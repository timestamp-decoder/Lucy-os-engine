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
HOUSE_SYSTEM = b"P"  # Placidus


LOCATION_MAP = {
    "CUERO, TX USA": {
        "label": "Cuero, TX USA",
        "lat": 29.0938,
        "lon": -97.2892,
        "utcOffset": -6,
    },
    "AMARILLO, TX USA": {
        "label": "Amarillo, TX USA",
        "lat": 35.2220,
        "lon": -101.8313,
        "utcOffset": -6,
    },
    "SAN ANTONIO, TX USA": {
        "label": "San Antonio, TX USA",
        "lat": 29.4241,
        "lon": -98.4936,
        "utcOffset": -6,
    },
    "AUSTIN, TX USA": {
        "label": "Austin, TX USA",
        "lat": 30.2672,
        "lon": -97.7431,
        "utcOffset": -6,
    },
    "HOUSTON, TX USA": {
        "label": "Houston, TX USA",
        "lat": 29.7604,
        "lon": -95.3698,
        "utcOffset": -6,
    },
    "DALLAS, TX USA": {
        "label": "Dallas, TX USA",
        "lat": 32.7767,
        "lon": -96.7970,
        "utcOffset": -6,
    },
    "CHICAGO, IL USA": {
        "label": "Chicago, IL USA",
        "lat": 41.8781,
        "lon": -87.6298,
        "utcOffset": -6,
    },
    "PHOENIX, AZ USA": {
        "label": "Phoenix, AZ USA",
        "lat": 33.4484,
        "lon": -112.0740,
        "utcOffset": -7,
    },
    "LOS ANGELES, CA USA": {
        "label": "Los Angeles, CA USA",
        "lat": 34.0522,
        "lon": -118.2437,
        "utcOffset": -8,
    },
    "NEW YORK, NY USA": {
        "label": "New York, NY USA",
        "lat": 40.7128,
        "lon": -74.0060,
        "utcOffset": -5,
    },
    "MIAMI, FL USA": {
        "label": "Miami, FL USA",
        "lat": 25.7617,
        "lon": -80.1918,
        "utcOffset": -5,
    },
    "DENVER, CO USA": {
        "label": "Denver, CO USA",
        "lat": 39.7392,
        "lon": -104.9903,
        "utcOffset": -7,
    },
    "SEATTLE, WA USA": {
        "label": "Seattle, WA USA",
        "lat": 47.6062,
        "lon": -122.3321,
        "utcOffset": -8,
    },
    "ATLANTA, GA USA": {
        "label": "Atlanta, GA USA",
        "lat": 33.7490,
        "lon": -84.3880,
        "utcOffset": -5,
    },
    "NASHVILLE, TN USA": {
        "label": "Nashville, TN USA",
        "lat": 36.1627,
        "lon": -86.7816,
        "utcOffset": -6,
    },
}


def normalize_longitude(lon: float) -> float:
    return (lon % 360.0) / 360.0


def normalize_tob_with_ampm(tob: str, ampm: str | None = None) -> str:
    tob = str(tob or "").strip()
    ampm = str(ampm or "").strip().upper()

    if not tob:
        raise ValueError("Time of birth is required")

    upper_tob = tob.upper()
    if "AM" in upper_tob or "PM" in upper_tob:
        return tob

    if ampm in ("AM", "PM"):
        return f"{tob} {ampm}"

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


def resolve_location(location_text: str, fallback_utc_offset: float | None):
    raw = str(location_text or "").strip()
    key = raw.upper()

    if key in LOCATION_MAP:
        loc = LOCATION_MAP[key].copy()
        return {
            "input": raw,
            "resolved": loc["label"],
            "lat": loc["lat"],
            "lon": loc["lon"],
            "utcOffset": float(loc["utcOffset"]),
            "matched": True,
        }

    return {
        "input": raw,
        "resolved": raw,
        "lat": None,
        "lon": None,
        "utcOffset": float(fallback_utc_offset) if fallback_utc_offset is not None else None,
        "matched": False,
    }


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


def to_local_datetime_string(dob: str, tob: str) -> str:
    date = datetime.strptime(dob, "%Y-%m-%d")
    time_obj = parse_time_flexible(tob)

    local_dt = datetime(
        date.year,
        date.month,
        date.day,
        time_obj.hour,
        time_obj.minute,
    )

    return local_dt.strftime("%Y-%m-%d %I:%M %p")


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


def compute_angles_and_houses(jd_ut: float, lat: float | None, lon: float | None):
    if lat is None or lon is None:
        return None, []

    cusps, ascmc = swe.houses(jd_ut, lat, lon, HOUSE_SYSTEM)

    # swe.houses returns:
    # cusps[1..12], ascmc[0]=Asc, ascmc[1]=MC
    asc = float(ascmc[0] % 360.0)
    mc = float(ascmc[1] % 360.0)
    desc = float((asc + 180.0) % 360.0)
    ic = float((mc + 180.0) % 360.0)

    houses = [float(cusps[i] % 360.0) for i in range(1, 13)]

    angles = {
        "asc": asc,
        "mc": mc,
        "desc": desc,
        "ic": ic,
    }

    return angles, houses


def compute_chart_inputs(
    dob: str,
    tob: str,
    utc_offset_hours: float,
    location: str | None = None,
):
    resolved_location = resolve_location(location, utc_offset_hours)
    effective_utc_offset = resolved_location["utcOffset"]

    jd_ut, utc_dt = to_julian_day_utc(dob, tob, effective_utc_offset)
    result = {}
    longitudes_deg = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = float(xx[0] % 360.0)
        longitudes_deg[name] = lon
        result[name] = normalize_longitude(lon)

    angles, houses = compute_angles_and_houses(
        jd_ut,
        resolved_location["lat"],
        resolved_location["lon"],
    )

    result["_longitudesDeg"] = longitudes_deg
    result["angles"] = angles
    result["houses"] = houses

    result["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "natal",
        "utc_datetime": utc_dt.isoformat(),
        "jd_ut": round(jd_ut, 6),
        "location": resolved_location["input"],
        "location_resolved": resolved_location["resolved"],
        "local_time_resolved": to_local_datetime_string(dob, tob),
        "utc_offset": effective_utc_offset,
        "lat": resolved_location["lat"],
        "lon": resolved_location["lon"],
        "location_matched": resolved_location["matched"],
        "note": (
            "Location-aware natal geometry active."
            if resolved_location["lat"] is not None and resolved_location["lon"] is not None
            else "Location text accepted, but no lat/lon match found; houses/angles unavailable."
        ),
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
    longitudes_deg = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = float(xx[0] % 360.0)
        longitudes_deg[name] = lon
        result[name] = normalize_longitude(lon)

    result["_longitudesDeg"] = longitudes_deg
    result["angles"] = None
    result["houses"] = []

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

            # Support both old and new payload keys
            tob = str(
                payload.get("time24")
                or payload.get("tob")
                or payload.get("time")
                or ""
            ).strip()

            ampm = str(payload.get("ampm", "")).strip().upper()
            location = str(
                payload.get("locationText")
                or payload.get("location")
                or ""
            ).strip()

            utc_offset = payload.get("utcOffset", None)

            if mode == "natal":
                if not dob or not tob or utc_offset in (None, ""):
                    self._set_headers(400)
                    self.wfile.write(
                        json.dumps({
                            "error": "dob, tob/time24, and utcOffset are required"
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
