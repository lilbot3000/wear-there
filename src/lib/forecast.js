/**
 * Forecast fetching from Open-Meteo.
 *
 * Free, keyless, called straight from the browser. Kept separate from
 * comfort.js so that the interpretation logic can be tested without a network,
 * and so this file stays a thin shape-conversion layer over the API.
 */

const FORECAST = 'https://api.open-meteo.com/v1/forecast'

/** How far ahead Open-Meteo will forecast. The MVP spec limits trips to this. */
export const FORECAST_DAYS = 14

const DAILY_FIELDS = [
  'apparent_temperature_max',
  'apparent_temperature_min',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'relative_humidity_2m_mean',
].join(',')

/**
 * Daily forecast for a place between two dates.
 *
 * Returns the shape comfort.js expects, rather than Open-Meteo's parallel
 * arrays — the conversion belongs here so nothing downstream has to know how
 * the API packs its response.
 */
export async function fetchForecast(place, startDate, endDate, { signal } = {}) {
  if (!place || place.lat == null || place.lon == null) return []

  const url =
    `${FORECAST}?latitude=${place.lat}&longitude=${place.lon}` +
    `&daily=${DAILY_FIELDS}&timezone=auto` +
    `&start_date=${startDate}&end_date=${endDate}`

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Forecast unavailable (${response.status})`)

  const data = await response.json()
  const daily = data?.daily
  if (!daily?.time) return []

  return daily.time.map((date, i) => ({
    date,
    feelsLikeMax: daily.apparent_temperature_max?.[i],
    feelsLikeMin: daily.apparent_temperature_min?.[i],
    airMax: daily.temperature_2m_max?.[i],
    airMin: daily.temperature_2m_min?.[i],
    rainChancePct: daily.precipitation_probability_max?.[i] ?? 0,
    windSpeedKph: daily.wind_speed_10m_max?.[i] ?? 0,
    humidityPct: daily.relative_humidity_2m_mean?.[i] ?? 0,
  }))
}

/**
 * The trip's forecast alongside the same days at home.
 *
 * Fetched together and over the same dates, because the comparison is only
 * meaningful like-for-like: "warmer than home" has to mean warmer than home
 * *this week*, not warmer than home's annual average.
 *
 * The home request is allowed to fail on its own. Losing the comparison is a
 * much smaller loss than losing the forecast, so it should never take the
 * trip down with it.
 */
export async function fetchTripAndHome(destination, home, startDate, endDate, options = {}) {
  const [trip, homeDays] = await Promise.all([
    fetchForecast(destination, startDate, endDate, options),
    home
      ? fetchForecast(home, startDate, endDate, options).catch(() => null)
      : Promise.resolve(null),
  ])

  return { trip, homeDays }
}

/* ------------------------------------------------------------------ dates */

/** Today in the browser's timezone, as YYYY-MM-DD. */
export function today() {
  return toISODate(new Date())
}

/** The furthest day Open-Meteo will forecast. */
export function lastForecastDay() {
  const date = new Date()
  date.setDate(date.getDate() + FORECAST_DAYS - 1)
  return toISODate(date)
}

export function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Inclusive night count, so 10th to 17th reads as 8 days. */
export function dayCount(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  return Math.round((end - start) / 86400000) + 1
}

/** "10–17 Aug", or "28 Jul – 3 Aug" when the trip crosses a month. */
export function formatDateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const month = (date) => date.toLocaleDateString('en-GB', { month: 'short' })

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${month(end)}`
  }
  return `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}`
}

/** "Tue 11", for a day card. */
export function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' })
  return `${weekday} ${date.getDate()}`
}
