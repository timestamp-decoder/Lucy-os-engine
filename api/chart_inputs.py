from http.server import BaseHTTPRequestHandler
import json
import math
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
    cleaned = str(time_str or "").strip().upper().replace(".", "")
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


def parse_bool(value) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        return bool(value)

    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "y", "on")

    return False


def resolve_requested_transit_utc(
    transit_date: str,
    transit_time: str,
    timezone_name: str | None = None,
    utc_offset_hours: float | None = None,
) -> dict:
    if not transit_date:
        raise ValueError("transitDate is required when forecastDiagnostic is true")

    if not transit_time:
        raise ValueError("transitTime is required when forecastDiagnostic is true")

    date_part = datetime.strptime(str(transit_date).strip(), "%Y-%m-%d")
    time_part = parse_time_flexible(str(transit_time).strip())

    local_naive = datetime(
        date_part.year,
        date_part.month,
        date_part.day,
        time_part.hour,
        time_part.minute,
        0,
        0,
    )

    timezone_used = timezone_name or "UTC"

    if timezone_name and timezone_name != "Manual/Override":
        try:
            local_dt = local_naive.replace(tzinfo=ZoneInfo(timezone_name))
        except Exception:
            if utc_offset_hours is None:
                local_dt = local_naive.replace(tzinfo=timezone.utc)
                timezone_used = "UTC"
            else:
                local_dt = local_naive.replace(
                    tzinfo=timezone(timedelta(hours=float(utc_offset_hours)))
                )
                timezone_used = f"UTC offset {float(utc_offset_hours):g}"
    elif utc_offset_hours is not None:
        local_dt = local_naive.replace(
            tzinfo=timezone(timedelta(hours=float(utc_offset_hours)))
        )
        timezone_used = f"UTC offset {float(utc_offset_hours):g}"
    else:
        local_dt = local_naive.replace(tzinfo=timezone.utc)
        timezone_used = "UTC"

    utc_dt = local_dt.astimezone(timezone.utc)

    return {
        "requested_local_datetime": local_dt.isoformat(),
        "transit_utc_datetime": utc_dt,
        "timezone_used": timezone_used,
    }


def build_forecast_diagnostic(
    requested_date: str,
    requested_time: str,
    transit_chart: dict,
    transit_response: dict,
) -> dict:
    proof_planets = ["sun", "moon", "mercury", "venus", "mars", "saturn", "pluto"]

    longitudes_deg = transit_chart.get("_longitudesDeg", {}) or {}
    normalized_transits = {
        name: round(float(transit_chart.get(name, 0.0)), 9)
        for name in proof_planets
    }

    transit_longitudes_deg = {
        name: round(float(longitudes_deg.get(name, 0.0)), 6)
        for name in proof_planets
    }

    sun_deg = float(longitudes_deg.get("sun", 0.0))
    moon_deg = float(longitudes_deg.get("moon", 0.0))
    moon_sun_angle = float((moon_deg - sun_deg) % 360.0)
    phase_fraction = moon_sun_angle / 360.0
    illumination_estimate = (1.0 - math.cos(math.radians(moon_sun_angle))) / 2.0

    meta = transit_chart.get("_meta", {}) or {}
    telemetry = transit_response.get("telemetry", {}) or {}

    return {
        "enabled": True,
        "requestedTransitDate": requested_date,
        "requestedTransitTime": requested_time,
        "transitUtcDatetime": meta.get("utc_datetime"),
        "transitJulianDay": meta.get("jd_ut"),
        "serverNowUsed": bool(meta.get("server_now_used", False)),
        "transitLongitudesDeg": transit_longitudes_deg,
        "normalizedTransits": normalized_transits,
        "moonSunAngle": round(moon_sun_angle, 6),
        "phaseFraction": round(phase_fraction, 9),
        "illuminationEstimate": round(illumination_estimate, 9),
        "primaryDriver": telemetry.get("primaryDriver"),
        "topDrivers": telemetry.get("topDrivers", []),
        "topRegulator": telemetry.get("topRegulator"),
    }


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
    if not location_text:
        raise ValueError("Birth location is required")

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
            "raw_offset_seconds": float(utc_offset_override) * 3600.0,
            "dst_offset_seconds": 0.0,
        }
    else:
        rough_utc = local_naive.replace(tzinfo=timezone.utc)
        rough_timestamp = int(rough_utc.timestamp())

        timezone_info = get_historical_timezone(
            geo["lat"],
            geo["lon"],
            rough_timestamp,
        )

        try:
            zone = ZoneInfo(timezone_info["timezone_name"])
            local_dt = local_naive.replace(tzinfo=zone)
            utc_dt = local_dt.astimezone(timezone.utc)
        except Exception:
            local_dt = local_naive.replace(
                tzinfo=timezone(timedelta(hours=timezone_info["utc_offset_at_birth"]))
            )
            utc_dt = local_dt.astimezone(timezone.utc)

        refined_timezone_info = get_historical_timezone(
            geo["lat"],
            geo["lon"],
            int(utc_dt.timestamp()),
        )
        timezone_info = refined_timezone_info

        try:
            zone = ZoneInfo(timezone_info["timezone_name"])
            local_dt = local_naive.replace(tzinfo=zone)
            utc_dt = local_dt.astimezone(timezone.utc)
        except Exception:
            local_dt = local_naive.replace(
                tzinfo=timezone(timedelta(hours=timezone_info["utc_offset_at_birth"]))
            )
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


def compute_transit_inputs(now_utc: datetime | None = None):
    server_now_used = now_utc is None

    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    elif now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)
    else:
        now_utc = now_utc.astimezone(timezone.utc)

    jd_ut = to_julian_day_utc(now_utc)

    result = {}
    longitudes_deg = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = float(xx[0] % 360.0)
        longitudes_deg[name] = lon
        result[name] = normalize_longitude(lon)

    result["_longitudesDeg"] = longitudes_deg
    result["angles"] = {}
    result["houses"] = []

    result["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "transit",
        "utc_datetime": now_utc.isoformat(),
        "jd_ut": round(jd_ut, 6),
        "server_now_used": server_now_used,
    }

    return result


def fmt_value(n: float) -> str:
    try:
        return f"{float(n):.2f}"
    except Exception:
        return "0.00"


def infer_mode(strain: float) -> str:
    if strain >= 1.0:
        return "Overload State"
    if strain >= 0.85:
        return "Threshold Strain"
    if strain >= 0.60:
        return "Mobilized State"
    return "Regulated Baseline"

def build_lucy_response(chart: dict) -> dict:
    sun = float(chart.get("sun", 0.0))
    moon = float(chart.get("moon", 0.0))
    mercury = float(chart.get("mercury", 0.0))
    venus = float(chart.get("venus", 0.0))
    mars = float(chart.get("mars", 0.0))
    jupiter = float(chart.get("jupiter", 0.0))
    saturn = float(chart.get("saturn", 0.0))
    uranus = float(chart.get("uranus", 0.0))
    neptune = float(chart.get("neptune", 0.0))
    pluto = float(chart.get("pluto", 0.0))

    angles = chart.get("angles", {}) or {}
    asc_deg = float(angles.get("asc", 0.0))
    mc_deg = float(angles.get("mc", 0.0))

    asc_norm = normalize_longitude(asc_deg)
    mc_norm = normalize_longitude(mc_deg)

    capacity = 0.55 + (sun * 0.45)

    amplified_load = (
        moon * 0.28 +
        mars * 0.18 +
        jupiter * 0.14 +
        uranus * 0.14 +
        neptune * 0.12 +
        pluto * 0.10 +
        asc_norm * 0.16
    )

    raw_regulation = (
        saturn * 0.32 +
        venus * 0.24 +
        mercury * 0.14
    )

    regulation_cap = amplified_load * 0.82
    regulation = min(raw_regulation, regulation_cap)

    overload_delta = max(amplified_load - capacity, 0.0)
    saturn_constraint = min(
        overload_delta * (0.20 + (saturn * 0.15)),
        amplified_load * 0.25
    )

    effective_load = max(amplified_load - regulation - saturn_constraint, 0.0)
    effective_load *= (0.92 + (asc_norm * 0.16))
    strain = effective_load / capacity if capacity > 0 else 0.0

    mode = infer_mode(strain)

    load_drivers = [
        ("Moon", moon),
        ("Mars", mars),
        ("Jupiter", jupiter),
        ("Uranus", uranus),
        ("Neptune", neptune),
        ("Pluto", pluto),
        ("ASC", asc_norm),
    ]
    load_drivers.sort(key=lambda x: x[1], reverse=True)

    regulators = [
        ("Saturn", saturn),
        ("Venus", venus),
        ("Mercury", mercury),
    ]
    regulators.sort(key=lambda x: x[1], reverse=True)

    primary_driver = load_drivers[0][0]
    top_regulator = regulators[0][0]

    environment_load = (uranus * 0.45) + (neptune * 0.45) + (asc_norm * 0.10)
    environment_mode = (
        "Clear / Stable" if environment_load < 0.33 else
        "Mixed / Variable" if environment_load < 0.66 else
        "Diffuse / Volatile"
    )

    timing_pressure = (
        mars * 0.35 +
        jupiter * 0.30 +
        mc_norm * 0.35
    )
    timing_mode = (
        "Stable Window" if timing_pressure < 0.33 else
        "Active Window" if timing_pressure < 0.66 else
        "Pushed Window"
    )

    pluto_rewrite = pluto > 0.85 and strain > 0.95
    saturn_shutdown = saturn_constraint > 0.20

    interpretation = {
        "modeMeaning": mode,
        "stateSummary": (
            f"{mode}. Capacity {fmt_value(capacity)}, "
            f"effective load {fmt_value(effective_load)}, "
            f"strain {fmt_value(strain)}."
        ),
        "nervousSystemBehavior": (
            f"Primary load driver is {primary_driver}; "
            f"top regulator is {top_regulator}."
        ),
        "recommendedPacing": (
            "Reduce load, simplify decisions, and avoid stacking stimulation."
            if strain >= 1.0 else
            "Move slower and increase containment before adding pressure."
            if strain >= 0.85 else
            "Good for focused effort with pacing and breaks."
            if strain >= 0.60 else
            "Baseline / stable window."
        ),
        "dominantDriverMeaning": (
            f"{primary_driver} is currently the strongest load-side influence."
        ),
        "regulationStatus": (
            f"{top_regulator} leads the regulation layer "
            f"({fmt_value(regulation)} active regulation; raw {fmt_value(raw_regulation)})."
        ),
        "volatilityNote": f"Uranus volatility proxy: {fmt_value(uranus)}.",
        "fogNote": f"Neptune fog proxy: {fmt_value(neptune)}.",
        "activationNote": f"Mars activation proxy: {fmt_value(mars)}.",
        "constraintNote": (
            f"Saturn constraint applied: {fmt_value(saturn_constraint)} "
            f"(overload delta {fmt_value(overload_delta)})."
        ),
    }

    forecast_now_state = (
        "Overload" if strain >= 1.0 else
        "Threshold" if strain >= 0.85 else
        "Mobilized" if strain >= 0.60 else
        "Regulated"
    )

    forecast = {
        "now": {
            "state": forecast_now_state,
            "text": interpretation["stateSummary"],
        },
        "plus6": {
            "state": forecast_now_state,
            "text": "Short-horizon forecast is currently using the same natal-state proxy layer.",
        },
        "plus24": {
            "state": forecast_now_state,
            "text": "Longer-horizon forecast is currently using the same natal-state proxy layer.",
        },
    }

    meta = chart.get("_meta", {})
    input_resolved = {
        "resolvedLocation": meta.get("location_resolved"),
        "locationResolved": meta.get("location_resolved"),
        "lat": meta.get("lat"),
        "lon": meta.get("lon"),
        "utcOffsetAtBirth": meta.get("utc_offset_at_birth"),
        "utc_offset_at_birth": meta.get("utc_offset_at_birth"),
        "timezoneName": meta.get("timezone_name"),
        "timezone_name": meta.get("timezone_name"),
        "localTimeResolved": meta.get("local_time_resolved"),
        "local_time_resolved": meta.get("local_time_resolved"),
        "utcDatetime": meta.get("utc_datetime"),
        "utc_datetime": meta.get("utc_datetime"),
    }

    ephemeris = {
        "source": meta.get("source", "Swiss Ephemeris"),
        "mode": meta.get("mode", "natal"),
        "utcDatetime": meta.get("utc_datetime"),
        "utc_datetime": meta.get("utc_datetime"),
        "jdUt": meta.get("jd_ut"),
        "jd_ut": meta.get("jd_ut"),
    }

    planetary = {
        "sun": sun,
        "moon": moon,
        "mercury": mercury,
        "venus": venus,
        "mars": mars,
        "jupiter": jupiter,
        "saturn": saturn,
        "uranus": uranus,
        "neptune": neptune,
        "pluto": pluto,
        "asc": asc_norm,
        "mc": mc_norm,
    }

    return {
        "state": {
            "capacity": capacity,
            "strain": strain,
            "amplifiedLoad": amplified_load,
            "regulation": regulation,
            "saturnConstraint": saturn_constraint,
            "effectiveLoad": effective_load,
            "mode": mode,
        },
        "telemetry": {
            "primaryDriver": primary_driver,
            "topRegulator": top_regulator,
            "topDrivers": [f"{name} ({fmt_value(val)})" for name, val in load_drivers[:3]],
            "topRegulators": [f"{name} ({fmt_value(val)})" for name, val in regulators[:3]],
            "capacity": capacity,
            "strain": strain,
            "amplifiedLoad": amplified_load,
            "regulation": regulation,
            "saturnConstraint": saturn_constraint,
            "effectiveLoad": effective_load,
        },
        "environment": {
            "environmentalLoad": environment_load,
            "environmentMode": environment_mode,
        },
        "timing": {
            "timingPressure": timing_pressure,
            "timingMode": timing_mode,
        },
        "flags": {
            "plutoRewrite": pluto_rewrite,
            "saturnShutdown": saturn_shutdown,
        },
        "interpretation": interpretation,
        "forecast": forecast,
        "ephemeris": ephemeris,
        "inputResolved": input_resolved,
        "planetary": planetary,
        "angles": chart.get("angles", {}),
        "houses": chart.get("houses", []),
        "_longitudesDeg": chart.get("_longitudesDeg", {}),
        "debugEcho": {
            "ascNorm": asc_norm,
            "mcNorm": mc_norm,
            "rawRegulation": raw_regulation,
            "regulationCap": regulation_cap,
        }
    }


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.end_headers()

    def _write_json(self, status_code: int, payload: dict):
        self._set_headers(status_code)
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        self._write_json(200, {
            "ok": True,
            "route": "/api/chart_inputs",
            "message": "Lucy.OS API is live. Use POST for natal input or GET as health check.",
            "env": {
                "has_geocode_key": bool(GOOGLE_GEOCODE_API_KEY),
                "has_timezone_key": bool(GOOGLE_TIMEZONE_API_KEY),
            }
        })

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body or "{}")

            mode = str(payload.get("mode", "natal")).strip().lower()

            forecast_diagnostic_enabled = parse_bool(payload.get("forecastDiagnostic", False))

            if mode == "transit":
                if forecast_diagnostic_enabled:
                    requested_date = str(payload.get("transitDate", "")).strip()
                    requested_time = str(payload.get("transitTime", "")).strip()

                    requested_transit = resolve_requested_transit_utc(
                        transit_date=requested_date,
                        transit_time=requested_time,
                        timezone_name=str(payload.get("transitTimezone", "") or "UTC").strip(),
                        utc_offset_hours=None,
                    )

                    chart = compute_transit_inputs(
                        requested_transit["transit_utc_datetime"]
                    )
                    response = build_lucy_response(chart)
                    response["forecastDiagnostic"] = build_forecast_diagnostic(
                        requested_date=requested_date,
                        requested_time=requested_time,
                        transit_chart=chart,
                        transit_response=response,
                    )
                    response["forecastDiagnostic"]["requestedLocalDatetime"] = (
                        requested_transit["requested_local_datetime"]
                    )
                    response["forecastDiagnostic"]["timezoneUsed"] = (
                        requested_transit["timezone_used"]
                    )
                else:
                    chart = compute_transit_inputs()
                    response = build_lucy_response(chart)

                self._write_json(200, response)
                return

            dob = str(payload.get("dob", "")).strip()

            tob = str(
                payload.get("tob")
                or payload.get("tobRaw")
                or payload.get("time")
                or ""
            ).strip()

            ampm = str(
                payload.get("ampm")
                or payload.get("timePeriod")
                or ""
            ).strip().upper()

            location = str(
                payload.get("locationText")
                or payload.get("location")
                or payload.get("birthLocation")
                or ""
            ).strip()

            utc_override_raw = (
                payload.get("utcOffsetOverride", None)
                if payload.get("utcOffsetOverride", None) not in (None, "", "null")
                else payload.get("utcOffset", None)
            )

            utc_override = None
            if utc_override_raw not in (None, "", "null"):
                utc_override = float(utc_override_raw)

            if not dob:
                self._write_json(400, {"error": "dob is required"})
                return

            if not tob:
                self._write_json(400, {"error": "tob / tobRaw / time is required"})
                return

            if not location:
                self._write_json(400, {"error": "locationText / location / birthLocation is required"})
                return

            normalized_tob = normalize_tob_with_ampm(tob, ampm)

            chart = compute_chart_inputs(
                dob=dob,
                tob=normalized_tob,
                utc_offset_hours=utc_override,
                location=location,
            )

            response = build_lucy_response(chart)

            if forecast_diagnostic_enabled:
                requested_date = str(payload.get("transitDate", "")).strip()
                requested_time = str(payload.get("transitTime", "")).strip()
                natal_meta = chart.get("_meta", {}) or {}

                requested_transit = resolve_requested_transit_utc(
                    transit_date=requested_date,
                    transit_time=requested_time,
                    timezone_name=natal_meta.get("timezone_name"),
                    utc_offset_hours=natal_meta.get("utc_offset_at_birth"),
                )

                transit_chart = compute_transit_inputs(
                    requested_transit["transit_utc_datetime"]
                )
                transit_response = build_lucy_response(transit_chart)

                response["forecastDiagnostic"] = build_forecast_diagnostic(
                    requested_date=requested_date,
                    requested_time=requested_time,
                    transit_chart=transit_chart,
                    transit_response=transit_response,
                )
                response["forecastDiagnostic"]["requestedLocalDatetime"] = (
                    requested_transit["requested_local_datetime"]
                )
                response["forecastDiagnostic"]["timezoneUsed"] = (
                    requested_transit["timezone_used"]
                )

            self._write_json(200, response)

        except ValueError as e:
            self._write_json(400, {"error": str(e)})
        except Exception as e:
            self._write_json(500, {"error": str(e)})
