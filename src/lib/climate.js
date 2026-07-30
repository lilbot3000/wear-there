/**
 * Typical temperatures where someone lives, used to make the survey's
 * temperature sliders mean something.
 *
 * "At what temperature do you switch to summer clothes?" is a hard question in
 * the abstract — most people don't carry a mental thermometer. But "about as
 * warm as a typical July day in London" is a question anyone can answer,
 * because they have lived it. We already know their home city from question
 * one, so we can convert the number into a memory.
 *
 * Data is Open-Meteo's historical archive: free, no key, same family as the
 * forecast API. Fetched once per city and cached, since three years of daily
 * readings is a big response to ask for twice.
 */

const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
const CACHE_PREFIX = 'wearthere.climate.'
const YEARS = 3

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Average daily high for each month, plus the extremes.
 *
 * Uses apparent temperature (feels-like) rather than air temperature, to match
 * what the rest of the app reasons about, and the daily maximum rather than
 * the mean, because getting dressed is a decision about the warm part of the
 * day rather than the average across the night.
 */
export async function fetchHomeClimate(place, { signal } = {}) {
  if (!place || place.lat == null || place.lon == null) return null

  const cached = readCache(place)
  if (cached) return cached

  // Whole calendar years only, and never the current one: the archive lags a
  // few days behind, and a part-year would skew the monthly averages toward
  // whichever seasons happen to have finished.
  const endYear = new Date().getFullYear() - 1
  const startYear = endYear - (YEARS - 1)

  const url =
    `${ARCHIVE}?latitude=${place.lat}&longitude=${place.lon}` +
    `&start_date=${startYear}-01-01&end_date=${endYear}-12-31` +
    '&daily=apparent_temperature_max&timezone=auto'

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Climate lookup failed (${response.status})`)

  const data = await response.json()
  const dates = data?.daily?.time
  const highs = data?.daily?.apparent_temperature_max
  if (!Array.isArray(dates) || !Array.isArray(highs)) return null

  const climate = summarise(dates, highs, place)
  writeCache(place, climate)
  return climate
}

function summarise(dates, highs, place) {
  const totals = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }))
  let hottest = -Infinity
  let coldest = Infinity

  dates.forEach((date, index) => {
    const value = highs[index]
    if (value == null) return

    const month = Number.parseInt(date.slice(5, 7), 10) - 1
    totals[month].sum += value
    totals[month].count += 1

    if (value > hottest) hottest = value
    if (value < coldest) coldest = value
  })

  const monthlyHighs = totals.map(({ sum, count }) =>
    count === 0 ? null : Math.round((sum / count) * 10) / 10,
  )

  return {
    city: place.city,
    monthlyHighs,
    hottest: Math.round(hottest),
    coldest: Math.round(coldest),
    years: YEARS,
  }
}

/**
 * Turn a slider value into a sentence about somewhere they know.
 *
 * Spring and autumn produce similar temperatures, so a value often matches two
 * months. Naming both is more honest than picking one arbitrarily, and reads
 * more naturally: "a typical May or October day".
 */
export function describeAgainstClimate(valueC, climate) {
  if (!climate) return null

  const months = climate.monthlyHighs
    .map((average, index) => ({ average, index }))
    .filter((entry) => entry.average != null)

  if (months.length === 0) return null

  const warmest = Math.max(...months.map((m) => m.average))
  const coolest = Math.min(...months.map((m) => m.average))

  // Beyond the local range, anchor to the extremes instead: the hottest and
  // coldest days they have actually lived through are the best benchmark for
  // temperatures their home rarely reaches.
  if (valueC > warmest + 1.5) {
    return valueC > climate.hottest
      ? `Hotter than anything ${climate.city} has felt in the last ${climate.years} years.`
      : `Warmer than a typical ${climate.city} summer day. The hottest day there recently felt like ${climate.hottest}°.`
  }
  if (valueC < coolest - 1.5) {
    return valueC < climate.coldest
      ? `Colder than anything ${climate.city} has felt in the last ${climate.years} years.`
      : `Colder than a typical ${climate.city} winter day. The coldest day there recently felt like ${climate.coldest}°.`
  }

  const closest = Math.min(...months.map((m) => Math.abs(m.average - valueC)))
  const matches = months
    .filter((m) => Math.abs(m.average - valueC) <= closest + 1)
    .sort((a, b) => Math.abs(a.average - valueC) - Math.abs(b.average - valueC))
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
    .map((m) => MONTHS[m.index])

  const when = matches.length === 2 ? `${matches[0]} or ${matches[1]}` : matches[0]
  return `About a typical ${when} day in ${climate.city}.`
}

/* ----------------------------------------------------------------- cache */

const cacheKey = (place) =>
  `${CACHE_PREFIX}${place.lat.toFixed(2)},${place.lon.toFixed(2)}`

function readCache(place) {
  try {
    const raw = window.localStorage.getItem(cacheKey(place))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(place, climate) {
  try {
    window.localStorage.setItem(cacheKey(place), JSON.stringify(climate))
  } catch {
    // Storage unavailable. The lookup still worked for this session; it will
    // just be repeated next time.
  }
}
