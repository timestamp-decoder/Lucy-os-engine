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
    "pluto": swe.PLUTO
}

FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED


def normalize_longitude(lon):
    return lon / 360.0


def parse_time_12h(time_str):
    return datetime.strptime(time_str, "%I:%M %p")


def to_julian_day_utc(dob, tob, utc_offset_hours):
    date = datetime.strptime(dob, "%Y-%m-%d")
    time = parse_time_12h(tob)

    local_dt = datetime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute
    )

    utc_dt = local_dt - timedelta(hours=utc_offset_hours)

    hour_decimal = utc_dt.hour + (utc_dt.minute / 60.0)

    jd_ut = swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        hour_decimal
    )

    return jd_ut


def compute_chart_inputs(dob, tob, utc_offset_hours):
    jd_ut = to_julian_day_utc(dob, tob, utc_offset_hours)

    result = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = xx[0]
        result[name] = normalize_longitude(lon)

    return result


def compute_transit_inputs():
    now_utc = datetime.utcnow()

    hour_decimal = (
        now_utc.hour +
        (now_utc.minute / 60.0) +
        (now_utc.second / 3600.0)
    )

    jd_ut = swe.julday(
        now_utc.year,
        now_utc.month,
        now_utc.day,
        hour_decimal
    )

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
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

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
                    self._set_headers(400)
                    self.wfile.write(json.dumps({
                        "error": "dob, tob, and utcOffset are required"
                    }).encode("utf-8"))
                    return

                utc_offset = float(utc_offset)

                result = compute_chart_inputs(
                    dob,
                    tob,
                    utc_offset
                )

            elif mode == "transit":

                result = compute_transit_inputs()

            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    "error": "mode must be 'natal' or 'transit'"
                }).encode("utf-8"))
                return

            self._set_headers(200)
            self.wfile.write(
                json.dumps(result).encode("utf-8")
            )

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({
                "error": str(e)
            }).encode("utf-8"))
