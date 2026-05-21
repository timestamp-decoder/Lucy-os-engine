/* =========================================================
   Lucy.OS Pro Library
   Static vocabulary/constants only.
   Do not place runtime engine logic in this file.
   ========================================================= */

const HARMONICS = {
  Structured: {
    label: "Structured",
    signalQuality: "Clear, organized, pattern-seeking, structure-oriented",
    stabilityMethod: "Sequencing, naming, organizing, building usable form",
    overloadRisk: "Too much signal before the container is finished; pressure outrunning structure",
    plainRead: "This system stabilizes by turning pressure into order. Overload happens when clarity arrives faster than the structure can hold it."
  },

  Contained: {
    label: "Contained",
    signalQuality: "Deep, internal, cyclical, protected",
    stabilityMethod: "Privacy, inward processing, slower release, protected formation",
    overloadRisk: "Emotional compression; signal trapped inside; delayed expression turning into pressure buildup",
    plainRead: "This system stabilizes by pulling signal inward until it feels safe. Overload happens when too much stays unexpressed for too long."
  },

  Chaotic: {
    label: "Chaotic",
    signalQuality: "Fast, mobile, catalytic, nonlinear",
    stabilityMethod: "Movement, discharge, rapid shifts, giving energy somewhere useful to go",
    overloadRisk: "Scattering, instability, shock cycles, losing continuity",
    plainRead: "This system carries fast, nonlinear signal and stabilizes by giving the charge somewhere useful to go. Overload happens when the voltage has no container."
  },

  Relational: {
    label: "Relational",
    signalQuality: "Attuned, responsive, field-sensitive, relational",
    stabilityMethod: "Contact, mirroring, tone-tracking, repairing the field",
    overloadRisk: "Over-attunement, losing center, attachment loops, emotional fusion",
    plainRead: "This system stabilizes by reading and repairing the space between people. Overload happens when the field becomes too loud or too fused."
  },

  Threshold: {
    label: "Threshold",
    signalQuality: "Sharp, decisive, activation-based, timing-sensitive",
    stabilityMethod: "Timing, clean openings, crossings, decisive movement",
    overloadRisk: "Urgency, rupture, impatience, acting before the field is ready",
    plainRead: "This system stabilizes at turning points. Overload happens when everything feels like a turning point."
  },

  Reconstructive: {
    label: "Reconstructive",
    signalQuality: "Compressed, transformative, deep-field, pressure-bearing",
    stabilityMethod: "Repair, rebuilding, pressure integration, strengthening weak points",
    overloadRisk: "Crisis identity, heaviness, repeated collapse loops",
    plainRead: "This system stabilizes by transforming pressure into a stronger form. Overload happens when the system is forced to rebuild too often without rest."
  },

  Integrative: {
    label: "Integrative",
    signalQuality: "Wide, connective, meaning-oriented, integrative",
    stabilityMethod: "Synthesis, pattern-linking, big-picture coherence",
    overloadRisk: "Over-meaning, abstraction, taking in too many layers at once",
    plainRead: "This system stabilizes by making the scattered field coherent. Overload happens when there are too many pieces to integrate."
  },

  Diffused: {
    label: "Diffused",
    signalQuality: "Porous, atmospheric, impressionistic, subtle",
    stabilityMethod: "Soft focus, spaciousness, gentle pacing, wide reception",
    overloadRisk: "Fog, overwhelm, boundary loss, unclear direction",
    plainRead: "This system stabilizes by receiving widely before defining. Overload happens when the field is too dense or too demanding."
  },

  Regulated: {
    label: "Regulated",
    signalQuality: "Measured, paced, controlled, load-aware",
    stabilityMethod: "Timing, containment, emotional management, load control",
    overloadRisk: "Over-control, bottlenecking, emotional restriction, fear of disorder",
    plainRead: "This system stabilizes by pacing the signal until it becomes manageable. Overload happens when the system tries to control too much for too long."
  }
};

const REGULATION_SUPPORT_LIBRARY = {
  Structured: {
    supportQuality: "clarity, order, clean focus, simple structure",
    lightEnvironment: "Bright clean light, clear desk, visible next step.",
    scent: "Rosemary, mint, eucalyptus, or a clean mild scent.",
    plantNature: "Upright plant, rosemary, or a small structured green plant.",
    musicSound: "Focused instrumental, light classical, or clean low-distraction music.",
    behavior: "Write the next step, organize one surface, or make one small plan.",
    why: "Structured fields regulate through clarity and usable form. The support should reduce clutter and make the next step visible."
  },

  Contained: {
    supportQuality: "privacy, warmth, protected space, slower release",
    lightEnvironment: "Dim warm light, closed door, soft blanket, or private corner.",
    scent: "Sandalwood, vanilla, amber, or a soft wood scent.",
    plantNature: "Fern, peace lily, pothos, or a protected indoor plant.",
    musicSound: "Quiet ambient, soft piano, or low-volume sound.",
    behavior: "Take space before explaining, journal privately, and reduce outside input.",
    why: "Contained fields regulate through protection and inward processing. The support should make the system feel less exposed."
  },

  Chaotic: {
    supportQuality: "discharge, channeling, rhythm, safe movement",
    lightEnvironment: "Open space, less clutter, and enough room to move.",
    scent: "Citrus, peppermint, ginger, or a bright fresh scent.",
    plantNature: "Snake plant, hardy upright plant, or outdoor air if available.",
    musicSound: "Steady rhythmic music, one song on repeat, beat-based but not explosive.",
    behavior: "Take a short walk, shake out tension, do one physical task, or give the charge one channel.",
    why: "Chaotic fields regulate by giving fast signal a safe direction. The support should move energy without escalating it."
  },

  Relational: {
    supportQuality: "warmth, softness, centered contact, proportional response",
    lightEnvironment: "Warm lamp light, soft texture, comfortable shared or calming space.",
    scent: "Rose, lavender, vanilla, jasmine, or a soft floral scent if tolerated.",
    plantNature: "Rose, jasmine, pothos, peace lily, or a plant that softens the room.",
    musicSound: "Warm steady music, soft vocals, or gentle familiar songs.",
    behavior: "Name mine / not mine, use plain language, do not over-read tone, and keep responsibility proportional.",
    why: "Relational fields regulate through clean contact and emotional proportion. The support should soften the field without fusing with it."
  },

  Threshold: {
    supportQuality: "edge pacing, pause, timing, clean crossing",
    lightEnvironment: "Amber light, low-stim space, and a clear exit or entry point.",
    scent: "Cedar, frankincense, pine, or a grounding resin or wood scent.",
    plantNature: "Bamboo, snake plant, small tree-like plant, or stepping outside briefly.",
    musicSound: "Steady beat, slow build, or music that supports motion without urgency.",
    behavior: "Pause before replying, name the decision, delay non-urgent choices, and cross one threshold only.",
    why: "Threshold fields regulate through timing. The support should slow urgency enough to make the crossing clean."
  },

  Reconstructive: {
    supportQuality: "grounding, repair focus, steadiness, one weak point at a time",
    lightEnvironment: "Neutral light, grounded workspace, tools visible but not overwhelming.",
    scent: "Cedar, vetiver, sandalwood, patchouli, or an earthy scent.",
    plantNature: "Aloe, jade, rubber plant, or a sturdy grounded plant.",
    musicSound: "Slow repetitive music, deep steady instrumental, or low-intensity rhythm.",
    behavior: "Fix one weak point only, stop after one repair, and do not rebuild the whole system.",
    why: "Reconstructive fields regulate through specific repair. The support should make the repair concrete without turning it into collapse."
  },

  Integrative: {
    supportQuality: "spaciousness, synthesis, pattern connection, meaning with limits",
    lightEnvironment: "Natural light, open notebook, and clean visual field.",
    scent: "Lavender, bergamot, clary sage, or a light herbal/citrus scent.",
    plantNature: "Monstera, pothos, trailing plant, or a nature view.",
    musicSound: "Spacious instrumental, ambient with movement, or music that helps pieces connect.",
    behavior: "Write the pattern, connect only what helps, and choose one meaningful next step.",
    why: "Integrative fields regulate by connecting pieces into usable meaning. The support should widen perspective without adding too many layers."
  },

  Diffused: {
    supportQuality: "grounding, low noise, gentle anchor, reduced input",
    lightEnvironment: "Soft grounding light, quiet room, fewer tabs/screens/noise sources.",
    scent: "Lavender, chamomile, clean linen, or a very mild scent.",
    plantNature: "Peace lily, fern, soft green plant, feet on ground, or outside air.",
    musicSound: "Minimal ambient, low-volume drone, or silence if music blurs the field.",
    behavior: "Write one true sentence, reduce sensory input, and choose one anchor before interpreting.",
    why: "Diffused fields regulate through simplification and grounding. The support should help the field become less foggy without forcing clarity too fast."
  },

  Regulated: {
    supportQuality: "rhythm, balance, routine, manageable pacing",
    lightEnvironment: "Balanced light, normal routine space, and stable temperature.",
    scent: "Clean mild scent, tea, light mint, or subtle herbal scent.",
    plantNature: "Simple green plant, small desk plant, or familiar natural object.",
    musicSound: "Steady low-tempo music, simple rhythm, or background music that does not pull focus.",
    behavior: "Keep the routine simple, do one task at a time, use a timer, and stop before over-controlling.",
    why: "Regulated fields regulate through pacing. The support should preserve rhythm without tightening into control."
  }
};

const STABLE_PROFILE_LABELS = {
  Structured: {
    Structured: "Core System Builder",
    Contained: "Boundary System Builder",
    Chaotic: "Adaptive System Builder",
    Relational: "Relational System Builder",
    Threshold: "Threshold System Builder",
    Reconstructive: "Repair System Builder",
    Integrative: "Integrative System Builder",
    Diffused: "Atmospheric System Builder",
    Regulated: "Steady System Builder"
  },

  Contained: {
    Structured: "Structured Boundary Keeper",
    Contained: "Core Boundary Keeper",
    Chaotic: "Activated Boundary Keeper",
    Relational: "Relational Boundary Keeper",
    Threshold: "Threshold Boundary Keeper",
    Reconstructive: "Repair Boundary Keeper",
    Integrative: "Integrative Boundary Keeper",
    Diffused: "Sensitive Boundary Keeper",
    Regulated: "Steady Boundary Keeper"
  },

  Chaotic: {
    Structured: "Signal-to-Structure Builder",
    Contained: "Contained Signal Mover",
    Chaotic: "Core Signal Catalyst",
    Relational: "Relational Signal Mover",
    Threshold: "Threshold Signal Mover",
    Reconstructive: "Repair Signal Catalyst",
    Integrative: "Integrative Signal Catalyst",
    Diffused: "Field-Sensitive Signal Mover",
    Regulated: "Regulated Signal Mover"
  },

  Relational: {
    Structured: "Structured Connection Reader",
    Contained: "Protective Connection Stabilizer",
    Chaotic: "Activated Connection Mover",
    Relational: "Core Connection Stabilizer",
    Threshold: "Threshold Connection Reader",
    Reconstructive: "Repair Connection Stabilizer",
    Integrative: "Integrative Connection Reader",
    Diffused: "Field-Sensitive Connection Reader",
    Regulated: "Steady Connection Stabilizer"
  },

  Threshold: {
    Structured: "Structured Threshold Navigator",
    Contained: "Contained Threshold Navigator",
    Chaotic: "Activated Threshold Mover",
    Relational: "Relational Threshold Navigator",
    Threshold: "Core Threshold Navigator",
    Reconstructive: "Repair Threshold Navigator",
    Integrative: "Integrative Threshold Navigator",
    Diffused: "Field-Sensitive Threshold Reader",
    Regulated: "Steady Threshold Navigator"
  },

  Reconstructive: {
    Structured: "Structured Repair Builder",
    Contained: "Contained Repair Stabilizer",
    Chaotic: "Activated Repair Catalyst",
    Relational: "Relational Repair Stabilizer",
    Threshold: "Threshold Repair Navigator",
    Reconstructive: "Core Repair Builder",
    Integrative: "Integrative Repair Builder",
    Diffused: "Field-Sensitive Repair Reader",
    Regulated: "Paced Repair Stabilizer"
  },

  Integrative: {
    Structured: "Structured Meaning Builder",
    Contained: "Contained Meaning Keeper",
    Chaotic: "Activated Meaning Synthesizer",
    Relational: "Relational Meaning Reader",
    Threshold: "Threshold Meaning Navigator",
    Reconstructive: "Repair Meaning Synthesizer",
    Integrative: "Core Meaning Synthesizer",
    Diffused: "Integrative Field Reader",
    Regulated: "Steady Meaning Synthesizer"
  },

  Diffused: {
    Structured: "Atmospheric Pattern Framer",
    Contained: "Contained Field Sensor",
    Chaotic: "Activated Field Sensor",
    Relational: "Relational Field Sensor",
    Threshold: "Threshold Field Sensor",
    Reconstructive: "Repair Field Sensor",
    Integrative: "Integrative Field Sensor",
    Diffused: "Core Field Sensor",
    Regulated: "Steady Field Sensor"
  },

  Regulated: {
    Structured: "Structured Rhythm Stabilizer",
    Contained: "Contained Rhythm Stabilizer",
    Chaotic: "Activated Rhythm Stabilizer",
    Relational: "Relational Rhythm Stabilizer",
    Threshold: "Threshold Rhythm Stabilizer",
    Reconstructive: "Repair Rhythm Stabilizer",
    Integrative: "Integrative Rhythm Stabilizer",
    Diffused: "Field-Sensitive Rhythm Stabilizer",
    Regulated: "Core Rhythm Stabilizer"
  }
};

const DISTORTION_STATES = {
  emotionalFusion: {
    label: "Emotional Fusion",
    short: "Field-overload distortion / blends signal",
    plain: "Outside emotional signal may enter the internal channel too strongly, making another field feel like your own.",
    returnPath: "Separate the channels again: mine / not mine. Return to your own center before responding."
  },

  rupture: {
    label: "Rupture",
    short: "Axis-protection distortion / breaks contact",
    plain: "Pressure may exceed tolerance and cause the system to break contact, withdraw, snap, or cut the field to protect itself.",
    returnPath: "Rebuild continuity slowly. Do not force re-entry before stability returns."
  },

  overStructuring: {
    label: "Over-Structuring",
    short: "Rigidity distortion / tightens structure",
    plain: "The system may try to stabilize uncertainty by adding more rules, categories, analysis, or control than the moment requires.",
    returnPath: "Widen the frame. Reduce structural load. Allow some uncertainty without treating it as failure."
  },

  scatter: {
    label: "Scatter",
    short: "Diffusion distortion / disperses signal",
    plain: "Too many signals may be open at once, making it hard to keep one clear thread.",
    returnPath: "Reduce inputs. Choose one channel. Restore sequence."
  }
};
