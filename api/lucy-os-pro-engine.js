/* lucy-os-pro-engine.js */
/* Engine/runtime logic only. Static libraries are loaded from lucy-os-library.js. */

const API_URL = "/api/chart_inputs";
const SAVED_PROFILES_KEY = "lucyOSProSavedProfiles";

const HARMONIC_SCORE_WEIGHTS = {
  natal: {
    Structured: 5.50,
    Contained: 2.60,
    Chaotic: 2.40,
    Relational: 2.55,
    Threshold: 2.80,
    Reconstructive: 2.40,
    Integrative: 2.55,
    Diffused: 2.40,
    Regulated: 3.35
  },
  field: {
    Structured: 1.60,
    Contained: 1.20,
    Chaotic: 2.65,
    Relational: 1.55,
    Threshold: 2.60,
    Reconstructive: 2.30,
    Integrative: 1.60,
    Diffused: 1.75,
    Regulated: 2.40
  },
  distortion: {
    Structured: 1.05,
    Contained: 1.10,
    Chaotic: 3.20,
    Relational: 1.00,
    Threshold: 2.30,
    Reconstructive: 3.20,
    Integrative: 1.90,
    Diffused: 3.60,
    Regulated: 2.50
  }
};

const FIELD_CLASS_NAMES = [
  "field-structured",
  "field-contained",
  "field-chaotic",
  "field-relational",
  "field-threshold",
  "field-reconstructive",
  "field-integrative",
  "field-diffused",
  "field-regulated",
  "field-steady"
];

const UNDERTONE_CLASS_NAMES = [
  "undertone-structured",
  "undertone-contained",
  "undertone-chaotic",
  "undertone-relational",
  "undertone-threshold",
  "undertone-reconstructive",
  "undertone-integrative",
  "undertone-diffused",
  "undertone-regulated",
  "undertone-steady"
];

let latestSharePayload = {
  systemWeather: "Structured signal architecture meeting a live field",
  fieldDirectionTitle: "—",
  fieldDirectionText: "Waiting for field direction.",
  fieldUndertone: {
    active: false,
    field: null,
    score: null,
    gap: null,
    ratio: null,
    title: "No strong undertone",
    text: "No secondary field is close enough to change the read."
  },
  coreRule: {
    gift: "—",
    distortion: "—",
    move: "—"
  },
  moonstampModifier: {
    hasMoonstamp: false,
    title: "",
    text: "",
    meta: "",
    shareLine: ""
  },
  regulationSupports: {
    state: "—",
    quality: "—",
    tryItems: [],
    why: "—",
    music: "—"
  },
  todayRead: "Waiting for daily read.",
  realLifeText: "Waiting for plain-life translation.",
  driverNote: "Waiting for driver note.",
  goodMove: "—",
  returnText: "—",
  primary: "Structured",
  field: "—",
  state: "—",
  motionStyle: "—",
  motionStyleRead: "—"
};

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

function fmtMaybe(v){
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function fmtPercent(v){
  const n = safeNum(v, NaN);
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function fmtMoonAge(v){
  const n = safeNum(v, NaN);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function setText(id, value){
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHTML(id, value){
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function setBar(id, value, max = 1.2){
  const el = document.getElementById(id);
  if (!el) return;
  const pct = clamp((safeNum(value) / max) * 100, 0, 100);
  el.style.width = pct + "%";
}

function setMiniBar(id, value, max = 1.2){
  const el = document.getElementById(id);
  if (!el) return;
  const pct = clamp((safeNum(value) / max) * 100, 0, 100);
  el.style.width = pct + "%";
}

function score10(value){
  return clamp(Math.round(safeNum(value) * 10), 1, 10);
}

function score10From01(value){
  return clamp(Math.round(safeNum(value) * 10), 1, 10);
}

function bandFromScore(score){
  const n = safeNum(score);
  if (n <= 3) return "Low";
  if (n <= 5) return "Moderate";
  if (n <= 7) return "Active";
  if (n <= 8) return "High";
  return "Very high";
}

function isMobileLayout(){
  return window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
}

function scrollToMobileReadSnapshot(){
  const target = document.getElementById("mobileReadSnapshot");
  if (!target || !isMobileLayout()) return;

  window.setTimeout(() => {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 120);
}

function setTechnicalDetailsDefault(){
  const details = document.getElementById("mobileTechnicalDetails");
  if (!details) return;

  if (isMobileLayout()) {
    details.removeAttribute("open");
  } else {
    details.setAttribute("open", "");
  }
}

function getMoonstamp(data){
  const moonstamp = data?.moonstamp;
  return moonstamp && typeof moonstamp === "object" ? moonstamp : null;
}

function hasMoonstampData(data){
  const moonstamp = getMoonstamp(data);
  if (!moonstamp) return false;

  return [
    moonstamp.phase,
    moonstamp.illumination,
    moonstamp.moonAge,
    moonstamp.state,
    moonstamp.modifier,
    moonstamp.forecastModifier,
    moonstamp.phaseFraction,
    moonstamp.sunLongitudeDeg,
    moonstamp.moonLongitudeDeg,
    moonstamp.utcDatetime
  ].some(value => value !== undefined && value !== null && String(value).trim() !== "");
}

function formatMoonstampTiming(moonstamp){
  if (!moonstamp) return "Moonstamp modifier pending";

  const phase = String(moonstamp.phase || "").trim() || "Moon phase";
  const moonAge = fmtMoonAge(moonstamp.moonAge);
  const illumination = fmtPercent(moonstamp.illumination);

  if (moonAge === "—" && illumination === "—") return phase;
  if (moonAge === "—") return `${phase} · ${illumination}% illuminated`;
  if (illumination === "—") return `${phase} · ${moonAge} days`;

  return `${phase} · ${moonAge} days · ${illumination}% illuminated`;
}

function buildMoonstampModifier(data){
  const moonstamp = getMoonstamp(data);

  if (!moonstamp || !hasMoonstampData(data)) {
    return "";
  }

  const modifier = String(moonstamp.modifier || "").trim();
  const forecastModifier = String(moonstamp.forecastModifier || "").trim();

  if (modifier && forecastModifier) return `${modifier} ${forecastModifier}`;
  if (modifier) return modifier;
  if (forecastModifier) return forecastModifier;

  const state = String(moonstamp.state || "").trim();
  const phase = String(moonstamp.phase || "").trim();

  if (state && phase) return `${state} lunar timing adds texture to the ${phase} field.`;
  if (state) return `${state} lunar timing adds texture to today’s field.`;
  if (phase) return `${phase} timing adds texture to today’s read.`;

  return "The lunar field adds timing texture to today’s read.";
}

function buildMoonstampModifierRead(data){
  const moonstamp = getMoonstamp(data);
  const hasMoonstamp = hasMoonstampData(data);
  const modifier = buildMoonstampModifier(data);

  if (!hasMoonstamp) {
    return {
      hasMoonstamp: false,
      title: "Moonstamp modifier pending",
      text: "Moonstamp modifies the timing field; it does not replace your harmonic profile.",
      meta: "The lunar field adds timing texture when backend Moonstamp data is available.",
      shareLine: ""
    };
  }

  const phase = String(moonstamp.phase || "").trim();
  const state = String(moonstamp.state || "").trim();
  const illumination = fmtPercent(moonstamp.illumination);
  const moonrise = String(moonstamp.moonrise || "").trim();
  const moonset = String(moonstamp.moonset || "").trim();
  const nextMajorPhase = String(moonstamp.nextMajorPhase || "").trim();

  const titleParts = [];
  if (state) titleParts.push(state);
  if (phase) titleParts.push(phase);

  const title = titleParts.length ? titleParts.join(" · ") : "Lunar timing modifier";
  const metaParts = [];
  if (illumination !== "—") metaParts.push(`${illumination}% illuminated`);
  if (moonrise) metaParts.push(`Moonrise ${moonrise}`);
  if (moonset) metaParts.push(`Moonset ${moonset}`);
  if (nextMajorPhase) metaParts.push(`Next: ${nextMajorPhase}`);

  const text = modifier || "The lunar field adds timing texture to today’s read. Use it as a field modifier, not an identity label.";
  const meta = metaParts.length ? metaParts.join(" · ") : "Moonstamp modifies the timing field only.";

  return {
    hasMoonstamp: true,
    title,
    text,
    meta,
    shareLine: `${title}: ${text}`
  };
}

function moonstampForecastText(forecastItem, fallback){
  if (!forecastItem || typeof forecastItem !== "object") return fallback;

  const text = String(forecastItem.text || forecastItem.read || forecastItem.modifier || forecastItem.forecastModifier || "").trim();
  const state = String(forecastItem.state || "").trim();
  const phase = String(forecastItem.phase || "").trim();
  const illumination = fmtPercent(forecastItem.illumination);
  const headerParts = [state, phase].filter(Boolean);
  const header = headerParts.length
    ? `${headerParts.join(" · ")}${illumination !== "—" ? ` · ${illumination}%` : ""}`
    : "";

  if (text && header) return `${header}. ${text}`;
  if (text) return text;
  if (header) return header;

  return fallback;
}

function compassGaugeNote(stateLabel, capacity, load, regulation){
  const capacityBand = capacityBandFromValue(capacity);
  const loadBand = loadBandFromValue(load);
  const regulationBand = regulationBandFromValue(regulation);

  if (stateLabel === "Overloaded") {
    return "High load is exceeding comfortable capacity. Reduce scope before adding more interpretation.";
  }

  if (loadBand === "High" && capacityBand === "Strong enough" && regulationBand === "Low") {
    return "High load with usable capacity. Regulation is lower, so simplify the move.";
  }

  if (loadBand === "High" && regulationBand === "Strong") {
    return "High load is present, but regulation is helping the system hold the pressure.";
  }

  if (capacityBand === "Limited") {
    return "Capacity is limited. Keep the next move small and reduce input first.";
  }

  if (stateLabel === "Mobilized") {
    return "The field has usable movement. Keep momentum paced and give it one channel.";
  }

  if (stateLabel === "Threshold") {
    return "Load is near an edge. Pause before crossing and keep the next move clean.";
  }

  if (stateLabel === "Regulated") {
    return "Balanced field. Keep the pace steady and avoid adding unnecessary pressure.";
  }

  return "Read the load first, then choose one clear next move.";
}

function getHarmonicBaseName(value){
  return String(value || "").split("/")[0].trim();
}

function getStableProfileLabel(primary, support){
  const primaryKey = getHarmonicBaseName(primary || "Structured");
  const supportKey = getHarmonicBaseName(support || "Regulated");
  return STABLE_PROFILE_LABELS?.[primaryKey]?.[supportKey] || `${supportKey} ${primaryKey} Profile`;
}

function harmonicClass(name){
  const base = getHarmonicBaseName(name);
  return String(base || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function harmonicText(name){
  if (!name) return "—";
  const parts = String(name).split("/").map(part => part.trim()).filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

function harmonicLabel(name){
  if (!name) return "—";
  const parts = String(name).split("/").map(part => part.trim()).filter(Boolean);

  if (parts.length > 1) {
    return parts
      .map(part => `<span class="harmonicName h-${harmonicClass(part)}">${part}</span>`)
      .join(" / ");
  }

  return `<span class="harmonicName h-${harmonicClass(name)}">${name}</span>`;
}

function chipClass(name, fallback = ""){
  const base = getHarmonicBaseName(name);
  const cls = harmonicClass(base);
  return cls || fallback;
}

function applyChipClass(id, baseClass, harmonic){
  const el = document.getElementById(id);
  if (!el) return;

  const keep = String(baseClass || "").trim();
  const hClass = chipClass(harmonic);

  el.className = keep && hClass
    ? `${keep} ${hClass}`
    : keep || el.className;
}

function applyFieldClass(blockId, field){
  const el = document.getElementById(blockId);
  if (!el) return;

  el.classList.remove(...FIELD_CLASS_NAMES);

  const cls = field ? `field-${harmonicClass(field)}` : "";

  if (cls && FIELD_CLASS_NAMES.includes(cls)) {
    el.classList.add(cls);
  } else {
    el.classList.add("field-steady");
  }
}

function applyFieldClasses(field){
  [
    "outlookDirectionBlock",
    "shareCardFieldDirectionBlock"
  ].forEach(id => applyFieldClass(id, field));
}

function applyFieldUndertoneClass(blockId, fieldUndertone){
  const el = document.getElementById(blockId);
  if (!el) return;

  el.classList.remove(...UNDERTONE_CLASS_NAMES);

  const field = fieldUndertone?.field;
  const cls = field ? `undertone-${harmonicClass(field)}` : "";

  if (fieldUndertone?.active && cls && UNDERTONE_CLASS_NAMES.includes(cls)) {
    el.classList.add(cls);
  } else {
    el.classList.add("undertone-steady");
  }
}

function applyFieldUndertoneClasses(fieldUndertone){
  [
    "topFieldUndertoneBlock",
    "fieldUndertoneBlock",
    "whyFieldUndertoneMini",
    "liveDebugFieldUndertoneBlock"
  ].forEach(id => applyFieldUndertoneClass(id, fieldUndertone));
}

function slugify(value){
  return String(value || "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sortedScoreKeys(scores){
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

function getTopFieldCandidates(normalizedFieldScores, limit = 3){
  return Object.entries(normalizedFieldScores || {})
    .sort((a, b) => safeNum(b[1]) - safeNum(a[1]))
    .slice(0, limit)
    .map(([field, score]) => ({
      field,
      score: safeNum(score)
    }));
}

function addScore(scores, key, value){
  scores[key] = safeNum(scores[key]) + safeNum(value);
}

function normalizeScores(scores, weights){
  const normalized = {};

  Object.keys(scores).forEach(key => {
    const divisor = safeNum(weights?.[key], 1);
    normalized[key] = divisor > 0 ? safeNum(scores[key]) / divisor : safeNum(scores[key]);
  });

  return normalized;
}

function getTopHarmonic(scores, fallback = "Structured"){
  const sorted = sortedScoreKeys(scores);
  return sorted[0] || fallback;
}

function getSecondHarmonic(scores, primary, fallback = "Regulated"){
  const sorted = sortedScoreKeys(scores).filter(key => key !== primary);
  return sorted[0] || fallback;
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
  return `Timing: ${text || "—"}`;
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

function publicDriverName(driver){
  const text = String(driver || "").trim();

  if (!text || text === "—") return "The strongest current driver";

  const lower = text.toLowerCase();

  if (
    lower === "mc" ||
    lower.startsWith("mc ") ||
    lower.startsWith("mc(") ||
    lower.includes("midheaven")
  ) return "Life Direction";

  if (
    lower === "asc" ||
    lower.startsWith("asc ") ||
    lower.startsWith("asc(") ||
    lower.includes("ascendant")
  ) return "Personal Orientation";

  return text;
}

function loadBandFromValue(load){
  const value = safeNum(load);
  if (value < 0.45) return "Low";
  if (value < 0.75) return "Moderate";
  if (value < 1.00) return "High";
  return "Very high";
}

function capacityBandFromValue(capacity){
  const value = safeNum(capacity);
  if (value < 0.55) return "Limited";
  if (value < 0.75) return "Usable";
  return "Strong enough";
}

function regulationBandFromValue(regulation){
  const value = safeNum(regulation);
  if (value < 0.40) return "Low";
  if (value < 0.70) return "Moderate";
  return "Strong";
}

function motionHas(motionStyle, target){
  return String(motionStyle || "")
    .split("/")
    .map(part => part.trim())
    .includes(target);
}

function fieldSupportBank(field){
  const key = getHarmonicBaseName(field || "Regulated");
  return REGULATION_SUPPORT_LIBRARY[key] || REGULATION_SUPPORT_LIBRARY.Regulated;
}

function buildTryListFromSupportBank(bank, intensityLabel, field, motionStyle, moonstampModifierRead){
  const items = [
    `Light/environment: ${bank.lightEnvironment}`,
    `Scent: ${bank.scent}`,
    `Plant/nature: ${bank.plantNature}`,
    `Music/sound: ${bank.musicSound}`,
    `Behavior: ${bank.behavior}`
  ];

  const moonstampText = String(moonstampModifierRead?.text || "").toLowerCase();

  if (intensityLabel === "Overloaded") {
    items.push("Intensity modifier: reduce phone/social input and choose the smallest workable version.");
  } else if (intensityLabel === "Threshold") {
    items.push("Intensity modifier: pause before replying and delay non-urgent choices.");
  } else if (intensityLabel === "Mobilized") {
    items.push("Intensity modifier: use movement, but keep it to one channel.");
  }

  if (field === "Relational") {
    items.push("Contact modifier: keep the field soft without taking on what is not yours.");
  }

  if (field === "Reconstructive") {
    items.push("Repair modifier: stop after one repair so the support does not become a teardown.");
  }

  if (field === "Diffused") {
    items.push("Clarity modifier: choose one anchor before interpreting the whole field.");
  }

  if (motionHas(motionStyle, "Chaotic")) {
    items.push("Motion modifier: discharge the charge safely before deciding.");
  }

  if (motionHas(motionStyle, "Contained")) {
    items.push("Motion modifier: protect the channel before explaining.");
  }

  if (moonstampText.includes("lower-load") || moonstampText.includes("simplify") || moonstampText.includes("reduce")) {
    items.push("Moonstamp modifier: remove one unnecessary demand.");
  }

  return [...new Set(items)].slice(0, 8);
}

function buildRegulationSupports(harmonics, data, moonstampModifierRead){
  const state = data?.state || {};
  const currentState = stateLabelFromMode(state.mode || "");
  const field = harmonics?.todayField || "Regulated";
  const motionStyle = harmonics?.motionStyle || "Steady";
  const load = safeNum(state.amplifiedLoad);
  const strain = safeNum(state.strain);
  const regulation = safeNum(state.regulation);
  const bank = fieldSupportBank(field);

  let intensityLabel = currentState;
  let stateLine = `${currentState} state + ${field} field`;

  if (currentState === "Overloaded" || load >= 0.95 || strain >= 0.95) {
    intensityLabel = "Overloaded";
  } else if (currentState === "Threshold") {
    intensityLabel = "Threshold";
  } else if (currentState === "Mobilized") {
    intensityLabel = "Mobilized";
  } else {
    intensityLabel = "Regulated";
  }

  if (intensityLabel === "Overloaded" && field === "Relational") {
    stateLine = "High relational load";
  } else if (intensityLabel === "Mobilized" && field === "Reconstructive") {
    stateLine = "High activation + repair pressure";
  } else if (intensityLabel === "Mobilized" && field === "Relational") {
    stateLine = "Activated contact field";
  } else if (intensityLabel === "Threshold") {
    stateLine = `Threshold state + ${field} field`;
  } else {
    stateLine = `${intensityLabel} state + ${field} field`;
  }

  const intensityQuality = [];

  if (intensityLabel === "Overloaded") {
    intensityQuality.push("lower input", "smaller scope");
  } else if (intensityLabel === "Threshold") {
    intensityQuality.push("pause", "clean timing");
  } else if (intensityLabel === "Mobilized") {
    intensityQuality.push("channeling", "paced movement");
  }

  if (regulation < 0.40) {
    intensityQuality.push("external structure");
  }

  const quality = [...new Set([
    bank.supportQuality,
    ...intensityQuality
  ])].filter(Boolean).join(", ");

  const tryItems = buildTryListFromSupportBank(bank, intensityLabel, field, motionStyle, moonstampModifierRead);

  let why = bank.why;

  if (intensityLabel === "Overloaded") {
    why += " Because the system is carrying high load, the support should reduce input before adding more interpretation.";
  } else if (intensityLabel === "Threshold") {
    why += " Because the system is near an edge, the support should slow urgency and protect the timing of the next move.";
  } else if (intensityLabel === "Mobilized") {
    why += " Because the system has usable movement, the support should channel energy without escalating it.";
  }

  if (regulation < 0.40) {
    why += " Regulation is lower, so visible structure, timers, or a smaller task can help keep the support practical.";
  }

  const music = bank.musicSound;

  return {
    state: stateLine,
    quality,
    tryItems,
    why,
    music
  };
}

function buildMobileSnapshotSupport(regulationSupports){
  if (!regulationSupports) return "Choose one small support and keep the field simple.";

  const tryItems = Array.isArray(regulationSupports.tryItems)
    ? regulationSupports.tryItems
    : [];

  const light = tryItems.find(item => String(item).toLowerCase().startsWith("light/environment"));
  const behavior = tryItems.find(item => String(item).toLowerCase().startsWith("behavior"));
  const scent = tryItems.find(item => String(item).toLowerCase().startsWith("scent"));

  const parts = [];

  if (light) parts.push(light.replace(/^Light\/environment:\s*/i, ""));
  if (scent) parts.push(scent.replace(/^Scent:\s*/i, ""));
  if (behavior) parts.push(behavior.replace(/^Behavior:\s*/i, ""));

  return parts.length
    ? parts.slice(0, 3).join(" ")
    : regulationSupports.quality || "Choose one small support.";
}

function updateMobileReadSnapshot({
  systemWeather,
  profileAwareRead,
  guidance,
  regulationSupports,
  state,
  field,
  loadBand
}){
  setText("mobileSnapshotWeather", systemWeather || "Waiting for field read.");

  const shortRead = profileAwareRead?.shareRead || profileAwareRead?.todayRead || "Calculate to see today’s practical read.";
  setText("mobileSnapshotText", shortRead);

  setText("mobileSnapshotMove", guidance?.move || "Choose one clear next move.");
  setText("mobileSnapshotSupport", buildMobileSnapshotSupport(regulationSupports));
  setText("mobileSnapshotMeta", `State: ${state || "—"} · Field: ${field || "—"} · Load: ${loadBand || "—"}`);
}

function updateRegulationSupportsUI(regulationSupports){
  const supports = regulationSupports || {
    state: "—",
    quality: "—",
    tryItems: [],
    why: "—",
    music: "—"
  };

  setText("regulationSupportState", supports.state || "—");
  setText("regulationSupportStateText", "Use this as the practical regulation read for the current field. It does not change your root pattern.");
  setText("regulationSupportQuality", supports.quality || "—");

  const list = document.getElementById("regulationSupportTry");
  if (list) {
    list.innerHTML = Array.isArray(supports.tryItems) && supports.tryItems.length
      ? supports.tryItems.map(item => `<li>${item}</li>`).join("")
      : "<li>Choose one small support and keep the field simple.</li>";
  }

  setText("regulationSupportWhy", supports.why || "—");
  setText("regulationSupportMusic", supports.music || "—");

  setText("whyRegulationSupports", `${supports.state || "—"} · ${supports.quality || "—"}`);

  setText("shareCardRegulationState", supports.state || "—");
  setText("shareCardRegulationQuality", supports.quality || "—");
  setText(
    "shareCardRegulationTry",
    Array.isArray(supports.tryItems) && supports.tryItems.length
      ? supports.tryItems.slice(0, 5).join(" · ")
      : "Choose one small support."
  );
  setText("shareCardRegulationMusic", supports.music || "—");
}

function getSavedProfiles(){
  try {
    const raw = localStorage.getItem(SAVED_PROFILES_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Could not read saved Lucy.OS profiles.", error);
    return [];
  }
}

function setSavedProfiles(profiles){
  try {
    localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(Array.isArray(profiles) ? profiles : []));
  } catch (error) {
    console.warn("Could not save Lucy.OS profiles.", error);
    setText("profileSaveStatus", "Could not save profile on this device/browser.");
  }
}

function renderSavedProfiles(){
  const select = document.getElementById("savedProfilesSelect");
  if (!select) return;

  const profiles = getSavedProfiles()
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  const currentValue = select.value;

  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = profiles.length ? "Select saved profile" : "No saved profiles yet";
  select.appendChild(placeholder);

  profiles.forEach(profile => {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = profile.name;
    select.appendChild(option);
  });

  if (currentValue && profiles.some(profile => profile.name === currentValue)) {
    select.value = currentValue;
  }
}

function saveCurrentProfile(){
  const name = document.getElementById("profileName")?.value.trim() || "";
  const dob = document.getElementById("dob")?.value || "";
  const tobRaw = document.getElementById("tob")?.value.trim() || "";
  const ampm = document.getElementById("ampm")?.value || "AM";
  const locationText = document.getElementById("location")?.value.trim() || "";

  if (!name) {
    setText("profileSaveStatus", "Enter a profile name first.");
    return;
  }

  if (!dob || !locationText) {
    setText("profileSaveStatus", "Date of birth and birth location are required.");
    return;
  }

  const profiles = getSavedProfiles();
  const nextProfile = {
    name,
    dob,
    tobRaw,
    ampm,
    locationText,
    savedAt: new Date().toISOString()
  };

  const existingIndex = profiles.findIndex(profile => String(profile.name || "").toLowerCase() === name.toLowerCase());

  if (existingIndex >= 0) {
    profiles[existingIndex] = nextProfile;
  } else {
    profiles.push(nextProfile);
  }

  setSavedProfiles(profiles);
  renderSavedProfiles();

  const select = document.getElementById("savedProfilesSelect");
  if (select) select.value = name;

  setText("profileSaveStatus", existingIndex >= 0 ? "Profile updated on this device/browser." : "Profile saved on this device/browser.");
}

function loadSelectedProfile(){
  const select = document.getElementById("savedProfilesSelect");
  const selectedName = select?.value || "";

  if (!selectedName) {
    setText("profileSaveStatus", "Select a saved profile to load.");
    return;
  }

  const profiles = getSavedProfiles();
  const profile = profiles.find(item => item.name === selectedName);

  if (!profile) {
    setText("profileSaveStatus", "Saved profile was not found.");
    renderSavedProfiles();
    return;
  }

  const profileNameInput = document.getElementById("profileName");
  const dobInput = document.getElementById("dob");
  const tobInput = document.getElementById("tob");
  const ampmInput = document.getElementById("ampm");
  const locationInput = document.getElementById("location");

  if (profileNameInput) profileNameInput.value = profile.name || "";
  if (dobInput) dobInput.value = profile.dob || "";
  if (tobInput) tobInput.value = profile.tobRaw || "";
  if (ampmInput) ampmInput.value = profile.ampm || "AM";
  if (locationInput) locationInput.value = profile.locationText || "";

  setText("profileSaveStatus", "Profile loaded. Press Calculate to run this chart.");
}

function deleteSelectedProfile(){
  const select = document.getElementById("savedProfilesSelect");
  const selectedName = select?.value || "";

  if (!selectedName) {
    setText("profileSaveStatus", "Select a saved profile to delete.");
    return;
  }

  const profiles = getSavedProfiles();
  const nextProfiles = profiles.filter(profile => profile.name !== selectedName);

  setSavedProfiles(nextProfiles);
  renderSavedProfiles();

  setText("profileSaveStatus", "Profile deleted from this device/browser.");
}

function buildWhyText({ modeText, primaryDriver, fog, activation, mercury, saturn, venus }) {
  const parts = [];

  if (safeNum(fog) >= 0.65) parts.push("Neptune is increasing diffusion");
  if (safeNum(activation) >= 0.65) parts.push("Mars is raising activation");
  if (safeNum(mercury) >= 0.65) parts.push("Mercury is improving signal clarity");
  if (safeNum(saturn) >= 0.65) parts.push("Saturn is adding structure");
  if (safeNum(venus) >= 0.65) parts.push("Venus is supporting regulation");

  let front = parts.slice(0, 3).join(" + ");
  if (!front) {
    front = `${primaryDriver || "Current drivers"} are within stable operating range`;
  }

  return `${front}. Current mode is ${String(modeText || "Regulated").toLowerCase()}.`;
}

function forecastTextFromState(forecastState){
  const state = String(forecastState || "").toLowerCase();

  if (state.includes("overload")) {
    return "The current field is carrying more load. Reduce inputs, simplify choices, and avoid stacking pressure.";
  }

  if (state.includes("threshold")) {
    return "The current field is near an edge. Move carefully, pace decisions, and do not force the crossing.";
  }

  if (state.includes("mobilized")) {
    return "The current field is active. Use the momentum, but keep the load contained and paced.";
  }

  return "The current field is regulated enough for steady, focused movement.";
}

function outlookTextFromState(forecastState, horizonLabel){
  const state = String(forecastState || "").toLowerCase();

  if (state.includes("overload")) {
    return `${horizonLabel} reads as overloaded. Reduce extra input, simplify choices, and do not add unnecessary pressure.`;
  }

  if (state.includes("threshold")) {
    return `${horizonLabel} reads near an edge. Pause before crossing and choose one clean move.`;
  }

  if (state.includes("mobilized")) {
    return `${horizonLabel} reads active. Use the available momentum, but avoid stacking too many demands.`;
  }

  return `${horizonLabel} reads steady enough for paced action, simple focus, and clean follow-through.`;
}

function compassPlainText(stateLabel){
  if (stateLabel === "Regulated") return "The field is stable enough for paced action.";
  if (stateLabel === "Mobilized") return "The field has usable movement, but momentum needs pacing.";
  if (stateLabel === "Threshold") return "The field is near an edge; pause before crossing.";
  if (stateLabel === "Overloaded") return "The field is carrying too much; reduce scope first.";
  return "Choose one clear next move and keep the field manageable.";
}

function updateFieldCompass(data){
  const state = data?.state || {};
  const label = stateLabelFromMode(state.mode || "");
  const capacity = safeNum(state.capacity);
  const load = safeNum(state.amplifiedLoad);
  const regulation = safeNum(state.regulation);

  setText("fieldCompassState", label);
  setText("fieldCompassText", compassPlainText(label));

  setText("fieldCompassCapacityValue", fmt(capacity));
  setText("fieldCompassLoadValue", fmt(load));
  setText("fieldCompassRegulationValue", fmt(regulation));

  setText("fieldCompassCapacityBand", capacityBandFromValue(capacity));
  setText("fieldCompassLoadBand", loadBandFromValue(load));
  setText("fieldCompassRegulationBand", regulationBandFromValue(regulation));

  setMiniBar("fieldCompassCapacityBar", capacity, 1.2);
  setMiniBar("fieldCompassLoadBar", load, 1.2);
  setMiniBar("fieldCompassRegulationBar", regulation, 1.2);

  setText("fieldCompassGaugeNote", compassGaugeNote(label, capacity, load, regulation));
}

function fieldPhraseFromHarmonic(field){
  if (field === "Reconstructive") return "repair pressure";
  if (field === "Chaotic") return "movement pressure";
  if (field === "Threshold") return "edge pressure";
  if (field === "Diffused") return "diffuse pressure";
  if (field === "Contained") return "inward pressure";
  if (field === "Relational") return "contact pressure";
  if (field === "Integrative") return "meaning pressure";
  if (field === "Structured") return "structure support";
  return "field pressure";
}

function primaryPhraseFromHarmonic(primary){
  if (primary === "Structured") return "structure-seeking signal";
  if (primary === "Contained") return "protected inner signal";
  if (primary === "Chaotic") return "fast nonlinear signal";
  if (primary === "Relational") return "contact-sensitive signal";
  if (primary === "Threshold") return "crossing-sensitive signal";
  if (primary === "Reconstructive") return "repair-oriented signal";
  if (primary === "Integrative") return "meaning-gathering signal";
  if (primary === "Diffused") return "wide receptive signal";
  if (primary === "Regulated") return "paced regulation signal";
  return "root signal";
}

function buildPairingAction(primary, field){
  if (primary === "Chaotic" && field === "Reconstructive") return "use the charge for one repair";
  if (primary === "Structured" && field === "Reconstructive") return "repair one weak point without rebuilding everything";
  if (primary === "Threshold" && field === "Reconstructive") return "cross only the repair that is ready";
  if (primary === "Diffused" && field === "Reconstructive") return "wait until the real repair point is clear";
  if (primary === "Regulated" && field === "Reconstructive") return "let pacing support one honest adjustment";
  return "choose one clear next move";
}

function primaryPlainPhrase(primary){
  if (primary === "Structured") return "You tend to stabilize by naming, organizing, and giving pressure a usable form.";
  if (primary === "Contained") return "You tend to process inwardly before releasing signal outward.";
  if (primary === "Chaotic") return "You tend to move quickly through charge, pressure points, and nonlinear signal.";
  if (primary === "Relational") return "You tend to read tone, contact, and the shared field between people.";
  if (primary === "Threshold") return "You tend to sense edges, openings, crossings, and decision points.";
  if (primary === "Reconstructive") return "You tend to work through pressure by repairing and rebuilding what needs strength.";
  if (primary === "Integrative") return "You tend to gather scattered pieces into meaning.";
  if (primary === "Diffused") return "You tend to receive the field widely before defining it.";
  if (primary === "Regulated") return "You tend to stabilize through pacing, timing, and load control.";
  return "You have a root signal pattern.";
}

function fieldPlainPhrase(field){
  if (field === "Structured") return "Today supports structure, sequence, and practical form.";
  if (field === "Contained") return "Today may pull the field inward for privacy, protection, or quiet sorting.";
  if (field === "Chaotic") return "Today may bring extra movement, charge, speed, or disruption.";
  if (field === "Relational") return "Today may clarify through contact, tone, feedback, or repair.";
  if (field === "Threshold") return "Today may bring an edge, decision, opening, or crossing.";
  if (field === "Reconstructive") return "Today may highlight what needs adjustment, repair, or recalibration.";
  if (field === "Integrative") return "Today may connect pieces and widen the pattern.";
  if (field === "Diffused") return "Today may feel subtle, foggy, atmospheric, or harder to define.";
  if (field === "Regulated") return "Today supports pacing, rhythm, containment, and steady movement.";
  return "Today is activating the field.";
}

function pairingMovePlainText(primary, field){
  if (primary === "Chaotic" && field === "Reconstructive") return "Use the energy to fix one weak point. Do not turn the whole field into a rebuild.";
  if (primary === "Structured" && field === "Reconstructive") return "Repair the weak point inside the structure, not the whole structure.";
  if (primary === "Threshold" && field === "Reconstructive") return "Cross only the repair that is actually ready.";
  if (primary === "Diffused" && field === "Reconstructive") return "Wait until the repair point is clear enough to name.";
  if (primary === "Regulated" && field === "Reconstructive") return "Use pacing to make one honest adjustment.";
  return "Choose one clear next move and keep the scope small.";
}

function updateInteractionMap(primary, field){
  setHTML("interactionSystemName", `${harmonicLabel(primary)}&nbsp;signal`);
  setText("interactionSystemText", primaryPlainPhrase(primary));
  setHTML("interactionFieldName", `${harmonicLabel(field)}&nbsp;field`);
  setText("interactionFieldText", fieldPlainPhrase(field));
  setText("interactionMoveName", buildPairingAction(primary, field));
  setText("interactionMoveText", pairingMovePlainText(primary, field));
}

function getFieldTranslation(field){
  const translations = {
    Structured: {
      title: "Structure is available",
      short: "Today favors form, order, sequence, and practical containers.",
      meaning: "The field supports turning pressure into something organized and usable. This is good for simplifying, planning, naming the next step, or giving loose signal a clear container.",
      best: "Use the field to create one useful structure.",
      watch: "Do not over-tighten the plan after the structure is already good enough."
    },
    Contained: {
      title: "The field is pulling inward",
      short: "Today favors privacy, protected processing, and slower release.",
      meaning: "The field may ask for more quiet, privacy, or internal sorting before the signal becomes ready to share. This is not blockage by default; it can be protected formation.",
      best: "Let the signal shape privately before forcing it outward.",
      watch: "Do not hold pressure so long that it becomes heavier than necessary."
    },
    Chaotic: {
      title: "Extra movement is active",
      short: "Today may bring more charge, disruption, speed, or nonlinear signal.",
      meaning: "The field may feel more mobile or electric. The point is not to stop the movement, but to give the charge one safe and useful direction.",
      best: "Give the energy one channel.",
      watch: "Do not chase every spark until the day loses continuity."
    },
    Relational: {
      title: "Contact is part of the field",
      short: "Today may clarify through tone, feedback, closeness, or repair.",
      meaning: "The field may make relationships, contact, or shared atmosphere more noticeable. Stay centered before trying to read or fix the room.",
      best: "Use simple language and keep responsibility proportional.",
      watch: "Do not absorb the whole shared field as if it belongs to you."
    },
    Threshold: {
      title: "The field is near an edge",
      short: "Today may bring a crossing, decision, opening, or pressure point.",
      meaning: "The field may feel like something is approaching a turn. The edge may be real, but timing matters more than speed.",
      best: "Name the real crossing before moving.",
      watch: "Do not treat every pressure spike like it means act now."
    },
    Reconstructive: {
      title: "Repair pressure is active",
      short: "Today may highlight what needs adjustment, repair, or recalibration.",
      meaning: "Reconstructive pressure does not automatically mean collapse. It often means one weak point is asking for attention. Choose one honest repair instead of turning the whole field into a rebuild.",
      best: "Fix one weak point that is actually present.",
      watch: "Do not treat every strain like proof the whole system has failed."
    },
    Integrative: {
      title: "Meaning is gathering",
      short: "Today may connect pieces and widen the pattern.",
      meaning: "The field may help you see how things connect. Use the larger pattern if it clarifies action, but do not make the day carry every layer at once.",
      best: "Choose the one connection that makes the next step clearer.",
      watch: "Do not try to integrate every loose end today."
    },
    Diffused: {
      title: "The field is more atmospheric",
      short: "Today may feel subtle, foggy, porous, or harder to define.",
      meaning: "The field may be harder to name quickly. Reduce inputs, look for one simple true line, and avoid making decisions from fog.",
      best: "Ground the field with one clear anchor.",
      watch: "Do not turn unclear atmosphere into a full conclusion."
    },
    Regulated: {
      title: "Pacing is available",
      short: "Today supports rhythm, load management, and steady movement.",
      meaning: "The field supports reducing strain through pacing and containment. This is good for doing less, doing it clearly, and keeping the system manageable.",
      best: "Let rhythm carry one practical action.",
      watch: "Do not turn regulation into over-control."
    }
  };

  return translations[field] || translations.Regulated;
}

function buildLiveDashboardDayType(field, stateLabel, fieldUndertone){
  const translation = getFieldTranslation(field || "Regulated");
  const state = stateLabel || "Regulated";
  let title = translation.title;
  let text = translation.short;
  let bestUse = translation.best || "Choose one useful next step.";

  if (field === "Integrative") {
    title = "Integration Day";
    text = "The field is better for connecting pieces, seeing the wider pattern, and turning scattered inputs into one useful read.";
    bestUse = "Best use: connect the pattern, then reduce it to one move.";
  } else if (field === "Reconstructive") {
    title = "Repair Day";
    text = "The field may expose one weak point that wants attention. This is repair pressure, not proof the whole system has failed.";
    bestUse = "Best use: fix one real weak point.";
  } else if (field === "Relational") {
    title = "Contact Day";
    text = "The field is reading through tone, feedback, contact, and shared atmosphere. Keep responsibility proportional.";
    bestUse = "Best use: clarify contact without absorbing the whole room.";
  } else if (field === "Diffused") {
    title = "Atmospheric Day";
    text = "The field is more subtle or porous. Ground first, then look for the simplest true line.";
    bestUse = "Best use: reduce inputs and choose one anchor.";
  } else if (field === "Chaotic") {
    title = "Activation Day";
    text = "The field has extra movement or charge. Give it one channel before it scatters.";
    bestUse = "Best use: move the charge into one useful task.";
  } else if (field === "Threshold") {
    title = "Threshold Day";
    text = "The field is near an edge, opening, or choice point. Timing matters more than intensity.";
    bestUse = "Best use: pause, name the edge, then cross cleanly.";
  } else if (field === "Structured") {
    title = "Structure Day";
    text = "The field supports order, sequence, and usable form. Build the container without over-tightening it.";
    bestUse = "Best use: make one system clearer.";
  } else if (field === "Contained") {
    title = "Containment Day";
    text = "The field is pulling inward for privacy, protection, or slower formation. Let the signal shape before releasing it.";
    bestUse = "Best use: protect the channel before explaining.";
  } else if (field === "Regulated") {
    title = "Pacing Day";
    text = "The field supports rhythm, load management, and simple steady movement.";
    bestUse = "Best use: let one routine carry the next step.";
  }

  if (state === "Overloaded") {
    text += " Because the system reads overloaded, reduce scope before adding more interpretation.";
  } else if (state === "Threshold") {
    text += " Because the system is near threshold, slow the crossing.";
  } else if (state === "Mobilized") {
    text += " Because movement is available, keep momentum paced.";
  }

  if (fieldUndertone?.active) {
    text += ` Undertone: ${fieldUndertone.title}.`;
  }

  return { title, text, bestUse };
}

function buildLiveFieldDashboardMetrics(data, harmonics){
  const state = data?.state || {};
  const planetary = data?.planetary || {};
  const scores = harmonics?.normalizedFieldScores || {};
  const debug = harmonics?.dailyFieldDebug || {};
  const topFieldScore = safeNum(scores[harmonics?.todayField], safeNum(debug?.topCandidates?.[0]?.score, 0.5));

  const strain = safeNum(state.strain);
  const amplifiedLoad = safeNum(state.amplifiedLoad, strain);
  const regulation = safeNum(state.regulation);
  const capacity = safeNum(state.capacity);

  const tMars = safeNum(planetary.transitMars, safeNum(planetary.mars));
  const tUranus = safeNum(planetary.transitUranus, safeNum(planetary.uranus));
  const tMercury = safeNum(planetary.transitMercury, safeNum(planetary.mercury));
  const tSaturn = safeNum(planetary.transitSaturn, safeNum(planetary.saturn));
  const tVenus = safeNum(planetary.transitVenus, safeNum(planetary.venus));
  const tMoon = safeNum(planetary.transitMoon, safeNum(planetary.moon));
  const tNeptune = safeNum(planetary.transitNeptune, safeNum(planetary.neptune));
  const tJupiter = safeNum(planetary.transitJupiter, safeNum(planetary.jupiter));

  const chaotic = safeNum(scores.Chaotic);
  const threshold = safeNum(scores.Threshold);
  const relational = safeNum(scores.Relational);
  const diffused = safeNum(scores.Diffused);
  const integrative = safeNum(scores.Integrative);
  const structured = safeNum(scores.Structured);
  const regulated = safeNum(scores.Regulated);

  const activeFieldPressure = Math.max(
    chaotic,
    threshold,
    relational,
    diffused,
    integrative,
    structured,
    regulated,
    safeNum(scores.Reconstructive),
    safeNum(scores.Contained)
  );

  const fieldSignal01 = clamp(((topFieldScore + strain + activeFieldPressure) / 3), 0.05, 1);
  const momentum01 = clamp(((chaotic + threshold + tMars + tUranus) / 4) + (stateLabelFromMode(state.mode) === "Mobilized" ? 0.10 : 0), 0.05, 1);
  const systemLoad01 = clamp(amplifiedLoad || strain, 0.05, 1);
  const regulation01 = clamp(regulation, 0.05, 1);
  const clarity01 = clamp(((tMercury + tSaturn + capacity + structured + regulated) / 5) - ((tNeptune + diffused) / 8), 0.05, 1);
  const decision01 = clamp(((regulation + capacity + threshold + structured + regulated) / 5) - (systemLoad01 / 5), 0.05, 1);
  const social01 = clamp((relational + tVenus + tMoon) / 3, 0.05, 1);
  const sensitivity01 = clamp((diffused + tNeptune + tMoon) / 3, 0.05, 1);
  const expansion01 = clamp((integrative + tJupiter + safeNum(debug.wideFieldSignature)) / 3, 0.05, 1);

  return [
    {
      key: "FieldSignal",
      label: "Field Signal",
      score: score10From01(fieldSignal01),
      helper: "Overall field strength today.",
      value01: fieldSignal01
    },
    {
      key: "Momentum",
      label: "Momentum",
      score: score10From01(momentum01),
      helper: "How much usable movement is available.",
      value01: momentum01
    },
    {
      key: "SystemLoad",
      label: "System Load",
      score: score10From01(systemLoad01),
      helper: "How much pressure the system is carrying.",
      value01: systemLoad01
    },
    {
      key: "Regulation",
      label: "Regulation",
      score: score10From01(regulation01),
      helper: "How much pacing and containment are available.",
      value01: regulation01
    },
    {
      key: "ClarityWindow",
      label: "Clarity Window",
      score: score10From01(clarity01),
      helper: "How readable the signal is right now.",
      value01: clarity01
    },
    {
      key: "DecisionFlow",
      label: "Decision Flow",
      score: score10From01(decision01),
      helper: "How cleanly choices can move today.",
      value01: decision01
    },
    {
      key: "SocialField",
      label: "Social Field",
      score: score10From01(social01),
      helper: "How active tone, contact, or relational feedback is.",
      value01: social01
    },
    {
      key: "FieldSensitivity",
      label: "Field Sensitivity",
      score: score10From01(sensitivity01),
      helper: "How much subtle or atmospheric signal is active.",
      value01: sensitivity01
    },
    {
      key: "ExpansionPotential",
      label: "Expansion Potential",
      score: score10From01(expansion01),
      helper: "How much widening, meaning, or opportunity is available.",
      value01: expansion01
    }
  ];
}

function updateLiveFieldDashboardUI(data, harmonics){
  const stateLabel = stateLabelFromMode(data?.state?.mode || "");
  const field = harmonics?.todayField || "Regulated";
  const fieldUndertone = harmonics?.fieldUndertone || getFieldUndertone(harmonics?.dailyFieldDebug);
  const dayType = buildLiveDashboardDayType(field, stateLabel, fieldUndertone);
  const metrics = buildLiveFieldDashboardMetrics(data, harmonics);

  setText("liveDashboardStateChip", `State: ${stateLabel}`);
  applyChipClass("liveDashboardStateChip", "chip violet", "");

  setHTML("liveDashboardFieldChip", `Field:&nbsp;${harmonicLabel(field)}`);
  applyChipClass("liveDashboardFieldChip", "chip field", field);

  setText("liveDashboardDayTypeTitle", dayType.title);
  setText("liveDashboardDayTypeText", dayType.text);
  setText("liveDashboardBestUse", dayType.bestUse);

  metrics.forEach(metric => {
    const scoreId = `liveDashboard${metric.key}Score`;
    const textId = `liveDashboard${metric.key}Text`;
    const barId = `liveDashboard${metric.key}Bar`;
    const bandId = `liveDashboard${metric.key}Band`;

    setHTML(scoreId, `${metric.score}<span>/10</span>`);
    setText(textId, metric.helper);
    setMiniBar(barId, metric.score, 10);
    setText(bandId, bandFromScore(metric.score));
  });
}

function buildFieldUndertoneText(primaryField, undertoneField){
  const primary = String(primaryField || "").trim();
  const undertone = String(undertoneField || "").trim();

  if (!primary || !undertone) {
    return "No secondary field is close enough to change the read.";
  }

  if (primary === "Relational" && undertone === "Contained") {
    return "Relational is the main field. Contained pressure is close underneath, so part of the signal may need privacy, protection, or slower release.";
  }

  if (primary === "Relational" && undertone === "Reconstructive") {
    return "Contact is the main field. Repair pressure is close underneath, so one weak point may ask for attention — but the whole field does not need to be rebuilt. Clarify the contact first. Repair only the part that is actually asking for attention.";
  }

  if (primary === "Diffused" && undertone === "Reconstructive") {
    return "The field is mostly atmospheric or unclear. Repair pressure may be underneath, but wait until the actual weak point is clear before acting.";
  }

  if (primary === "Integrative" && undertone === "Reconstructive") {
    return "The main field is meaning-gathering. Repair pressure is present underneath, but the first move is to connect the pattern, then repair only what is actually exposed.";
  }

  if (primary === "Chaotic" && undertone === "Reconstructive") {
    return "Movement is the main field. Repair pressure is close underneath, so give the charge one repair channel instead of turning the whole field into a teardown.";
  }

  if (primary === "Threshold" && undertone === "Reconstructive") {
    return "The main field is an edge or crossing. Repair pressure is underneath, so cross only the repair that is ready.";
  }

  if (primary === "Reconstructive" && undertone === "Relational") {
    return "Repair is the main field. Relational pressure is underneath, so make the repair specific and avoid turning contact into a whole-field judgment.";
  }

  if (primary === "Reconstructive" && undertone === "Diffused") {
    return "Repair is the main field, but the background may feel unclear or atmospheric. Name the actual weak point before acting.";
  }

  if (primary === "Reconstructive" && undertone === "Integrative") {
    return "Repair is the main field, while meaning-gathering is close underneath. Fix what is actually exposed without trying to integrate every layer at once.";
  }

  if (primary === "Reconstructive" && undertone === "Chaotic") {
    return "Repair is the main field, while movement pressure is close underneath. Use the charge for one specific repair, not a full teardown.";
  }

  if (primary === "Reconstructive" && undertone === "Threshold") {
    return "Repair is the main field, while an edge or crossing is close underneath. Let the repair determine the timing, not urgency alone.";
  }

  if (undertone === "Reconstructive") {
    return `${primary} is the main field. Repair pressure is close underneath, so one weak point may ask for attention — but the whole field does not need to be rebuilt. Repair only what is actually exposed.`;
  }

  if (undertone === "Relational") {
    return `${primary} is the main field. Relational pressure is close underneath, so tone, contact, or shared-field feedback may matter. Keep contact clean and responsibility proportional.`;
  }

  if (undertone === "Diffused") {
    return `${primary} is the main field. Diffused pressure is close underneath, so the background may feel more atmospheric or harder to define. Ground before interpreting.`;
  }

  if (undertone === "Integrative") {
    return `${primary} is the main field. Integrative pressure is close underneath, so meaning may be gathering in the background. Let the larger pattern clarify one useful step.`;
  }

  if (undertone === "Chaotic") {
    return `${primary} is the main field. Chaotic movement is close underneath, so extra charge or disruption may be present. Give the energy one safe channel.`;
  }

  if (undertone === "Threshold") {
    return `${primary} is the main field. Threshold pressure is close underneath, so an edge, choice, or crossing may be near. Do not force the opening.`;
  }

  if (undertone === "Contained") {
    return `${primary} is the main field. Contained pressure is close underneath, so part of the signal may need privacy, protection, or slower release.`;
  }

  if (undertone === "Structured") {
    return `${primary} is the main field. Structured pressure is close underneath, so form, sequence, or a practical container may help stabilize the read.`;
  }

  if (undertone === "Regulated") {
    return `${primary} is the main field. Regulated pressure is close underneath, so pacing and load management may be the stabilizing background.`;
  }

  return `${primary} is the main field. ${undertone} pressure is close underneath as a secondary texture, but it does not replace the selected field.`;
}

function getFieldUndertone(dailyFieldDebug){
  const top = dailyFieldDebug?.topCandidates?.[0];
  const second = dailyFieldDebug?.topCandidates?.[1];

  if (!top || !second || !top.field || !second.field) {
    return {
      active: false,
      field: null,
      score: null,
      gap: null,
      ratio: null,
      title: "No strong undertone",
      text: "No secondary field is close enough to change the read."
    };
  }

  const primaryScore = safeNum(top.score);
  const secondaryScore = safeNum(second.score);
  const gap = primaryScore - secondaryScore;
  const ratio = primaryScore > 0 ? secondaryScore / primaryScore : 0;

  const active =
    second.field !== top.field &&
    secondaryScore > 0 &&
    ratio >= 0.86 &&
    gap <= 0.075;

  if (!active) {
    return {
      active: false,
      field: second.field,
      score: secondaryScore,
      gap,
      ratio,
      title: "No strong undertone",
      text: "The selected field is clear enough that the secondary field should stay in debug only."
    };
  }

  return {
    active: true,
    field: second.field,
    score: secondaryScore,
    gap,
    ratio,
    title: `${second.field} pressure is close underneath`,
    text: buildFieldUndertoneText(top.field, second.field)
  };
}

function updateFieldUndertoneUI(fieldUndertone){
  const undertone = fieldUndertone || getFieldUndertone(null);

  applyFieldUndertoneClasses(undertone);

  const blocks = [
    document.getElementById("topFieldUndertoneBlock"),
    document.getElementById("fieldUndertoneBlock")
  ];

  blocks.forEach(block => {
    if (!block) return;
    block.classList.toggle("active", !!undertone.active);
  });

  setText("topFieldUndertoneTitle", undertone.title || "No strong undertone");
  setText("topFieldUndertoneText", undertone.text || "No secondary field is close enough to change the read.");
  setText(
    "topFieldUndertoneMeta",
    undertone.active
      ? `Secondary field: ${undertone.field || "—"} · Gap: ${fmtMaybe(undertone.gap)} · Ratio: ${fmtMaybe(undertone.ratio)}`
      : "Secondary field stays in debug only."
  );

  setText("fieldUndertoneTitle", undertone.title || "No strong undertone");
  setText("fieldUndertoneText", undertone.text || "No secondary field is close enough to change the read.");
  setText(
    "fieldUndertoneMeta",
    undertone.active
      ? `Close underneath · Gap: ${fmtMaybe(undertone.gap)} · Ratio: ${fmtMaybe(undertone.ratio)}`
      : "Secondary field stays in debug only."
  );
}

function updateShareFieldUndertoneUI(fieldUndertone){
  const undertone = fieldUndertone || getFieldUndertone(null);
  const block = document.getElementById("shareCardFieldUndertoneBlock");

  applyFieldUndertoneClass("shareCardFieldUndertoneBlock", undertone);

  if (block) {
    block.classList.toggle("active", !!undertone.active);
  }

  setText("shareCardFieldUndertoneTitle", undertone.title || "No strong undertone");
  setText("shareCardFieldUndertoneText", undertone.text || "No secondary field is close enough to change the read.");
}

function updateLiveDebugFieldUndertoneUI(fieldUndertone){
  const undertone = fieldUndertone || getFieldUndertone(null);
  const status = undertone.active ? "Active" : "Inactive";
  const secondary = undertone.field || "—";
  const gapRatio = undertone.gap !== null && undertone.ratio !== null
    ? `${fmtMaybe(undertone.gap)} / ${fmtMaybe(undertone.ratio)}`
    : "—";

  setHTML(
    "liveDebugFieldUndertone",
    [
      renderLiveDebugPair("Status", status),
      renderLiveDebugPair("Secondary", secondary),
      renderLiveDebugPair("Gap / Ratio", gapRatio)
    ].join("")
  );
}

function calculateFieldTrend(data, harmonics){
  const state = data?.state || {};
  const field = harmonics?.todayField || "Regulated";
  const modeLabel = stateLabelFromMode(state.mode || "");
  const strain = safeNum(state.strain);
  const load = safeNum(state.amplifiedLoad);
  const regulation = safeNum(state.regulation);
  const driver = publicDriverName(primaryDriverName(data));
  const fieldPhrase = fieldPhraseFromHarmonic(field);

  let trend = "Stable";
  let rationale = "Regulation is holding the load; trend reads as stable.";

  if (modeLabel === "Overloaded" || strain >= 1.0) {
    trend = "Intensifying";
    rationale = `${driver} is increasing pressure while load is already high; trend reads as intensifying.`;
  } else if (
    modeLabel === "Threshold" ||
    strain >= 0.85 ||
    field === "Reconstructive" ||
    field === "Threshold"
  ) {
    trend = "Intensifying";
    rationale = `${driver} is increasing ${fieldPhrase}; trend reads as intensifying.`;
  } else if (modeLabel === "Mobilized" || strain >= 0.60 || load >= 0.75) {
    trend = "Active";
    rationale = `The field is active but still workable; ${driver} is the strongest driver.`;
  } else if (regulation >= 0.50 && strain < 0.55) {
    trend = "Easing";
    rationale = "Regulation is holding more of the load; trend reads as easing.";
  }

  return {
    trend,
    fieldPhrase,
    rationale
  };
}

function buildFieldDirectionText(harmonics, data){
  const field = harmonics?.todayField || "Regulated";
  const undertone = harmonics?.fieldUndertone || getFieldUndertone(harmonics?.dailyFieldDebug);
  const driver = publicDriverName(primaryDriverName(data));
  const driverText = driver && driver !== "—" ? ` ${driver} is the strongest active driver.` : "";
  const undertoneText = undertone?.active ? ` ${undertone.text}` : "";

  if (field === "Reconstructive") {
    return {
      title: "Repair pressure is active",
      text: `Something may be asking for adjustment today, but this does not mean collapse. Choose one repair instead of rebuilding the whole system.${undertoneText}${driverText}`
    };
  }

  if (field === "Chaotic") {
    return {
      title: "Extra movement is active",
      text: `The field may feel more mobile, scattered, or charged. Let movement happen, but give it one clean container.${undertoneText}${driverText}`
    };
  }

  if (field === "Threshold") {
    return {
      title: "The field is near an edge",
      text: `The field may bring openings, decisions, or crossings. Do not rush the threshold. Name the next step before moving.${undertoneText}${driverText}`
    };
  }

  if (field === "Diffused") {
    return {
      title: "The field is more atmospheric",
      text: `The field may feel subtle, foggy, or harder to define. Reduce inputs and look for one simple true line.${undertoneText}${driverText}`
    };
  }

  if (field === "Contained") {
    return {
      title: "The field is pulling inward",
      text: `The field favors privacy, inward processing, and protected formation. Let the signal shape quietly before forcing it outward.${undertoneText}${driverText}`
    };
  }

  if (field === "Relational") {
    return {
      title: "Contact is part of the field",
      text: `The field may clarify through tone, contact, or repair. Stay centered before trying to read or fix the room.${undertoneText}${driverText}`
    };
  }

  if (field === "Integrative") {
    return {
      title: "Meaning is gathering",
      text: `The field may connect pieces and widen the pattern. Integrate what helps today without carrying every fragment.${undertoneText}${driverText}`
    };
  }

  if (field === "Structured") {
    return {
      title: "Structure is available",
      text: `The field supports form, sequence, and practical order. Use the container, but do not over-tighten it.${undertoneText}${driverText}`
    };
  }

  return {
    title: "Stable field",
    text: `The field is readable enough to pace your next move. Keep the guidance practical and avoid turning the whole day into a problem to solve.${undertoneText}${driverText}`
  };
}

function updateOutlookUI(data, harmonics){
  const forecast = data?.forecast || {};
  const moonstampForecast = data?.moonstampForecast || {};
  const nowState = forecast?.now?.state || stateLabelFromMode(data?.state?.mode || "");
  const plus6State = forecast?.plus6?.state || moonstampForecast?.plus6?.state || nowState;
  const plus24State = forecast?.plus24?.state || moonstampForecast?.plus24?.state || nowState;
  const field = harmonics?.todayField || "—";
  const stateLabel = stateLabelFromMode(data?.state?.mode || "");
  const direction = buildFieldDirectionText(harmonics, data);

  const plus6Text =
    forecast?.plus6?.text ||
    moonstampForecastText(moonstampForecast?.plus6, outlookTextFromState(plus6State, "Next timing window"));

  const plus24Text =
    forecast?.plus24?.text ||
    moonstampForecastText(moonstampForecast?.plus24, outlookTextFromState(plus24State, "Later field window"));

  setText("outlookStateChip", `${stateLabel} State`);
  applyChipClass("outlookStateChip", "chip violet", "");

  setHTML("outlookFieldChip", `Field:&nbsp;${harmonicLabel(field)}`);
  applyChipClass("outlookFieldChip", "chip field", field);

  setText("outlookNowState", nowState);
  setText("outlookNowText", outlookTextFromState(nowState, "Now"));

  setText("outlookShortState", plus6State);
  setText("outlookShortText", plus6Text);

  setText("outlook24State", plus24State);
  setText("outlook24Text", plus24Text);

  setText("outlookDirectionTitle", direction.title);
  setText("outlookDirectionText", direction.text);
  applyFieldClasses(field);
  updateFieldUndertoneUI(harmonics?.fieldUndertone);
}

function updateFieldTranslationUI(field){
  const translation = getFieldTranslation(field || "Regulated");

  setHTML("fieldTranslationChip", `Field:&nbsp;${harmonicLabel(field || "Regulated")}`);
  applyChipClass("fieldTranslationChip", "chip field", field || "Regulated");

  setHTML("fieldTranslationTitle", harmonicLabel(field || "Regulated"));
  setText("fieldTranslationShort", translation.short);
  setText("fieldTranslationMeaning", translation.meaning);
  setText("fieldTranslationBest", translation.best);
  setText("fieldTranslationWatch", translation.watch);
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

function buildMotionStyle(normalizedNatalScores, primary){
  const scores = normalizedNatalScores || {};

  const chaoticScore = safeNum(scores.Chaotic);
  const thresholdScore = safeNum(scores.Threshold);
  const containedScore = safeNum(scores.Contained);
  const structuredScore = safeNum(scores.Structured);
  const reconstructiveScore = safeNum(scores.Reconstructive);
  const diffusedScore = safeNum(scores.Diffused);
  const primaryScore = safeNum(scores[primary]);

  const CHAOTIC_FLOOR = 0.55;
  const THRESHOLD_FLOOR = 0.55;
  const CONTAINED_FLOOR = 0.52;
  const RECONSTRUCTIVE_FLOOR = 0.56;
  const DIFFUSED_FLOOR = 0.56;
  const FALLBACK_FLOOR = 0.62;

  const chaoticActive =
    chaoticScore >= CHAOTIC_FLOOR &&
    (
      chaoticScore >= primaryScore * 0.95 ||
      chaoticScore >= structuredScore * 1.00
    );

  const thresholdActive =
    thresholdScore >= THRESHOLD_FLOOR &&
    (
      thresholdScore >= primaryScore * 0.95 ||
      thresholdScore >= chaoticScore * 0.95
    );

  const containedActive =
    containedScore >= CONTAINED_FLOOR &&
    (
      containedScore >= primaryScore * 0.90 ||
      containedScore >= chaoticScore * 0.88 ||
      containedScore >= thresholdScore * 0.88
    );

  const reconstructiveActive =
    reconstructiveScore >= RECONSTRUCTIVE_FLOOR &&
    (
      reconstructiveScore >= primaryScore * 0.90 ||
      reconstructiveScore >= chaoticScore * 0.88 ||
      reconstructiveScore >= thresholdScore * 0.88
    );

  const diffusedActive =
    diffusedScore >= DIFFUSED_FLOOR &&
    (
      diffusedScore >= primaryScore * 0.90 ||
      diffusedScore >= chaoticScore * 0.88 ||
      diffusedScore >= thresholdScore * 0.88
    );

  const containedProtectiveCloseCall =
    chaoticActive &&
    thresholdActive &&
    diffusedActive &&
    containedScore >= CONTAINED_FLOOR &&
    containedScore >= diffusedScore * 0.82;

  const activeCandidates = [];

  if (chaoticActive) activeCandidates.push({ label: "Chaotic", score: chaoticScore });
  if (thresholdActive) activeCandidates.push({ label: "Threshold", score: thresholdScore });
  if (containedActive || containedProtectiveCloseCall) activeCandidates.push({ label: "Contained", score: containedScore });
  if (reconstructiveActive) activeCandidates.push({ label: "Reconstructive", score: reconstructiveScore });
  if (diffusedActive && !containedProtectiveCloseCall) activeCandidates.push({ label: "Diffused", score: diffusedScore });

  if (activeCandidates.length > 0 && activeCandidates.length <= 3) {
    return activeCandidates.map(item => item.label).join(" / ");
  }

  if (activeCandidates.length > 3) {
    const finalMotionParts = [];

    if (chaoticActive) finalMotionParts.push("Chaotic");
    if (thresholdActive) finalMotionParts.push("Threshold");

    const remainingCandidates = [
      {
        label: "Contained",
        score: containedScore,
        active: containedActive || containedProtectiveCloseCall
      },
      {
        label: "Reconstructive",
        score: reconstructiveScore,
        active: reconstructiveActive
      },
      {
        label: "Diffused",
        score: diffusedScore,
        active: diffusedActive && !containedProtectiveCloseCall
      }
    ]
      .filter(item => item.active && !finalMotionParts.includes(item.label))
      .sort((a, b) => b.score - a.score);

    remainingCandidates.forEach(item => {
      if (finalMotionParts.length < 3) finalMotionParts.push(item.label);
    });

    const motionOrder = ["Chaotic", "Threshold", "Contained", "Reconstructive", "Diffused"];

    return finalMotionParts
      .sort((a, b) => motionOrder.indexOf(a) - motionOrder.indexOf(b))
      .slice(0, 3)
      .join(" / ");
  }

  const fallbackCandidates = [
    { label: "Chaotic", score: chaoticScore },
    { label: "Threshold", score: thresholdScore },
    { label: "Contained", score: containedScore },
    { label: "Reconstructive", score: reconstructiveScore },
    { label: "Diffused", score: diffusedScore }
  ].sort((a, b) => b.score - a.score);

  const topMotion = fallbackCandidates[0];

  if (topMotion && topMotion.score >= FALLBACK_FLOOR) {
    return topMotion.label;
  }

  return "Steady";
}

function getDistortionState(harmonics, data){
  const primary = harmonics?.primary || "Structured";
  const motion = harmonicText(harmonics?.motionStyle || "");
  const distortion = harmonics?.distortion || "Regulated";
  const field = harmonics?.todayField || "Regulated";

  const state = data?.state || {};
  const strain = safeNum(state.strain);
  const load = safeNum(state.amplifiedLoad);
  const regulation = safeNum(state.regulation);

  const highLoad = strain >= 0.85 || load >= 0.85;
  const lowRegulation = regulation < 0.45;

  const motionHasLocal = (name) => String(motion).includes(name);

  if (
    primary === "Relational" ||
    field === "Relational" ||
    distortion === "Relational" ||
    (distortion === "Diffused" && field === "Relational")
  ) {
    return "emotionalFusion";
  }

  if (
    distortion === "Diffused" ||
    distortion === "Integrative" ||
    primary === "Diffused" ||
    primary === "Integrative" ||
    field === "Diffused"
  ) {
    return "scatter";
  }

  if (
    motionHasLocal("Chaotic") ||
    motionHasLocal("Threshold") ||
    distortion === "Chaotic" ||
    distortion === "Threshold" ||
    (highLoad && field === "Threshold")
  ) {
    return lowRegulation || highLoad ? "rupture" : "scatter";
  }

  if (
    distortion === "Structured" ||
    distortion === "Regulated" ||
    primary === "Structured" ||
    primary === "Regulated"
  ) {
    return highLoad && lowRegulation ? "rupture" : "overStructuring";
  }

  if (primary === "Reconstructive" || field === "Reconstructive" || distortion === "Reconstructive") {
    return highLoad ? "rupture" : "overStructuring";
  }

  return "overStructuring";
}

function renderLiveDebugPair(label, value){
  return `<div class="liveDebugMiniItem"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderLiveDebugScore(label, value){
  return `<div class="liveDebugScoreItem"><span>${label}</span><strong>${fmtMaybe(value)}</strong></div>`;
}

function updateLiveFieldDebugUI(dailyFieldDebug){
  const debug = dailyFieldDebug || {};
  const selectedField = debug.selectedField || "—";
  const fieldUndertone = debug.fieldUndertone || getFieldUndertone(debug);

  setText("liveDebugSelectedField", selectedField);
  setText("liveDebugSelectedFieldBadge", `Selected Field: ${selectedField}`);

  const topCandidates = Array.isArray(debug.topCandidates) ? debug.topCandidates : [];
  const topCandidatesHTML = [0, 1, 2].map(index => {
    const item = topCandidates[index] || {};
    const field = item.field || "—";
    const score = item.field ? fmtMaybe(item.score) : "—";

    return `
      <div class="liveDebugCandidateRow">
        <span>${index + 1}. ${field}</span>
        <strong>${score}</strong>
      </div>
    `;
  }).join("");

  setHTML("liveDebugTopCandidates", topCandidatesHTML);

  const normalizedFieldScores = debug.normalizedFieldScores || {};
  const allFields = [
    "Structured",
    "Contained",
    "Chaotic",
    "Relational",
    "Threshold",
    "Reconstructive",
    "Integrative",
    "Diffused",
    "Regulated"
  ];

  setHTML(
    "liveDebugAllFieldScores",
    allFields.map(field => renderLiveDebugScore(field, normalizedFieldScores[field])).join("")
  );

  const loadInputs = debug.stateLoadInputs || {};
  setHTML(
    "liveDebugLoadInputs",
    [
      renderLiveDebugPair("Current Strain", fmtMaybe(loadInputs.currentStrain)),
      renderLiveDebugPair("Current Load", fmtMaybe(loadInputs.currentLoad)),
      renderLiveDebugPair("Current Regulation", fmtMaybe(loadInputs.currentRegulation))
    ].join("")
  );

  const slowInputs = debug.slowBodyClimateInputs || {};
  const fastInputs = debug.fastBodyInputs || {};
  setHTML(
    "liveDebugTransitInputs",
    [
      renderLiveDebugPair("Transit Pluto", fmtMaybe(slowInputs.transitPluto)),
      renderLiveDebugPair("Transit Uranus", fmtMaybe(slowInputs.transitUranus)),
      renderLiveDebugPair("Transit Neptune", fmtMaybe(slowInputs.transitNeptune)),
      renderLiveDebugPair("Transit Mars", fmtMaybe(fastInputs.transitMars)),
      renderLiveDebugPair("Transit Saturn", fmtMaybe(slowInputs.transitSaturn)),
      renderLiveDebugPair("Transit Mercury", fmtMaybe(fastInputs.transitMercury))
    ].join("")
  );

  const moonstampInputs = debug.moonstampInputs || {};
  setHTML(
    "liveDebugMoonstampInputs",
    [
      renderLiveDebugPair("Moonstamp State", moonstampInputs.state || "—"),
      renderLiveDebugPair("Moonstamp Phase", moonstampInputs.phase || "—"),
      renderLiveDebugPair("Forecast Modifier", moonstampInputs.forecastModifier || "—")
    ].join("")
  );

  updateLiveDebugFieldUndertoneUI(fieldUndertone);
}

function getMotionStyleRead(motionStyle){
  const parts = String(motionStyle || "")
    .split("/")
    .map(part => part.trim())
    .filter(Boolean);

  const normalizedParts = parts.length ? parts : ["Steady"];
  const key = normalizedParts.join(" / ");

  const reads = {
    "Steady": "Signal moves through pacing, continuity, and manageable rhythm.",
    "Chaotic": "Signal activates quickly, moves nonlinearly, and needs a useful channel.",
    "Threshold": "Signal moves toward edges, decisions, access points, or crossings.",
    "Contained": "Signal pulls inward, protects the channel, and waits for safety before release.",
    "Reconstructive": "Signal moves toward repair, reset, structural correction, or rebuild pressure.",
    "Diffused": "Signal spreads through the atmosphere and needs grounding before clear action.",
    "Chaotic / Threshold": "Fast activation moves toward unresolved pressure, weak points, decisions, or turning points.",
    "Chaotic / Contained": "Fast signal rises, then pulls inward to prevent spillover.",
    "Threshold / Contained": "The system senses an edge, then protects the crossing until safety is clear.",
    "Chaotic / Reconstructive": "Fast activation moves toward repair pressure and wants to fix the weak point quickly.",
    "Threshold / Reconstructive": "The system senses a crossing where repair, reset, or structural change is needed.",
    "Contained / Reconstructive": "Repair pressure goes inward first and needs a protected container before action.",
    "Chaotic / Diffused": "Fast signal spreads across the field and needs grounding before it scatters.",
    "Threshold / Diffused": "The system senses an edge, but the signal may feel unclear until the field settles.",
    "Contained / Diffused": "Signal pulls inward and becomes atmospheric; grounding is needed before interpretation.",
    "Reconstructive / Diffused": "Repair pressure is present, but the weak point may not be clear yet.",
    "Chaotic / Threshold / Contained": "Fast activation finds the access point, then contains or closes the channel when the field feels unsafe, contaminated, or no longer repairable.",
    "Chaotic / Threshold / Reconstructive": "Fast activation finds the pressure point and wants to force a repair or reset quickly.",
    "Chaotic / Threshold / Diffused": "Fast activation finds an edge, but the field may feel scattered or unclear before the right move appears.",
    "Chaotic / Contained / Reconstructive": "Fast repair pressure rises, then pulls inward so the system can process before acting.",
    "Chaotic / Contained / Diffused": "Fast signal rises, spreads, then pulls inward because the field feels too porous or unclear.",
    "Chaotic / Reconstructive / Diffused": "Fast repair pressure spreads quickly; the system needs one concrete weak point before acting.",
    "Threshold / Contained / Reconstructive": "The system senses a repair threshold, then protects the channel until the change can happen safely.",
    "Threshold / Contained / Diffused": "The system senses an edge, then pulls inward because the signal is not clear enough to cross cleanly.",
    "Threshold / Reconstructive / Diffused": "The system senses a repair threshold, but needs clarity before deciding what actually needs to change.",
    "Contained / Reconstructive / Diffused": "Repair pressure goes inward, becomes subtle or foggy, and needs grounding before any rebuild."
  };

  if (reads[key]) return reads[key];

  if (normalizedParts.length === 1) {
    return reads[normalizedParts[0]] || "Signal moves through a pattern that needs pacing, containment, and one clean next step.";
  }

  const readableParts = normalizedParts.map(part => part.toLowerCase()).join(", ");
  return `Signal moves through ${readableParts}. Keep the interpretation practical and choose one clean next move.`;
}

function buildDailyGuidance(harmonics, data){
  const primary = harmonics.primary || "Structured";
  const field = harmonics.todayField || "Regulated";
  const fieldUndertone = harmonics.fieldUndertone || getFieldUndertone(harmonics.dailyFieldDebug);
  const stateLabel = stateLabelFromMode(data?.state?.mode || "");
  const primaryLower = primary.toLowerCase();
  const fieldLower = field.toLowerCase();

  let read = `Your ${primaryLower} root pattern is meeting a ${fieldLower} field today. Let today’s field guide your pace, but do not let temporary weather rewrite your identity.`;
  let lean = "Choose the clearest useful move and keep the day simple.";
  let watch = "Watch for turning the whole field into something you have to solve at once.";
  let move = "Pick one pressure point and give it a clean next step.";
  let ret = "Name what is actually active, then stop before you expand the task.";

  if (field === "Relational") {
    lean = "Clean contact, simple language, proportional repair, and centered response.";
    watch = "Over-reading tone, absorbing the shared field, or trying to fix the whole room.";
    move = "Name one relational signal plainly and keep responsibility proportional.";
    ret = "Return to your own center before trying to repair the field.";
  } else if (field === "Reconstructive") {
    lean = "Honest repair, one clean adjustment, and practical containment.";
    watch = "Treating every weak point like it means the whole structure has failed.";
    move = "Choose one honest adjustment and give it a clean container.";
    ret = "Remind yourself that one repair is not the same as rebuilding the whole system.";
  } else if (field === "Contained") {
    lean = "Private refinement, protected timing, low input, and careful release.";
    watch = "Holding everything inside until the pressure becomes harder to name.";
    move = "Let one small piece of the inner field become visible or workable.";
    ret = "Return to privacy as a container, not a hiding place.";
  } else if (field === "Diffused") {
    lean = "Soft focus, fewer inputs, and one clear sentence.";
    watch = "Over-explaining fog or forcing definition before the signal forms.";
    move = "Give the atmosphere one sentence and let that be enough.";
    ret = "Come back to the simplest true line.";
  } else if (field === "Integrative") {
    lean = "Synthesis, pattern-linking, and choosing the one connection that actually helps.";
    watch = "Trying to integrate every loose end today.";
    move = "Name the larger pattern, then reduce it to one workable step.";
    ret = "Come back to the structure that makes the meaning usable.";
  } else if (field === "Chaotic") {
    lean = "Movement with a container, quick release, and one useful direction for the charge.";
    watch = "Following every spark until the whole day loses continuity.";
    move = "Pick one channel for the energy and let the rest pass through.";
    ret = "Return to rhythm before chasing another signal.";
  } else if (field === "Threshold") {
    lean = "Clean timing, small crossings, and naming the actual decision point.";
    watch = "Treating every feeling of pressure like it means act now.";
    move = "Choose the one threshold that is real enough to cross today.";
    ret = "Return to the edge slowly and do not force the opening.";
  } else if (field === "Structured") {
    lean = "Simple systems, clear order, and one practical piece made more workable.";
    watch = "Over-refining the structure after it is already strong enough.";
    move = "Improve one useful container and stop before polish becomes strain.";
    ret = "Return to the structure that helps, not the structure that controls.";
  } else if (field === "Regulated") {
    lean = "Steady rhythm, clear limits, and one manageable action.";
    watch = "Tightening the system after the pressure is already manageable.";
    move = "Choose one useful rhythm and let it carry the next step.";
    ret = "Return to enough regulation, not total control.";
  }

  if (primary === "Chaotic" && field === "Reconstructive") {
    read = "Your root pattern moves quickly, nonlinearly, and toward pressure points, while today may bring repair or recalibration pressure. Not every burst of energy needs to become a teardown.";
    lean = "Directed repair, controlled release, and useful disruption.";
    watch = "Creating a bigger break than the situation actually needs.";
    move = "Use the charge to fix one weak point, not to rebuild the whole field.";
    ret = "Let movement serve repair. Stop once the first usable structure appears.";
  } else if (primary === "Structured" && field === "Reconstructive") {
    read = "Your root pattern wants clarity and form, but today may bring repair pressure. Do not turn normal strain into a full reconstruction project.";
  } else {
    read = `Your ${primaryLower} root pattern is meeting a ${fieldLower} field today. The read is about the interaction between your stable profile and the current field, not a permanent identity label.`;
  }

  if (fieldUndertone?.active) {
    watch = `${watch} Background note: ${fieldUndertone.title}.`;
  }

  if (stateLabel === "Overloaded") {
    watch = `${watch} Also watch for stacking more input when your system is already carrying enough.`;
    move = `Reduce scope first. ${move}`;
  } else if (stateLabel === "Threshold") {
    move = `Pause at the edge, then choose cleanly. ${move}`;
  } else if (stateLabel === "Mobilized") {
    lean = `${lean} Use the available movement, but keep it paced.`;
  }

  return { read, lean, watch, move, ret };
}

function buildProfileAwareEnglishRead(harmonics, data, stableProfileLabel, distortionState){
  const primary = harmonics?.primary || "Structured";
  const support = getHarmonicBaseName(harmonics?.support || "Regulated");
  const field = harmonics?.todayField || "Regulated";
  const fieldUndertone = harmonics?.fieldUndertone || getFieldUndertone(harmonics?.dailyFieldDebug);
  const currentState = stateLabelFromMode(data?.state?.mode || "");
  const label = stableProfileLabel || getStableProfileLabel(primary, support);
  const distortion = distortionState || DISTORTION_STATES.overStructuring;

  const primaryPhrases = {
    Structured: "turns pressure into order",
    Contained: "protects signal until it is ready to release",
    Chaotic: "moves fast signal into usable form",
    Relational: "reads tone, contact, and shared atmosphere",
    Threshold: "notices openings, crossings, and decisions",
    Reconstructive: "strengthens what pressure exposes",
    Integrative: "gathers the wider story into meaning",
    Diffused: "feels the atmosphere before defining it",
    Regulated: "manages load through rhythm and containment"
  };

  const fieldPressures = {
    Structured: "structure, sequence, and practical form are available",
    Contained: "the field is pulling inward for protected processing",
    Chaotic: "movement, charge, or disruption is active",
    Relational: "tone, contact, or shared-field pressure is active",
    Threshold: "an edge, opening, or decision point is active",
    Reconstructive: "repair or recalibration pressure is active",
    Integrative: "the pattern is widening and asking pieces to connect",
    Diffused: "the field is more subtle, porous, or hard to define",
    Regulated: "pacing, rhythm, and manageable movement are available"
  };

  const fieldBestInterpretations = {
    Structured: "Use the available form, but do not over-tighten it.",
    Contained: "Let the signal shape privately before forcing it outward.",
    Chaotic: "Give the movement one safe channel.",
    Relational: "Stay centered before trying to read or repair the room.",
    Threshold: "Name the real crossing before moving.",
    Reconstructive: "Treat this as one repair point, not a full-system failure.",
    Integrative: "Let the larger pattern clarify one useful step.",
    Diffused: "Ground first, then choose the simplest true line.",
    Regulated: "Let rhythm carry one practical action."
  };

  let todayRead = `${label}: ${primaryPhrases[primary] || "your root pattern is active"}. Today, ${fieldPressures[field] || "the current field is active"}. ${fieldBestInterpretations[field] || "Choose one clear next move."}`;
  let realLife = `When this shows up in normal life, keep the response to one clear move and do not let the field become bigger than the action.`;
  let shareRead = todayRead;
  let shareRealLife = realLife;
  let whySentence = `The profile-aware layer keeps the stable profile primary: ${label} combines ${harmonicText(primary)} root pattern with ${harmonicText(support)} support, while the ${harmonicText(field)} field describes today’s active pressure.`;

  if (fieldUndertone?.active) {
    todayRead += ` Field Undertone: ${fieldUndertone.text}`;
    realLife += ` ${fieldUndertone.text}`;
    shareRead += ` Field Undertone: ${fieldUndertone.title}.`;
    shareRealLife += ` ${fieldUndertone.text}`;
    whySentence += ` Field Undertone is active: ${fieldUndertone.title}. This modifies the read as secondary pressure only; it does not replace the selected field.`;
  }

  if (primary === "Chaotic" && support === "Structured") {
    todayRead = `${label}: fast signal becomes usable through structure, naming, framing, and containment. Today, ${fieldPressures[field] || "the current field is active"}. ${field === "Reconstructive" ? "Not every burst of energy needs to become a teardown." : "Give the charge one clear form."}`;
    realLife = field === "Reconstructive"
      ? "When energy rises, name the pressure, frame the weak point, and use the charge to repair one thing."
      : "When energy rises, name it, frame it, and give it one useful container before acting.";
    shareRead = `${label}: fast signal becomes usable through structure. Today, ${fieldPressures[field] || "the current field is active"}.`;
    shareRealLife = field === "Reconstructive"
      ? "Name the pressure. Frame the weak point. Repair one thing."
      : "Name the pressure, frame it, and give the charge one useful container.";
    whySentence = `The profile-aware layer keeps ${label} visible: the root signal moves fast, but the stabilizing support turns activation into structure, naming, framing, and usable pressure.`;

    if (fieldUndertone?.active) {
      todayRead += ` Field Undertone: ${fieldUndertone.text}`;
      realLife += ` ${fieldUndertone.text}`;
      shareRead += ` Field Undertone: ${fieldUndertone.title}.`;
      shareRealLife += ` ${fieldUndertone.text}`;
      whySentence += ` Field Undertone is active: ${fieldUndertone.title}. This modifies the read as secondary pressure only; it does not replace the selected field.`;
    }
  }

  if (currentState === "Overloaded") {
    todayRead += " Current state reads overloaded, so simplify before expanding.";
    realLife += " Reduce scope first.";
    shareRead += " Simplify before expanding.";
    shareRealLife += " Reduce scope first.";
    whySentence += " Current state is overloaded, so the profile-aware read prioritizes containment before interpretation.";
  } else if (currentState === "Threshold") {
    todayRead += " Current state is near a threshold, so timing matters more than intensity.";
    realLife += " Pause at the edge first.";
    shareRead += " Timing matters more than intensity.";
    shareRealLife += " Pause at the edge first.";
    whySentence += " Current state is thresholded, so the profile-aware read emphasizes timing and one clean crossing.";
  } else if (currentState === "Mobilized") {
    todayRead += " Current state is mobilized, so use the movement without stacking more pressure.";
    realLife += " Let momentum serve one move.";
    shareRead += " Use the movement without stacking pressure.";
    shareRealLife += " Let momentum serve one move.";
    whySentence += " Current state is mobilized, so the profile-aware read uses activation but keeps it paced.";
  }

  if (distortion?.label) {
    whySentence += ` Distortion watch: ${distortion.label} means ${distortion.plain}`;
  }

  return {
    todayRead,
    realLife,
    shareRead,
    shareRealLife,
    whySentence
  };
}

function buildCoreRule(harmonics, data, stableProfileLabel, distortionState, guidance){
  const primary = harmonics?.primary || "Structured";
  const support = getHarmonicBaseName(harmonics?.support || "Regulated");
  const label = stableProfileLabel || getStableProfileLabel(primary, support);
  const distortion = distortionState || DISTORTION_STATES.overStructuring;

  const gifts = {
    Structured: "Turn pressure into order.",
    Contained: "Protect the signal until it is ready.",
    Chaotic: "Let the signal move.",
    Relational: "Read the field without losing your center.",
    Threshold: "Sense the edge and time the crossing.",
    Reconstructive: "Strengthen the weak point.",
    Integrative: "Gather the pieces into meaning.",
    Diffused: "Feel the field, then find one anchor.",
    Regulated: "Pace the load."
  };

  const supportAdds = {
    Structured: "Give it form.",
    Contained: "Keep it protected.",
    Chaotic: "Give it motion.",
    Relational: "Keep contact clean.",
    Threshold: "Move at the right edge.",
    Reconstructive: "Repair what is real.",
    Integrative: "Connect only what helps.",
    Diffused: "Keep one gentle anchor.",
    Regulated: "Keep the pace steady."
  };

  let useGift = gifts[primary] || "Use your root pattern cleanly.";

  if (primary === "Chaotic" && support === "Structured") {
    useGift = "Let the signal move, then give it form.";
  } else if (supportAdds[support] && support !== primary) {
    useGift = `${useGift} ${supportAdds[support]}`;
  }

  let watchDistortion = distortion.returnPath || "Return to one clear channel before responding.";

  if (distortion.label === "Emotional Fusion") {
    watchDistortion = "Separate mine / not mine before responding.";
  } else if (distortion.label === "Rupture") {
    watchDistortion = "Do not break contact faster than the field requires.";
  } else if (distortion.label === "Over-Structuring") {
    watchDistortion = "Do not add more structure than the moment needs.";
  } else if (distortion.label === "Scatter") {
    watchDistortion = "Choose one channel before the signal spreads.";
  }

  return {
    label,
    useGift,
    watchDistortion,
    makeMove: guidance?.move || "Choose one clear next move."
  };
}

function buildShortDriverNote(data, harmonics, fieldTrend){
  const driver = publicDriverName(primaryDriverName(data));
  const field = harmonics?.todayField || "Regulated";
  const fieldUndertone = harmonics?.fieldUndertone || getFieldUndertone(harmonics?.dailyFieldDebug);
  const stateLabel = stateLabelFromMode(data?.state?.mode || "");
  const cleanDriver = driver && driver !== "—" ? driver : "The strongest current driver";
  const driverLower = String(cleanDriver).toLowerCase();

  let note = `${cleanDriver} may shape how today’s field lands. Choose one manageable next move.`;

  if (driverLower.includes("pluto")) {
    note = "Pluto may make the pressure feel deeper or more fundamental today. Use it for one honest repair, not a full rebuild.";
  } else if (driverLower.includes("mars")) {
    note = "Mars may raise activation or urgency today. Use the extra charge for one clear action.";
  } else if (driverLower.includes("uranus")) {
    note = "Uranus may add movement or sudden signal today. Let the change show one useful adjustment.";
  } else if (driverLower.includes("neptune")) {
    note = "Neptune may make the field feel foggier or more blended today. Reduce input and find one simple true line.";
  } else if (driverLower.includes("saturn")) {
    note = "Saturn may add pressure, limits, or structure today. Use the container to simplify the load.";
  } else if (driverLower.includes("venus")) {
    note = "Venus may bring tone, contact, or relational regulation into focus today. Let steadiness and repair lead.";
  } else if (driverLower.includes("mercury")) {
    note = "Mercury may sharpen language and interpretation today. Name the signal plainly, then stop.";
  } else if (driverLower.includes("moon")) {
    note = "The Moon may make the field more responsive or body-led today. Let the signal settle first.";
  } else if (driverLower.includes("jupiter")) {
    note = "Jupiter may widen the field or add meaning today. Let the larger pattern help without carrying everything.";
  } else if (driverLower.includes("sun")) {
    note = "The Sun may bring identity, focus, or visibility into the field today. Let the signal clarify direction without forcing proof.";
  }

  if (field === "Reconstructive" && !driverLower.includes("pluto")) {
    note += " Focus on one repair that is actually present.";
  } else if (field === "Threshold" && !driverLower.includes("mars")) {
    note += " Pause before crossing and choose the next step cleanly.";
  } else if (field === "Diffused" && !driverLower.includes("neptune")) {
    note += " Fewer inputs can help the real signal stand out.";
  } else if (field === "Chaotic" && !driverLower.includes("uranus")) {
    note += " Give the movement one safe container.";
  }

  if (fieldUndertone?.active) {
    note += ` Field Undertone: ${fieldUndertone.title}. Treat it as background pressure, not the main field.`;
  }

  if (stateLabel === "Overloaded") {
    note += " Since the system reads overloaded, keep the move small.";
  } else if (stateLabel === "Threshold") {
    note += " Since the system reads near threshold, move carefully.";
  } else if (stateLabel === "Mobilized") {
    note += " Because the system is mobilized, keep momentum paced.";
  }

  return note;
}

function buildDriverNote(data, harmonics, fieldTrend){
  return buildShortDriverNote(data, harmonics, fieldTrend);
}

function renderHarmonicLibrary(activePrimary = "", activeField = ""){
  const grid = document.getElementById("harmonicLibraryGrid");
  if (!grid) return;

  grid.innerHTML = Object.entries(HARMONICS).map(([key, item]) => {
    const activeClass = key === activePrimary || key === activeField ? "active" : "";
    const activeLabel = key === activePrimary
      ? "Root pattern"
      : key === activeField
        ? "Current field"
        : "";

    return `
      <article class="libraryCard ${activeClass}">
        <h3>${harmonicLabel(item.label)}${activeLabel ? `&nbsp;· ${activeLabel}` : ""}</h3>
        <p><strong>Signal Quality:</strong> ${item.signalQuality}</p>
        <p><strong>Stability Method:</strong> ${item.stabilityMethod}</p>
        <p><strong>Overload Risk:</strong> ${item.overloadRisk}</p>
        <p>${item.plainRead}</p>
      </article>
    `;
  }).join("");
}

function updateMoonstampModifierBlock(data){
  const moonstampModifierRead = buildMoonstampModifierRead(data);
  const block = document.getElementById("moonstampModifierBlock");

  if (block) {
    block.style.display = "block";
  }

  setText("moonstampModifierTitle", moonstampModifierRead.title);
  setText("moonstampModifierText", moonstampModifierRead.text);
  setText("moonstampModifierMeta", moonstampModifierRead.meta);

  if (moonstampModifierRead.hasMoonstamp) {
    setText("shareCardMoonstampModifier", `${moonstampModifierRead.title}: ${moonstampModifierRead.text}`);
  } else {
    setText("shareCardMoonstampModifier", "");
  }

  return moonstampModifierRead;
}

function renderWhyExplainBlock(title, text){
  return `
    <div class="whyExplainBlock">
      <div class="whyExplainTitle">${title}</div>
      <div class="whyExplainText">${text}</div>
    </div>
  `;
}

function updateWhyReadUI(harmonics, data, fieldTrend, profileAwareRead, regulationSupports){
  const state = data?.state || {};
  const moonstamp = getMoonstamp(data);
  const hasMoonstamp = hasMoonstampData(data);
  const primary = harmonics.primary || "Structured";
  const support = harmonics.support || "Regulated";
  const stableProfileLabel = getStableProfileLabel(primary, support);
  const field = harmonics.todayField || "Regulated";
  const fieldUndertone = harmonics.fieldUndertone || getFieldUndertone(harmonics.dailyFieldDebug);
  const motionStyle = harmonics.motionStyle || "—";
  const motionStyleRead = getMotionStyleRead(motionStyle);
  const currentState = stateLabelFromMode(state.mode || "");
  const driver = publicDriverName(primaryDriverName(data));
  const loadBand = loadBandFromValue(state.amplifiedLoad);
  const capacityBand = capacityBandFromValue(state.capacity);
  const regulationBand = regulationBandFromValue(state.regulation);
  const distortion = harmonics.distortion || "Diffused";
  const distortionState = DISTORTION_STATES[harmonics.distortionStateKey] || DISTORTION_STATES.overStructuring;
  const driverNote = buildDriverNote(data, harmonics, fieldTrend);
  const moonstampLine = hasMoonstamp
    ? `${formatMoonstampTiming(moonstamp)} · ${buildMoonstampModifier(data)}`
    : "Moonstamp modifier pending";

  setHTML("whyBaseline", harmonicLabel(primary));
  setHTML("whyField", harmonicLabel(field));
  setText("whyFieldUndertone", fieldUndertone?.active ? `${fieldUndertone.title} (${fmtMaybe(fieldUndertone.score)})` : "No strong undertone");
  setHTML("whyMotionStyle", harmonicLabel(motionStyle));
  setText("whyState", currentState);
  setText("whyDriver", driver);
  setText("whyLoad", loadBand);
  setText("whyCapacity", capacityBand);
  setText("whyRegulation", regulationBand);
  setText("whyDistortion", distortionState.label);
  setText("whyDirection", fieldTrend.trend);
  setText("whyRationale", fieldTrend.rationale);
  setText("whyPeakTiming", formatMoonstampTiming(moonstamp));
  setText("whyMoonstampModifier", moonstampLine);

  const stableProfileText = `${profileAwareRead?.whySentence || ""} Lucy.OS is reading a ${harmonicText(primary)} root pattern inside a ${harmonicText(field)} current field. Stable profile translation: ${stableProfileLabel}. This means the guidance is not only “who you are” and not only “what today is doing.” It is the interaction between your stable profile and the current field.`;

  const currentFieldText = `${harmonicText(field)} is the selected Current Field. ${fieldTrend.rationale} The field shows what pressure is active right now; it does not rewrite your root pattern.`;

  const fieldUndertoneText = fieldUndertone?.active
    ? `Field Undertone is ${fieldUndertone.title}. ${fieldUndertone.text} Undertone stays secondary: it adds background texture without replacing the selected field.`
    : "No strong Field Undertone is active, so the selected field is clear enough to carry the read without a visible secondary layer.";

  const motionLoadText = `Motion Style is ${harmonicText(motionStyle).toLowerCase()}: ${motionStyleRead} Current state is ${currentState.toLowerCase()}; load is ${loadBand.toLowerCase()}, capacity is ${capacityBand.toLowerCase()}, and regulation is ${regulationBand.toLowerCase()}.`;

  const distortionWatchText = `Primary distortion state is ${distortionState.label}: ${distortionState.plain} Return path: ${distortionState.returnPath}`;

  const driverNoteText = driverNote;

  const regulationSupportsText = regulationSupports
    ? `Regulation Supports selected: ${regulationSupports.state}. Support quality: ${regulationSupports.quality}. This is a practical sensory/environment layer only; it does not change identity routing, Today’s Field selection, Field Undertone, repairGate, or engine scoring.`
    : "Regulation Supports are waiting for the support read. When active, this layer translates the current field into practical environment and behavior support.";

  const moonstampModifierText = hasMoonstamp
    ? `Moonstamp line: ${moonstampLine}. Moonstamp modifies the timing field; it does not replace your harmonic profile. Use it as a field modifier, not an identity label.`
    : "Moonstamp line: Moonstamp modifier pending. The app is waiting for backend Moonstamp data before adding lunar timing texture.";

  const optionalMatchText = distortion === field
    ? renderWhyExplainBlock(
        "Field / Distortion Match",
        "The raw distortion harmonic matches today’s field, so the same pattern that is active today can become the overload route if the load keeps stacking."
      )
    : "";

  setHTML(
    "whyConfigText",
    `<div class="whyExplainStack">
      ${renderWhyExplainBlock("Stable Profile", stableProfileText)}
      ${renderWhyExplainBlock("Current Field", currentFieldText)}
      ${renderWhyExplainBlock("Field Undertone", fieldUndertoneText)}
      ${renderWhyExplainBlock("Motion + Load", motionLoadText)}
      ${renderWhyExplainBlock("Distortion Watch", distortionWatchText)}
      ${optionalMatchText}
      ${renderWhyExplainBlock("Driver Note", driverNoteText)}
      ${renderWhyExplainBlock("Regulation Supports", regulationSupportsText)}
      ${renderWhyExplainBlock("Moonstamp Modifier", moonstampModifierText)}
    </div>`
  );
}

function updateShareUI({
  systemWeather,
  fieldDirectionTitle,
  fieldDirectionText,
  fieldUndertone,
  coreRule,
  moonstampModifier,
  regulationSupports,
  todayRead,
  realLifeText,
  driverNote,
  goodMove,
  returnText,
  primary,
  field,
  state,
  motionStyle,
  motionStyleRead
}){
  latestSharePayload = {
    systemWeather,
    fieldDirectionTitle,
    fieldDirectionText,
    fieldUndertone: fieldUndertone || {
      active: false,
      field: null,
      score: null,
      gap: null,
      ratio: null,
      title: "No strong undertone",
      text: "No secondary field is close enough to change the read."
    },
    coreRule,
    moonstampModifier: moonstampModifier || { hasMoonstamp: false, title: "", text: "", shareLine: "" },
    regulationSupports: regulationSupports || {
      state: "—",
      quality: "—",
      tryItems: [],
      why: "—",
      music: "—"
    },
    todayRead,
    realLifeText,
    driverNote,
    goodMove,
    returnText,
    primary,
    field,
    state,
    motionStyle,
    motionStyleRead
  };

  setHTML("shareBaselineChip", `Root:&nbsp;${harmonicLabel(primary)}`);
  setHTML("shareFieldChip", `Field:&nbsp;${harmonicLabel(field)}`);
  setText("shareStateChip", `State: ${state}`);

  setHTML("shareCardBaselineChip", `Root:&nbsp;${harmonicLabel(primary)}`);
  setHTML("shareCardFieldChip", `Field:&nbsp;${harmonicLabel(field)}`);
  setText("shareCardStateChip", `State: ${state}`);

  applyChipClass("shareBaselineChip", "shareChip", primary);
  applyChipClass("shareFieldChip", "shareChip", field);
  applyChipClass("shareStateChip", "shareChip violet", "");

  applyChipClass("shareCardBaselineChip", "shareCardChip", primary);
  applyChipClass("shareCardFieldChip", "shareCardChip", field);
  applyChipClass("shareCardStateChip", "shareCardChip violet", "");

  setText("shareCardWeather", systemWeather);
  setText("shareCardFieldDirectionTitle", fieldDirectionTitle || "—");
  setText("shareCardFieldDirectionText", fieldDirectionText || "Waiting for field direction.");

  updateShareFieldUndertoneUI(fieldUndertone);

  setText("shareCardCoreGift", coreRule?.useGift || "Use your gift cleanly.");
  setText("shareCardCoreDistortion", coreRule?.watchDistortion || "Watch the distortion before responding.");
  setText("shareCardCoreMove", coreRule?.makeMove || goodMove || "Choose one clear next move.");

  setText("shareCardTodayRead", todayRead);
  setText("shareCardRealLife", realLifeText || "Translate the read into one practical action.");
  setText("shareCardMotionStyle", harmonicText(motionStyle || "—"));
  setText("shareCardDriverNote", driverNote);
  setText("shareCardGoodMove", goodMove);
  setText("shareCardReturn", returnText);

  updateRegulationSupportsUI(regulationSupports);

  const shareMoonstampBlock = document.getElementById("shareCardMoonstampBlock");
  if (shareMoonstampBlock) {
    shareMoonstampBlock.classList.toggle("active", !!moonstampModifier?.hasMoonstamp);
  }

  if (moonstampModifier?.hasMoonstamp) {
    setText("shareCardMoonstampModifier", `${moonstampModifier.title}: ${moonstampModifier.text}`);
  } else {
    setText("shareCardMoonstampModifier", "");
  }
}

function getShareText(){
  const lines = [
    "Lucy.OS Pro",
    "",
    "Today’s System Weather:",
    latestSharePayload.systemWeather,
    "",
    "Current Field Direction:",
    latestSharePayload.fieldDirectionTitle || "—",
    latestSharePayload.fieldDirectionText || "Waiting for field direction."
  ];

  if (latestSharePayload.fieldUndertone?.active) {
    lines.push(
      "",
      "Field Undertone:",
      latestSharePayload.fieldUndertone.title || "Secondary pressure is close underneath",
      latestSharePayload.fieldUndertone.text || "The secondary field modifies the read without replacing the selected field."
    );
  }

  lines.push(
    "",
    "Core Rule:",
    "Use your gift:",
    latestSharePayload.coreRule?.useGift || "Use your gift cleanly.",
    "Watch the distortion:",
    latestSharePayload.coreRule?.watchDistortion || "Watch the distortion before responding.",
    "Make the move:",
    latestSharePayload.coreRule?.makeMove || latestSharePayload.goodMove || "Choose one clear next move."
  );

  if (latestSharePayload.moonstampModifier?.hasMoonstamp) {
    lines.push(
      "",
      "Moonstamp Modifier:",
      latestSharePayload.moonstampModifier.title || "Lunar timing modifier",
      latestSharePayload.moonstampModifier.text || "The lunar field adds timing texture to today’s read."
    );
  }

  const supports = latestSharePayload.regulationSupports || {};

  lines.push(
    "",
    "Regulation Supports:",
    "State:",
    supports.state || "—",
    "Support quality needed:",
    supports.quality || "—",
    "Try:",
    Array.isArray(supports.tryItems) && supports.tryItems.length
      ? supports.tryItems.map(item => `- ${item}`).join("\n")
      : "- Choose one small support and keep the field simple.",
    "Why:",
    supports.why || "—",
    "Music Support:",
    supports.music || "—"
  );

  lines.push(
    "",
    "Today’s Read:",
    latestSharePayload.todayRead,
    "",
    "In Real Life, This Means:",
    latestSharePayload.realLifeText || "Translate the read into one practical action.",
    "",
    "Motion Style:",
    latestSharePayload.motionStyle || "—",
    latestSharePayload.motionStyleRead || "",
    "",
    "Today’s Driver:",
    latestSharePayload.driverNote,
    "",
    "One Good Move:",
    latestSharePayload.goodMove,
    "",
    "Return to yourself by:",
    latestSharePayload.returnText,
    "",
    "Personal field guidance · Lucy.OS Pro"
  );

  return lines.join("\n");
}

async function copyShareText(){
  const status = document.getElementById("shareStatus");

  try {
    await navigator.clipboard.writeText(getShareText());
    if (status) status.textContent = "Copied share text.";
  } catch (error) {
    if (status) status.textContent = "Copy failed. You can manually select and copy the text.";
  }
}

async function saveShareCard(){
  const status = document.getElementById("shareStatus");
  const card = document.getElementById("lucyShareCard");

  if (!card) {
    if (status) status.textContent = "Share card was not found.";
    return;
  }

  if (typeof html2canvas === "undefined") {
    if (status) status.textContent = "Image exporter did not load. You can still screenshot the card.";
    return;
  }

  try {
    if (status) status.textContent = "Creating image...";

    const canvas = await html2canvas(card, {
      backgroundColor: "#09142f",
      scale: 2,
      useCORS: true,
      logging: false
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        if (status) status.textContent = "Image save failed. You can still screenshot the card.";
        return;
      }

      const weatherSlug = slugify(latestSharePayload.systemWeather || "lucy-os-pro");
      const filename = weatherSlug ? `lucy-os-pro-${weatherSlug}.png` : "lucy-os-pro-share-card.png";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      if (status) status.textContent = "Saved share card.";
    }, "image/png");
  } catch (error) {
    console.error("Could not save Lucy.OS Pro share card.", error);
    if (status) status.textContent = "Image save failed. You can still screenshot the card.";
  }
}

function calculateHarmonics(data){
  const state = data?.state || {};
  const baselineState = data?.baselineState || {};
  const planetary = data?.planetary || {};
  const environment = data?.environment || {};
  const forecast = data?.forecast || {};
  const timing = data?.timing || {};

  const sun = safeNum(planetary.sun);
  const moon = safeNum(planetary.moon);
  const mercury = safeNum(planetary.mercury);
  const venus = safeNum(planetary.venus);
  const mars = safeNum(planetary.mars);
  const jupiter = safeNum(planetary.jupiter);
  const saturn = safeNum(planetary.saturn);
  const uranus = safeNum(planetary.uranus);
  const neptune = safeNum(planetary.neptune);
  const pluto = safeNum(planetary.pluto);
  const asc = safeNum(planetary.asc);
  const mc = safeNum(planetary.mc);

  const tMoon = safeNum(planetary.transitMoon);
  const tMercury = safeNum(planetary.transitMercury);
  const tVenus = safeNum(planetary.transitVenus);
  const tMars = safeNum(planetary.transitMars);
  const tJupiter = safeNum(planetary.transitJupiter);
  const tSaturn = safeNum(planetary.transitSaturn);
  const tUranus = safeNum(planetary.transitUranus);
  const tNeptune = safeNum(planetary.transitNeptune);
  const tPluto = safeNum(planetary.transitPluto);

  const currentStrain = safeNum(state.strain);
  const currentLoad = safeNum(state.amplifiedLoad);
  const currentRegulation = safeNum(state.regulation);
  const baselineCapacity = safeNum(baselineState.capacity);
  const baselineRegulation = safeNum(baselineState.regulation);
  const envMode = String(environment.environmentMode || "").toLowerCase();
  const forecastState = String(forecast?.now?.state || "").toLowerCase();
  const timingPressure = safeNum(timing.timingPressure);

  const natalScores = {
    Structured: 0,
    Contained: 0,
    Chaotic: 0,
    Relational: 0,
    Threshold: 0,
    Reconstructive: 0,
    Integrative: 0,
    Diffused: 0,
    Regulated: 0
  };

  addScore(natalScores, "Structured", saturn * 1.40 + mercury * 1.30 + sun * 0.75 + mc * 0.65 + baselineCapacity * 0.85 + baselineRegulation * 0.55);
  addScore(natalScores, "Contained", moon * 1.05 + saturn * 0.75 + neptune * 0.45 + baselineRegulation * 0.35);
  addScore(natalScores, "Chaotic", uranus * 1.05 + mars * 0.85 + neptune * 0.35);
  addScore(natalScores, "Relational", venus * 1.15 + moon * 0.85 + asc * 0.55);
  addScore(natalScores, "Threshold", mars * 1.05 + uranus * 0.85 + pluto * 0.45 + mc * 0.45);
  addScore(natalScores, "Reconstructive", pluto * 1.25 + saturn * 0.80);
  addScore(natalScores, "Integrative", jupiter * 1.10 + neptune * 0.85 + moon * 0.35 + mercury * 0.25);
  addScore(natalScores, "Diffused", neptune * 1.35 + moon * 0.70 + jupiter * 0.35);
  addScore(natalScores, "Regulated", saturn * 1.25 + mercury * 0.85 + baselineRegulation * 0.90 + venus * 0.35);

  const normalizedNatalScores = normalizeScores(natalScores, HARMONIC_SCORE_WEIGHTS.natal);

  let primary = getTopHarmonic(normalizedNatalScores, "Structured");

  const structuredScore = normalizedNatalScores.Structured || 0;
  const chaoticScore = normalizedNatalScores.Chaotic || 0;
  const thresholdScore = normalizedNatalScores.Threshold || 0;

  const structuredSupport =
    saturn >= 0.58 &&
    mercury >= 0.58 &&
    mc >= 0.48;

  const chaoticBarelyWins =
    primary === "Chaotic" &&
    structuredScore >= chaoticScore * 0.96 &&
    structuredSupport;

  const thresholdBarelyWins =
    primary === "Threshold" &&
    structuredScore >= thresholdScore * 0.96 &&
    structuredSupport;

  if (chaoticBarelyWins || thresholdBarelyWins) {
    primary = "Structured";
  }

  const motionStyle = buildMotionStyle(normalizedNatalScores, primary);

  let support = getSecondHarmonic(normalizedNatalScores, primary, "Regulated");

  const activationHeavySupport =
    support === "Chaotic" ||
    support === "Threshold";

  if (activationHeavySupport) {
    const supportCandidates = {
      Structured: safeNum(normalizedNatalScores.Structured),
      Regulated: safeNum(normalizedNatalScores.Regulated),
      Integrative: safeNum(normalizedNatalScores.Integrative),
      Contained: safeNum(normalizedNatalScores.Contained),
      Relational: safeNum(normalizedNatalScores.Relational)
    };

    support = getTopHarmonic(supportCandidates, "Regulated");
  }

  if (primary === "Structured" || primary === "Chaotic") {
    const regulatedScore = normalizedNatalScores.Regulated || 0;
    const integrativeScore = normalizedNatalScores.Integrative || 0;
    const structuredSupportScore = normalizedNatalScores.Structured || 0;
    const secondScore = normalizedNatalScores[support] || 0;

    if (primary === "Chaotic" && structuredSupportScore >= secondScore * 0.88) {
      support = "Structured";
    } else if (regulatedScore >= secondScore * 0.88 && integrativeScore >= secondScore * 0.78) {
      support = "Regulated / Integrative";
    } else if (regulatedScore >= secondScore * 0.88) {
      support = "Regulated";
    } else if (integrativeScore >= secondScore * 0.88) {
      support = "Integrative";
    }
  }

  const fieldScores = {
    Structured: 0,
    Contained: 0,
    Chaotic: 0,
    Relational: 0,
    Threshold: 0,
    Reconstructive: 0,
    Integrative: 0,
    Diffused: 0,
    Regulated: 0
  };

  const repairSignature =
    (tPluto * 1.10) +
    (tSaturn * 0.45) +
    (Math.min(tPluto, tSaturn) * 0.55);

  const wideFieldSignature =
    (tJupiter * 0.80) +
    (tNeptune * 0.42) +
    (currentStrain * 0.10);

  const activationSignature =
    (tUranus * 0.95) +
    (tMars * 0.70) +
    (timingPressure * 0.35);

  const containmentSignature =
    (tSaturn * 0.80) +
    (currentRegulation * 0.42) +
    (tMoon * 0.25);

  const relationalSignature =
    (tVenus * 0.95) +
    (tMoon * 0.55);

  const diffusionSignature =
    (tNeptune * 1.15) +
    (tMoon * 0.35) +
    (tJupiter * 0.28);

  const thresholdSignature =
    (tMars * 0.92) +
    (tUranus * 0.62) +
    (timingPressure * 0.75);

  const structuredSignature =
    (tSaturn * 0.82) +
    (tMercury * 0.72);

  const regulatedSignature =
    (tSaturn * 0.92) +
    (tMercury * 0.70) +
    (currentRegulation * 0.55);

  const repairGate =
    repairSignature >= 1.05 ||
    (tPluto >= 0.68 && tSaturn >= 0.55);

  addScore(fieldScores, "Structured", structuredSignature);
  addScore(fieldScores, "Contained", containmentSignature);
  addScore(fieldScores, "Chaotic", activationSignature + (currentStrain * 0.14));
  addScore(fieldScores, "Relational", relationalSignature);
  addScore(fieldScores, "Threshold", thresholdSignature);
  addScore(fieldScores, "Reconstructive", repairGate ? repairSignature : repairSignature * 0.42);
  addScore(fieldScores, "Integrative", wideFieldSignature);
  addScore(fieldScores, "Diffused", diffusionSignature);
  addScore(fieldScores, "Regulated", regulatedSignature);

  if (envMode.includes("diffuse")) {
    addScore(fieldScores, "Diffused", 0.45);
    addScore(fieldScores, "Integrative", 0.12);
  }

  if (envMode.includes("volatile")) {
    addScore(fieldScores, "Chaotic", 0.35);
    addScore(fieldScores, "Threshold", 0.12);
  }

  if (forecastState.includes("threshold")) {
    addScore(fieldScores, "Threshold", 0.55);
  }

  if (forecastState.includes("mobilized")) {
    addScore(fieldScores, "Chaotic", 0.28);
    addScore(fieldScores, "Threshold", 0.10);
  }

  if (forecastState.includes("overload")) {
    addScore(fieldScores, "Contained", 0.18);
    addScore(fieldScores, "Regulated", 0.18);
    addScore(fieldScores, "Diffused", 0.08);

    if (repairGate) {
      addScore(fieldScores, "Reconstructive", 0.12);
    }
  }

  if (tJupiter >= 0.60 && currentStrain >= 0.65 && !repairGate) {
    addScore(fieldScores, "Integrative", 0.18);
    addScore(fieldScores, "Diffused", 0.12);
  }

  if (tNeptune >= 0.60 && currentStrain >= 0.65 && !repairGate) {
    addScore(fieldScores, "Diffused", 0.18);
  }

  const fieldWeights = { ...HARMONIC_SCORE_WEIGHTS.field };

  if (envMode.includes("diffuse")) {
    fieldWeights.Diffused += 0.45;
    fieldWeights.Integrative += 0.12;
  }

  if (envMode.includes("volatile")) {
    fieldWeights.Chaotic += 0.35;
    fieldWeights.Threshold += 0.12;
  }

  if (forecastState.includes("threshold")) {
    fieldWeights.Threshold += 0.55;
  }

  if (forecastState.includes("mobilized")) {
    fieldWeights.Chaotic += 0.28;
    fieldWeights.Threshold += 0.10;
  }

  if (forecastState.includes("overload")) {
    fieldWeights.Contained += 0.18;
    fieldWeights.Regulated += 0.18;
    fieldWeights.Diffused += 0.08;

    if (repairGate) {
      fieldWeights.Reconstructive += 0.12;
    }
  }

  if (tJupiter >= 0.60 && currentStrain >= 0.65 && !repairGate) {
    fieldWeights.Integrative += 0.18;
    fieldWeights.Diffused += 0.12;
  }

  if (tNeptune >= 0.60 && currentStrain >= 0.65 && !repairGate) {
    fieldWeights.Diffused += 0.18;
  }

  const normalizedFieldScores = normalizeScores(fieldScores, fieldWeights);
  let todayField = getTopHarmonic(normalizedFieldScores, "Regulated");

  if (todayField === "Reconstructive" && !repairGate) {
    const nonRepairCandidates = { ...normalizedFieldScores };
    delete nonRepairCandidates.Reconstructive;
    todayField = getTopHarmonic(nonRepairCandidates, "Regulated");
  }

  const structuredCloseCall =
    todayField === "Contained" &&
    normalizedFieldScores.Structured > 0 &&
    normalizedFieldScores.Contained > 0 &&
    normalizedFieldScores.Structured >= normalizedFieldScores.Contained * 0.90 &&
    tSaturn >= 0.72 &&
    tMercury >= 0.68 &&
    currentRegulation >= 0.55;

  if (structuredCloseCall) {
    todayField = "Structured";
  }

  const topFieldScore = safeNum(normalizedFieldScores[todayField]);
  const reconstructiveScore = safeNum(normalizedFieldScores.Reconstructive);
  const reconstructiveCloseCall =
    repairGate &&
    repairSignature >= 1.45 &&
    reconstructiveScore > 0 &&
    topFieldScore > 0 &&
    reconstructiveScore >= topFieldScore * 0.96;

  if (
    todayField !== "Reconstructive" &&
    reconstructiveCloseCall
  ) {
    todayField = "Reconstructive";
  }

  const topCandidates = getTopFieldCandidates(normalizedFieldScores, 3);

  if (Array.isArray(topCandidates) && topCandidates.length) {
    const selectedIndex = topCandidates.findIndex(item => item.field === todayField);

    if (selectedIndex > 0) {
      const selectedCandidate = topCandidates[selectedIndex];
      topCandidates.splice(selectedIndex, 1);
      topCandidates.unshift(selectedCandidate);
    }
  }

  const dailyFieldDebug = {
    selectedField: todayField,
    topCandidates,
    rawFieldScores: fieldScores,
    fieldWeights,
    normalizedFieldScores,
    repairGate,
    repairSignature,
    structuredCloseCall,
    wideFieldSignature,
    activationSignature,
    containmentSignature,
    relationalSignature,
    diffusionSignature,
    thresholdSignature,
    fastBodyInputs: {
      transitMoon: tMoon,
      transitMercury: tMercury,
      transitVenus: tVenus,
      transitMars: tMars
    },
    slowBodyClimateInputs: {
      transitJupiter: tJupiter,
      transitSaturn: tSaturn,
      transitUranus: tUranus,
      transitNeptune: tNeptune,
      transitPluto: tPluto
    },
    stateLoadInputs: {
      currentStrain,
      currentLoad,
      currentRegulation
    },
    timingInputs: {
      timingPressure,
      forecastState,
      environmentMode: envMode
    },
    moonstampInputs: {
      state: data?.moonstamp?.state || null,
      phase: data?.moonstamp?.phase || null,
      phaseFraction: data?.moonstamp?.phaseFraction || null,
      forecastModifier: data?.moonstamp?.forecastModifier || null
    },
    backendDebug: data?.dailyFieldBackendDebug || null,
    freshness: {
      transitUtcDatetime: data?.ephemeris?.transitUtcDatetime || null,
      backendServerTimestamp: data?.dailyFieldBackendDebug?.serverCalculationTimestamp || null,
      timezoneName: data?.inputResolved?.timezoneName || data?.inputResolved?.timezone_name || null
    },
    note: "Frontend Today’s Field separates load intensity from field type. Reconstructive requires stronger repair signatures instead of generic load/strain."
  };

  const fieldUndertone = getFieldUndertone(dailyFieldDebug);
  dailyFieldDebug.fieldUndertone = fieldUndertone;

  console.log("Lucy.OS Daily Field Debug:", dailyFieldDebug);

  const distortionScores = {
    Structured: 0,
    Contained: 0,
    Chaotic: 0,
    Relational: 0,
    Threshold: 0,
    Reconstructive: 0,
    Integrative: 0,
    Diffused: 0,
    Regulated: 0
  };

  const regulationRatio = currentLoad > 0.15
    ? clamp(currentRegulation / currentLoad, 0, 1.25)
    : currentRegulation;
  const overloadGap = Math.max(currentStrain - 0.85, 0);

  addScore(distortionScores, "Diffused", neptune * 1.00 + tNeptune * 1.20 + overloadGap * 1.40);
  addScore(distortionScores, "Chaotic", uranus * 0.70 + tUranus * 1.05 + tMars * 0.65 + overloadGap * 0.80);
  addScore(distortionScores, "Reconstructive", pluto * 0.85 + tPluto * 1.00 + currentLoad * 0.35 + overloadGap * 1.00);
  addScore(distortionScores, "Regulated", saturn * 0.75 + tSaturn * 0.65 + regulationRatio * 1.10);
  addScore(distortionScores, "Threshold", mars * 0.65 + tMars * 0.85 + timingPressure * 0.80);
  addScore(distortionScores, "Integrative", jupiter * 0.55 + neptune * 0.45 + tJupiter * 0.45 + tNeptune * 0.45);
  addScore(distortionScores, "Contained", moon * 0.65 + saturn * 0.45);
  addScore(distortionScores, "Relational", venus * 0.55 + moon * 0.45);
  addScore(distortionScores, "Structured", mercury * 0.55 + saturn * 0.50);

  const distortionWeights = { ...HARMONIC_SCORE_WEIGHTS.distortion };

  if (overloadGap > 0) {
    distortionWeights.Diffused += 1.40;
    distortionWeights.Chaotic += 0.80;
    distortionWeights.Reconstructive += 1.00;
  }

  const normalizedDistortionScores = normalizeScores(distortionScores, distortionWeights);
  let distortion = getTopHarmonic(normalizedDistortionScores, "Diffused");

  if (primary === "Structured" && normalizedDistortionScores.Diffused >= normalizedDistortionScores[distortion] * 0.82) {
    distortion = "Diffused";
  }

  if (primary === "Chaotic" && normalizedDistortionScores.Structured >= normalizedDistortionScores[distortion] * 0.78) {
    distortion = "Structured";
  }

  const distortionStateKey = getDistortionState(
    {
      primary,
      support,
      motionStyle,
      distortion,
      todayField
    },
    data
  );

  return {
    primary,
    support,
    motionStyle,
    distortion,
    distortionStateKey,
    todayField,
    fieldUndertone,
    dailyFieldDebug,
    natalScores,
    normalizedNatalScores,
    fieldScores,
    normalizedFieldScores,
    distortionScores,
    normalizedDistortionScores
  };
}

function updateHarmonicUI(data){
  const harmonics = calculateHarmonics(data);
  const primaryMeta = HARMONICS[harmonics.primary] || HARMONICS.Structured;
  const supportBase = getHarmonicBaseName(harmonics.support);
  const supportMeta = HARMONICS[supportBase] || HARMONICS.Regulated;
  const stableProfileLabel = getStableProfileLabel(harmonics.primary, harmonics.support);
  const distortionMeta = HARMONICS[harmonics.distortion] || HARMONICS.Diffused;
  const distortionState = DISTORTION_STATES[harmonics.distortionStateKey] || DISTORTION_STATES.overStructuring;
  const fieldMeta = HARMONICS[harmonics.todayField] || HARMONICS.Regulated;
  const fieldUndertone = harmonics.fieldUndertone || getFieldUndertone(harmonics.dailyFieldDebug);
  const currentState = stateLabelFromMode(data?.state?.mode || "");
  const fieldTrend = calculateFieldTrend(data, harmonics);
  const fieldDirection = buildFieldDirectionText(harmonics, data);
  const moonstampModifier = updateMoonstampModifierBlock(data);
  const regulationSupports = buildRegulationSupports(harmonics, data, moonstampModifier);

  const primaryLabel = harmonicLabel(primaryMeta.label);
  const supportLabel = harmonics.support && String(harmonics.support).includes("/")
    ? String(harmonics.support)
        .split("/")
        .map(part => harmonicLabel(part.trim()))
        .join(" / ")
    : harmonicLabel(supportMeta.label);
  const motionStyleLabel = harmonicLabel(harmonics.motionStyle || "Steady");
  const motionStyleRead = getMotionStyleRead(harmonics.motionStyle || "Steady");
  const distortionLabel = harmonicLabel(distortionMeta.label);
  const fieldLabel = harmonicLabel(fieldMeta.label);

  const primaryPhrase = primaryPhraseFromHarmonic(primaryMeta.label);
  const fieldPhrase = fieldPhraseFromHarmonic(fieldMeta.label);
  const pairingMeaning = `${primaryPhrase} + ${fieldPhrase} = ${buildPairingAction(primaryMeta.label, fieldMeta.label)}`;
  const systemWeather = `${harmonicText(primaryMeta.label)} root pattern meeting a ${harmonicText(fieldMeta.label)} field`;
  const systemWeatherHTML = `${primaryLabel}&nbsp;root pattern<br><span>meeting a</span> ${fieldLabel}&nbsp;field`;
  const guidance = buildDailyGuidance(harmonics, data);
  const profileAwareRead = buildProfileAwareEnglishRead(harmonics, data, stableProfileLabel, distortionState);
  const coreRule = buildCoreRule(harmonics, data, stableProfileLabel, distortionState, guidance);
  const driver = publicDriverName(primaryDriverName(data));
  const shareDriverNote = buildShortDriverNote(data, harmonics, fieldTrend);

  updateMobileReadSnapshot({
    systemWeather,
    profileAwareRead,
    guidance,
    regulationSupports,
    state: currentState,
    field: fieldMeta.label,
    loadBand: loadBandFromValue(data?.state?.amplifiedLoad)
  });

  setHTML("systemWeatherLine", systemWeatherHTML);
  setHTML(
    "pairingExplain",
    `<span><strong>Root pattern:</strong>&nbsp;${primaryLabel}</span>` +
    `<span><strong>Current field:</strong>&nbsp;${fieldLabel}</span>` +
    `<span><strong>Recommended move:</strong>&nbsp;${pairingMeaning}</span>`
  );

  updateInteractionMap(primaryMeta.label, fieldMeta.label);
  updateFieldUndertoneUI(fieldUndertone);

  setHTML("topMotionStyle", motionStyleLabel);
  setText("topMotionStyleRead", motionStyleRead);

  setText("dailyTodayRead", profileAwareRead.todayRead);
  setText("dailyRealLife", profileAwareRead.realLife);
  setText("dailyLeanInto", guidance.lean);
  setText("dailyWatchFor", guidance.watch);

  setText("dailyGoodMove", guidance.move);
  setText("dailyReturn", guidance.ret);
  setText(
    "todayOutlookLine",
    `Current Field Direction: Trend: ${fieldTrend.trend} · Driver: ${driver} · ${fieldTrend.fieldPhrase}${fieldUndertone?.active ? ` · Undertone: ${fieldUndertone.field}` : ""}`
  );

  setHTML("primaryHarmonic", primaryLabel);
  setHTML("supportHarmonic", supportLabel);
  setText("profileTranslationLabel", stableProfileLabel);
  setHTML("motionStyle", motionStyleLabel);
  setText("motionStyleRead", motionStyleRead);
  setHTML("distortionHarmonic", `${distortionLabel} · ${distortionState.label}`);
  setHTML("todayFieldHarmonic", fieldLabel);
  setText("signalQuality", primaryMeta.signalQuality);
  setText("stabilityMethod", primaryMeta.stabilityMethod);
  setText("overloadRisk", `${distortionState.short}. ${distortionState.plain}`);
  setText("harmonicPlainRead", primaryMeta.plainRead);

  setHTML("profileStateChip", `${primaryLabel}&nbsp;root pattern`);
  setHTML("profileFieldChip", `${fieldLabel}&nbsp;field`);
  applyChipClass("profileStateChip", "chip", primaryMeta.label);
  applyChipClass("profileFieldChip", "chip", fieldMeta.label);

  setText("regulationStateChip", `State: ${currentState}`);
  setHTML("regulationFieldChip", `Field:&nbsp;${fieldLabel}`);
  applyChipClass("regulationStateChip", "chip violet", "");
  applyChipClass("regulationFieldChip", "chip field", fieldMeta.label);

  updateFieldTranslationUI(fieldMeta.label);
  updateOutlookUI(data, harmonics);
  updateRegulationSupportsUI(regulationSupports);
  updateWhyReadUI(harmonics, data, fieldTrend, profileAwareRead, regulationSupports);
  updateShareUI({
    systemWeather,
    fieldDirectionTitle: fieldDirection.title,
    fieldDirectionText: fieldDirection.text,
    fieldUndertone,
    coreRule,
    moonstampModifier,
    regulationSupports,
    todayRead: profileAwareRead.shareRead,
    realLifeText: profileAwareRead.shareRealLife,
    driverNote: shareDriverNote,
    goodMove: guidance.move,
    returnText: guidance.ret,
    primary: primaryMeta.label,
    field: fieldMeta.label,
    state: currentState,
    motionStyle: harmonicText(harmonics.motionStyle || "Steady"),
    motionStyleRead
  });

  renderHarmonicLibrary(primaryMeta.label, fieldMeta.label);

  return harmonics;
}

function updateUI(data){
  console.log("Lucy.OS Pro response:", data);
  window.lastLucyData = data;

  const state = data?.state || {};
  const telemetry = data?.telemetry || {};
  const environment = data?.environment || {};
  const forecast = data?.forecast || {};
  const planetary = data?.planetary || {};
  const inputResolved = data?.inputResolved || {};
  const ephemeris = data?.ephemeris || {};
  const moonstamp = getMoonstamp(data);

  const capacity = safeNum(state.capacity);
  const strain = safeNum(state.strain);
  const load = safeNum(state.amplifiedLoad);
  const regulation = safeNum(state.regulation);
  const effective = safeNum(state.effectiveLoad);
  const modeText = state.mode || "Regulated";

  const effectiveDisplay = Math.min(effective, Math.max(capacity * 1.15, 1.10));

  const volatility = safeNum(
    planetary.uranus,
    driverValueFromTaggedList(telemetry.topDrivers, "Uranus")
  );
  const fog = safeNum(
    planetary.neptune,
    driverValueFromTaggedList(telemetry.topDrivers, "Neptune")
  );
  const activation = safeNum(
    planetary.mars,
    driverValueFromTaggedList(telemetry.topDrivers, "Mars")
  );

  const saturn = safeNum(
    planetary.saturn,
    driverValueFromTaggedList(telemetry.topRegulators, "Saturn")
  );
  const venus = safeNum(
    planetary.venus,
    driverValueFromTaggedList(telemetry.topRegulators, "Venus")
  );
  const mercury = safeNum(
    planetary.mercury,
    driverValueFromTaggedList(telemetry.topRegulators, "Mercury")
  );

  const regulatorAverage = (saturn + venus + mercury) / 3;

  const harmonics = updateHarmonicUI(data);
  updateLiveFieldDashboardUI(data, harmonics);
  updateFieldCompass(data);
  updateLiveFieldDebugUI(harmonics.dailyFieldDebug);

  const distortionState = DISTORTION_STATES[harmonics.distortionStateKey] || DISTORTION_STATES.overStructuring;
  const fieldUndertone = harmonics.fieldUndertone || getFieldUndertone(harmonics.dailyFieldDebug);

  console.log("Lucy.OS normalized harmonic scores:", {
    primary: harmonics.primary,
    support: harmonics.support,
    stableProfileLabel: getStableProfileLabel(harmonics.primary, harmonics.support),
    profileTranslation: getStableProfileLabel(harmonics.primary, harmonics.support),
    motionStyle: harmonics.motionStyle,
    motionStyleRead: getMotionStyleRead(harmonics.motionStyle),
    rawDistortionHarmonic: harmonics.distortion,
    primaryDistortionState: distortionState.label,
    todayField: harmonics.todayField,
    fieldUndertone,
    dailyFieldDebug: harmonics.dailyFieldDebug,
    moonstamp,
    natalScores: harmonics.natalScores,
    normalizedNatalScores: harmonics.normalizedNatalScores,
    fieldScores: harmonics.fieldScores,
    normalizedFieldScores: harmonics.normalizedFieldScores,
    distortionScores: harmonics.distortionScores,
    normalizedDistortionScores: harmonics.normalizedDistortionScores
  });

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
  setText("stabilityVal", fmt(regulatorAverage));

  setText("primaryDriver", primaryDriverName(data));
  setText("volatilityVal", fmt(volatility));
  setText("fogVal", fmt(fog));
  setText("activationVal", fmt(activation));

  setText("saturnVal", fmt(saturn));
  setText("venusVal", fmt(venus));
  setText("mercuryVal", fmt(mercury));
  setText("stateCondition", stateLabelFromMode(modeText));

  const forecastState = forecast?.now?.state || stateLabelFromMode(modeText);
  setText("forecastTitle", forecastState);
  setText("forecastText", forecastTextFromState(forecastState));

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

  const utcDatetime =
    ephemeris.utcDatetime ||
    ephemeris.utc_datetime ||
    "—";

  setText("skyDataTitle", ephemeris.source ? "Verified" : "Pending");
  setText(
    "skyDataText",
    ephemeris.source
      ? "Live ephemeris and resolved location confirmed."
      : `Local: ${resolvedTime} • UTC: ${utcDatetime} • ${resolvedLocation} • ${timezoneName}`
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
  setText("forecastBand", moonstamp ? `Moonstamp: ${moonstamp.state || "—"}` : forecastBandFromState(forecastState));

  setText(
    "resolvedInput",
    `Local: ${resolvedTime} | UTC: ${utcDatetime} | Place: ${resolvedLocation} | TZ: ${timezoneName}`
  );

  setText(
    "apiStatus",
    `OK • ${ephemeris.source || "API"} • ${ephemeris.mode || "natal"}${moonstamp ? " • Moonstamp live" : ""}`
  );

  const apiStatusEl = document.getElementById("apiStatus");
  if (apiStatusEl) apiStatusEl.className = "ok";

  const sunDeg = data?._longitudesDeg?.sun ?? moonstamp?.sunLongitudeDeg ?? "—";
  const moonDeg = data?._longitudesDeg?.moon ?? moonstamp?.moonLongitudeDeg ?? "—";
  const ascDeg = data?.angles?.asc ?? "—";
  const mcDeg = data?.angles?.mc ?? "—";
  const dailyFieldDebug = harmonics.dailyFieldDebug || {};
  const topCandidatesText = Array.isArray(dailyFieldDebug.topCandidates) && dailyFieldDebug.topCandidates.length
    ? dailyFieldDebug.topCandidates.map(item => `${item.field} ${fmt(item.score)}`).join(" · ")
    : "—";
  const transitUtcDebug =
    dailyFieldDebug?.freshness?.transitUtcDatetime ||
    data?.dailyFieldBackendDebug?.transitUtcDatetime ||
    "—";
  const moonstampDebug =
    dailyFieldDebug?.moonstampInputs?.state || dailyFieldDebug?.moonstampInputs?.phase
      ? `${dailyFieldDebug?.moonstampInputs?.state || "—"} / ${dailyFieldDebug?.moonstampInputs?.phase || "—"}`
      : "—";
  const undertoneDebug = fieldUndertone?.active
    ? `${fieldUndertone.field} active | gap ${fmtMaybe(fieldUndertone.gap)} | ratio ${fmtMaybe(fieldUndertone.ratio)}`
    : "No strong undertone";
  const structuredCloseCallDebug = dailyFieldDebug.structuredCloseCall ? "yes" : "no";

  setText(
    "chartDebug",
    `Today’s Field: ${dailyFieldDebug.selectedField || harmonics.todayField || "—"}\n` +
    `Field Undertone: ${undertoneDebug}\n` +
    `Top 3: ${topCandidatesText}\n` +
    `Repair Gate: ${dailyFieldDebug.repairGate ? "open" : "closed"} | Repair Signature: ${fmtMaybe(dailyFieldDebug.repairSignature)}\n` +
    `Structured Close Call: ${structuredCloseCallDebug}\n` +
    `Wide Field: ${fmtMaybe(dailyFieldDebug.wideFieldSignature)} | Activation: ${fmtMaybe(dailyFieldDebug.activationSignature)} | Diffusion: ${fmtMaybe(dailyFieldDebug.diffusionSignature)}\n` +
    `Transit UTC: ${transitUtcDebug}\n` +
    `Moonstamp: ${moonstampDebug}\n` +
    `JD: ${ephemeris.jdUt || ephemeris.jd_ut || "—"} | Sun: ${sunDeg} | Moon: ${moonDeg} | ASC: ${ascDeg} | MC: ${mcDeg}`
  );

  setHeroGlow(modeText, fog, volatility);
}

async function fetchChartInputs(payload){
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

  return data;
}

async function calculate(options = {}){
  const shouldAutoScroll = !!options.shouldAutoScroll;

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
    const apiStatusEl = document.getElementById("apiStatus");
    if (apiStatusEl) apiStatusEl.className = "";

    const data = await fetchChartInputs(payload);

    updateUI(data);

    if (shouldAutoScroll) {
      scrollToMobileReadSnapshot();
    }
  } catch (err) {
    console.error(err);
    setText("apiStatus", `Error • ${err.message}`);
    const apiStatusEl = document.getElementById("apiStatus");
    if (apiStatusEl) apiStatusEl.className = "err";
    alert("Calculation failed. Check API deployment or payload.");
  } finally {
    const btn = document.getElementById("calcBtn");
    btn.disabled = false;
    btn.textContent = "Calculate";
  }
}

function calculateLucyOSPro(data){
  const harmonics = calculateHarmonics(data);
  const stableProfileLabel = getStableProfileLabel(harmonics.primary, harmonics.support);
  const distortionState = DISTORTION_STATES[harmonics.distortionStateKey] || DISTORTION_STATES.overStructuring;
  const fieldTrend = calculateFieldTrend(data, harmonics);
  const guidance = buildDailyGuidance(harmonics, data);
  const profileAwareRead = buildProfileAwareEnglishRead(harmonics, data, stableProfileLabel, distortionState);
  const coreRule = buildCoreRule(harmonics, data, stableProfileLabel, distortionState, guidance);
  const moonstampModifier = buildMoonstampModifierRead(data);
  const regulationSupports = buildRegulationSupports(harmonics, data, moonstampModifier);
  const fieldDirection = buildFieldDirectionText(harmonics, data);
  const driverNote = buildDriverNote(data, harmonics, fieldTrend);

  return {
    harmonics,
    stableProfileLabel,
    distortionState,
    fieldTrend,
    guidance,
    profileAwareRead,
    coreRule,
    moonstampModifier,
    regulationSupports,
    fieldDirection,
    driverNote
  };
}

function buildLucyOSInterpretation(data){
  return calculateLucyOSPro(data);
}

function getEngineSummary(data){
  const result = calculateLucyOSPro(data);
  return {
    primary: result.harmonics.primary,
    support: result.harmonics.support,
    stableProfileLabel: result.stableProfileLabel,
    motionStyle: result.harmonics.motionStyle,
    distortion: result.harmonics.distortion,
    distortionState: result.distortionState.label,
    todayField: result.harmonics.todayField,
    fieldUndertone: result.harmonics.fieldUndertone,
    fieldTrend: result.fieldTrend,
    guidance: result.guidance,
    coreRule: result.coreRule,
    moonstampModifier: result.moonstampModifier,
    regulationSupports: result.regulationSupports
  };
}

function getEngineDebug(data){
  const result = calculateLucyOSPro(data);
  return {
    ...result,
    dailyFieldDebug: result.harmonics.dailyFieldDebug,
    natalScores: result.harmonics.natalScores,
    normalizedNatalScores: result.harmonics.normalizedNatalScores,
    fieldScores: result.harmonics.fieldScores,
    normalizedFieldScores: result.harmonics.normalizedFieldScores,
    distortionScores: result.harmonics.distortionScores,
    normalizedDistortionScores: result.harmonics.normalizedDistortionScores
  };
}

function randomHarmonicTestData() {
  const r = () => Math.random();

  return {
    state: {
      strain: r(),
      amplifiedLoad: r(),
      regulation: r(),
      effectiveLoad: r(),
      capacity: r(),
      mode: "Regulated"
    },
    baselineState: {
      capacity: r(),
      strain: r(),
      amplifiedLoad: r(),
      regulation: r()
    },
    planetary: {
      sun: r(),
      moon: r(),
      mercury: r(),
      venus: r(),
      mars: r(),
      jupiter: r(),
      saturn: r(),
      uranus: r(),
      neptune: r(),
      pluto: r(),
      asc: r(),
      mc: r(),
      transitMoon: r(),
      transitMercury: r(),
      transitVenus: r(),
      transitMars: r(),
      transitJupiter: r(),
      transitSaturn: r(),
      transitUranus: r(),
      transitNeptune: r(),
      transitPluto: r()
    },
    environment: {
      environmentMode: ""
    },
    forecast: {
      now: {
        state: "Regulated"
      }
    },
    timing: {
      timingPressure: r()
    },
    moonstamp: null,
    moonstampForecast: null
  };
}

function runSyntheticHarmonicBalanceTest(count = 10000) {
  const primaryCounts = {};
  const supportCounts = {};
  const profileLabelCounts = {};
  const motionStyleCounts = {};
  const fieldCounts = {};
  const fieldUndertoneCounts = {};
  const rawDistortionCounts = {};
  const distortionStateCounts = {};
  let reconstructiveWithoutGateCount = 0;
  let activeUndertoneCount = 0;

  Object.keys(HARMONICS).forEach(key => {
    primaryCounts[key] = 0;
    supportCounts[key] = 0;
    motionStyleCounts[key] = 0;
    fieldCounts[key] = 0;
    fieldUndertoneCounts[key] = 0;
    rawDistortionCounts[key] = 0;
  });

  Object.values(DISTORTION_STATES).forEach(state => {
    distortionStateCounts[state.label] = 0;
  });

  for (let i = 0; i < count; i++) {
    const data = randomHarmonicTestData();
    const result = calculateHarmonics(data);
    const distortionState = DISTORTION_STATES[result.distortionStateKey] || DISTORTION_STATES.overStructuring;
    const stableProfileLabel = getStableProfileLabel(result.primary, result.support);
    const fieldUndertone = result.fieldUndertone || getFieldUndertone(result.dailyFieldDebug);

    primaryCounts[result.primary] = (primaryCounts[result.primary] || 0) + 1;

    const supportBase = getHarmonicBaseName(result.support);
    supportCounts[supportBase] = (supportCounts[supportBase] || 0) + 1;
    profileLabelCounts[stableProfileLabel] = (profileLabelCounts[stableProfileLabel] || 0) + 1;

    String(result.motionStyle || "")
      .split("/")
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => {
        motionStyleCounts[part] = (motionStyleCounts[part] || 0) + 1;
      });

    fieldCounts[result.todayField] = (fieldCounts[result.todayField] || 0) + 1;

    if (fieldUndertone?.active && fieldUndertone.field) {
      activeUndertoneCount += 1;
      fieldUndertoneCounts[fieldUndertone.field] = (fieldUndertoneCounts[fieldUndertone.field] || 0) + 1;
    }

    rawDistortionCounts[result.distortion] = (rawDistortionCounts[result.distortion] || 0) + 1;
    distortionStateCounts[distortionState.label] = (distortionStateCounts[distortionState.label] || 0) + 1;

    if (result.todayField === "Reconstructive" && !result.dailyFieldDebug?.repairGate) {
      reconstructiveWithoutGateCount += 1;
    }
  }

  console.table({
    Primary: primaryCounts,
    Support: supportCounts,
    ProfileTranslation: profileLabelCounts,
    MotionStyle: motionStyleCounts,
    Field: fieldCounts,
    FieldUndertone: fieldUndertoneCounts,
    RawDistortionHarmonic: rawDistortionCounts,
    DistortionState: distortionStateCounts,
    ReconstructiveWithoutRepairGate: { count: reconstructiveWithoutGateCount },
    ActiveUndertoneCount: { count: activeUndertoneCount }
  });

  return {
    primaryCounts,
    supportCounts,
    profileLabelCounts,
    motionStyleCounts,
    fieldCounts,
    fieldUndertoneCounts,
    rawDistortionCounts,
    distortionStateCounts,
    reconstructiveWithoutGateCount,
    activeUndertoneCount
  };
}

function runAstrologyCalibrationTest() {
  const baseData = () => ({
    state: {
      strain: 0.30,
      amplifiedLoad: 0.35,
      regulation: 0.45,
      effectiveLoad: 0.25,
      capacity: 0.55,
      mode: "Regulated"
    },
    baselineState: {
      capacity: 0.40,
      strain: 0.25,
      amplifiedLoad: 0.25,
      regulation: 0.40
    },
    planetary: {
      sun: 0.20,
      moon: 0.20,
      mercury: 0.20,
      venus: 0.20,
      mars: 0.20,
      jupiter: 0.20,
      saturn: 0.20,
      uranus: 0.20,
      neptune: 0.20,
      pluto: 0.20,
      asc: 0.20,
      mc: 0.20,
      transitMoon: 0.20,
      transitMercury: 0.20,
      transitVenus: 0.20,
      transitMars: 0.20,
      transitJupiter: 0.20,
      transitSaturn: 0.20,
      transitUranus: 0.20,
      transitNeptune: 0.20,
      transitPluto: 0.20
    },
    environment: {
      environmentMode: ""
    },
    forecast: {
      now: {
        state: "Regulated"
      }
    },
    timing: {
      timingPressure: 0.20
    },
    moonstamp: null,
    moonstampForecast: null
  });

  const cases = [
    {
      name: "Wide Jupiter Scatter Field Should Not Become Reconstructive",
      expectedField: ["Integrative", "Diffused", "Chaotic", "Contained", "Regulated"],
      build: () => {
        const data = baseData();
        data.state.strain = 0.82;
        data.state.amplifiedLoad = 0.80;
        data.state.regulation = 0.34;
        data.planetary.transitJupiter = 0.95;
        data.planetary.transitNeptune = 0.72;
        data.planetary.transitUranus = 0.55;
        data.planetary.transitPluto = 0.22;
        data.planetary.transitSaturn = 0.28;
        data.forecast.now.state = "Overload";
        return data;
      }
    },
    {
      name: "Actual Pluto Saturn Repair Field Can Become Reconstructive",
      expectedField: ["Reconstructive"],
      build: () => {
        const data = baseData();
        data.state.strain = 0.88;
        data.state.amplifiedLoad = 0.82;
        data.state.regulation = 0.40;
        data.planetary.transitPluto = 0.92;
        data.planetary.transitSaturn = 0.72;
        data.planetary.transitJupiter = 0.30;
        data.planetary.transitNeptune = 0.26;
        data.forecast.now.state = "Overload";
        return data;
      }
    },
    {
      name: "Relational Field Can Beat Secondary Repair Pressure",
      expectedField: ["Relational"],
      expectedUndertone: ["Reconstructive", null],
      build: () => {
        const data = baseData();
        data.state.strain = 0.78;
        data.state.amplifiedLoad = 0.97;
        data.state.regulation = 0.40;
        data.planetary.transitVenus = 0.80;
        data.planetary.transitMoon = 0.62;
        data.planetary.transitPluto = 0.58;
        data.planetary.transitSaturn = 0.42;
        data.planetary.transitJupiter = 0.45;
        data.forecast.now.state = "Mobilized";
        return data;
      }
    },
    {
      name: "Close Relational / Reconstructive Scores Should Show Undertone",
      expectedField: ["Relational", "Reconstructive"],
      expectedUndertoneActive: true,
      build: () => {
        const data = baseData();
        data.state.strain = 0.76;
        data.state.amplifiedLoad = 0.78;
        data.state.regulation = 0.43;
        data.planetary.transitVenus = 0.78;
        data.planetary.transitMoon = 0.58;
        data.planetary.transitPluto = 0.66;
        data.planetary.transitSaturn = 0.53;
        data.planetary.transitMars = 0.42;
        data.forecast.now.state = "Mobilized";
        return data;
      }
    },
    {
      name: "Strong Selected Field With Distant Second Should Hide Undertone",
      expectedUndertoneActive: false,
      build: () => {
        const data = baseData();
        data.state.strain = 0.38;
        data.state.amplifiedLoad = 0.40;
        data.state.regulation = 0.70;
        data.planetary.transitSaturn = 0.95;
        data.planetary.transitMercury = 0.82;
        data.planetary.transitVenus = 0.22;
        data.planetary.transitPluto = 0.18;
        data.planetary.transitNeptune = 0.18;
        data.forecast.now.state = "Regulated";
        return data;
      }
    },
    {
      name: "Reconstructive Selected With Relational Second Keeps Reconstructive Main",
      expectedField: ["Reconstructive"],
      build: () => {
        const data = baseData();
        data.state.strain = 0.82;
        data.state.amplifiedLoad = 0.84;
        data.state.regulation = 0.46;
        data.planetary.transitPluto = 0.90;
        data.planetary.transitSaturn = 0.70;
        data.planetary.transitVenus = 0.66;
        data.planetary.transitMoon = 0.52;
        data.forecast.now.state = "Overload";
        return data;
      }
    }
  ];

  const results = cases.map(testCase => {
    const data = testCase.build();
    const result = calculateHarmonics(data);
    const distortionState = DISTORTION_STATES[result.distortionStateKey] || DISTORTION_STATES.overStructuring;
    const stableProfileLabel = getStableProfileLabel(result.primary, result.support);
    const fieldUndertone = result.fieldUndertone || getFieldUndertone(result.dailyFieldDebug);
    const profileAwareRead = buildProfileAwareEnglishRead(result, data, stableProfileLabel, distortionState);
    const regulationSupports = buildRegulationSupports(result, data, { text: "" });
    const expectedField = testCase.expectedField || [];
    const fieldPassed = expectedField.length ? expectedField.includes(result.todayField) : true;
    const undertonePassed =
      typeof testCase.expectedUndertoneActive === "boolean"
        ? fieldUndertone.active === testCase.expectedUndertoneActive
        : true;

    return {
      case: testCase.name,
      expectedField: expectedField.join(" or ") || "—",
      actualField: result.todayField,
      undertoneActive: fieldUndertone.active,
      undertoneField: fieldUndertone.field || "—",
      undertoneGap: fieldUndertone.gap,
      undertoneRatio: fieldUndertone.ratio,
      repairGate: result.dailyFieldDebug?.repairGate,
      repairSignature: result.dailyFieldDebug?.repairSignature,
      structuredCloseCall: result.dailyFieldDebug?.structuredCloseCall,
      structuredSignature: result.dailyFieldDebug?.structuredSignature,
      wideFieldSignature: result.dailyFieldDebug?.wideFieldSignature,
      relationalSignature: result.dailyFieldDebug?.relationalSignature,
      regulationSupportState: regulationSupports.state,
      regulationSupportQuality: regulationSupports.quality,
      regulationSupportTry: regulationSupports.tryItems,
      profileAwareTodayRead: profileAwareRead.todayRead,
      dailyFieldDebug: result.dailyFieldDebug,
      passFail: fieldPassed && undertonePassed ? "PASS" : "FAIL"
    };
  });

  console.table(results);
  return results;
}

const LucyOSEngine = {
  API_URL,
  SAVED_PROFILES_KEY,
  HARMONIC_SCORE_WEIGHTS,
  FIELD_CLASS_NAMES,
  UNDERTONE_CLASS_NAMES,
  clamp,
  safeNum,
  fmt,
  fmtMaybe,
  fmtPercent,
  fmtMoonAge,
  setText,
  setHTML,
  setBar,
  setMiniBar,
  score10,
  score10From01,
  bandFromScore,
  isMobileLayout,
  scrollToMobileReadSnapshot,
  setTechnicalDetailsDefault,
  getMoonstamp,
  hasMoonstampData,
  formatMoonstampTiming,
  buildMoonstampModifier,
  buildMoonstampModifierRead,
  moonstampForecastText,
  compassGaugeNote,
  getHarmonicBaseName,
  getStableProfileLabel,
  harmonicClass,
  harmonicText,
  harmonicLabel,
  chipClass,
  applyChipClass,
  applyFieldClass,
  applyFieldClasses,
  applyFieldUndertoneClass,
  applyFieldUndertoneClasses,
  slugify,
  sortedScoreKeys,
  getTopFieldCandidates,
  addScore,
  normalizeScores,
  getTopHarmonic,
  getSecondHarmonic,
  stateLabelFromMode,
  stateHelperFromMode,
  strainLabelFromStrain,
  capacityLabelFromValue,
  envBandFromMode,
  forecastBandFromState,
  driverValueFromTaggedList,
  primaryDriverName,
  publicDriverName,
  loadBandFromValue,
  capacityBandFromValue,
  regulationBandFromValue,
  motionHas,
  fieldSupportBank,
  buildTryListFromSupportBank,
  buildRegulationSupports,
  buildMobileSnapshotSupport,
  updateMobileReadSnapshot,
  updateRegulationSupportsUI,
  getSavedProfiles,
  setSavedProfiles,
  renderSavedProfiles,
  saveCurrentProfile,
  loadSelectedProfile,
  deleteSelectedProfile,
  buildWhyText,
  forecastTextFromState,
  outlookTextFromState,
  compassPlainText,
  updateFieldCompass,
  fieldPhraseFromHarmonic,
  primaryPhraseFromHarmonic,
  buildPairingAction,
  primaryPlainPhrase,
  fieldPlainPhrase,
  pairingMovePlainText,
  updateInteractionMap,
  getFieldTranslation,
  buildLiveDashboardDayType,
  buildLiveFieldDashboardMetrics,
  updateLiveFieldDashboardUI,
  buildFieldUndertoneText,
  getFieldUndertone,
  updateFieldUndertoneUI,
  updateShareFieldUndertoneUI,
  updateLiveDebugFieldUndertoneUI,
  calculateFieldTrend,
  buildFieldDirectionText,
  updateOutlookUI,
  updateFieldTranslationUI,
  setHeroGlow,
  buildMotionStyle,
  getDistortionState,
  renderLiveDebugPair,
  renderLiveDebugScore,
  updateLiveFieldDebugUI,
  getMotionStyleRead,
  buildDailyGuidance,
  buildProfileAwareEnglishRead,
  buildCoreRule,
  buildShortDriverNote,
  buildDriverNote,
  renderHarmonicLibrary,
  updateMoonstampModifierBlock,
  renderWhyExplainBlock,
  updateWhyReadUI,
  updateShareUI,
  getShareText,
  copyShareText,
  saveShareCard,
  calculateHarmonics,
  updateHarmonicUI,
  updateUI,
  fetchChartInputs,
  calculate,
  calculateLucyOSPro,
  buildLucyOSInterpretation,
  getEngineSummary,
  getEngineDebug,
  randomHarmonicTestData,
  runSyntheticHarmonicBalanceTest,
  runAstrologyCalibrationTest
};

window.LucyOSEngine = LucyOSEngine;

window.runSyntheticHarmonicBalanceTest = runSyntheticHarmonicBalanceTest;
window.runAstrologyCalibrationTest = runAstrologyCalibrationTest;
window.getMotionStyleRead = getMotionStyleRead;
window.getStableProfileLabel = getStableProfileLabel;
window.buildProfileAwareEnglishRead = buildProfileAwareEnglishRead;
window.getFieldUndertone = getFieldUndertone;
window.buildFieldUndertoneText = buildFieldUndertoneText;
window.buildRegulationSupports = buildRegulationSupports;
window.buildLiveFieldDashboardMetrics = buildLiveFieldDashboardMetrics;
window.updateLiveFieldDashboardUI = updateLiveFieldDashboardUI;
window.buildLiveDashboardDayType = buildLiveDashboardDayType;
window.buildMobileSnapshotSupport = buildMobileSnapshotSupport;
window.updateMobileReadSnapshot = updateMobileReadSnapshot;
window.scrollToMobileReadSnapshot = scrollToMobileReadSnapshot;
window.setTechnicalDetailsDefault = setTechnicalDetailsDefault;
window.applyFieldClass = applyFieldClass;
window.applyFieldClasses = applyFieldClasses;
window.applyFieldUndertoneClass = applyFieldUndertoneClass;
window.applyFieldUndertoneClasses = applyFieldUndertoneClasses;
window.harmonicClass = harmonicClass;
window.harmonicText = harmonicText;
window.chipClass = chipClass;
window.slugify = slugify;
window.FIELD_CLASS_NAMES = FIELD_CLASS_NAMES;
window.UNDERTONE_CLASS_NAMES = UNDERTONE_CLASS_NAMES;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("calcBtn")?.addEventListener("click", () => calculate({ shouldAutoScroll: true }));
  document.getElementById("saveShareCardBtn")?.addEventListener("click", saveShareCard);
  document.getElementById("copyShareTextBtn")?.addEventListener("click", copyShareText);
  document.getElementById("saveProfileBtn")?.addEventListener("click", saveCurrentProfile);
  document.getElementById("loadProfileBtn")?.addEventListener("click", loadSelectedProfile);
  document.getElementById("deleteProfileBtn")?.addEventListener("click", deleteSelectedProfile);

  const dobEl = document.getElementById("dob");
  const tobEl = document.getElementById("tob");
  const ampmEl = document.getElementById("ampm");
  const locationEl = document.getElementById("location");

  if (dobEl && !dobEl.value) dobEl.value = "1980-11-21";
  if (tobEl && !tobEl.value) tobEl.value = "6:20";
  if (ampmEl && !ampmEl.value) ampmEl.value = "AM";
  if (locationEl && !locationEl.value) locationEl.value = "Cuero, TX";

  setTechnicalDetailsDefault();
  renderHarmonicLibrary();
  renderSavedProfiles();
  calculate({ shouldAutoScroll: false });
});
