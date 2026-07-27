/**
 * Wear There — the temperature colour system.
 *
 * Every temperature-driven colour in the app comes from here. See
 * docs/04-ux-design-spec.md ("The temperature gradient system").
 *
 * The core idea: a day's colour is driven by how far it sits past *your*
 * personal comfort thresholds, not by an absolute temperature. So 24°C can
 * read as "hot for you" for one traveller and "mild" for another.
 *
 * The safety invariant: a comfort chip's `body` colour is what sits under the
 * text, so it is only ever sampled from the dark segment of a ramp where white
 * text passes WCAG AA. The bright `edge` colour lives only in the chip's left
 * padding, where no glyph ever lands. Contrast therefore holds by
 * construction, at any temperature and any text length.
 */

/* ------------------------------------------------------------------ ramps */

/**
 * Full ramps. Used for decorative gradient bars only, where no text sits, so
 * they run the whole way from palest to deepest. Hot lingers in yellow and
 * orange and saves red for the top; cold moves baby blue to bright blue to
 * sapphire. Both end on a saturated jewel tone rather than a muddy dark.
 */
const RAMP = {
  hot: ['#FFE14D', '#FFC61A', '#FF9A1F', '#FF6A1F', '#E11D2E', '#B3122A'],
  cold: ['#D6E9FF', '#A8D0F7', '#5B9BE8', '#2E71D6', '#1A46A8'],
}

/**
 * Edge colours — the bright flash in a chip's left padding. Never sits under
 * text, so these are unconstrained by contrast and can stay vivid.
 */
const EDGE = {
  hot: ['#FFE14D', '#FFB020', '#FF7A1F'],
  cold: ['#D6E9FF', '#9BC8F5', '#5B9BE8'],
}

/**
 * Body colours — everything under the text, clamped to the contrast-safe
 * segment of each ramp. Every colour here passes white text at 4.5:1 or
 * better, so any interpolation between two of them passes too (sRGB
 * luminance is convex, so a blend is never lighter than its lighter end).
 *
 * These segments run deliberately long — from the lightest colour that still
 * carries white text all the way down to a near-black jewel tone. The length
 * is what produces both a dramatic sweep inside a single chip and real tonal
 * separation between a warm day and a scorching one.
 *
 *   hot:  #C24A0A 4.91:1 -> #E11D2E 4.76 -> #B3122A 6.92 -> #8A0F20 9.68 -> #5E0A16 13.7
 *   cold: #2E71D6 4.72:1 -> #1E56BE 6.71 -> #1A46A8 8.45 -> #12327A 11.9  -> #0B1F4D 17.0
 *
 * #C24A0A is about as orange as a colour can get and still carry white text;
 * anything more vivid drops below 4.5:1. Brighter orange lives in the edge
 * colours and the decorative bars instead.
 */
const BODY = {
  hot: ['#C24A0A', '#E11D2E', '#B3122A', '#8A0F20', '#5E0A16'],
  cold: ['#2E71D6', '#1E56BE', '#1A46A8', '#12327A', '#0B1F4D'],
}

/**
 * How much of the safe segment a single chip spans. The window slides along
 * the ramp as intensity rises. At 0.5 a barely-hot day and a scorching one
 * share no colour at all, which is what gives the day-to-day variation.
 */
const CHIP_SPAN = 0.5

/** Mild days: bright tint with dark text, so quiet weather reads quiet. */
const MILD = {
  hot: { background: '#FFEBAD', text: '#7A4A0A' },
  cold: { background: '#D4E8FF', text: '#1E4FA3' },
}

/**
 * Degrees past a threshold before intensity maxes out. With the default
 * profile, 34°C is full red and -3°C is full deep blue.
 */
const SPAN_C = 12

/** Fallback profile, used until the Phase 3 survey provides a real one. */
export const DEFAULT_PROFILE = {
  runsHotCold: 'average',
  summerThresholdC: 22,
  coatThresholdC: 9,
}

/* -------------------------------------------------------------- utilities */

const clamp01 = (n) => Math.min(1, Math.max(0, n))

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

const toHex = (n) => Math.round(n).toString(16).padStart(2, '0')

function mix(fromHex, toHexColour, amount) {
  const a = hexToRgb(fromHex)
  const b = hexToRgb(toHexColour)
  return `#${toHex(a.r + (b.r - a.r) * amount)}${toHex(
    a.g + (b.g - a.g) * amount,
  )}${toHex(a.b + (b.b - a.b) * amount)}`.toUpperCase()
}

/** Sample a colour from an array of stops. `t` runs 0 (first) to 1 (last). */
export function sampleRamp(stops, t) {
  const position = clamp01(t)
  if (position <= 0) return stops[0]
  if (position >= 1) return stops[stops.length - 1]

  const scaled = position * (stops.length - 1)
  const index = Math.floor(scaled)
  return mix(stops[index], stops[index + 1], scaled - index)
}

/* ------------------------------------------------------------- intensity */

/**
 * How extreme is this day, for this person?
 *
 * Returns `side` ('hot' | 'cold' | 'mild') and `t`, a 0–1 intensity. Mild days
 * also carry `leaning`, so they can borrow the warmer or cooler tint.
 */
export function temperatureIntensity(feelsLikeC, profile = DEFAULT_PROFILE) {
  // Running hot or cold nudges where the thresholds sit: if you run cold you
  // need it warmer before you're comfortable, so both thresholds shift up.
  const shift =
    profile.runsHotCold === 'cold' ? 2 : profile.runsHotCold === 'hot' ? -2 : 0

  const summer = (profile.summerThresholdC ?? DEFAULT_PROFILE.summerThresholdC) + shift
  const coat = (profile.coatThresholdC ?? DEFAULT_PROFILE.coatThresholdC) + shift

  if (feelsLikeC >= summer) {
    return { side: 'hot', t: clamp01((feelsLikeC - summer) / SPAN_C) }
  }

  if (feelsLikeC <= coat) {
    return { side: 'cold', t: clamp01((coat - feelsLikeC) / SPAN_C) }
  }

  const midpoint = (summer + coat) / 2
  return {
    side: 'mild',
    t: 0,
    leaning: feelsLikeC >= midpoint ? 'hot' : 'cold',
  }
}

/* ---------------------------------------------------------------- colours */

/**
 * The main entry point. Give it a feels-like temperature and a profile, get
 * back everything needed to paint a comfort chip.
 *
 * Intense days return a gradient with white text; mild days return a pale
 * tint with dark text.
 */
export function tempColour(feelsLikeC, profile = DEFAULT_PROFILE) {
  const { side, t, leaning } = temperatureIntensity(feelsLikeC, profile)

  if (side === 'mild') {
    const tint = MILD[leaning]
    return {
      side: 'mild',
      leaning,
      t: 0,
      background: tint.background,
      body: tint.background,
      text: tint.text,
      chipStyle: { background: tint.background, color: tint.text },
    }
  }

  const edge = sampleRamp(EDGE[side], t)

  // A sliding window over the safe segment: the chip runs from bodyStart at
  // the padding boundary to bodyEnd at its right edge, so the gradient is
  // visible across the whole readable width. Both ends are contrast-safe, and
  // so is everything between them.
  const windowStart = t * (1 - CHIP_SPAN)
  const bodyStart = sampleRamp(BODY[side], windowStart)
  const bodyEnd = sampleRamp(BODY[side], windowStart + CHIP_SPAN)

  return {
    side,
    t,
    edge,
    body: bodyStart,
    bodyStart,
    bodyEnd,
    text: '#FFFFFF',
    chipStyle: {
      // The first stop lands at exactly the chip's left padding, so the bright
      // edge colour never reaches a glyph. Keep those two in lockstep.
      background: `linear-gradient(90deg, ${edge}, ${bodyStart} var(--chip-padding-x), ${bodyEnd})`,
      color: '#FFFFFF',
    },
  }
}

/**
 * A decorative gradient bar for a trip. It runs from the palest stop up to the
 * trip's intensity point, so the bar's reach itself shows how extreme the trip
 * is: a mild week stays pale, a heatwave sweeps the full ramp into deep red.
 */
export function temperatureBar(feelsLikeC, profile = DEFAULT_PROFILE, stopCount = 5) {
  const { side, t, leaning } = temperatureIntensity(feelsLikeC, profile)
  const ramp = RAMP[side === 'mild' ? leaning : side]

  // Mild trips barely travel along the ramp; intense trips reach the end.
  const reach = side === 'mild' ? 0.25 : 0.4 + 0.6 * t

  const stops = Array.from({ length: stopCount }, (_, index) =>
    sampleRamp(ramp, (index / (stopCount - 1)) * reach),
  )

  return `linear-gradient(90deg, ${stops.join(', ')})`
}

/* ----------------------------------------------------------------- words */

/**
 * The phrase that goes in a comfort chip.
 *
 * Wear There talks like a well-travelled friend, so a day gets a description
 * rather than a reading: "Muggy + brolly", "Bundle up", "Scorching for you".
 * Weather conditions win over raw temperature when they're the thing you'd
 * actually mention.
 *
 * Phase 4 wires the real forecast into `conditions`; until then the caller
 * can pass whatever it has, or nothing.
 */
export function comfortLabel(feelsLikeC, profile = DEFAULT_PROFILE, conditions = {}) {
  const { side, t, leaning } = temperatureIntensity(feelsLikeC, profile)
  const { humidityPct = 0, rainChancePct = 0, windy = false } = conditions

  const muggy = humidityPct >= 70
  const wet = rainChancePct >= 50

  if (side === 'hot') {
    if (muggy && wet) return 'Muggy + brolly'
    if (muggy) return t >= 0.55 ? 'Hot and sticky' : 'Warm and humid'
    if (wet) return 'Warm + brolly'
    if (t >= 0.85) return 'Scorching for you'
    if (t >= 0.55) return 'Properly hot'
    if (t >= 0.25) return 'Hot for you'
    return 'Warm for you'
  }

  if (side === 'cold') {
    if (windy && t >= 0.5) return 'Biting wind chill'
    if (windy) return 'Cold and blowy'
    if (wet) return 'Cold + brolly'
    if (t >= 0.85) return 'Bitter, full layers'
    if (t >= 0.55) return 'Bundle up'
    if (t >= 0.25) return 'Cold for you'
    return 'Cool for you'
  }

  if (wet) return 'Mild + brolly'
  if (muggy) return 'Mild but close'
  return leaning === 'hot' ? 'Comfortably warm' : 'Fresh but fine'
}

/* ---------------------------------------------------------- verification */

/** Relative luminance per WCAG 2.1. */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value) => {
    const sRGB = value / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : ((sRGB + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * WCAG contrast ratio between two colours, 1–21. The styleguide uses this to
 * prove the body-colour clamp is working rather than taking it on trust.
 */
export function contrastRatio(hexA, hexB) {
  const a = luminance(hexA)
  const b = luminance(hexB)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}
