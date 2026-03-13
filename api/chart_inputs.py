from http.server import BaseHTTPRequestHandler
import json
import re
from datetime import datetime, timedelta, timezone

import swisseph as swe


PLANETS = {
    "sun": swe.SUN,
    "moon": swe.MOON,
    "mercury": swe.MERCURY,
    "venus": swe.VENUS,
    "mars": swe.MARS,
    "jupiter": swe.JUPITER,
    "saturn": swe.SATURN,
    "uranus": swe.URANUS,
    "neptune": swe.NEPTUNE,
    "pluto": swe.PLUTO,
}

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED


def normalize_longitude(lon: float) -> float:
    return (lon % 360.0) / 360.0


def normalize_tob_with_ampm(tob: str, ampm: str | None = None) -> str:
    """
    Accepts:
      - tob='6:20', ampm='AM'
      - tob='6:20', ampm='PM'
      - tob='18:20', ampm=None
      - tob='6:20 AM', ampm=None

    Returns a normalized string suitable for parse_time_flexible().
    """
    tob = str(tob or "").strip()
    ampm = str(ampm or "").strip().upper()

    if not tob:
        raise ValueError("Time of birth is required")

    # If tob already contains AM/PM, trust it.
    upper_tob = tob.upper()
    if "AM" in upper_tob or "PM" in upper_tob:
        return tob

    # If ampm is supplied separately, append it.
    if ampm in ("AM", "PM"):
        return f"{tob} {ampm}"

    # Otherwise assume tob is already 24-hour style or flexible enough for parser.
    return tob


def parse_time_flexible(time_str: str) -> datetime:
    cleaned = time_str.strip().upper().replace(".", "")
    cleaned = re.sub(r"\s+", " ", cleaned)

    formats = [
        "%I:%M %p",  # 6:20 AM
        "%I:%M%p",   # 6:20AM
        "%I %p",     # 6 AM
        "%I%p",      # 6AM
        "%H:%M",     # 18:20
        "%H",        # 18
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue

    raise ValueError(
        "Time of birth must look like 6:20 AM, 10:55 PM, or 18:20"
    )


def to_utc_datetime(dob: str, tob: str, utc_offset_hours: float) -> datetime:
    date = datetime.strptime(dob, "%Y-%m-%d")
    time_obj = parse_time_flexible(tob)

    local_dt = datetime(
        date.year,
        date.month,
        date.day,
        time_obj.hour,
        time_obj.minute,
        tzinfo=timezone(timedelta(hours=utc_offset_hours)),
    )

    return local_dt.astimezone(timezone.utc)


def to_julian_day_utc(dob: str, tob: str, utc_offset_hours: float):
    utc_dt = to_utc_datetime(dob, tob, utc_offset_hours)

    hour_decimal = (
        utc_dt.hour
        + (utc_dt.minute / 60.0)
        + (utc_dt.second / 3600.0)
    )

    jd_ut = swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        hour_decimal,
    )

    return jd_ut, utc_dt


def compute_chart_inputs(
    dob: str,
    tob: str,
    utc_offset_hours: float,
    location: str | None = None,
):
    jd_ut, utc_dt = to_julian_day_utc(dob, tob, utc_offset_hours)
    result = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = xx[0]
        result[name] = normalize_longitude(lon)

    result["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "natal",
        "utc_datetime": utc_dt.isoformat(),
        "jd_ut": round(jd_ut, 6),
        "location": location or "",
        "utc_offset": utc_offset_hours,
        "note": "Location is currently metadata only; chart is driven by dob, tob, and utcOffset."
    }

    return result


def compute_transit_inputs():
    now_utc = datetime.now(timezone.utc)

    hour_decimal = (
        now_utc.hour
        + (now_utc.minute / 60.0)
        + (now_utc.second / 3600.0)
    )

    jd_ut = swe.julday(
        now_utc.year,
        now_utc.month,
        now_utc.day,
        hour_decimal,
    )

    result = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = xx[0]
        result[name] = normalize_longitude(lon)

    result["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "transit",
        "utc_datetime": now_utc.isoformat(),
        "jd_ut": round(jd_ut, 6),
    }

    return result


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        self._set_headers(200)
        self.wfile.write(
            json.dumps({
                "ok": True,
                "route": "/api/chart_inputs",
                "message": "Lucy.OS API is live. Use POST for natal input or GET as health check."
            }).encode("utf-8")
        )

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body or "{}")

            mode = str(payload.get("mode", "natal")).strip().lower()
            dob = str(payload.get("dob", "")).strip()
            tob = str(payload.get("tob", "")).strip()
            ampm = str(payload.get("ampm", "")).strip().upper()
            location = str(payload.get("location", "")).strip()
            utc_offset = payload.get("utcOffset", None)

            if mode == "natal":
                if not dob or not tob or utc_offset in (None, ""):
                    self._set_headers(400)
                    self.wfile.write(
                        json.dumps({
                            "error": "dob, tob, and utcOffset are required"
                        }).encode("utf-8")
                    )
                    return

                utc_offset = float(utc_offset)
                normalized_tob = normalize_tob_with_ampm(tob, ampm)

                result = compute_chart_inputs(
                    dob=dob,
                    tob=normalized_tob,
                    utc_offset_hours=utc_offset,
                    location=location,
                )

            elif mode == "transit":
                result = compute_transit_inputs()

            else:
                self._set_headers(400)
                self.wfile.write(
                    json.dumps({
                        "error": "mode must be 'natal' or 'transit'"
                    }).encode("utf-8")
                )
                return

            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(
                json.dumps({
                    "error": str(e)
                }).encode("utf-8")
            )
