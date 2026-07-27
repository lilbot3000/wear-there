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
 * they run the whole way from palest to deepest.
 */
const RAMP = {
  hot: ['#FFE066', '#FFB020', '#FF6A3D', '#E11D2E', '#8F0C18'],
  cold: ['#CFE4FF', '#8FBBEE', '#4A82D6', '#1E4FA3', '#14336B'],
}

/**
 * Edge colours — the bright flash in a chip's left padding. Light half of the
 * ramp. Never appears under text, so these are unconstrained by contrast.
 */
const EDGE = {
  hot: ['#FFD37A', '#FFB020', '#FF6A3D'],
  cold: ['#CFE4FF', '#8FBBEE', '#4A82D6'],
}

/**
 * Body colours — everything under the text. Clamped to the contrast-safe
 * segment of each ramp. Every colour these can produce passes white text at
 * 4.5:1 or better (hot starts at 4.8:1, cold at 5.5:1, both darkening).
 */
const BODY = {
  hot: ['#E11D2E', '#8F0C18'],
  cold: ['#3D66B8', '#1E4FA3', '#14336B'],
}

/** Mild days: pale tint with dark text, so quiet weather reads quiet. */
const MILD = {
  hot: { background: '#FCE7C2', text: '#8A5A12' },
  cold: { background: '#DCE9FB', text: '#2C5590' },
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
  const body = sampleRamp(BODY[side], t)

  return {
    side,
    t,
    edge,
    body,
    text: '#FFFFFF',
    chipStyle: {
      // The dark stop lands at exactly the chip's left padding, so the bright
      // edge colour never reaches a glyph. Keep these two in lockstep.
      background: `linear-gradient(90deg, ${edge}, ${body} var(--chip-padding-x))`,
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
