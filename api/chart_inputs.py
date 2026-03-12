from http.server import BaseHTTPRequestHandler
import json
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


def normalize_longitude(lon):
    return (lon % 360.0) / 360.0


def parse_time_flexible(time_str):
    """
    Accepts common formats like:
    - 6:20 AM
    - 6:20AM
    - 06:20 AM
    - 18:20
    """
    time_str = str(time_str).strip().upper().replace(".", "")
    candidates = [
        "%I:%M %p",
        "%I:%M%p",
        "%H:%M",
    ]

    for fmt in candidates:
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue

    raise ValueError("tob must look like '6:20 AM' or '18:20'")


def to_julian_day_utc(dob, tob, utc_offset_hours):
    date = datetime.strptime(dob, "%Y-%m-%d")
    time = parse_time_flexible(tob)

    local_dt = datetime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
        0,
    )

    utc_dt = local_dt - timedelta(hours=float(utc_offset_hours))
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

    return jd_ut, local_dt, utc_dt


def compute_chart_inputs(dob, tob, utc_offset_hours):
    jd_ut, local_dt, utc_dt = to_julian_day_utc(dob, tob, utc_offset_hours)

    result = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = xx[0]
        speed = xx[3]

        result[name] = normalize_longitude(lon)
        result[f"{name}_lon"] = round(lon % 360.0, 6)
        result[f"{name}_speed"] = round(speed, 6)

    result["_meta"] = {
        "mode": "natal",
        "source": "Swiss Ephemeris",
        "jd_ut": round(jd_ut, 8),
        "local_datetime": local_dt.strftime("%Y-%m-%d %H:%M"),
        "utc_datetime": utc_dt.strftime("%Y-%m-%d %H:%M"),
        "utc_offset_hours": float(utc_offset_hours),
        "planet_count": len(PLANETS),
    }

    return result


def compute_transit_inputs():
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

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
        speed = xx[3]

        result[name] = normalize_longitude(lon)
        result[f"{name}_lon"] = round(lon % 360.0, 6)
        result[f"{name}_speed"] = round(speed, 6)

    result["_meta"] = {
        "mode": "transit",
        "source": "Swiss Ephemeris",
        "jd_ut": round(jd_ut, 8),
        "utc_datetime": now_utc.strftime("%Y-%m-%d %H:%M:%S"),
        "planet_count": len(PLANETS),
    }

    return result


class handler(BaseHTTPRequestHandler):

    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def _write_json(self, status_code, payload):
        self._set_headers(status_code)
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body or "{}")

            mode = str(payload.get("mode", "natal")).strip().lower()
            dob = str(payload.get("dob", "")).strip()
            tob = str(payload.get("tob", "")).strip()
            utc_offset = payload.get("utcOffset", None)

            if mode == "natal":
                if not dob or not tob or utc_offset in (None, ""):
                    self._write_json(400, {
                        "error": "dob, tob, and utcOffset are required for natal mode"
                    })
                    return

                try:
                    utc_offset = float(utc_offset)
                except (TypeError, ValueError):
                    self._write_json(400, {
                        "error": "utcOffset must be a valid number"
                    })
                    return

                result = compute_chart_inputs(dob, tob, utc_offset)

            elif mode == "transit":
                result = compute_transit_inputs()

            else:
                self._write_json(400, {
                    "error": "mode must be 'natal' or 'transit'"
                })
                return

            self._write_json(200, result)

        except ValueError as e:
            self._write_json(400, {
                "error": str(e)
            })

        except Exception as e:
            self._write_json(500, {
                "error": str(e)
            })
