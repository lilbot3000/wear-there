/**
 * The preference profile: what Wear There knows about how you feel weather.
 *
 * Answered once, kept in localStorage, and read by every later screen. See the
 * PreferenceProfile schema in docs/03-technical-design.md.
 *
 * localStorage persists indefinitely, so the survey really is a one-time thing;
 * it is only lost if the user clears site data, uses private browsing, or
 * switches device. That is the accepted v1 tradeoff for having no accounts.
 */

const STORAGE_KEY = 'wearthere.profile'

/** Bump this when the shape changes, so old saved profiles can be migrated. */
export const SCHEMA_VERSION = 1

export const EMPTY_PROFILE = {
  schemaVersion: SCHEMA_VERSION,
  home: null,
  runsHotCold: null,
  perfectTempC: null,
  coatThresholdC: null,
  humiditySensitivity: null,
  rainPlan: null,
  styles: [],
  warmStaples: [],
  coldStaples: [],
  layering: null,
  packingPhilosophy: null,
}

/**
 * Every read and write is guarded: localStorage throws rather than returning
 * null in Safari private browsing and when a user has disabled site storage.
 * A thrown error there would take the whole app down, so we degrade to
 * in-memory instead and let the session still work.
 */
let memoryFallback = null

/**
 * Can we actually persist anything?
 *
 * Safari private browsing, and Chrome with site data blocked, both throw on
 * write rather than failing quietly. Without this check the app would look
 * like it saved and then lose everything on reload, which is exactly the kind
 * of silent failure worth surfacing to the user instead of hiding.
 */
export function isStorageAvailable() {
  try {
    const probe = '__wearthere_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function loadProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return memoryFallback
    const parsed = JSON.parse(raw)
    return migrate(parsed)
  } catch {
    return memoryFallback
  }
}

export function saveProfile(profile) {
  const next = { ...profile, schemaVersion: SCHEMA_VERSION }
  memoryFallback = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable or full. The in-memory copy keeps this session
    // working; the profile just won't survive a reload.
  }
  return next
}

export function clearProfile() {
  memoryFallback = null
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing useful to do */
  }
}

/** Bring an older saved profile up to the current shape. */
function migrate(profile) {
  if (!profile || typeof profile !== 'object') return null

  const migrated = { ...EMPTY_PROFILE, ...profile, schemaVersion: SCHEMA_VERSION }

  // "When do you switch to summer clothes?" became "What's your perfect
  // temperature?", and the old answer is deliberately dropped rather than
  // carried across. They are not the same number: the first user asked said
  // she switches to summer clothes at 21° but is happiest at 26-27°. Reusing
  // the old value would have told her a 33° day was scorching when for her it
  // is merely hot, which is precisely the misreading this app exists to avoid.
  //
  // Dropping it leaves the profile incomplete, so the Home screen offers to
  // finish it — one question, asked honestly, rather than a wrong answer
  // nobody knew to correct.
  delete migrated.summerThresholdC

  return migrated
}

/* Midpoint of the default comfort band (coat 9°, summer 22°). */
const AVERAGE_MIDPOINT = 15.5

/* How far a comfort band has to drift before it contradicts the stated
 * tendency. Kept generous so nobody is called inconsistent for being slightly
 * unusual — only for genuinely disagreeing with themselves. */
const CONTRADICTION_DRIFT = 3

/**
 * A one-line read on how someone feels temperature, for the Home screen.
 *
 * Two answers describe the same thing from different angles: the hot/cold
 * question asks how they see themselves, and the two threshold sliders show
 * where their comfort actually sits. Usually those agree. When they don't —
 * someone who says they run hot but wants it warmer than average before
 * changing clothes — that's worth naming rather than quietly picking one.
 *
 * The thresholds are what the rest of the app trusts, since they are concrete
 * numbers rather than self-assessment.
 */
export function describeTemperament(profile) {
  if (!profile) return null

  const summer = profile.perfectTempC
  const coat = profile.coatThresholdC
  const tendency = profile.runsHotCold

  if (summer == null || coat == null || !tendency) return null

  // Positive drift means they need it warmer than average to be comfortable.
  const drift = (summer + coat) / 2 - AVERAGE_MIDPOINT

  const contradicts =
    (tendency === 'hot' && drift > CONTRADICTION_DRIFT) ||
    (tendency === 'cold' && drift < -CONTRADICTION_DRIFT)

  const detail = `Happiest at ${summer}°, coat below ${coat}°`

  if (contradicts) {
    return {
      headline: 'You are a special snowflake',
      detail:
        tendency === 'hot'
          ? 'You say you run hot, but you want it warmer than most before changing. We go by your temperatures.'
          : 'You say you run cold, but you are comfortable cooler than most. We go by your temperatures.',
      contradicts: true,
    }
  }

  const headline = {
    hot: 'You run hot',
    cold: 'You run cold',
    average: 'You run about average',
  }[tendency]

  return { headline, detail, contradicts: false }
}

/**
 * Has this person answered enough to generate a packing list?
 *
 * Multi-selects are allowed to be empty — "none of these" is a real answer
 * about someone's wardrobe — so completeness only requires the single-value
 * questions.
 */
/**
 * Which required answers are missing.
 *
 * Named separately from isProfileComplete because "what is missing" and
 * "is anything missing" are different questions, and the Home screen can say
 * something far more useful with the first.
 */
export function missingAnswers(profile) {
  if (!profile) return REQUIRED_FIELDS
  return REQUIRED_FIELDS.filter(
    (field) => profile[field] === null || profile[field] === undefined,
  )
}

const REQUIRED_FIELDS = [
  'home',
  'runsHotCold',
  'perfectTempC',
  'coatThresholdC',
  'humiditySensitivity',
  'rainPlan',
  'layering',
  'packingPhilosophy',
]

export function isProfileComplete(profile) {
  return missingAnswers(profile).length === 0
}
