/**
 * Comfort mapping: a forecast, read through one person's preferences.
 *
 * This is the idea the whole product rests on. A forecast says 21°C; that same
 * day is pleasant for one traveller and cold for another. Everything here
 * converts objective weather into a subjective read, using the profile from
 * the survey.
 *
 * Deliberately not machine learning, per docs/03-technical-design.md — it is a
 * band shift plus a few modifiers, which is enough to feel personal and simple
 * enough to explain in a sentence.
 *
 * Layering: temperature.js owns colour and short chip phrases; this module
 * owns the reading of a day and a trip, including the comparison with home.
 * Pure functions, no fetching — forecast.js does that — so it can be tested
 * without a network.
 */

import {
  comfortLabel,
  comfortThresholds,
  tempColour,
  temperatureIntensity,
} from './temperature.js'

/** Humidity at or above this counts as muggy. */
export const MUGGY_HUMIDITY = 70

/** Only travellers this sensitive to humidity get told about mugginess. */
export const MUGGY_SENSITIVITY = 4

/** Rain chance at or above this is worth mentioning. */
export const WET_CHANCE = 50

/** Wind at or above this (km/h) makes cold days bite. */
export const WINDY_SPEED = 25

/** Degrees of difference before a trip is worth comparing to home. */
export const NOTABLE_DIFFERENCE = 6

/** Percentage points of humidity difference worth mentioning. */
export const NOTABLE_HUMIDITY = 12

/**
 * Read a single day.
 *
 * Takes the raw daily forecast values and returns everything a day card
 * needs: the classification, the colour, the chip phrase, and the reasons
 * behind them. The reasons matter — they become the "why" lines on packing
 * items in Phase 5, and they are what makes a recommendation trustworthy
 * rather than magic.
 */
export function readDay(day, profile) {
  const feelsLike = day.feelsLikeMax

  const conditions = {
    humidityPct: day.humidityPct ?? 0,
    rainChancePct: day.rainChancePct ?? 0,
    windy: (day.windSpeedKph ?? 0) >= WINDY_SPEED,
  }

  const { side, t } = temperatureIntensity(feelsLike, profile)
  const colour = tempColour(feelsLike, profile)

  // Mugginess is only surfaced to people who said it bothers them. Someone who
  // barely notices humidity does not want every summer day labelled sticky.
  const muggy =
    conditions.humidityPct >= MUGGY_HUMIDITY &&
    (profile.humiditySensitivity ?? 0) >= MUGGY_SENSITIVITY

  const wet = conditions.rainChancePct >= WET_CHANCE

  return {
    date: day.date,
    feelsLike,
    feelsLikeMin: day.feelsLikeMin,
    airMax: day.airMax,
    humidityPct: conditions.humidityPct,
    rainChancePct: conditions.rainChancePct,
    windSpeedKph: day.windSpeedKph ?? 0,
    side,
    intensity: t,
    muggy,
    wet,
    windy: conditions.windy,
    colour,
    // The chip phrase gets the muggy flag only when this traveller cares, so
    // the same weather reads differently for different people.
    label: comfortLabel(feelsLike, profile, {
      ...conditions,
      humidityPct: muggy ? conditions.humidityPct : 0,
    }),
    rainNote: wet ? rainNote(profile, conditions.rainChancePct) : null,
  }
}

/**
 * What to say about rain, in the traveller's own terms.
 *
 * Someone who answered "I just get wet" does not want to be told to pack an
 * umbrella; telling them the chance and leaving it there respects the answer
 * they gave.
 */
function rainNote(profile, chancePct) {
  const chance = `${Math.round(chancePct)}% chance of rain`

  switch (profile.rainPlan) {
    case 'umbrella':
      return `${chance}, so bring the umbrella`
    case 'hood':
      return `${chance}, so pack something with a hood`
    case 'wet':
      return chance
    default:
      return chance
  }
}

/**
 * Read a whole trip.
 *
 * `homeDays` is optional: without it the comparison is simply omitted rather
 * than guessed at.
 */
export function readTrip(days, profile, homeDays = null) {
  const read = days.map((day) => readDay(day, profile))

  return {
    days: read,
    // The headline number is the trip's typical day, not its hottest — an
    // average week with one scorcher should not read as a heatwave.
    feelsLike: Math.round(average(read.map((day) => day.feelsLike))),
    summary: summarise(read, profile),
    homeComparison: compareWithHome(days, homeDays),
  }
}

/**
 * One sentence about the trip as a whole, for under the city name.
 * Leads with how it will feel, then the one condition worth flagging.
 *
 * This reads the trip's *typical* day through the same banding a single day
 * gets, rather than counting how many days fall on the warm side. Counting
 * sides was the bug behind "Hot for you all week" on a week of pleasant 21–26°
 * days: every day was technically past the summer threshold, but none of them
 * were hot. It is the largest line on the screen, so it is the one most worth
 * getting right.
 */
function summarise(read, profile) {
  const typical = average(read.map((day) => day.feelsLike))
  const { side, t } = temperatureIntensity(typical, profile)

  // "start to finish" works for a long weekend as well as a fortnight, where
  // "all week" only suits one of them.
  const consistent = read.every((day) => day.side === side)
  const base = `${tripPhrase(side, t)}${consistent ? ', start to finish' : ', mostly'}`

  const muggyDays = read.filter((day) => day.muggy).length
  const wetDays = read.filter((day) => day.wet).length
  const windyDays = read.filter((day) => day.windy && day.side === 'cold').length

  if (muggyDays > 0) {
    return `${base}, and ${muggyDays === 1 ? 'one day turns' : `${muggyDays} days turn`} muggy.`
  }
  if (wetDays > 0) {
    const plan = profile.rainPlan === 'wet' ? 'expect a soaking' : 'pack for rain'
    return `${base}, with ${wetDays === 1 ? 'a wet day' : `${wetDays} wet days`} — ${plan}.`
  }
  if (windyDays > 0) {
    return `${base}, and the wind makes it bite.`
  }
  return `${base}.`
}

/**
 * How the trip's typical day reads. Mirrors comfortLabel's banding, so the
 * headline and the day chips can never disagree with each other — the summer
 * threshold is where pleasant summer starts, not where heat starts.
 */
function tripPhrase(side, t) {
  if (side === 'hot') {
    if (t >= 0.9) return 'Scorching for you'
    if (t >= 0.7) return 'Properly hot'
    if (t >= 0.45) return 'Hot for you'
    if (t >= 0.15) return 'Warm for you'
    return 'Just about perfect for you'
  }

  if (side === 'cold') {
    if (t >= 0.9) return 'Bitter for you'
    if (t >= 0.7) return 'Properly cold'
    if (t >= 0.45) return 'Cold for you'
    if (t >= 0.15) return 'Chilly for you'
    return 'Cool but fine'
  }

  return 'Comfortable for you'
}

/**
 * How this trip compares with home.
 *
 * The comparison the wireframes ask for ("warmer & stickier than home") is
 * what makes a forecast graspable: people know their own city in their bones,
 * so a difference from it lands harder than an absolute number. Differences
 * below the thresholds are left unsaid rather than padded into a sentence.
 */
export function compareWithHome(tripDays, homeDays) {
  if (!homeDays || homeDays.length === 0 || tripDays.length === 0) return null

  const tripTemp = average(tripDays.map((day) => day.feelsLikeMax))
  const homeTemp = average(homeDays.map((day) => day.feelsLikeMax))
  const tempDiff = tripTemp - homeTemp

  const tripHumidity = average(tripDays.map((day) => day.humidityPct ?? 0))
  const homeHumidity = average(homeDays.map((day) => day.humidityPct ?? 0))
  const humidityDiff = tripHumidity - homeHumidity

  const tripWind = average(tripDays.map((day) => day.windSpeedKph ?? 0))
  const homeWind = average(homeDays.map((day) => day.windSpeedKph ?? 0))

  const notableTemp = Math.abs(tempDiff) >= NOTABLE_DIFFERENCE
  const notableHumidity = Math.abs(humidityDiff) >= NOTABLE_HUMIDITY

  // Temperature leads when it qualifies; humidity and wind are follow-ons that
  // attach to it. When only humidity qualifies it has to carry the sentence
  // itself — "and stickier" alone is a dangling fragment.
  if (!notableTemp) {
    if (notableHumidity) {
      return humidityDiff > 0 ? 'stickier than home' : 'drier than home'
    }
    return null
  }

  const much = Math.abs(tempDiff) >= NOTABLE_DIFFERENCE * 2
  const lead = `${much ? 'much ' : ''}${tempDiff > 0 ? 'warmer' : 'colder'} than home`

  if (notableHumidity) {
    return `${lead} and ${humidityDiff > 0 ? 'stickier' : 'drier'}`
  }

  // On a colder trip, wind is the thing that actually catches people out.
  if (tempDiff <= -NOTABLE_DIFFERENCE && tripWind > homeWind + 10) {
    return `${lead}, and wind chill matters`
  }

  return lead
}

/** Where the trip's thresholds sit, for explaining the reading. */
export function tripThresholds(profile) {
  return comfortThresholds(profile)
}

function average(numbers) {
  const usable = numbers.filter((n) => typeof n === 'number' && Number.isFinite(n))
  if (usable.length === 0) return 0
  return usable.reduce((total, n) => total + n, 0) / usable.length
}
