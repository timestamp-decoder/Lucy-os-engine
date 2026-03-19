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

PLANET_BLEND_WEIGHTS = {
    "sun": {"natal": 0.90, "transit": 0.10},
    "moon": {"natal": 0.35, "transit": 0.65},
    "mercury": {"natal": 0.55, "transit": 0.45},
    "venus": {"natal": 0.50, "transit": 0.50},
    "mars": {"natal": 0.40, "transit": 0.60},
    "jupiter": {"natal": 0.60, "transit": 0.40},
    "saturn": {"natal": 0.65, "transit": 0.35},
    "uranus": {"natal": 0.45, "transit": 0.55},
    "neptune": {"natal": 0.50, "transit": 0.50},
    "pluto": {"natal": 0.70, "transit": 0.30},
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


def extract_planetary_and_longitudes(jd_ut: float) -> tuple[dict, dict]:
    planetary = {}
    longitudes_deg = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = float(xx[0] % 360.0)
        longitudes_deg[name] = lon
        planetary[name] = normalize_longitude(lon)

    return planetary, longitudes_deg


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

    planetary, longitudes_deg = extract_planetary_and_longitudes(jd_ut)

    angles, houses = compute_angles_and_houses(
        jd_ut,
        resolved["lat"],
        resolved["lon"],
    )

    result = {**planetary}
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


def compute_transit_inputs_at(target_utc: datetime):
    if target_utc.tzinfo is None:
        target_utc = target_utc.replace(tzinfo=timezone.utc)
    else:
        target_utc = target_utc.astimezone(timezone.utc)

    jd_ut = to_julian_day_utc(target_utc)
    planetary, longitudes_deg = extract_planetary_and_longitudes(jd_ut)

    result = {**planetary}
    result["_longitudesDeg"] = longitudes_deg
    result["angles"] = {}
    result["houses"] = []

    result["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "transit",
        "utc_datetime": target_utc.isoformat(),
        "jd_ut": round(jd_ut, 6),
    }

    return result


def compute_transit_inputs():
    return compute_transit_inputs_at(datetime.now(timezone.utc))


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


def forecast_state_label(strain: float) -> str:
    if strain >= 1.0:
        return "Overload"
    if strain >= 0.85:
        return "Threshold"
    if strain >= 0.60:
        return "Mobilized"
    return "Regulated"


def build_planetary_view(chart: dict) -> dict:
    angles = chart.get("angles", {}) or {}
    asc_deg = float(angles.get("asc", 0.0))
    mc_deg = float(angles.get("mc", 0.0))

    return {
        "sun": float(chart.get("sun", 0.0)),
        "moon": float(chart.get("moon", 0.0)),
        "mercury": float(chart.get("mercury", 0.0)),
        "venus": float(chart.get("venus", 0.0)),
        "mars": float(chart.get("mars", 0.0)),
        "jupiter": float(chart.get("jupiter", 0.0)),
        "saturn": float(chart.get("saturn", 0.0)),
        "uranus": float(chart.get("uranus", 0.0)),
        "neptune": float(chart.get("neptune", 0.0)),
        "pluto": float(chart.get("pluto", 0.0)),
        "asc": normalize_longitude(asc_deg),
        "mc": normalize_longitude(mc_deg),
    }


def blend_charts(natal: dict, transit: dict) -> dict:
    blended = {}

    for planet in PLANETS.keys():
        weights = PLANET_BLEND_WEIGHTS[planet]
        natal_val = float(natal.get(planet, 0.0))
        transit_val = float(transit.get(planet, 0.0))
        blended[planet] = (
            natal_val * weights["natal"] +
            transit_val * weights["transit"]
        )

    blended["angles"] = natal.get("angles", {}) or {}
    blended["houses"] = natal.get("houses", []) or []
    blended["_longitudesDeg"] = natal.get("_longitudesDeg", {}) or {}

    natal_meta = natal.get("_meta", {}) or {}
    transit_meta = transit.get("_meta", {}) or {}

    blended["_meta"] = {
        "source": "Swiss Ephemeris",
        "mode": "blended",
        "utc_datetime": transit_meta.get("utc_datetime"),
        "jd_ut": transit_meta.get("jd_ut"),
        "natal_utc_datetime": natal_meta.get("utc_datetime"),
        "transit_utc_datetime": transit_meta.get("utc_datetime"),
        "location": natal_meta.get("location"),
        "location_resolved": natal_meta.get("location_resolved"),
        "utc_offset": natal_meta.get("utc_offset"),
        "utc_offset_at_birth": natal_meta.get("utc_offset_at_birth"),
        "timezone_name": natal_meta.get("timezone_name"),
        "timezone_label": natal_meta.get("timezone_label"),
        "lat": natal_meta.get("lat"),
        "lon": natal_meta.get("lon"),
        "local_time_resolved": natal_meta.get("local_time_resolved"),
        "note": "Blended natal baseline + transit weather."
    }

    return blended


def compute_engine_metrics(chart: dict) -> dict:
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

    capacity = (
        sun * 0.70 +
        saturn * 0.20 +
        jupiter * 0.10
    )

    load = (
        moon * 0.30 +
        mars * 0.20 +
        uranus * 0.15 +
        neptune * 0.15 +
        pluto * 0.10 +
        jupiter * 0.10
    )

    raw_regulation = (
        saturn * 0.45 +
        venus * 0.30 +
        mercury * 0.25
    )

    regulation_cap = load * 0.90
    regulation = min(raw_regulation, regulation_cap)

    overload_delta = max(load - capacity, 0.0)
    saturn_factor = 0.20 + (saturn * 0.15)
    saturn_constraint = min(
        overload_delta * saturn_factor,
        load * 0.25
    )

    effective_load = max(load - regulation - saturn_constraint, 0.0)
    strain = effective_load / max(capacity, 0.1)

    mode = infer_mode(strain)

    load_drivers = [
        ("Moon", moon),
        ("Mars", mars),
        ("Jupiter", jupiter),
        ("Uranus", uranus),
        ("Neptune", neptune),
        ("Pluto", pluto),
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

    return {
        "state": {
            "capacity": capacity,
            "strain": strain,
            "amplifiedLoad": load,
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
            "amplifiedLoad": load,
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
        "debugEcho": {
            "ascNorm": asc_norm,
            "mcNorm": mc_norm,
            "rawRegulation": raw_regulation,
            "regulationCap": regulation_cap,
            "saturnFactor": saturn_factor,
        }
    }


def build_forecast_entry(label: str, blended_chart: dict) -> dict:
    metrics = compute_engine_metrics(blended_chart)
    state = metrics["state"]
    telemetry = metrics["telemetry"]
    interpretation = metrics["interpretation"]

    return {
        "label": label,
        "state": forecast_state_label(float(state["strain"])),
        "mode": state["mode"],
        "strain": state["strain"],
        "capacity": state["capacity"],
        "effectiveLoad": state["effectiveLoad"],
        "primaryDriver": telemetry["primaryDriver"],
        "topRegulator": telemetry["topRegulator"],
        "text": interpretation["stateSummary"],
    }


def build_lucy_response(natal: dict, transit_now: dict) -> dict:
    blended_now = blend_charts(natal, transit_now)
    now_metrics = compute_engine_metrics(blended_now)

    now_utc = datetime.now(timezone.utc)

    transit_plus6 = compute_transit_inputs_at(now_utc + timedelta(hours=6))
    transit_plus24 = compute_transit_inputs_at(now_utc + timedelta(hours=24))
    transit_plus72 = compute_transit_inputs_at(now_utc + timedelta(hours=72))
    transit_plus168 = compute_transit_inputs_at(now_utc + timedelta(hours=168))

    blended_plus6 = blend_charts(natal, transit_plus6)
    blended_plus24 = blend_charts(natal, transit_plus24)
    blended_plus72 = blend_charts(natal, transit_plus72)
    blended_plus168 = blend_charts(natal, transit_plus168)

    forecast = {
        "now": build_forecast_entry("Now", blended_now),
        "plus6": build_forecast_entry("+6h", blended_plus6),
        "plus24": build_forecast_entry("+24h", blended_plus24),
        "plus72": build_forecast_entry("+72h", blended_plus72),
        "plus168": build_forecast_entry("+168h", blended_plus168),
    }

    natal_meta = natal.get("_meta", {}) or {}
    transit_meta = transit_now.get("_meta", {}) or {}
    blended_meta = blended_now.get("_meta", {}) or {}

    input_resolved = {
        "resolvedLocation": natal_meta.get("location_resolved"),
        "locationResolved": natal_meta.get("location_resolved"),
        "lat": natal_meta.get("lat"),
        "lon": natal_meta.get("lon"),
        "utcOffsetAtBirth": natal_meta.get("utc_offset_at_birth"),
        "utc_offset_at_birth": natal_meta.get("utc_offset_at_birth"),
        "timezoneName": natal_meta.get("timezone_name"),
        "timezone_name": natal_meta.get("timezone_name"),
        "localTimeResolved": natal_meta.get("local_time_resolved"),
        "local_time_resolved": natal_meta.get("local_time_resolved"),
        "utcDatetime": natal_meta.get("utc_datetime"),
        "utc_datetime": natal_meta.get("utc_datetime"),
    }

    ephemeris = {
        "source": "Swiss Ephemeris",
        "mode": "blended",
        "utcDatetime": blended_meta.get("utc_datetime"),
        "utc_datetime": blended_meta.get("utc_datetime"),
        "jdUt": blended_meta.get("jd_ut"),
        "jd_ut": blended_meta.get("jd_ut"),
        "natalUtcDatetime": natal_meta.get("utc_datetime"),
        "natal_utc_datetime": natal_meta.get("utc_datetime"),
        "transitUtcDatetime": transit_meta.get("utc_datetime"),
        "transit_utc_datetime": transit_meta.get("utc_datetime"),
    }

    baseline = {
        "capacityBias": (
            float(natal.get("sun", 0.0)) * 0.70 +
            float(natal.get("saturn", 0.0)) * 0.20 +
            float(natal.get("jupiter", 0.0)) * 0.10
        ),
        "summary": "Natal chart provides the stable architecture layer.",
    }

    transit_summary = {
        "summary": "Current transit chart provides the moving weather layer.",
        "utcDatetime": transit_meta.get("utc_datetime"),
        "utc_datetime": transit_meta.get("utc_datetime"),
    }

    planetary = {
        "natal": build_planetary_view(natal),
        "transit": build_planetary_view(transit_now),
        "blended": build_planetary_view(blended_now),
    }

    return {
        "baseline": baseline,
        "transitNow": transit_summary,
        "state": now_metrics["state"],
        "telemetry": now_metrics["telemetry"],
        "environment": now_metrics["environment"],
        "timing": now_metrics["timing"],
        "flags": now_metrics["flags"],
        "interpretation": now_metrics["interpretation"],
        "forecast": forecast,
        "ephemeris": ephemeris,
        "inputResolved": input_resolved,
        "planetary": planetary["blended"],
        "planetaryLayers": planetary,
        "angles": natal.get("angles", {}),
        "houses": natal.get("houses", []),
        "_longitudesDeg": natal.get("_longitudesDeg", {}),
        "debugEcho": {
            **now_metrics["debugEcho"],
            "blendWeights": PLANET_BLEND_WEIGHTS,
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

            if mode == "transit":
                transit = compute_transit_inputs()
                self._write_json(200, transit)
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

            natal = compute_chart_inputs(
                dob=dob,
                tob=normalized_tob,
                utc_offset_hours=utc_override,
                location=location,
            )

            transit_now = compute_transit_inputs()
            response = build_lucy_response(natal, transit_now)
            self._write_json(200, response)

        except ValueError as e:
            self._write_json(400, {"error": str(e)})
        except Exception as e:
            self._write_json(500, {"error": str(e)})
