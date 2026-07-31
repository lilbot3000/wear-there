import { describe, expect, it } from 'vitest'

import {
  listProgress,
  nightsBetween,
  normaliseList,
  sortedItems,
  toggleItem,
} from './packing.js'

/**
 * The list arrives from a model, so these tests are mostly about what happens
 * when it arrives imperfectly — and about ticks, which are the one piece of
 * state someone would be annoyed to lose.
 */

const RAW = {
  categories: [
    {
      name: 'Tops',
      items: [
        { label: 'Linen shirts', quantity: 3, why: 'Feels-like 31° and you notice humidity' },
        { label: 'T-shirts', quantity: 4 },
      ],
    },
    {
      name: 'Essentials',
      items: [{ label: 'Sun cream', quantity: 1 }],
    },
  ],
}

describe('normaliseList', () => {
  it('gives every item a stable id', () => {
    const list = normaliseList(RAW)
    const ids = list.categories.flatMap((c) => c.items.map((i) => i.id))

    expect(ids).toEqual(['c0i0', 'c0i1', 'c1i0'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('starts everything unticked', () => {
    const list = normaliseList(RAW)
    expect(list.categories.flatMap((c) => c.items).every((i) => !i.checked)).toBe(true)
  })

  it('keeps a missing reason as null rather than an empty string', () => {
    const list = normaliseList(RAW)
    expect(list.categories[0].items[0].why).toBe('Feels-like 31° and you notice humidity')
    expect(list.categories[0].items[1].why).toBeNull()
  })

  it('treats a blank reason as no reason', () => {
    const list = normaliseList({
      categories: [{ name: 'Tops', items: [{ label: 'Shirt', quantity: 1, why: '   ' }] }],
    })
    expect(list.categories[0].items[0].why).toBeNull()
  })

  it('defaults a missing or nonsense quantity to one', () => {
    const list = normaliseList({
      categories: [
        {
          name: 'Tops',
          items: [
            { label: 'Shirt' },
            { label: 'Jumper', quantity: 0 },
            { label: 'Coat', quantity: 2.5 },
          ],
        },
      ],
    })
    expect(list.categories[0].items.map((i) => i.quantity)).toEqual([1, 1, 1])
  })

  it('drops items with no usable label', () => {
    const list = normaliseList({
      categories: [
        { name: 'Tops', items: [{ label: 'Shirt', quantity: 1 }, { label: '  ' }, { quantity: 2 }] },
      ],
    })
    expect(list.categories[0].items).toHaveLength(1)
  })

  it('drops categories left with nothing in them', () => {
    const list = normaliseList({
      categories: [
        { name: 'Tops', items: [{ label: 'Shirt', quantity: 1 }] },
        { name: 'Empty', items: [] },
      ],
    })
    expect(list.categories.map((c) => c.name)).toEqual(['Tops'])
  })

  it('throws rather than rendering an empty screen', () => {
    expect(() => normaliseList({ categories: [] })).toThrow()
    expect(() => normaliseList(null)).toThrow()
  })
})

describe('toggleItem', () => {
  it('ticks only the item asked for', () => {
    const list = normaliseList(RAW)
    const next = toggleItem(list, 'c0i1')

    expect(next.categories[0].items[1].checked).toBe(true)
    expect(next.categories[0].items[0].checked).toBe(false)
    expect(next.categories[1].items[0].checked).toBe(false)
  })

  it('unticks on a second call', () => {
    const list = normaliseList(RAW)
    const twice = toggleItem(toggleItem(list, 'c0i0'), 'c0i0')
    expect(twice.categories[0].items[0].checked).toBe(false)
  })

  it('does not mutate the list it was given', () => {
    const list = normaliseList(RAW)
    toggleItem(list, 'c0i0')
    expect(list.categories[0].items[0].checked).toBe(false)
  })
})

describe('sortedItems', () => {
  it('sinks ticked items to the bottom', () => {
    const items = [
      { id: 'a', checked: true },
      { id: 'b', checked: false },
      { id: 'c', checked: true },
      { id: 'd', checked: false },
    ]
    expect(sortedItems(items).map((i) => i.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('is stable, so unticking returns an item to where it was', () => {
    const items = [
      { id: 'a', checked: false },
      { id: 'b', checked: false },
      { id: 'c', checked: false },
    ]
    expect(sortedItems(items).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('listProgress', () => {
  it('counts across every category', () => {
    const list = toggleItem(normaliseList(RAW), 'c1i0')
    expect(listProgress(list)).toEqual({ total: 3, checked: 1 })
  })

  it('survives a missing list', () => {
    expect(listProgress(null)).toEqual({ total: 0, checked: 0 })
  })
})

describe('nightsBetween', () => {
  it('counts nights, not days', () => {
    expect(nightsBetween('2026-08-10', '2026-08-17')).toBe(7)
  })

  it('treats a same-day trip as zero nights', () => {
    expect(nightsBetween('2026-08-10', '2026-08-10')).toBe(0)
  })

  it('is unaffected by daylight saving', () => {
    // The UK clocks change on 25 October 2026; a naive local-time subtraction
    // would give 6.96 days here and round wrong.
    expect(nightsBetween('2026-10-24', '2026-10-31')).toBe(7)
  })

  it('returns null for unusable dates', () => {
    expect(nightsBetween('not-a-date', '2026-08-17')).toBeNull()
  })
})
