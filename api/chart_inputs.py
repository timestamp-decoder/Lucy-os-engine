from http.server import BaseHTTPRequestHandler
import json
import re
from datetime import datetime, timedelta, timezone

import swisseph as swe

try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

try:
    from timezonefinder import TimezoneFinder
    tf = TimezoneFinder()
except Exception:
    tf = None

try:
    from geopy.geocoders import Nominatim
    geolocator = Nominatim(user_agent="lucy-os-engine")
except Exception:
    geolocator = None


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


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def normalize_tob_with_ampm(tob: str, ampm: str | None = None) -> str:
    """
    Accepts:
      - tob='6:20', ampm='AM'
      - tob='6:20 PM'
      - tob='18:20'
      - tob='06:20'
    Returns HH:MM 24h
    """
    raw = (tob or "").strip().upper()

    m = re.match(r"^\s*(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)?\s*$", raw)
    if not m:
        raise ValueError("Time of birth must look like 6:20 or 6:20 PM")

    hour = int(m.group(1))
    minute = int(m.group(2))
    suffix = m.group(3)

    if ampm:
        suffix = ampm.strip().upper()

    if minute < 0 or minute > 59:
        raise ValueError("Minutes must be 00-59")

    if suffix in ("AM", "PM"):
        if hour < 1 or hour > 12:
            raise ValueError("12-hour time must use hours 1-12")
        if suffix == "AM":
            hour = 0 if hour == 12 else hour
        else:
            hour = 12 if hour == 12 else hour + 12
    else:
        if hour < 0 or hour > 23:
            raise ValueError("24-hour time must use hours 0-23")

    return f"{hour:02d}:{minute:02d}"


def geocode_location(location_text: str):
    """
    Returns:
      {
        lat, lon, display_name, timezone_name
      }
    """
    if not location_text or not geolocator:
        return None

    try:
        loc = geolocator.geocode(location_text, exactly_one=True, timeout=10)
        if not loc:
            return None

        lat = float(loc.latitude)
        lon = float(loc.longitude)

        tz_name = None
        if tf:
            try:
                tz_name = tf.timezone_at(lat=lat, lng=lon)
            except Exception:
                tz_name = None

        return {
            "lat": lat,
            "lon": lon,
            "display_name": loc.address,
            "timezone_name": tz_name,
        }
    except Exception:
        return None


def resolve_timezone_and_utc(dob: str, tob_24: str, location_text: str, utc_offset_override: str | None = None):
    """
    Returns:
      {
        lat, lon, resolved_location, timezone_name,
        local_dt, utc_dt
      }
    """
    y, m, d = [int(x) for x in dob.split("-")]
    hh, mm = [int(x) for x in tob_24.split(":")]

    geo = geocode_location(location_text) if location_text else None

    # Manual UTC offset override (like -6, +9, -05:00)
    if utc_offset_override:
        txt = utc_offset_override.strip()
        m_off = re.match(r"^([+-]?)(\d{1,2})(?::?(\d{2}))?$", txt)
        if not m_off:
            raise ValueError("UTC offset override must look like -6, +9, -05:00")

        sign = -1 if m_off.group(1) == "-" else 1
        oh = int(m_off.group(2))
        om = int(m_off.group(3) or "0")

        if oh > 14 or om > 59:
            raise ValueError("UTC offset override out of range")

        offset = timedelta(hours=oh, minutes=om) * sign
        tzinfo = timezone(offset)

        local_dt = datetime(y, m, d, hh, mm, tzinfo=tzinfo)
        utc_dt = local_dt.astimezone(timezone.utc)

        return {
            "lat": geo["lat"] if geo else None,
            "lon": geo["lon"] if geo else None,
            "resolved_location": geo["display_name"] if geo else location_text,
            "timezone_name": f"UTC{txt}",
            "local_dt": local_dt,
            "utc_dt": utc_dt,
        }

    # Automatic timezone resolution
    if geo and geo.get("timezone_name") and ZoneInfo:
        tz_name = geo["timezone_name"]
        try:
            tzinfo = ZoneInfo(tz_name)
            local_dt = datetime(y, m, d, hh, mm, tzinfo=tzinfo)
            utc_dt = local_dt.astimezone(timezone.utc)

            return {
                "lat": geo["lat"],
                "lon": geo["lon"],
                "resolved_location": geo["display_name"],
                "timezone_name": tz_name,
                "local_dt": local_dt,
                "utc_dt": utc_dt,
            }
        except Exception:
            pass

    # Fallback: treat as UTC if timezone can't be resolved
    local_dt = datetime(y, m, d, hh, mm, tzinfo=timezone.utc)
    utc_dt = local_dt

    return {
        "lat": geo["lat"] if geo else None,
        "lon": geo["lon"] if geo else None,
        "resolved_location": geo["display_name"] if geo else location_text,
        "timezone_name": "UTC (fallback)",
        "local_dt": local_dt,
        "utc_dt": utc_dt,
    }


def julian_day_from_utc(dt_utc: datetime):
    return swe.julday(
        dt_utc.year,
        dt_utc.month,
        dt_utc.day,
        dt_utc.hour + (dt_utc.minute / 60.0) + (dt_utc.second / 3600.0),
    )


def get_real_ephemeris(dt_utc: datetime):
    jd_ut = julian_day_from_utc(dt_utc)

    out = {}
    speeds = {}

    for name, body in PLANETS.items():
        xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
        lon = xx[0]
        speed = xx[3]
        out[name] = normalize_longitude(lon)
        speeds[name] = speed

    return {
        "normalized": out,
        "speeds": speeds,
        "jd_ut": jd_ut,
        "source": "Swiss Ephemeris",
    }


def smooth_planets(raw, previous=None):
    # V2 smoothing layer
    alpha_map = {
        "sun": 0.01,
        "moon": 0.05,
        "mercury": 0.02,
        "venus": 0.02,
        "mars": 0.02,
        "jupiter": 0.01,
        "saturn": 0.01,
        "uranus": 0.01,
        "neptune": 0.01,
        "pluto": 0.01,
    }

    if not previous:
        return raw.copy()

    smoothed = {}
    for k, raw_val in raw.items():
        prev_val = previous.get(k, raw_val)
        a = alpha_map.get(k, 0.02)
        smoothed[k] = (raw_val * a) + (prev_val * (1.0 - a))
    return smoothed


def build_planetary_state(p):
    """
    Core V2.5-ish engine:
    - Sun = capacity baseline
    - Moon/Mars/Jupiter/Uranus/Neptune/Pluto = load pressures
    - Saturn/Venus/Mercury = regulation offsets
    """
    sun = p["sun"]
    moon = p["moon"]
    mercury = p["mercury"]
    venus = p["venus"]
    mars = p["mars"]
    jupiter = p["jupiter"]
    saturn = p["saturn"]
    uranus = p["uranus"]
    neptune = p["neptune"]
    pluto = p["pluto"]

    # Capacity (Sun baseline)
    capacity = clamp(0.15 + (sun * 0.85), 0.10, 1.00)

    # Load drivers
    load_drivers = {
        "Moon": moon * 0.95,
        "Mars": mars * 1.00,
        "Jupiter": jupiter * 1.05,
        "Uranus": uranus * 1.10,
        "Neptune": neptune * 0.90,
        "Pluto": pluto * 1.15,
    }

    amplified_load = sum(load_drivers.values()) / len(load_drivers)
    amplified_load = clamp(amplified_load, 0.0, 1.30)

    # Regulation drivers
    regulation_drivers = {
        "Mercury": mercury * 0.90,
        "Venus": venus * 0.95,
        "Saturn": saturn * 1.00,
    }

    regulation = sum(regulation_drivers.values()) / len(regulation_drivers)
    regulation = clamp(regulation, 0.0, amplified_load)  # regulation cannot exceed load

    # ---- SATURN HARD GOVERNOR (TUNED STRONGER) ----
    # This is the overload clamp, distinct from Saturn's normal contribution inside regulation.
    # It engages when amplified load is above capacity (relative overload).
    overload_delta = max(0.0, amplified_load - capacity)

    saturn_eff = regulation_drivers["Saturn"]

    # Strengthened from previous weaker tuning.
    saturn_constraint = 0.0
    if overload_delta > 0:
        saturn_constraint = min(
            overload_delta * max(saturn_eff, 0.20) * 0.35,
            amplified_load * 0.50
        )

    saturn_constraint = clamp(saturn_constraint, 0.0, amplified_load * 0.50)

    # Effective load after regulation + hard constraint
    effective_load = amplified_load - regulation - saturn_constraint
    effective_load = clamp(effective_load, 0.0, 1.30)

    strain = clamp(effective_load / max(capacity, 0.10), 0.0, 2.0)

    # Mode logic
    if strain < 0.60:
        mode = "Regulated Baseline"
    elif strain < 0.85:
        mode = "Mobilized"
    elif strain < 1.00:
        mode = "Threshold Strain"
    else:
        mode = "Overload"

    # Pluto override (collapse mode if very high pluto and low containment)
    if pluto > 0.92 and regulation < 0.22 and strain > 1.05:
        mode = "Collapse / Rewrite"

    # Load state / containment labels
    if amplified_load < 0.45:
        load_state = "Low"
    elif amplified_load < 0.70:
        load_state = "Moderate"
    else:
        load_state = "Elevated"

    if regulation >= amplified_load * 0.85:
        containment = "Strong"
    elif regulation >= amplified_load * 0.55:
        containment = "Partial"
    else:
        containment = "Weak"

    # Driver rankings
    primary_driver = max(load_drivers, key=load_drivers.get)
    top_regulator = max(regulation_drivers, key=regulation_drivers.get)

    top_loads = sorted(load_drivers.items(), key=lambda x: x[1], reverse=True)
    top_regs = sorted(regulation_drivers.items(), key=lambda x: x[1], reverse=True)

    return {
        "state": {
            "capacity": round(capacity, 4),
            "strain": round(strain, 4),
            "amplifiedLoad": round(amplified_load, 4),
            "regulation": round(regulation, 4),
            "saturnConstraint": round(saturn_constraint, 4),
            "effectiveLoad": round(effective_load, 4),
            "mode": mode,
            "loadState": load_state,
            "containment": containment,
        },
        "telemetry": {
            "primaryDriver": primary_driver,
            "topRegulator": top_regulator,
            "topDrivers": [f"{k} ({round(v, 2)})" for k, v in top_loads[:3]],
            "topRegulators": [f"{k} ({round(v, 2)})" for k, v in top_regs[:3]],
        },
        "raw": {
            "loadDrivers": {k: round(v, 4) for k, v in load_drivers.items()},
            "regulationDrivers": {k: round(v, 4) for k, v in regulation_drivers.items()},
            "overloadDelta": round(overload_delta, 4),
            "saturnEff": round(saturn_eff, 4),
        },
    }


def build_forecast_snapshot(current_state):
    """
    Prototype placeholder forecast layer.
    Right now it intentionally mirrors the natal-state proxy.
    """
    s = current_state["state"]

    def summarize(label):
        if s["mode"] == "Regulated Baseline":
            title = "Regulated"
        elif s["mode"] == "Mobilized":
            title = "Mobilized"
        elif s["mode"] == "Threshold Strain":
            title = "Threshold"
        elif s["mode"] == "Overload":
            title = "Overloaded"
        else:
            title = "Rewrite"

        if label == "now":
            detail = f"{s['mode']}. Capacity {s['capacity']:.2f}, effective load {s['effectiveLoad']:.2f}, strain {s['strain']:.2f}."
        elif label == "plus6":
            detail = "Short-horizon forecast is currently using the same natal-state proxy layer."
        else:
            detail = "Longer-horizon forecast is currently using the same natal-state proxy layer."

        return {
            "title": title,
            "detail": detail,
        }

    return {
        "now": summarize("now"),
        "plus6": summarize("plus6"),
        "plus24": summarize("plus24"),
    }


class handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self):
        self._send(200, {"ok": True})

    def do_GET(self):
        if self.path.startswith("/api/health"):
            self._send(200, {
                "ok": True,
                "service": "lucy-os-engine",
                "build_id": "v2.5-saturn-tuned",
            })
            return

        self._send(200, {
            "ok": True,
            "service": "lucy-os-engine",
            "message": "POST natal inputs to this endpoint.",
            "build_id": "v2.5-saturn-tuned",
        })

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            body = json.loads(raw_body or "{}")

            dob_in = (body.get("dob") or "").strip()
            tob_in = (body.get("tob") or "").strip()
            ampm_in = (body.get("ampm") or "").strip().upper() or None
            location_in = (body.get("location") or "").strip()
            utc_offset_override = (body.get("utcOffsetOverride") or "").strip() or None

            if not dob_in:
                raise ValueError("dob is required (YYYY-MM-DD or MM/DD/YYYY)")
            if not tob_in:
                raise ValueError("tob is required")
            if not location_in:
                raise ValueError("location is required")

            # Normalize DOB
            if re.match(r"^\d{4}-\d{2}-\d{2}$", dob_in):
                dob = dob_in
            else:
                m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", dob_in)
                if not m:
                    raise ValueError("dob must be YYYY-MM-DD or MM/DD/YYYY")
                mm, dd, yyyy = m.groups()
                dob = f"{int(yyyy):04d}-{int(mm):02d}-{int(dd):02d}"

            tob_24 = normalize_tob_with_ampm(tob_in, ampm_in)

            resolved = resolve_timezone_and_utc(
                dob=dob,
                tob_24=tob_24,
                location_text=location_in,
                utc_offset_override=utc_offset_override,
            )

            ephem = get_real_ephemeris(resolved["utc_dt"])
            raw_planets = ephem["normalized"]

            # For now, use raw as smoothed baseline on single-shot requests
            smoothed = smooth_planets(raw_planets, previous=None)

            engine = build_planetary_state(smoothed)
            forecast = build_forecast_snapshot(engine)

            response = {
                "ok": True,
                "build_id": "v2.5-saturn-tuned",
                "inputResolved": {
                    "dob": dob,
                    "tob24": tob_24,
                    "resolvedLocation": resolved["resolved_location"],
                    "timezoneName": resolved["timezone_name"],
                    "localTimeResolved": resolved["local_dt"].isoformat(),
                    "utcDatetime": resolved["utc_dt"].isoformat(),
                    "lat": resolved["lat"],
                    "lon": resolved["lon"],
                },
                "ephemeris": {
                    "source": ephem["source"],
                    "jdUt": round(ephem["jd_ut"], 6),
                    "raw": {k: round(v, 6) for k, v in raw_planets.items()},
                    "smoothed": {k: round(v, 6) for k, v in smoothed.items()},
                },
                "state": engine["state"],
                "telemetry": engine["telemetry"],
                "raw": engine["raw"],
                "forecast": forecast,
            }

            self._send(200, response)

        except Exception as e:
            self._send(400, {
                "ok": False,
                "error": str(e),
                "build_id": "v2.5-saturn-tuned",
            })
