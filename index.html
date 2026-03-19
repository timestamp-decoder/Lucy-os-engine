<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lucy.OS</title>
  <style>
    :root{
      --bg:#09142f;
      --panel:#0f1b38;
      --panel2:#132347;
      --line:#2a3c69;
      --lineSoft:rgba(255,255,255,.06);
      --text:#f4f7ff;
      --muted:#aab7d6;
      --muted2:#7f8fb8;
      --blue:#67c1ff;
      --red:#ff6666;
      --green:#67d26f;
      --violet:#b06cff;
      --gold:#d8b84c;
    }

    *{box-sizing:border-box}

    body{
      margin:0;
      font-family:Arial, sans-serif;
      background:
        radial-gradient(circle at 50% 0%, rgba(103,193,255,.06), transparent 32%),
        linear-gradient(180deg,#071126 0%, #09142f 100%);
      color:var(--text);
    }

    .wrap{
      max-width:1380px;
      margin:0 auto;
      padding:24px;
    }

    .hero{
      position:relative;
      text-align:center;
      margin-bottom:22px;
      padding:18px 18px 14px;
      overflow:hidden;
    }

    .heroGlow{
      position:absolute;
      inset:0;
      pointer-events:none;
      opacity:.95;
      transition:background .35s ease;
      background:
        radial-gradient(circle at 50% 28%, rgba(103,193,255,.10), transparent 42%);
    }

    .hero h1{
      position:relative;
      margin:0;
      font-size:40px;
      letter-spacing:.4px;
      z-index:1;
    }

    .hero p{
      position:relative;
      margin:8px 0 0;
      color:var(--muted);
      font-size:14px;
      z-index:1;
    }

    .grid{
      display:grid;
      grid-template-columns:360px 1fr;
      gap:20px;
      align-items:start;
    }

    .panel{
      background:linear-gradient(180deg,var(--panel),var(--panel2));
      border:1px solid var(--line);
      border-radius:18px;
      padding:18px;
      box-shadow:0 10px 30px rgba(0,0,0,.20);
    }

    .panel h2{
      margin:0 0 12px;
      font-size:18px;
    }

    label{
      display:block;
      font-size:12px;
      color:var(--muted);
      margin:10px 0 6px;
    }

    input, select, button{
      width:100%;
      border-radius:10px;
      border:1px solid var(--line);
      background:#0b1734;
      color:var(--text);
      padding:12px;
      font-size:14px;
    }

    input::placeholder{
      color:var(--muted2);
    }

    .row2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    button{
      margin-top:14px;
      background:linear-gradient(180deg,#1d5cff,#3f86ff);
      border:none;
      cursor:pointer;
      font-weight:700;
    }

    button:hover{
      filter:brightness(1.08);
    }

    button:disabled{
      opacity:.72;
      cursor:wait;
    }

    .tiny{
      font-size:11px;
      color:var(--muted);
      margin-top:10px;
      line-height:1.45;
    }

    .leftStack{
      display:grid;
      gap:12px;
      margin-top:14px;
    }

    .statusBlock{
      padding:14px;
      border:1px solid var(--line);
      border-radius:14px;
      background:rgba(255,255,255,.02);
      font-size:12px;
      line-height:1.55;
      color:var(--muted);
    }

    .statusBlock strong{
      color:var(--text);
      display:block;
      margin-bottom:6px;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:.08em;
    }

    .ok{
      color:var(--green);
      font-weight:700;
    }

    .err{
      color:#ff9c9c;
      font-weight:700;
    }

    .heroStats{
      display:grid;
      grid-template-columns:1fr 1fr 1fr;
      gap:14px;
      margin-bottom:14px;
    }

    .stat{
      background:rgba(255,255,255,.025);
      border:1px solid var(--line);
      border-radius:16px;
      padding:16px;
      min-height:138px;
    }

    .stat .label{
      font-size:11px;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.08em;
    }

    .big{
      font-size:30px;
      font-weight:800;
      margin-top:8px;
      line-height:1.05;
    }

    .sub{
      font-size:12px;
      color:var(--muted);
      margin-top:8px;
      line-height:1.4;
    }

    .meter{
      margin-top:12px;
      height:10px;
      width:100%;
      border-radius:999px;
      background:#081126;
      border:1px solid var(--line);
      overflow:hidden;
    }

    .meter > span{
      display:block;
      height:100%;
      width:0%;
      transition:width .35s ease;
    }

    .meter-capacity > span{
      background:linear-gradient(90deg,#67c1ff,#a1d8ff,#d8b84c);
    }

    .meter-strain > span{
      background:linear-gradient(90deg,#67d26f,#d8b84c,#ff6666);
    }

    .stateBadge{
      display:inline-block;
      margin-top:12px;
      padding:6px 10px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      background:rgba(103,193,255,.10);
      color:var(--blue);
      border:1px solid rgba(103,193,255,.18);
    }

    .midRow{
      display:grid;
      grid-template-columns:1.15fr .85fr;
      gap:14px;
      margin-bottom:14px;
    }

    .microCard{
      background:rgba(255,255,255,.025);
      border:1px solid var(--line);
      border-radius:16px;
      padding:14px 16px;
      min-height:126px;
    }

    .microHeader{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-bottom:8px;
    }

    .microTitle{
      font-size:11px;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.08em;
      font-weight:700;
    }

    .verifiedBadge{
      display:inline-flex;
      align-items:center;
      padding:4px 8px;
      border-radius:999px;
      font-size:10px;
      font-weight:700;
      color:var(--teal, #6fe0d3);
      background:rgba(103,193,255,.08);
      border:1px solid rgba(103,193,255,.14);
      white-space:nowrap;
    }

    .forecastBig{
      font-size:18px;
      font-weight:800;
      margin:2px 0 6px;
    }

    .forecastSub{
      font-size:12px;
      color:var(--muted);
      line-height:1.45;
    }

    .whyCard{
      margin-bottom:16px;
      background:rgba(255,255,255,.025);
      border:1px solid var(--line);
      border-radius:16px;
      padding:18px;
    }

    .whyTitle{
      font-size:11px;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.08em;
      font-weight:700;
      margin-bottom:8px;
    }

    .whyText{
      font-size:13px;
      color:var(--text);
      line-height:1.72;
    }

    .sectionTitle{
      margin:0 0 10px;
      font-size:11px;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.08em;
      font-weight:700;
    }

    .summaryTitle{
      margin:0 0 10px;
      font-size:14px;
      color:var(--text);
      text-transform:uppercase;
      letter-spacing:.08em;
      font-weight:800;
    }

    .table{
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }

    .table th,.table td{
      padding:11px 8px;
      border-bottom:1px solid var(--lineSoft);
      text-align:left;
      vertical-align:middle;
    }

    .table th{
      color:var(--muted);
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:.08em;
    }

    .badge{
      display:inline-block;
      padding:5px 8px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      border:1px solid transparent;
    }

    .b-blue{background:rgba(103,193,255,.12); color:var(--blue); border-color:rgba(103,193,255,.22)}
    .b-red{background:rgba(255,102,102,.12); color:var(--red); border-color:rgba(255,102,102,.22)}
    .b-green{background:rgba(103,210,111,.12); color:var(--green); border-color:rgba(103,210,111,.22)}
    .b-gold{background:rgba(216,184,76,.12); color:var(--gold); border-color:rgba(216,184,76,.22)}
    .b-violet{background:rgba(176,108,255,.08); color:#cab1ff; border-color:rgba(176,108,255,.14)}

    .softMetric td{
      opacity:.70;
    }

    .softMetric .badge{
      opacity:.82;
    }

    .bottomGrid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:14px;
      margin-top:14px;
    }

    .miniPanel{
      background:rgba(255,255,255,.025);
      border:1px solid var(--line);
      border-radius:16px;
      padding:16px;
    }

    .metaRow{
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
      margin-top:16px;
    }

    .metaPill{
      display:inline-flex;
      align-items:center;
      padding:6px 10px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.03);
      color:var(--muted);
    }

    .metaPill.field{
      color:#c27cff;
      background:rgba(176,108,255,.10);
      border-color:rgba(176,108,255,.16);
    }

    .metaPill.forecast{
      color:#6fc0ff;
      background:rgba(103,193,255,.10);
      border-color:rgba(103,193,255,.16);
    }

    @media (max-width: 1120px){
      .grid{grid-template-columns:1fr}
      .heroStats{grid-template-columns:1fr}
      .midRow{grid-template-columns:1fr}
      .bottomGrid{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="heroGlow" id="heroGlow"></div>
      <h1>Lucy.OS</h1>
      <p>Astrology-informed system weather</p>
    </div>

    <div class="grid">
      <div class="panel">
        <h2>Inputs</h2>

        <label>Date of Birth</label>
        <input id="dob" type="date" />

        <div class="row2">
          <div>
            <label>Time of Birth</label>
            <input id="tob" type="text" placeholder="6:20" />
          </div>
          <div>
            <label>AM / PM</label>
            <select id="ampm">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>

        <label>Birth Location</label>
        <input id="location" type="text" placeholder="Cuero, TX" />

        <button id="calcBtn">Calculate</button>

        <div class="tiny">
          Birth location resolves timezone, angles, and houses for accurate chart input.
        </div>

        <div class="leftStack">
          <div class="statusBlock">
            <strong>API Status</strong>
            <div id="apiStatus">Waiting for calculation.</div>
          </div>

          <div class="statusBlock">
            <strong>Chart Input</strong>
            <div id="resolvedInput">No resolved birth data yet.</div>
          </div>

          <div class="statusBlock">
            <strong>Chart Debug</strong>
            <div id="chartDebug">Awaiting first chart load.</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="heroStats">
          <div class="stat">
            <div class="label">Capacity</div>
            <div class="big" id="capacityScore">0.00</div>
            <div class="sub" id="capacityLabel">Available system bandwidth</div>
            <div class="meter meter-capacity"><span id="capacityBar"></span></div>
          </div>

          <div class="stat">
            <div class="label">Strain</div>
            <div class="big" id="strainScore">0.00</div>
            <div class="sub" id="strainLabel">Current active load</div>
            <div class="meter meter-strain"><span id="strainBar"></span></div>
          </div>

          <div class="stat">
            <div class="label">State</div>
            <div class="big" id="stateText">Regulated</div>
            <div class="sub" id="stateLabel">Stable with manageable load</div>
            <div class="stateBadge" id="stateBadge">Regulated</div>
          </div>
        </div>

        <div class="midRow">
          <div class="microCard">
            <div class="microHeader">
              <div class="microTitle">Forecast</div>
            </div>
            <div class="forecastBig" id="forecastTitle">Forecast: —</div>
            <div class="forecastSub" id="forecastText">
              Waiting for forecast.
            </div>
          </div>

          <div class="microCard">
            <div class="microHeader">
              <div class="microTitle">Sky Data</div>
              <div class="verifiedBadge" id="skyVerified">Verified</div>
            </div>
            <div class="forecastBig" id="skyDataTitle">Chart Loaded</div>
            <div class="forecastSub" id="skyDataText">
              Waiting for resolved birth data and ephemeris source confirmation.
            </div>
          </div>
        </div>

        <div class="whyCard">
          <div class="whyTitle">Why</div>
          <div class="whyText" id="whyText">Waiting for chart interpretation.</div>
        </div>

        <div class="summaryTitle">System Summary</div>
        <table class="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Band</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Capacity</td>
              <td id="capVal">0.00</td>
              <td><span class="badge b-gold">Capacity</span></td>
            </tr>
            <tr>
              <td>Amplified Load</td>
              <td id="loadVal">0.00</td>
              <td><span class="badge b-red">Load</span></td>
            </tr>
            <tr>
              <td>Regulation</td>
              <td id="regVal">0.00</td>
              <td><span class="badge b-green">Regulation</span></td>
            </tr>
            <tr>
              <td>Effective Load</td>
              <td id="effVal">0.00</td>
              <td><span class="badge b-blue">Net</span></td>
            </tr>
            <tr class="softMetric">
              <td>Stability Index</td>
              <td id="stabilityVal">0.00</td>
              <td><span class="badge b-violet">Derived</span></td>
            </tr>
          </tbody>
        </table>

        <div class="bottomGrid">
          <div class="miniPanel">
            <div class="summaryTitle" style="font-size:13px; margin-bottom:10px;">Active Drivers</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Strength</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Primary Driver</td>
                  <td id="primaryDriver">—</td>
                </tr>
                <tr>
                  <td>Volatility (Uranus)</td>
                  <td id="volatilityVal">0.00</td>
                </tr>
                <tr>
                  <td>Fog (Neptune)</td>
                  <td id="fogVal">0.00</td>
                </tr>
                <tr>
                  <td>Activation (Mars)</td>
                  <td id="activationVal">0.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="miniPanel">
            <div class="summaryTitle" style="font-size:13px; margin-bottom:10px;">Stabilizers</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Regulator</th>
                  <th>Strength</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Saturn</td>
                  <td id="saturnVal">0.00</td>
                </tr>
                <tr>
                  <td>Venus</td>
                  <td id="venusVal">0.00</td>
                </tr>
                <tr>
                  <td>Mercury</td>
                  <td id="mercuryVal">0.00</td>
                </tr>
                <tr>
                  <td>Current State</td>
                  <td id="stateCondition">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="metaRow">
          <span class="metaPill field" id="envBand">Field: —</span>
          <span class="metaPill forecast" id="forecastBand">Forecast: —</span>
        </div>

        <div class="tiny">
          Forecast now uses the blended baseline + transit weather engine.
        </div>
      </div>
    </div>
  </div>

  <script>
    const API_URL = "/api/chart_inputs";

    function clamp(v, min, max){
      return Math.max(min, Math.min(max, v));
    }

    function safeNum(v, fallback = 0){
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }

    function fmt(v){
      return safeNum(v).toFixed(2);
    }

    function setText(id, value){
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    function setBar(id, value, max = 1.2){
      const el = document.getElementById(id);
      if (!el) return;
      const pct = clamp((safeNum(value) / max) * 100, 0, 100);
      el.style.width = pct + "%";
    }

    function setHeroGlow(modeText, fog, volatility){
      const el = document.getElementById("heroGlow");
      if (!el) return;

      const text = String(modeText || "").toLowerCase();
      let glow = "radial-gradient(circle at 50% 28%, rgba(103,193,255,.10), transparent 42%)";

      if (text.includes("overload")) {
        glow = "radial-gradient(circle at 50% 28%, rgba(255,102,102,.14), transparent 42%)";
      } else if (text.includes("threshold") || text.includes("strain")) {
        glow = "radial-gradient(circle at 50% 28%, rgba(216,184,76,.14), transparent 42%)";
      } else if (text.includes("mobilized") || text.includes("active")) {
        glow = "radial-gradient(circle at 50% 28%, rgba(103,193,255,.08), rgba(216,184,76,.10), transparent 48%)";
      }

      if (safeNum(fog) > 0.72) {
        glow = "radial-gradient(circle at 50% 28%, rgba(176,108,255,.12), rgba(103,193,255,.05), transparent 48%)";
      }

      if (safeNum(volatility) > 0.75 && !text.includes("overload")) {
        glow = "radial-gradient(circle at 50% 28%, rgba(103,193,255,.12), rgba(176,108,255,.05), transparent 48%)";
      }

      el.style.background = glow;
    }

    function stateLabelFromMode(modeText){
      const text = String(modeText || "").toLowerCase();
      if (text.includes("overload")) return "Overloaded";
      if (text.includes("threshold") || text.includes("strain")) return "Threshold";
      if (text.includes("mobilized") || text.includes("active")) return "Mobilized";
      return "Regulated";
    }

    function stateHelperFromMode(modeText){
      const text = String(modeText || "").toLowerCase();
      if (text.includes("overload")) return "System is carrying more than it can comfortably regulate";
      if (text.includes("threshold") || text.includes("strain")) return "Load is approaching capacity";
      if (text.includes("mobilized") || text.includes("active")) return "Elevated activity, still functioning";
      return "Stable with manageable load";
    }

    function strainLabelFromStrain(strain){
      const s = safeNum(strain);
      if (s < 0.60) return "Current active load";
      if (s < 0.85) return "Moderate active load";
      if (s < 1.00) return "High strain";
      return "Critical load";
    }

    function capacityLabelFromValue(){
      return "Available system bandwidth";
    }

    function envBandFromMode(envMode){
      const text = String(envMode || "").trim();
      return `Field: ${text || "—"}`;
    }

    function forecastBandFromState(forecastState){
      const text = String(forecastState || "").trim();
      return `Forecast: ${text || "—"}`;
    }

    function driverValueFromTaggedList(list, planetName){
      if (!Array.isArray(list)) return null;
      const hit = list.find(item => String(item).toLowerCase().startsWith(String(planetName).toLowerCase()));
      if (!hit) return null;
      const match = String(hit).match(/\(([^)]+)\)/);
      return match ? safeNum(match[1]) : null;
    }

    function primaryDriverName(data){
      return data?.telemetry?.primaryDriver || "—";
    }

    function buildWhyText({ modeText, primaryDriver, fog, activation, mercury, saturn, venus }) {
      const parts = [];

      if (safeNum(fog) >= 0.65) parts.push("Neptune is increasing diffusion");
      if (safeNum(activation) >= 0.65) parts.push("Mars is raising activation");
      if (safeNum(mercury) >= 0.65) parts.push("Mercury is improving signal clarity");
      if (safeNum(saturn) >= 0.65) parts.push("Saturn is adding constraint");
      if (safeNum(venus) >= 0.65) parts.push("Venus is supporting regulation");

      let front = parts.slice(0, 3).join(" + ");
      if (!front) {
        front = `${primaryDriver || "Current drivers"} are within stable operating range`;
      }

      return `${front}. Current mode is ${String(modeText || "Regulated").toLowerCase()}.`;
    }

    function buildForecastText(forecast){
      const now = forecast?.now || {};
      const plus24 = forecast?.plus24 || {};
      const plus72 = forecast?.plus72 || {};
      const plus168 = forecast?.plus168 || {};

      const parts = [];

      if (now.state) parts.push(`Now: ${now.state}`);
      if (plus24.state) parts.push(`24h: ${plus24.state}`);
      if (plus72.state) parts.push(`72h: ${plus72.state}`);
      if (plus168.state) parts.push(`7d: ${plus168.state}`);

      const trendText = parts.join(" • ");
      const driverText = now.primaryDriver ? ` Main driver: ${now.primaryDriver}.` : "";

      return trendText ? `${trendText}.${driverText}` : "Forecast unavailable.";
    }

    function buildSkyText({ ephemeris, inputResolved, transitNow, baseline }){
      const resolvedLocation =
        inputResolved.resolvedLocation ||
        inputResolved.locationResolved ||
        "—";

      const resolvedTime =
        inputResolved.localTimeResolved ||
        inputResolved.local_time_resolved ||
        "—";

      const timezoneName =
        inputResolved.timezoneName ||
        inputResolved.timezone_name ||
        "—";

      const natalUtc =
        ephemeris.natalUtcDatetime ||
        ephemeris.natal_utc_datetime ||
        inputResolved.utcDatetime ||
        inputResolved.utc_datetime ||
        "—";

      const transitUtc =
        ephemeris.transitUtcDatetime ||
        ephemeris.transit_utc_datetime ||
        transitNow?.utcDatetime ||
        transitNow?.utc_datetime ||
        "—";

      const baselineText = baseline?.summary || "Natal baseline active.";
      return `Local birth: ${resolvedTime} • Natal UTC: ${natalUtc} • Transit UTC: ${transitUtc} • ${resolvedLocation} • ${timezoneName} • ${baselineText}`;
    }

    function updateUI(data){
      console.log("Lucy.OS response:", data);

      const state = data?.state || {};
      const telemetry = data?.telemetry || {};
      const environment = data?.environment || {};
      const forecast = data?.forecast || {};
      const planetary = data?.planetary || {};
      const planetaryLayers = data?.planetaryLayers || {};
      const inputResolved = data?.inputResolved || {};
      const ephemeris = data?.ephemeris || {};
      const baseline = data?.baseline || {};
      const transitNow = data?.transitNow || {};

      const capacity = safeNum(state.capacity);
      const strain = safeNum(state.strain);
      const load = safeNum(state.amplifiedLoad);
      const regulation = safeNum(state.regulation);
      const effective = safeNum(state.effectiveLoad);
      const modeText = state.mode || "Regulated";

      const effectiveDisplay = Math.min(effective, Math.max(capacity * 1.15, 1.10));

      const blendedPlanetary = Object.keys(planetary).length
        ? planetary
        : (planetaryLayers?.blended || {});

      const volatility = safeNum(
        blendedPlanetary.uranus,
        driverValueFromTaggedList(telemetry.topDrivers, "Uranus")
      );
      const fog = safeNum(
        blendedPlanetary.neptune,
        driverValueFromTaggedList(telemetry.topDrivers, "Neptune")
      );
      const activation = safeNum(
        blendedPlanetary.mars,
        driverValueFromTaggedList(telemetry.topDrivers, "Mars")
      );

      const saturn = safeNum(
        blendedPlanetary.saturn,
        driverValueFromTaggedList(telemetry.topRegulators, "Saturn")
      );
      const venus = safeNum(
        blendedPlanetary.venus,
        driverValueFromTaggedList(telemetry.topRegulators, "Venus")
      );
      const mercury = safeNum(
        blendedPlanetary.mercury,
        driverValueFromTaggedList(telemetry.topRegulators, "Mercury")
      );

      const stabilityIndex = (saturn + venus + mercury) / 3;

      setText("capacityScore", fmt(capacity));
      setText("capacityLabel", capacityLabelFromValue(capacity));

      setText("strainScore", fmt(strain));
      setText("strainLabel", strainLabelFromStrain(strain));

      setText("stateText", stateLabelFromMode(modeText));
      setText("stateLabel", stateHelperFromMode(modeText));
      setText("stateBadge", stateLabelFromMode(modeText));

      setBar("capacityBar", capacity, 1.2);
      setBar("strainBar", strain, 1.2);

      setText("capVal", fmt(capacity));
      setText("loadVal", fmt(load));
      setText("regVal", fmt(regulation));
      setText("effVal", fmt(effectiveDisplay));
      setText("stabilityVal", fmt(stabilityIndex));

      setText("primaryDriver", primaryDriverName(data));
      setText("volatilityVal", fmt(volatility));
      setText("fogVal", fmt(fog));
      setText("activationVal", fmt(activation));

      setText("saturnVal", fmt(saturn));
      setText("venusVal", fmt(venus));
      setText("mercuryVal", fmt(mercury));
      setText("stateCondition", stateLabelFromMode(modeText));

      const forecastState = forecast?.now?.state || "Regulated";
      setText("forecastTitle", forecastState);
      setText("forecastText", buildForecastText(forecast));

      setText("skyDataTitle", ephemeris.source ? "Verified" : "Pending");
      setText(
        "skyDataText",
        buildSkyText({ ephemeris, inputResolved, transitNow, baseline })
      );

      setText(
        "whyText",
        buildWhyText({
          modeText: stateLabelFromMode(modeText),
          primaryDriver: primaryDriverName(data),
          fog,
          activation,
          mercury,
          saturn,
          venus
        })
      );

      setText("envBand", envBandFromMode(environment.environmentMode));
      setText("forecastBand", forecastBandFromState(forecastState));

      const resolvedLocation =
        inputResolved.resolvedLocation ||
        inputResolved.locationResolved ||
        "—";

      const resolvedTime =
        inputResolved.localTimeResolved ||
        inputResolved.local_time_resolved ||
        "—";

      const timezoneName =
        inputResolved.timezoneName ||
        inputResolved.timezone_name ||
        "—";

      const natalUtc =
        ephemeris.natalUtcDatetime ||
        ephemeris.natal_utc_datetime ||
        inputResolved.utcDatetime ||
        inputResolved.utc_datetime ||
        "—";

      setText(
        "resolvedInput",
        `Local: ${resolvedTime} | Natal UTC: ${natalUtc} | Place: ${resolvedLocation} | TZ: ${timezoneName}`
      );

      setText(
        "apiStatus",
        `OK • ${ephemeris.source || "API"} • ${ephemeris.mode || "blended"}`
      );
      document.getElementById("apiStatus").className = "ok";

      const sunDeg = data?._longitudesDeg?.sun ?? "—";
      const moonDeg = data?._longitudesDeg?.moon ?? "—";
      const ascDeg = data?.angles?.asc ?? "—";
      const mcDeg = data?.angles?.mc ?? "—";

      setText(
        "chartDebug",
        `JD: ${ephemeris.jdUt || ephemeris.jd_ut || "—"} | Sun: ${sunDeg} | Moon: ${moonDeg} | ASC: ${ascDeg} | MC: ${mcDeg}`
      );

      setHeroGlow(modeText, fog, volatility);
    }

    async function calculate(){
      const dob = document.getElementById("dob").value;
      const tobRaw = document.getElementById("tob").value.trim();
      const ampm = document.getElementById("ampm").value;
      const location = document.getElementById("location").value.trim();

      const payload = {
        dob,
        tobRaw,
        ampm,
        locationText: location
      };

      try {
        const btn = document.getElementById("calcBtn");
        btn.disabled = true;
        btn.textContent = "Calculating...";

        setText("apiStatus", "Calculating...");
        document.getElementById("apiStatus").className = "";

        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || `API error ${response.status}`);
        }

        updateUI(data);
      } catch (err) {
        console.error(err);
        setText("apiStatus", `Error • ${err.message}`);
        document.getElementById("apiStatus").className = "err";
        alert("Calculation failed. Check API deployment or payload.");
      } finally {
        const btn = document.getElementById("calcBtn");
        btn.disabled = false;
        btn.textContent = "Calculate";
      }
    }

    document.getElementById("calcBtn").addEventListener("click", calculate);

    document.getElementById("dob").value = "1980-11-21";
    document.getElementById("tob").value = "6:20";
    document.getElementById("ampm").value = "AM";
    document.getElementById("location").value = "Cuero, TX";

    calculate();
  </script>
</body>
</html>
