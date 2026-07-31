import { describe, expect, it } from 'vitest'

import { comfortThresholds } from './temperature.js'

/**
 * "When do you switch to summer clothes?" became "What's your perfect
 * temperature?" — a rewording, not a new question, so nobody should lose an
 * answer or see their readings shift underneath them.
 */
describe('the perfect-temperature rename', () => {
  it('reads a profile saved under the old field name', () => {
    const old = { runsHotCold: 'average', summerThresholdC: 24, coatThresholdC: 9 }
    expect(comfortThresholds(old).summer).toBe(24)
  })

  it('gives an old and a new profile identical bands', () => {
    const before = { runsHotCold: 'hot', summerThresholdC: 24, coatThresholdC: 9 }
    const after = { runsHotCold: 'hot', perfectTempC: 24, coatThresholdC: 9 }
    expect(comfortThresholds(after)).toEqual(comfortThresholds(before))
  })

  it('prefers the new field when somehow both are present', () => {
    const both = { runsHotCold: 'average', perfectTempC: 20, summerThresholdC: 28, coatThresholdC: 9 }
    expect(comfortThresholds(both).summer).toBe(20)
  })
})
