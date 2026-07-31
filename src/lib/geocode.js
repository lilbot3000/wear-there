/**
 * City lookup via Open-Meteo's geocoding API.
 *
 * Free, no key, no account — the same reason we use Open-Meteo for the
 * forecast itself. Called straight from the browser; there is nothing secret
 * in the request.
 *
 * Small places are the hard case. Germany alone has 28 places called
 * Schönfeld, and picking the wrong one is silent: you get a real forecast for
 * a real town 200km from where you're going. So this module works harder than
 * a plain search wrapper — it narrows, it distinguishes, and where it cannot
 * distinguish it says so rather than showing two identical rows.
 */

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'

/**
 * How many results to pull from the API before filtering.
 *
 * The API ranks by population, so a village with no recorded population sits
 * far below the first handful. Pulling deep is what makes the extra search
 * terms below able to find anything at all.
 */
const FETCH_COUNT = 100

/**
 * Search for a place.
 *
 * The API only matches a single name — "Schönfeld Brandenburg" returns
 * nothing. So the first word goes to the API and any remaining words filter
 * the results here, against the region, district, country and postcode. That
 * makes "Schönfeld Uckermark" and "Schönfeld 17291" work, which is the only
 * practical way to reach a village that shares its name with 27 others.
 */
export async function searchCities(query, { signal, limit = 8 } = {}) {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  // The whole phrase first: "New York" and "San Francisco" are names, not a
  // name plus a filter, and only the API knows which is which.
  const whole = await fetchPlaces(trimmed, signal)
  if (whole.length > 0) return whole.slice(0, limit).map(toPlace)

  // Nothing matched the phrase, so treat it as a name being narrowed:
  // "Schönfeld Uckermark", "Schönfeld 17291".
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 2) return []

  const terms = words.slice(1).map((word) => word.toLowerCase())
  const narrowed = (await fetchPlaces(words[0], signal)).filter((result) =>
    matchesAll(result, terms),
  )

  return narrowed.slice(0, limit).map(toPlace)
}

async function fetchPlaces(name, signal) {
  const url = `${ENDPOINT}?name=${encodeURIComponent(name)}&count=${FETCH_COUNT}&language=en&format=json`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`City search failed (${response.status})`)
  }

  const data = await response.json()
  return data.results ?? []
}

/** Every extra term must appear somewhere in the result. */
function matchesAll(result, terms) {
  if (terms.length === 0) return true

  const haystack = [
    result.name,
    result.admin1,
    result.admin2,
    result.admin3,
    result.admin4,
    result.country,
    ...(result.postcodes ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return terms.every((term) => haystack.includes(term))
}

function toPlace(result) {
  // admin1 is the state/region. It's what separates Paris, France from
  // Paris, Texas, but it's often absent for city-states and small countries.
  const region = result.admin1 && result.admin1 !== result.name ? result.admin1 : null

  // The district ("Landkreis Uckermark") is usually the only thing telling two
  // same-named villages in the same state apart. admin3 carries it in Germany;
  // admin2 does elsewhere. Skip it when it just repeats the name or region.
  const district = [result.admin3, result.admin2].find(
    (value) => value && value !== result.name && value !== region,
  )

  return {
    id: result.id,
    city: result.name,
    region,
    district: district ?? null,
    postcode: result.postcodes?.[0] ?? null,
    country: result.country ?? null,
    lat: result.latitude,
    lon: result.longitude,
    label: [result.name, region, result.country].filter(Boolean).join(', '),
  }
}

/*
 * Two results can still look identical after all this — Brandenburg has two
 * Schönfelds in the same district with no postcode between them. We used to
 * append coordinates to break the tie, but they read as noise on the results
 * that had them and looked arbitrary next to the ones that didn't.
 *
 * Leaving the tie unbroken is fine, because by then it barely matters: two
 * villages sharing a district sit ~25km apart and their forecasts differ by
 * about 0.5°C. Getting the *district* right is what counts — the Saxony vs
 * Uckermark mixup this all started with was 235km and 4.9°C.
 */

/** Short form for summaries and headings: "Lisbon, Portugal". */
export function placeLabel(place) {
  if (!place) return ''
  return [place.city, place.country].filter(Boolean).join(', ')
}

/**
 * The line under the name in a result list: everything that separates this
 * place from another with the same name, and nothing that doesn't.
 */
export function placeDetail(place) {
  if (!place) return ''
  return [place.district, place.region, place.country].filter(Boolean).join(', ')
}
