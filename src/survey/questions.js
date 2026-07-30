/**
 * The 11 survey questions (F1 in docs/02-mvp-spec.md).
 *
 * Defined as data rather than 11 hand-written screens, so the survey stepper
 * and the "My style" summary both read from one source and can't drift apart.
 * Adding or reordering a question means editing this list and nothing else.
 *
 * Voice: a sharp, well-travelled friend. Plain, warm, confident. Sentence case
 * throughout, never capitals.
 */

import { placeLabel } from '../lib/geocode.js'

/** Turn a stored value into the one-line answer shown on "My style". */
const listSummary = (values, empty) =>
  values && values.length > 0 ? values.join(', ') : empty

const HUMIDITY_LABELS = [
  'Barely notice it',
  'Mildly annoying',
  'Noticeable',
  'Really bothers me',
  'Ruins the day',
]

const PACKING_LABELS = [
  'Pack light, re-wear everything',
  'Lean, with a couple of spares',
  'A sensible middle',
  'Options for most days',
  'Options for every scenario',
]

export const QUESTIONS = [
  {
    id: 'home',
    label: 'Home',
    field: 'home',
    type: 'city',
    question: "Where's home?",
    help: 'This anchors everything else. 22° reads differently depending on what you are used to, and it lets us tell you how a trip compares to home.',
    summary: (value) => (value ? placeLabel(value) : 'Not set'),
  },

  {
    id: 'runs',
    label: 'Temperature',
    field: 'runsHotCold',
    type: 'choice',
    question: 'Do you run hot, cold, or average?',
    help: 'Compared with the people around you, not with a thermometer.',
    options: [
      { value: 'hot', label: 'I run hot' },
      { value: 'average', label: 'About average' },
      { value: 'cold', label: 'I run cold' },
    ],
    summary: (value) =>
      ({ hot: 'Runs hot', average: 'Runs average', cold: 'Runs cold' })[value] ?? 'Not set',
  },

  {
    id: 'summer',
    label: 'Summer clothes',
    field: 'summerThresholdC',
    type: 'slider',
    question: 'When do you switch to summer clothes?',
    help: 'The point where you reach for shorts, linen, or a dress without thinking about it.',
    min: 12,
    max: 32,
    step: 1,
    fallback: 22,
    caption: (value) => `At ${value}° and above, you are in summer clothes.`,
    // Must stay above the coat threshold, or the "mild" band disappears.
    bounds: (profile) => ({ min: Math.max(12, (profile.coatThresholdC ?? 9) + 4) }),
    // Summaries sit under their question's label on "My style", so they state
    // the answer alone rather than repeating the label back.
    summary: (value) => (value == null ? 'Not set' : `${value}° and above`),
  },

  {
    id: 'coat',
    label: 'Coat weather',
    field: 'coatThresholdC',
    type: 'slider',
    question: 'When do you need a proper coat?',
    help: 'Not a jacket you might carry. The coat you actually zip up.',
    min: -5,
    max: 18,
    step: 1,
    fallback: 9,
    caption: (value) => `Below ${value}°, you want a proper coat.`,
    bounds: (profile) => ({ max: Math.min(18, (profile.summerThresholdC ?? 22) - 4) }),
    summary: (value) => (value == null ? 'Not set' : `Below ${value}°`),
  },

  {
    id: 'humidity',
    label: 'Humidity',
    field: 'humiditySensitivity',
    type: 'scale',
    question: 'How much does mugginess bother you?',
    help: 'Humid heat is the thing most forecasts hide, so it is worth knowing.',
    labels: HUMIDITY_LABELS,
    summary: (value) => (value == null ? 'Not set' : HUMIDITY_LABELS[value - 1]),
  },

  {
    id: 'rain',
    label: 'Rain',
    field: 'rainPlan',
    type: 'choice',
    question: 'What is your rain plan?',
    options: [
      { value: 'hood', label: 'Hood up, keep walking' },
      { value: 'umbrella', label: 'Umbrella, every time' },
      { value: 'wet', label: 'I just get wet' },
    ],
    summary: (value) =>
      ({
        hood: 'Hood up',
        umbrella: 'Always an umbrella',
        wet: 'Just gets wet',
      })[value] ?? 'Not set',
  },

  {
    id: 'styles',
    label: 'Style',
    field: 'styles',
    type: 'multi',
    max: 2,
    question: 'How do you dress most days?',
    help: 'Pick up to two. This keeps the packing list sounding like you.',
    options: ['Casual', 'Smart casual', 'Dressy', 'Sporty'],
    summary: (value) => listSummary(value, 'Not set'),
  },

  {
    id: 'warm',
    label: 'Warm-weather staples',
    field: 'warmStaples',
    type: 'multi',
    question: 'Which warm-weather things do you actually wear?',
    help: 'Only tick what genuinely leaves the wardrobe. Skipping a few is fine.',
    options: [
      'Linen shirts',
      'T-shirts',
      'Vest tops',
      'Shorts',
      'Sundresses',
      'Light trousers',
      'Sandals',
      'Swimwear',
    ],
    summary: (value) => listSummary(value, 'None picked'),
  },

  {
    id: 'cold',
    label: 'Cold-weather staples',
    field: 'coldStaples',
    type: 'multi',
    question: 'And which cold-weather things?',
    help: 'Same again. Only what you really reach for.',
    options: [
      'Wool jumpers',
      'Puffer jacket',
      'Heavy coat',
      'Thermal base layers',
      'Boots',
      'Scarf',
      'Gloves',
      'Warm hat',
    ],
    summary: (value) => listSummary(value, 'None picked'),
  },

  {
    id: 'layering',
    label: 'Layering',
    field: 'layering',
    type: 'choice',
    question: 'Layers, or one big coat?',
    help: 'It changes how many pieces we suggest for the same temperature.',
    options: [
      { value: 'layers', label: 'Several layers' },
      { value: 'one-coat', label: 'One big coat' },
    ],
    summary: (value) =>
      ({ layers: 'Several layers', 'one-coat': 'One big coat' })[value] ?? 'Not set',
  },

  {
    id: 'packing',
    label: 'Packing',
    field: 'packingPhilosophy',
    type: 'scale',
    question: 'How do you like to pack?',
    labels: PACKING_LABELS,
    summary: (value) => (value == null ? 'Not set' : PACKING_LABELS[value - 1]),
  },
]

export const TOTAL_STEPS = QUESTIONS.length

/**
 * Is this question answered? Multi-selects count as answered once visited,
 * since "none of these" is a real answer about someone's wardrobe — the
 * stepper tracks visits separately rather than inferring from emptiness.
 */
export function hasAnswer(question, profile) {
  const value = profile[question.field]
  if (question.type === 'multi') return Array.isArray(value)
  return value !== null && value !== undefined
}

/** Resolve a slider's min/max, which can depend on the other threshold. */
export function sliderRange(question, profile) {
  const overrides = question.bounds ? question.bounds(profile) : {}
  return {
    min: overrides.min ?? question.min,
    max: overrides.max ?? question.max,
    step: question.step ?? 1,
  }
}
