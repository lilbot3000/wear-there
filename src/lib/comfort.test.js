/**
 * Tests for the comfort mapping.
 *
 * Weighted toward boundaries, because that is where this logic is most likely
 * to be subtly wrong and least likely to be noticed: an off-by-one at a
 * threshold produces a plausible-looking answer that is quietly incorrect for
 * one person. The interesting assertions are the ones that pin down "exactly
 * at the threshold" and "the same day, two different people".
 */

import { describe, expect, it } from 'vitest'

import {
  MUGGY_HUMIDITY,
  NOTABLE_DIFFERENCE,
  WET_CHANCE,
  WINDY_SPEED,
  compareWithHome,
  readDay,
  readTrip,
} from './comfort.js'

/** Summer from 22°, coat below 9°, so mild runs 9–22. */
const AVERAGE = {
  runsHotCold: 'average',
  summerThresholdC: 22,
  coatThresholdC: 9,
  humiditySensitivity: 3,
  rainPlan: 'umbrella',
}

const day = (overrides = {}) => ({
  date: '2026-08-11',
  feelsLikeMax: 20,
  feelsLikeMin: 14,
  airMax: 19,
  humidityPct: 50,
  rainChancePct: 10,
  windSpeedKph: 5,
  ...overrides,
})

describe('crossing the summer threshold is not the same as being hot', () => {
  /*
   * Reported from the live app. Profile: summer clothes from 21°, runs
   * average. A San Francisco week of 21–26° was labelled "Hot for you all
   * week", when the traveller considered it perfect. The threshold marks
   * where summer clothes start, not where discomfort starts, and the
   * vocabulary has to respect that or it contradicts the one thing the app
   * claims to know about someone.
   */
  const SUMMER_FROM_21 = { ...AVERAGE, summerThresholdC: 21, coatThresholdC: 10 }

  const sanFrancisco = [26, 25, 24, 25, 23, 21].map((t) =>
    day({ feelsLikeMax: t, humidityPct: 60, rainChancePct: 5, windSpeedKph: 12 }),
  )

  it('does not call a pleasant week hot', () => {
    expect(readTrip(sanFrancisco, SUMMER_FROM_21).summary).not.toMatch(/hot/i)
  })

  it('describes that week as warm or perfect instead', () => {
    expect(readTrip(sanFrancisco, SUMMER_FROM_21).summary).toMatch(/warm|perfect/i)
  })

  it('reads sitting right on the threshold as just right, not hot', () => {
    expect(readDay(day({ feelsLikeMax: 21 }), SUMMER_FROM_21).label).toBe('Just right for you')
  })

  it('keeps a few degrees past the threshold as warm', () => {
    for (const temp of [23, 24, 25, 26]) {
      expect(readDay(day({ feelsLikeMax: temp }), SUMMER_FROM_21).label).toBe('Warm for you')
    }
  })

  it('still says hot once a day is well past the threshold', () => {
    expect(readDay(day({ feelsLikeMax: 30 }), SUMMER_FROM_21).label).toMatch(/hot/i)
    expect(readDay(day({ feelsLikeMax: 34 }), SUMMER_FROM_21).label).toMatch(/scorching/i)
  })

  it('mirrors the restraint on the cold side', () => {
    // Just under the coat threshold is cool, not bitter.
    expect(readDay(day({ feelsLikeMax: 10 }), SUMMER_FROM_21).label).toBe('Cool for you')
    expect(readDay(day({ feelsLikeMax: -2 }), SUMMER_FROM_21).label).toMatch(/bitter/i)
  })

  it('never disagrees with itself: headline and chips share a vocabulary', () => {
    // A one-day trip's summary should describe that day the same way its chip does.
    for (const temp of [21, 24, 27, 31, 35, 10, 4, -2]) {
      const single = [day({ feelsLikeMax: temp })]
      const { summary, days } = readTrip(single, SUMMER_FROM_21)
      const chipIsHot = /hot|scorching/i.test(days[0].label)
      const summaryIsHot = /hot|scorching/i.test(summary)
      expect(summaryIsHot).toBe(chipIsHot)
    }
  })
})

describe('temperature thresholds', () => {
  it('treats the summer threshold itself as hot, not mild', () => {
    expect(readDay(day({ feelsLikeMax: 22 }), AVERAGE).side).toBe('hot')
  })

  it('treats one degree below the summer threshold as mild', () => {
    expect(readDay(day({ feelsLikeMax: 21 }), AVERAGE).side).toBe('mild')
  })

  it('treats the coat threshold itself as cold, not mild', () => {
    expect(readDay(day({ feelsLikeMax: 9 }), AVERAGE).side).toBe('cold')
  })

  it('treats one degree above the coat threshold as mild', () => {
    expect(readDay(day({ feelsLikeMax: 10 }), AVERAGE).side).toBe('mild')
  })

  it('reads the whole band between the thresholds as mild', () => {
    for (let temp = 10; temp <= 21; temp += 1) {
      expect(readDay(day({ feelsLikeMax: temp }), AVERAGE).side).toBe('mild')
    }
  })
})

describe('running hot or cold shifts the bands', () => {
  const hot = { ...AVERAGE, runsHotCold: 'hot' }
  const cold = { ...AVERAGE, runsHotCold: 'cold' }

  it('makes 20° hot for someone who runs hot', () => {
    // Their summer threshold shifts down to 20.
    expect(readDay(day({ feelsLikeMax: 20 }), hot).side).toBe('hot')
  })

  it('leaves 20° mild for someone average', () => {
    expect(readDay(day({ feelsLikeMax: 20 }), AVERAGE).side).toBe('mild')
  })

  it('leaves 23° mild for someone who runs cold', () => {
    // Their summer threshold shifts up to 24.
    expect(readDay(day({ feelsLikeMax: 23 }), cold).side).toBe('mild')
  })

  it('makes 10° cold for someone who runs cold', () => {
    // Their coat threshold shifts up to 11.
    expect(readDay(day({ feelsLikeMax: 10 }), cold).side).toBe('cold')
  })

  it('gives the same day opposite readings for opposite people', () => {
    const same = day({ feelsLikeMax: 21 })
    expect(readDay(same, hot).side).toBe('hot')
    expect(readDay(same, cold).side).toBe('mild')
  })
})

describe('mugginess', () => {
  const sensitive = { ...AVERAGE, humiditySensitivity: 4 }
  const unbothered = { ...AVERAGE, humiditySensitivity: 2 }

  it('flags muggy at the humidity threshold for a sensitive traveller', () => {
    expect(readDay(day({ humidityPct: MUGGY_HUMIDITY }), sensitive).muggy).toBe(true)
  })

  it('does not flag one point below the threshold', () => {
    expect(readDay(day({ humidityPct: MUGGY_HUMIDITY - 1 }), sensitive).muggy).toBe(false)
  })

  it('stays quiet for someone who is not bothered by humidity', () => {
    expect(readDay(day({ humidityPct: 90 }), unbothered).muggy).toBe(false)
  })

  it('keeps mugginess out of the chip phrase for the unbothered', () => {
    const sticky = day({ feelsLikeMax: 29, humidityPct: 85 })
    expect(readDay(sticky, sensitive).label).toMatch(/sticky|humid|muggy/i)
    expect(readDay(sticky, unbothered).label).not.toMatch(/sticky|humid|muggy/i)
  })
})

describe('rain', () => {
  it('flags rain at the threshold', () => {
    expect(readDay(day({ rainChancePct: WET_CHANCE }), AVERAGE).wet).toBe(true)
    expect(readDay(day({ rainChancePct: WET_CHANCE - 1 }), AVERAGE).wet).toBe(false)
  })

  it('phrases the note using the rain plan they chose', () => {
    const wet = day({ rainChancePct: 70 })
    expect(readDay(wet, { ...AVERAGE, rainPlan: 'umbrella' }).rainNote).toContain('umbrella')
    expect(readDay(wet, { ...AVERAGE, rainPlan: 'hood' }).rainNote).toContain('hood')
  })

  it('does not tell someone who gets wet on purpose to pack anything', () => {
    const note = readDay(day({ rainChancePct: 70 }), { ...AVERAGE, rainPlan: 'wet' }).rainNote
    expect(note).toContain('70%')
    expect(note).not.toMatch(/umbrella|hood/i)
  })

  it('leaves the note off entirely on a dry day', () => {
    expect(readDay(day({ rainChancePct: 10 }), AVERAGE).rainNote).toBeNull()
  })
})

describe('wind', () => {
  it('flags windy at the threshold', () => {
    expect(readDay(day({ windSpeedKph: WINDY_SPEED }), AVERAGE).windy).toBe(true)
    expect(readDay(day({ windSpeedKph: WINDY_SPEED - 1 }), AVERAGE).windy).toBe(false)
  })
})

describe('comparison with home', () => {
  const home = (temp, humidity = 60, wind = 10) => [
    day({ feelsLikeMax: temp, humidityPct: humidity, windSpeedKph: wind }),
  ]

  it('says nothing when the trip is much like home', () => {
    expect(compareWithHome(home(20), home(20))).toBeNull()
  })

  it('stays quiet just below the difference threshold', () => {
    expect(compareWithHome(home(20 + NOTABLE_DIFFERENCE - 1), home(20))).toBeNull()
  })

  it('speaks up at the difference threshold', () => {
    expect(compareWithHome(home(20 + NOTABLE_DIFFERENCE), home(20))).toBe('warmer than home')
  })

  it('recognises a colder trip', () => {
    expect(compareWithHome(home(5), home(20))).toContain('colder than home')
  })

  it('calls a large difference much warmer', () => {
    expect(compareWithHome(home(35), home(15))).toContain('much warmer')
  })

  it('adds stickiness when humidity is notably higher', () => {
    expect(compareWithHome(home(28, 85), home(20, 55))).toBe('warmer than home and stickier')
  })

  it('lets humidity carry the sentence when temperature is unremarkable', () => {
    // Regression: this used to return the dangling fragment "and stickier",
    // which rendered as "1–5 Aug · and stickier".
    const phrase = compareWithHome(home(22, 85), home(20, 55))
    expect(phrase).toBe('stickier than home')
    expect(phrase.startsWith('and ')).toBe(false)
  })

  it('says drier when the trip is less humid but similar in temperature', () => {
    expect(compareWithHome(home(21, 40), home(20, 75))).toBe('drier than home')
  })

  it('never produces a phrase starting with "and"', () => {
    for (const [tripTemp, tripHum] of [[30, 90], [22, 85], [5, 30], [20, 60], [2, 70]]) {
      const phrase = compareWithHome(home(tripTemp, tripHum), home(20, 60))
      if (phrase) expect(phrase.startsWith('and ')).toBe(false)
    }
  })

  it('mentions wind chill on a colder, windier trip', () => {
    expect(compareWithHome(home(3, 60, 35), home(15, 60, 8))).toContain('wind chill')
  })

  it('omits the comparison when home is unknown', () => {
    expect(compareWithHome(home(30), null)).toBeNull()
  })
})

describe('reading a whole trip', () => {
  const week = [
    day({ date: '2026-08-11', feelsLikeMax: 29, humidityPct: 65 }),
    day({ date: '2026-08-12', feelsLikeMax: 27, rainChancePct: 60 }),
    day({ date: '2026-08-13', feelsLikeMax: 26, humidityPct: 40 }),
  ]

  it('reports the typical day rather than the hottest', () => {
    // Average of 29, 27, 26 is 27.3 -> 27, not 29.
    expect(readTrip(week, AVERAGE).feelsLike).toBe(27)
  })

  it('reads every day', () => {
    expect(readTrip(week, AVERAGE).days).toHaveLength(3)
  })

  it('calls a genuinely hot week hot', () => {
    const scorcher = [
      day({ feelsLikeMax: 34 }),
      day({ feelsLikeMax: 35 }),
      day({ feelsLikeMax: 36 }),
    ]
    expect(readTrip(scorcher, AVERAGE).summary).toMatch(/scorching|properly hot/i)
  })

  it('mentions the wet day in the summary', () => {
    expect(readTrip(week, AVERAGE).summary).toMatch(/wet day/i)
  })

  it('works without home data', () => {
    expect(readTrip(week, AVERAGE).homeComparison).toBeNull()
  })

  it('is not fooled by one scorcher in a mild week', () => {
    const mostlyMild = [
      day({ feelsLikeMax: 15 }),
      day({ feelsLikeMax: 16 }),
      day({ feelsLikeMax: 34 }),
    ]
    expect(readTrip(mostlyMild, AVERAGE).summary).not.toMatch(/all week/i)
  })
})

describe('a day is not one temperature', () => {
  // The screen showed only the high, so a 26° afternoon that fell to 4°
  // looked like a warm day and nothing suggested packing a layer. The low is
  // now carried through, and judged against the same personal bands as
  // everything else.
  const COLD_ONE = { ...AVERAGE, runsHotCold: 'cold' }

  it('carries the air low through for display', () => {
    const read = readDay(day({ airMin: 6, airMax: 24 }), AVERAGE)
    expect(read.airMin).toBe(6)
  })

  it('flags a night that falls out of their comfort band', () => {
    const read = readDay(day({ feelsLikeMax: 26, feelsLikeMin: 4 }), AVERAGE)
    expect(read.side).toBe('hot')
    expect(read.coldNight).toBe(true)
  })

  it('leaves a warm night unflagged', () => {
    const read = readDay(day({ feelsLikeMax: 30, feelsLikeMin: 19 }), AVERAGE)
    expect(read.coldNight).toBe(false)
  })

  it('judges the night against the person, not the thermometer', () => {
    // 11° is inside an average person's mild band but below where someone who
    // runs cold is comfortable — the premise of the app, applied after dark.
    const night = { feelsLikeMax: 26, feelsLikeMin: 11 }
    expect(readDay(day(night), AVERAGE).coldNight).toBe(false)
    expect(readDay(day(night), COLD_ONE).coldNight).toBe(true)
  })

  it('does not flag anything when the forecast has no low', () => {
    expect(readDay(day({ feelsLikeMin: undefined }), AVERAGE).coldNight).toBe(false)
  })
})

describe('modifiers decorate the temperature, they never replace it', () => {
  // From a screenshot: a 33° day, feels-like 36°, 55% rain, labelled
  // "Warm + brolly". The rain branch returned before intensity was consulted,
  // so every wet hot day read as warm however hot it was.
  const wet = { rainChancePct: 60 }

  it('does not call a scorching day warm because it rains', () => {
    const read = readDay(day({ feelsLikeMax: 36, ...wet }), AVERAGE)
    expect(read.label).toBe('Scorching + brolly')
  })

  it('still says warm when it is actually warm', () => {
    expect(readDay(day({ feelsLikeMax: 24, ...wet }), AVERAGE).label).toBe('Warm + brolly')
  })

  it('scales the cold side the same way', () => {
    expect(readDay(day({ feelsLikeMax: -5, ...wet }), AVERAGE).label).toBe('Bitter + brolly')
    expect(readDay(day({ feelsLikeMax: 8, ...wet }), AVERAGE).label).toBe('Cool + brolly')
  })

  it('keeps the plain phrasing when nothing needs flagging', () => {
    expect(readDay(day({ feelsLikeMax: 36 }), AVERAGE).label).toBe('Scorching for you')
  })
})

describe('running hot has to be visible in the words', () => {
  // Two real users, both on the default 22° slider, read identically at 25°
  // because the old 2° shift left the hot-running one at t=0.417 against a
  // band edge of 0.45.
  const hot = { ...AVERAGE, runsHotCold: 'hot' }
  const cold = { ...AVERAGE, runsHotCold: 'cold' }

  it('separates hot from average at everyday summer temperatures', () => {
    const average = readDay(day({ feelsLikeMax: 25 }), AVERAGE).label
    const runsHot = readDay(day({ feelsLikeMax: 25 }), hot).label

    expect(average).toBe('Warm for you')
    expect(runsHot).toBe('Hot for you')
  })

  it('still agrees when it is genuinely extreme', () => {
    // Everyone is scorching at 34°. Personalisation should not manufacture a
    // disagreement that does not exist.
    expect(readDay(day({ feelsLikeMax: 34 }), AVERAGE).label).toBe('Scorching for you')
    expect(readDay(day({ feelsLikeMax: 34 }), hot).label).toBe('Scorching for you')
  })

  it('does not let the self-assessment overrun the thresholds', () => {
    // Someone who runs cold should still find 25° warm, not comfortable — the
    // reason the shift stops at 3°.
    expect(readDay(day({ feelsLikeMax: 25 }), cold).label).toBe('Just right for you')
  })
})
