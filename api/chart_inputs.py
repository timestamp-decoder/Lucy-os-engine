from http.server import BaseHTTPRequestHandler
import json
import os
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from urllib.parse import urlencode
from urllib.request import urlopen, Request

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
HOUSE_SYSTEM = b"P"

GOOGLE_GEOCODE_API_KEY = os.getenv("GOOGLE_GEOCODE_API_KEY", "")
GOOGLE_TIMEZONE_API_KEY = os.getenv("GOOGLE_TIMEZONE_API_KEY", "")


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
        "%I:%M %p",
        "%I:%M%p",
        "%I %p",
        "%I%p",
        "%H:%M",
        "%H",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue

    raise ValueError("Time of birth must look like 6:20 AM, 10:55 PM, or 18:20")


def http_get_json(url: str) -> dict:
    req = Request(
        url,
        headers={
            "User-Agent": "LucyOS/1.0"
        },
    )
    with urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def geocode_birth_place(location_text: str) -> dict:
    if not GOOGLE_GEOCODE_API_KEY:
        raise RuntimeError("Missing GOOGLE_GEOCODE_API_KEY in environment")

    params = urlencode({
        "address": location_text,
        "key": GOOGLE_GEOCODE_API_KEY,
    })
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
    data = http_get_json(url)

    if data.get("status") != "OK" or not data.get("results"):
        error_message = data.get("error_message", "Unknown geocoding error")
        raise ValueError(
            f"Could not geocode location: {location_text} | "
            f"status={data.get('status')} | error={error_message}"
        )

    first = data["results"][0]
    geo = first["geometry"]["location"]

    return {
        "location_input": location_text,
        "location_resolved": first.get("formatted_address", location_text),
        "lat": float(geo["lat"]),
        "lon": float(geo["lng"]),
    }


def get_historical_timezone(lat: float, lon: float, timestamp: int) -> dict:
    if not GOOGLE_TIMEZONE_API_KEY:
        raise RuntimeError("Missing GOOGLE_TIMEZONE_API_KEY in environment")

    params = urlencode({
        "location": f"{lat},{lon}",
        "timestamp": str(timestamp),
        "key": GOOGLE_TIMEZONE_API_KEY,
    })
    url = f"https://maps.googleapis.com/maps/api/timezone/json?{params}"
    data = http_get_json(url)

    if data.get("status") != "OK":
        error_message = data.get("errorMessage", "Unknown timezone error")
        raise ValueError(
            f"Could not resolve timezone for coordinates {lat},{lon} | "
            f"status={data.get('status')} | error={error_message}"
        )

    raw_offset = float(data.get("rawOffset", 0))
    dst_offset = float(data.get("dstOffset", 0))

    return {
        "timezone_name": data["timeZoneId"],
        "timezone_label": data.get("timeZoneName", data["timeZoneId"]),
        "raw_offset_seconds": raw_offset,
        "dst_offset_seconds": dst_offset,
        "utc_offset_at_birth": (raw_offset + dst_offset) / 3600.0,
    }


def resolve_local_and_utc_birth(
    dob: str,
    tob_normalized: str,
    location_text: str,
    utc_offset_override: float | None = None,
) -> dict:
    date_part = datetime.strptime(dob, "%Y-%m-%d")
    time_part = parse_time_flexible(tob_normalized)

    local_naive = datetime(
        date_part.year,
        date_part.month,
        date_part.day,
        time_part.hour,
        time_part.minute,
        0,
        0,
    )

    geo = geocode_birth_place(location_text)

    if utc_offset_override is not None:
        local_dt = local_naive.replace(
            tzinfo=timezone(timedelta(hours=float(utc_offset_override)))
        )
        utc_dt = local_dt.astimezone(timezone.utc)
        timezone_info = {
            "timezone_name": "Manual/Override",
            "timezone_label": "Manual/Override",
            "utc_offset_at_birth": float(utc_offset_override),
        }
    else:
        rough_utc = local_naive.replace(tzinfo=timezone.utc)
        rough_timestamp = int(rough_utc.timestamp())

        timezone_info = get_historical_timezone(
            geo["lat"],
            geo["lon"],
            rough_timestamp,
        )

        zone = ZoneInfo(timezone_info["timezone_name"])
        local_dt = local_naive.replace(tzinfo=zone)
        utc_dt = local_dt.astimezone(timezone.utc)

        refined_timezone_info = get_historical_timezone(
            geo["lat"],
            geo["lon"],
            int(utc_dt.timestamp()),
        )
        timezone_info = refined_timezone_info

        zone = ZoneInfo(timezone_info["timezone_name"])
        local_dt = local_naive.replace(tzinfo=zone)
        utc_dt = local_dt.astimezone(timezone.utc)

    return {
        **geo,
        **timezone_info,
        "local_dt": local_dt,
        "utc_dt": utc_dt,
        "local_time_resolved": local_dt.strftime("%Y-%m-%d %I:%M %p"),
        "utc_datetime": utc_dt.isoformat(),
    }


def to_julian_day_utc(utc_dt: datetime) -> float:
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

    return jd_ut


def compute_angles_and_houses(jd_ut: float, lat: float, lon: float):
    cusps, ascmc = swe.houses(jd_ut, lat, lon, HOUSE_SYSTEM)

    asc = float(ascmc[0] % 360.0)
    mc = float(ascmc[1] % 360.0)
    desc = float((asc + 180.0) % 360.0)
    ic = float((mc + 180.0) % 360.0)

    # cusps is 0-indexed in Python here for the 12 houses
    houses = [float(cusps[i] % 360.0) for i in range(12)]

    return {
        "asc": asc,
        "mc": mc,
        "desc": desc,
        "ic": ic,
    }, houses


def compute_chart_inputs(
    dob: str,
    tob: str,
    utc_offset_hours: float | None = None,
    location: str | None = None,
):
    resolved = resolve_local_and_utc_birth(
        dob=dob,
        tob_normalized=tob,
        location_text=location or "",
        utc_offset_override=utc_offset_hours,
    )

    utc_dt = resolved["utc_dt"]
    jd_ut = to_julian_day_utc(utc_dt)

    result = {}
    longitudes_deg = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = float(xx[0] % 360.0)
        longitudes_deg[name] = lon
        result[name] = normalize_longitude(lon)

    angles, houses = compute_angles_and_houses(
        jd_ut,
        resolved["lat"],
        resolved["lon"],
    )

    result["_longitudesDeg"] = longitudes_deg
    result["angles"] = angles
    result["houses"] = houses

    result["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "natal",
        "utc_datetime": resolved["utc_datetime"],
        "jd_ut": round(jd_ut, 6),
        "location": resolved["location_input"],
        "location_resolved": resolved["location_resolved"],
        "utc_offset": resolved["utc_offset_at_birth"],
        "utc_offset_at_birth": resolved["utc_offset_at_birth"],
        "timezone_name": resolved["timezone_name"],
        "timezone_label": resolved["timezone_label"],
        "lat": resolved["lat"],
        "lon": resolved["lon"],
        "local_time_resolved": resolved["local_time_resolved"],
        "note": "Worldwide location + timezone resolution active."
    }

    return result


def compute_transit_inputs():
    now_utc = datetime.now(timezone.utc)
    jd_ut = to_julian_day_utc(now_utc)

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

            if mode == "transit":
                result = compute_transit_inputs()
                self._set_headers(200)
                self.wfile.write(json.dumps(result).encode("utf-8"))
                return

            dob = str(payload.get("dob", "")).strip()

            # Prefer raw time + AM/PM, let backend normalize it
            tob = str(
                payload.get("tob")
                or payload.get("time")
                or ""
            ).strip()

            ampm = str(payload.get("ampm", "")).strip().upper()
            location = str(
                payload.get("locationText")
                or payload.get("location")
                or ""
            ).strip()

            utc_override_raw = payload.get("utcOffsetOverride", None)
            utc_override = None
            if utc_override_raw not in (None, "", "null"):
                utc_override = float(utc_override_raw)

            if not dob or not tob or not location:
                self._set_headers(400)
                self.wfile.write(
                    json.dumps({
                        "error": "dob, tob/time, and locationText/location are required"
                    }).encode("utf-8")
                )
                return

            normalized_tob = normalize_tob_with_ampm(tob, ampm)

            result = compute_chart_inputs(
                dob=dob,
                tob=normalized_tob,
                utc_offset_hours=utc_override,
                location=location,
            )

            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(
                json.dumps({
                    "error": str(e)
                }).encode("utf-8")
            )
