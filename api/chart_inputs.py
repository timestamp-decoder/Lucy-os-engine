from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime, timedelta

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


def parse_time_12h(time_str: str):
    clean = (time_str or "").strip().upper()
    dt = datetime.strptime(clean, "%I:%M %p")
    return dt.hour, dt.minute


def normalize_longitude(deg: float) -> float:
    return (deg % 360.0) / 360.0


def to_julian_day_utc(dob: str, tob: str, utc_offset_hours: float):
    year, month, day = map(int, dob.split("-"))
    hour, minute = parse_time_12h(tob)

    local_dt = datetime(year, month, day, hour, minute)
    utc_dt = local_dt - timedelta(hours=utc_offset_hours)

    hour_decimal = utc_dt.hour + (utc_dt.minute / 60.0)
    jd_ut = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, hour_decimal)

    return jd_ut


def compute_chart_inputs(dob: str, tob: str, utc_offset_hours: float):
    jd_ut = to_julian_day_utc(dob, tob, utc_offset_hours)

    result = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = xx[0]
        result[name] = normalize_longitude(lon)

    return result


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body or "{}")

            dob = str(payload.get("dob", "")).strip()
            tob = str(payload.get("tob", "")).strip()
            utc_offset = payload.get("utcOffset", None)

            if not dob or not tob or utc_offset in (None, ""):
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    "error": "dob, tob, and utcOffset are required"
                }).encode("utf-8"))
                return

            utc_offset = float(utc_offset)
            result = compute_chart_inputs(dob, tob, utc_offset)

            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({
                "error": str(e)
            }).encode("utf-8"))
