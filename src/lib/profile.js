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
  summerThresholdC: null,
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
  // Only one version so far, so there is nothing to migrate yet. Future
  // versions branch here on profile.schemaVersion.
  return { ...EMPTY_PROFILE, ...profile, schemaVersion: SCHEMA_VERSION }
}

/**
 * Has this person answered enough to generate a packing list?
 *
 * Multi-selects are allowed to be empty — "none of these" is a real answer
 * about someone's wardrobe — so completeness only requires the single-value
 * questions.
 */
export function isProfileComplete(profile) {
  if (!profile) return false
  return [
    'home',
    'runsHotCold',
    'summerThresholdC',
    'coatThresholdC',
    'humiditySensitivity',
    'rainPlan',
    'layering',
    'packingPhilosophy',
  ].every((field) => profile[field] !== null && profile[field] !== undefined)
}
