import { describe, expect, it } from 'vitest'

import { readDay } from './comfort.js'
import { comfortThresholds } from './temperature.js'

/**
 * "When do you switch to summer clothes?" became "What's your perfect
 * temperature?" — and the old answer is dropped rather than reused.
 *
 * The two looked interchangeable until a real user said she switches to summer
 * clothes at 21° but is happiest at 26-27°. On a 33° day that gap is the
 * difference between "Scorching for you" and "Hot for you", and she is right
 * that the second describes her. Carrying the value across would have quietly
 * mis-set every profile that already existed, in the one direction this app
 * exists to get right.
 */
describe('the perfect-temperature question is asked, not inferred', () => {
  it('does not treat an old summer threshold as a perfect temperature', () => {
    const old = { runsHotCold: 'average', summerThresholdC: 21, coatThresholdC: 10 }

    // Falls back to the default rather than silently adopting 21.
    expect(comfortThresholds(old).summer).not.toBe(21)
    expect(comfortThresholds(old).summer).toBe(22)
  })

  it('uses the real answer once it has been given', () => {
    const answered = { runsHotCold: 'average', perfectTempC: 26, coatThresholdC: 10 }
    expect(comfortThresholds(answered).summer).toBe(26)
  })

  it('still applies the temperament shift to the new field', () => {
    const hot = { runsHotCold: 'hot', perfectTempC: 26, coatThresholdC: 10 }
    const cold = { runsHotCold: 'cold', perfectTempC: 26, coatThresholdC: 10 }

    expect(comfortThresholds(hot).summer).toBe(23)
    expect(comfortThresholds(cold).summer).toBe(29)
  })

  it('reads 33° as hot rather than scorching for someone happiest at 26°', () => {
    const day = {
      date: '2026-08-12',
      feelsLikeMax: 33,
      airMax: 33,
      humidityPct: 50,
      rainChancePct: 5,
      windSpeedKph: 8,
    }
    const sunBunny = {
      runsHotCold: 'average',
      perfectTempC: 26,
      coatThresholdC: 10,
      humiditySensitivity: 1,
    }

    expect(readDay(day, sunBunny).label).toBe('Hot for you')
  })
})
