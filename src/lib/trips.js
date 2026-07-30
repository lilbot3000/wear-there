/**
 * Trip storage.
 *
 * Same approach as the profile: localStorage, guarded reads and writes, an
 * in-memory fallback when a browser blocks site storage. See the Trip schema
 * in docs/03-technical-design.md.
 *
 * The MVP spec caps this at 10 trips. The cap is enforced on read as well as
 * write, so a list that somehow grew past it (an older build, a hand-edited
 * store) still behaves.
 */

const STORAGE_KEY = 'wearthere.trips'

export const SCHEMA_VERSION = 1
export const MAX_TRIPS = 10

let memoryFallback = null

export function loadTrips() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return memoryFallback ?? []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_TRIPS) : []
  } catch {
    return memoryFallback ?? []
  }
}

export function loadTrip(id) {
  return loadTrips().find((trip) => trip.id === id) ?? null
}

/**
 * Insert or update a trip, newest first.
 *
 * Returns the saved list so callers can tell whether the cap pushed anything
 * out, rather than having to re-read.
 */
export function saveTrip(trip) {
  const existing = loadTrips().filter((item) => item.id !== trip.id)
  const next = [{ ...trip, schemaVersion: SCHEMA_VERSION }, ...existing].slice(0, MAX_TRIPS)
  writeTrips(next)
  return next
}

/**
 * Update a trip in place, keeping its position in the list.
 *
 * Distinct from saveTrip, which moves a trip to the front. Recording a
 * forecast snapshot shouldn't reshuffle someone's trips just because they
 * opened one.
 */
export function updateTrip(id, changes) {
  const next = loadTrips().map((trip) =>
    trip.id === id ? { ...trip, ...changes } : trip,
  )
  writeTrips(next)
  return next
}

export function deleteTrip(id) {
  const next = loadTrips().filter((trip) => trip.id !== id)
  writeTrips(next)
  return next
}

export function isAtCapacity() {
  return loadTrips().length >= MAX_TRIPS
}

function writeTrips(trips) {
  memoryFallback = trips
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  } catch {
    // Storage unavailable; the in-memory copy keeps this session working.
  }
}

/** Stable-enough id without pulling in a uuid dependency. */
export function newTripId() {
  return `trip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
