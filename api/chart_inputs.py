from http.server import BaseHTTPRequestHandler
import json
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import swisseph as swe
import urllib.parse
import urllib.request


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

GOOGLE_GEOCODE_API_KEY = os.getenv("GOOGLE_GEOCODE_API_KEY", "")
GOOGLE_TIMEZONE_API_KEY = os.getenv("GOOGLE_TIMEZONE_API_KEY", "")


# ---------- Data models ----------

@dataclass
class ResolvedLocation:
    location_input: str
    location_resolved: str
    lat: float
    lon: float
    timezone_name: str | None = None
    utc_offset_at_birth: float | None = None


@dataclass
class ResolvedBirthContext:
    dob: str
    time_input: str
    ampm: str
    location_input: str
    location_resolved: str
    lat: float
    lon: float
    timezone_name: str
    utc_offset_at_birth: float
    local_datetime_resolved: str
    utc_datetime: str


# ---------- Utility ----------

def normalize_longitude(lon: float) -> float:
    return (lon % 360.0) / 360.0


def normalize_tob_with_ampm(time_str: str, ampm: str | None = None) -> str:
    time_str = str(time_str or "").strip()
    ampm = str(ampm or "").strip().upper()

    if not time_str:
        raise ValueError("Time of birth is required.")

    upper = time_str.upper()
    if "AM" in upper or "PM" in upper:
        return time_str

    if ampm in ("AM", "PM"):
        return f"{time_str} {ampm}"

    return time_str


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

    raise ValueError("Time must look like 6:20 AM, 10:55 PM, or 18:20.")


def http_get_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Lucy.OS/1.0"
        }
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------- External resolution ----------
# Google Geocoding + Google Time Zone are used here because they give
# global location and timezone handling with timestamp-aware timezone lookup.
# Docs:
# - https://developers.google.com/maps/documentation/timezone/overview
# - https://developers.google.com/maps/documentation/timezone/requests-timezone

def geocode_location_google(location_text: str) -> ResolvedLocation:
    if not GOOGLE_GEOCODE_API_KEY:
        raise RuntimeError("Missing GOOGLE_GEOCODE_API_KEY")

    query = urllib.parse.quote(location_text)
    url = (
        "https://maps.googleapis.com/maps/api/geocode/json"
        f"?address={query}&key={GOOGLE_GEOCODE_API_KEY}"
    )
    data = http_get_json(url)

    if data.get("status") != "OK" or not data.get("results"):
        raise ValueError(f"Could not geocode location: {location_text}")

    first = data["results"][0]
    geom = first["geometry"]["location"]

    return ResolvedLocation(
        location_input=location_text,
        location_resolved=first["formatted_address"],
        lat=float(geom["lat"]),
        lon=float(geom["lng"]),
    )


def resolve_timezone_google(lat: float, lon: float, birth_utc_timestamp: int) -> tuple[str, float]:
    if not GOOGLE_TIMEZONE_API_KEY:
        raise RuntimeError("Missing GOOGLE_TIMEZONE_API_KEY")

    url = (
        "https://maps.googleapis.com/maps/api/timezone/json"
        f"?location={lat},{lon}&timestamp={birth_utc_timestamp}&key={GOOGLE_TIMEZONE_API_KEY}"
    )
    data = http_get_json(url)

    if data.get("status") != "OK":
        raise ValueError("Could not resolve timezone for location/timestamp")

    timezone_name = data["timeZoneId"]
    raw_offset = float(data.get("rawOffset", 0))
    dst_offset = float(data.get("dstOffset", 0))
    total_hours = (raw_offset + dst_offset) / 3600.0

    return timezone_name, total_hours


# ---------- Birth context resolution ----------

def resolve_birth_context(
    dob: str,
    time_input: str,
    ampm: str,
    location_text: str,
    utc_offset_override: float | None = None,
) -> ResolvedBirthContext:
    normalized_time = normalize_tob_with_ampm(time_input, ampm)
    parsed_time = parse_time_flexible(normalized_time)

    # First geocode location
    loc = geocode_location_google(location_text)

    # Build a naive local datetime candidate
    local_naive = datetime.strptime(dob, "%Y-%m-%d").replace(
        hour=parsed_time.hour,
        minute=parsed_time.minute,
        second=0,
        microsecond=0,
    )

    if utc_offset_override is not None:
        # Advanced/manual override path
        offset_seconds = int(utc_offset_override * 3600)
        utc_dt = (local_naive - timedelta(seconds=offset_seconds)).replace(tzinfo=timezone.utc)
        timezone_name = "Manual/Override"
        utc_offset_at_birth = float(utc_offset_override)
        local_resolved_str = local_naive.strftime("%Y-%m-%d %I:%M %p")
    else:
        # Timestamp-aware timezone lookup path
        # Use a rough UTC guess first for the timezone API timestamp requirement
        rough_utc = local_naive.replace(tzinfo=timezone.utc)
        rough_ts = int(rough_utc.timestamp())

        timezone_name, utc_offset_at_birth = resolve_timezone_google(
            loc.lat, loc.lon, rough_ts
        )

        zinfo = ZoneInfo(timezone_name)
        local_zoned = local_naive.replace(tzinfo=zinfo)
        utc_dt = local_zoned.astimezone(timezone.utc)
        local_resolved_str = local_zoned.strftime("%Y-%m-%d %I:%M %p")

    return ResolvedBirthContext(
        dob=dob,
        time_input=time_input,
        ampm=ampm,
        location_input=location_text,
        location_resolved=loc.location_resolved,
        lat=loc.lat,
        lon=loc.lon,
        timezone_name=timezone_name,
        utc_offset_at_birth=utc_offset_at_birth,
        local_datetime_resolved=local_resolved_str,
        utc_datetime=utc_dt.isoformat(),
    )


# ---------- Swiss Ephemeris ----------

def utc_datetime_to_jd(utc_dt: datetime) -> float:
    hour_decimal = (
        utc_dt.hour
        + (utc_dt.minute / 60.0)
        + (utc_dt.second / 3600.0)
    )
    return swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        hour_decimal,
    )


def compute_angles_and_houses(jd_ut: float, lat: float, lon: float):
    cusps, ascmc = swe.houses(jd_ut, lat, lon, HOUSE_SYSTEM)

    asc = float(ascmc[0] % 360.0)
    mc = float(ascmc[1] % 360.0)
    desc = float((asc + 180.0) % 360.0)
    ic = float((mc + 180.0) % 360.0)

    houses = [float(cusps[i] % 360.0) for i in range(1, 13)]

    return {
        "asc": asc,
        "mc": mc,
        "desc": desc,
        "ic": ic,
    }, houses


def compute_chart_from_birth_context(ctx: ResolvedBirthContext) -> dict:
    utc_dt = datetime.fromisoformat(ctx.utc_datetime)
    jd_ut = utc_datetime_to_jd(utc_dt)

    result = {}
    longitudes_deg = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = float(xx[0] % 360.0)
        longitudes_deg[name] = lon
        result[name] = normalize_longitude(lon)

    angles, houses = compute_angles_and_houses(jd_ut, ctx.lat, ctx.lon)

    result["_longitudesDeg"] = longitudes_deg
    result["angles"] = angles
    result["houses"] = houses
    result["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "natal",
        "location_input": ctx.location_input,
        "location_resolved": ctx.location_resolved,
        "lat": ctx.lat,
        "lon": ctx.lon,
        "timezone_name": ctx.timezone_name,
        "utc_offset_at_birth": ctx.utc_offset_at_birth,
        "local_time_resolved": ctx.local_datetime_resolved,
        "utc_datetime": ctx.utc_datetime,
        "jd_ut": round(jd_ut, 6),
    }

    return result


def compute_transit_inputs() -> dict:
    now_utc = datetime.now(timezone.utc)
    jd_ut = utc_datetime_to_jd(now_utc)

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


# ---------- HTTP handler ----------

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
            time_input = str(payload.get("time") or payload.get("tob") or "").strip()
            ampm = str(payload.get("ampm", "")).strip().upper()
            location_text = str(payload.get("locationText") or payload.get("location") or "").strip()

            utc_override_raw = payload.get("utcOffsetOverride", None)
            utc_override = None
            if utc_override_raw not in (None, "", "null"):
                utc_override = float(utc_override_raw)

            if not dob or not time_input or not location_text:
                self._set_headers(400)
                self.wfile.write(
                    json.dumps({
                        "error": "dob, time/tob, ampm, and locationText/location are required"
                    }).encode("utf-8")
                )
                return

            ctx = resolve_birth_context(
                dob=dob,
                time_input=time_input,
                ampm=ampm,
                location_text=location_text,
                utc_offset_override=utc_override,
            )
            result = compute_chart_from_birth_context(ctx)

            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(
                json.dumps({
                    "error": str(e)
                }).encode("utf-8")
            )
