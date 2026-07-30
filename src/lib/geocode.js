/**
 * City lookup via Open-Meteo's geocoding API.
 *
 * Free, no key, no account — the same reason we use Open-Meteo for the
 * forecast itself. Called straight from the browser; there is nothing secret
 * in the request.
 */

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'

/**
 * Search for a city by name.
 *
 * Results carry a region ("Paris, France" vs "Paris, Texas") so the user can
 * tell duplicates apart, which the UX spec calls for on both this screen and
 * the new-trip one.
 */
export async function searchCities(query, { signal, limit = 6 } = {}) {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = `${ENDPOINT}?name=${encodeURIComponent(trimmed)}&count=${limit}&language=en&format=json`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`City search failed (${response.status})`)
  }

  const data = await response.json()
  return (data.results ?? []).map(toPlace)
}

function toPlace(result) {
  // admin1 is the state/region. It's what separates Paris, France from
  // Paris, Texas, but it's often absent for city-states and small countries.
  const region = result.admin1 && result.admin1 !== result.name ? result.admin1 : null

  return {
    id: result.id,
    city: result.name,
    region,
    country: result.country ?? null,
    lat: result.latitude,
    lon: result.longitude,
    label: [result.name, region, result.country].filter(Boolean).join(', '),
  }
}

/** Short form for summaries and headings: "Lisbon, Portugal". */
export function placeLabel(place) {
  if (!place) return ''
  return [place.city, place.country].filter(Boolean).join(', ')
}
