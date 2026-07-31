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
 * How a chip is painted: `edge` is a bright flash in the chip's left padding,
 * `body` is the gradient under the text. Intensity slides both toward the deep
 * end of the ramp, so a barely-warm day reads light and a scorching one reads
 * deep — the switch point being personal, driven by the traveller's own
 * thresholds rather than an absolute temperature.
 *
 * ON CONTRAST: earlier revisions clamped `body` to a WCAG-safe segment so
 * white text always passed. That is no longer the case. The palette now
 * matches the original design mockups, whose bright ends fall below 4.5:1
 * against white. This is an accepted, deliberate tradeoff — see the comments
 * on BODY and MILD below before changing any colour here.
 */

/* ------------------------------------------------------------------ ramps */

/**
 * Full ramps. Used for decorative gradient bars only, where no text sits, so
 * they run the whole way from palest to deepest. Hot lingers in yellow and
 * orange and saves red for the top; cold moves baby blue to bright blue to
 * sapphire. Both end on a saturated jewel tone rather than a muddy dark.
 */
const RAMP = {
  hot: ['#F7D46A', '#F5B841', '#F0952F', '#E2662F', '#D13C37'],
  cold: ['#D6E9FF', '#B9D2F5', '#8FB0E4', '#4E75C4', '#3558A5'],
}

/**
 * Edge colours — the bright flash in a chip's left padding. Never sits under
 * text, so these are unconstrained by contrast and can stay vivid.
 */
const EDGE = {
  hot: ['#F7D46A', '#F5B841', '#F0952F'],
  cold: ['#C3D9F5', '#A8C4EE', '#8FB0E4'],
}

/**
 * Body colours — everything under the text, clamped to the contrast-safe
 * segment of each ramp. Every colour here passes white text at 4.5:1 or
 * better, so any interpolation between two of them passes too (sRGB
 * luminance is convex, so a blend is never lighter than its lighter end).
 *
 * These are the original mockup ramps. A mid-intensity chip resolves to the
 * mockup's sampled colours at its deep end: cold ~#3558A5, hot ~#D13C37.
 *
 * ACCEPTED CONTRAST EXCEPTION — do not "fix" this.
 * Unlike earlier revisions, these ramps are NOT clamped to the WCAG-safe
 * segment. The bright ends carry white text below 4.5:1 (roughly 1.9:1 at the
 * lightest orange and 2.6:1 at the lightest periwinkle). That is deliberate:
 * it keeps the brighter, more editorial palette of the original mockups, and
 * it applies to every chip, not just the mild ones. Do NOT auto-darken these
 * ramps and do NOT switch any chip to dark text. /styleguide reports each
 * chip's real worst-case ratio on purpose, as an ongoing reminder.
 *
 *   hot:  #F5B841 1.9:1 -> #F0952F 2.3 -> #E2662F 3.2 -> #D13C37 4.8 -> #B02A2E 6.6
 *   cold: #8FB0E4 2.6:1 -> #6E93D8 3.3 -> #4E75C4 4.3 -> #3558A5 6.8 -> #2A4585 9.4
 */
const BODY = {
  hot: ['#F5B841', '#F0952F', '#E2662F', '#D13C37', '#B02A2E'],
  cold: ['#8FB0E4', '#6E93D8', '#4E75C4', '#3558A5', '#2A4585'],
}

/**
 * How much of the safe segment a single chip spans. The window slides along
 * the ramp as intensity rises. At 0.5 a barely-hot day and a scorching one
 * share no colour at all, which is what gives the day-to-day variation.
 */
const CHIP_SPAN = 0.5

/**
 * Mild days: the bright solid chips from the original mockups, white bold text.
 *
 * ACCEPTED CONTRAST EXCEPTION — do not "fix" this.
 * Against white text, mild cool (#98BAEA) measures ~1.99:1 and mild warm
 * (#F4B446) ~1.83:1. Both fail WCAG AA, which needs 4.5:1. This is an
 * intentional design decision to keep the brighter, more editorial palette of
 * the original mockups. Do NOT auto-darken these backgrounds and do NOT
 * auto-switch the text colour on these two chips. The /styleguide page reports
 * the real failing ratios on purpose, as an ongoing reminder rather than a
 * one-time note.
 */
const MILD = {
  hot: { background: '#F4B446', text: '#FFFFFF' },
  cold: { background: '#98BAEA', text: '#FFFFFF' },
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
/**
 * The two temperatures that divide cold from mild from hot, for this person.
 *
 * The survey's own thresholds do most of the work; running hot or cold nudges
 * both by 2°, since someone who runs cold needs it warmer before they're
 * comfortable at either end.
 */
/**
 * How far "I run hot" or "I run cold" moves the bands.
 *
 * Was 2°, which two real users proved too timid: both left the summer slider
 * on its default, and at 25° the one who runs hot landed on t=0.417 against a
 * band edge at 0.45 — so an average person and a hot-running person read
 * identically, which is the app failing at its one job. 3° clears the band.
 *
 * Not more than 3: at 4° someone who runs cold stops finding 25° warm at all,
 * and the self-assessment starts overruling the thresholds people actually
 * chose rather than adjusting them.
 */
const TEMPERAMENT_SHIFT_C = 3

export function comfortThresholds(profile = DEFAULT_PROFILE) {
  const shift =
    profile.runsHotCold === 'cold'
      ? TEMPERAMENT_SHIFT_C
      : profile.runsHotCold === 'hot'
        ? -TEMPERAMENT_SHIFT_C
        : 0

  return {
    coat: (profile.coatThresholdC ?? DEFAULT_PROFILE.coatThresholdC) + shift,
    summer: (profile.summerThresholdC ?? DEFAULT_PROFILE.summerThresholdC) + shift,
  }
}

export function temperatureIntensity(feelsLikeC, profile = DEFAULT_PROFILE) {
  const { coat, summer } = comfortThresholds(profile)

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
      // Solid fill, so the colour under the text is simply the background.
      lightestUnderText: tint.background,
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
    /*
     * The lightest colour any glyph actually sits on, and therefore the right
     * value to judge readability by. The chip's left padding and the
     * gradient's first stop are both --chip-padding-x, so text begins exactly
     * at bodyStart; the brighter `edge` colour is entirely inside the padding
     * and never touches a letter. From bodyStart rightward the gradient only
     * darkens, so this is the worst case under text.
     */
    lightestUnderText: bodyStart,
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
 * On the banding: crossing a threshold does not mean the weather is extreme.
 * The summer threshold is the point where someone reaches for shorts — the
 * *start of pleasant summer*, not the start of discomfort. So the first
 * stretch past it reads "Just right" and then "Warm", and the word "hot" is
 * held back until a day is genuinely well past what they asked for. The cold
 * side mirrors that: just under the coat threshold is "Cool", not "Bitter".
 *
 * Getting this wrong is subtle and quietly insulting — telling someone their
 * idea of perfect weather is "hot for you" contradicts the one thing the app
 * claims to know about them.
 */
export function comfortLabel(feelsLikeC, profile = DEFAULT_PROFILE, conditions = {}) {
  const { side, t, leaning } = temperatureIntensity(feelsLikeC, profile)
  const { humidityPct = 0, rainChancePct = 0, windy = false } = conditions

  const muggy = humidityPct >= 70
  const wet = rainChancePct >= 50

  // Rain, humidity and wind decorate the temperature word; they never replace
  // it. Returning "Warm + brolly" for a 36° downpour, as this once did, threw
  // away the reading the whole app exists to produce — the modifier fired
  // first and the intensity was never consulted. The short words below exist
  // so a decorated chip still fits: "Scorching + brolly" is about the width of
  // "Comfortably warm", which is the longest chip the layout allows.
  if (side === 'hot') {
    const heat =
      t >= 0.9 ? 'Scorching' : t >= 0.7 ? 'Very hot' : t >= 0.45 ? 'Hot' : t >= 0.15 ? 'Warm' : 'Mild'

    // Rain outranks humidity on the chip because it changes what you carry,
    // not just how you feel. Mugginess still shows on the day's detail line.
    if (wet) return `${heat} + brolly`
    if (muggy) return t >= 0.45 ? `${heat} + sticky` : `${heat} + humid`

    if (t >= 0.9) return 'Scorching for you'
    if (t >= 0.7) return 'Properly hot'
    if (t >= 0.45) return 'Hot for you'
    if (t >= 0.15) return 'Warm for you'
    return 'Just right for you'
  }

  if (side === 'cold') {
    const chill =
      t >= 0.9 ? 'Bitter' : t >= 0.7 ? 'Very cold' : t >= 0.45 ? 'Cold' : t >= 0.15 ? 'Chilly' : 'Cool'

    // On a cold day wind is the thing that actually catches people out, so it
    // outranks rain here — the reverse of the hot side.
    if (windy) return `${chill} + wind`
    if (wet) return `${chill} + brolly`

    if (t >= 0.9) return 'Bitter, full layers'
    if (t >= 0.7) return 'Bundle up'
    if (t >= 0.45) return 'Properly cold'
    if (t >= 0.15) return 'Cold for you'
    return 'Cool for you'
  }

  if (wet) return 'Mild + brolly'
  // "Close" is regional British for muggy and reads as ambiguous; say muggy.
  if (muggy) return 'Mild but muggy'
  return leaning === 'hot' ? 'Comfortably warm' : 'Fresh but fine'
}

/* -------------------------------------------------------------- spectrum */

/**
 * Absolute temperature to colour.
 *
 * Everything above is *personal* — how a day sits against your thresholds.
 * This is the opposite: a fixed scale from cold to hot, for UI that shows
 * temperature as a range rather than a judgement. The survey's threshold
 * sliders need it, because there the whole point is deciding where your
 * personal bands fall, so they can't be coloured by bands that don't exist yet.
 *
 * Anchors are drawn from the same two ramps, meeting in a pale neutral around
 * room temperature, so the survey teaches the colour language the forecast
 * screens will later speak.
 */
const SPECTRUM = [
  { c: -10, hex: '#2A4585' },
  { c: -2, hex: '#4E75C4' },
  { c: 5, hex: '#8FB0E4' },
  { c: 12, hex: '#C3D9F5' },
  { c: 17, hex: '#F7D46A' },
  { c: 23, hex: '#F0952F' },
  { c: 29, hex: '#E2662F' },
  { c: 35, hex: '#D13C37' },
]

export function spectrumColour(celsius) {
  if (celsius <= SPECTRUM[0].c) return SPECTRUM[0].hex

  const last = SPECTRUM[SPECTRUM.length - 1]
  if (celsius >= last.c) return last.hex

  for (let i = 0; i < SPECTRUM.length - 1; i += 1) {
    const from = SPECTRUM[i]
    const to = SPECTRUM[i + 1]
    if (celsius <= to.c) {
      return mix(from.hex, to.hex, (celsius - from.c) / (to.c - from.c))
    }
  }

  return last.hex
}

/**
 * A left-to-right gradient across a temperature range, for a slider track.
 * Sampled at fixed steps rather than using the raw anchors, so the gradient
 * stays smooth whatever slice of the scale a given slider covers.
 */
export function spectrumGradient(minC, maxC, steps = 7) {
  const stops = Array.from({ length: steps }, (_, index) =>
    spectrumColour(minC + ((maxC - minC) * index) / (steps - 1)),
  )
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

/**
 * The same spectrum colour, but legible as text on white.
 *
 * The mild middle of the scale is deliberately pale — that's what makes a
 * slider track read as a temperature range — but a pale blue numeral is
 * unreadable. This keeps the hue and deepens it only as far as it must to
 * clear the large-text contrast floor, so 10° still looks cool and 26° still
 * looks warm; they just stay readable.
 *
 * Unlike the comfort chips, there is no design reason to cross the floor
 * here: this is a plain numeral, not the mockup palette.
 */
export function spectrumTextColour(celsius, minRatio = 3.2) {
  const base = spectrumColour(celsius)
  if (contrastRatio(base, '#FFFFFF') >= minRatio) return base

  for (let amount = 0.05; amount <= 1; amount += 0.05) {
    const darkened = mix(base, '#1C1C1E', amount)
    if (contrastRatio(darkened, '#FFFFFF') >= minRatio) return darkened
  }

  return '#1C1C1E'
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
