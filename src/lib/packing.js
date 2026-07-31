/**
 * The packing list, client side.
 *
 * Requesting it, giving it stable ids, and ticking it off. The list itself is
 * written by the serverless function — everything here is about turning that
 * response into something that survives a page reload and a change of mind.
 *
 * Pure except for `generateList`, so the ticking logic can be tested without a
 * network or an API key.
 */

import { QUESTIONS } from '../survey/questions.js'

const ENDPOINT = '/api/generate-list'

/** Give up rather than leave someone watching a bar forever. */
const TIMEOUT_MS = 30000

/**
 * Ask for a list.
 *
 * Sends preferences, the trip, and the forecast as the app already read it —
 * the same comfort labels shown on the forecast screen, so the list cannot
 * contradict the screen that led to it.
 */
export async function generateList(trip, profile, days, extras = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        profile: {
          runsHotCold: profile.runsHotCold,
          summerThresholdC: profile.summerThresholdC,
          coatThresholdC: profile.coatThresholdC,
          humiditySensitivity: profile.humiditySensitivity,
          rainPlan: profile.rainPlan,
          styles: profile.styles,
          warmStaples: profile.warmStaples,
          coldStaples: profile.coldStaples,
          // What they were shown and left unticked. Sending only the ticked
          // items made "shorts" look merely unmentioned rather than declined,
          // and the model kept packing them. An explicit no is much harder to
          // reason past than an absence.
          warmStaplesDeclined: declined('warmStaples', profile.warmStaples),
          coldStaplesDeclined: declined('coldStaples', profile.coldStaples),
          layering: profile.layering,
          packingPhilosophy: profile.packingPhilosophy,
          // The city only, never the coordinates — the function has no use for
          // a precise location and no reason to receive one.
          homeCity: profile.home?.city ?? null,
        },
        trip: {
          city: trip.destination?.city ?? null,
          country: trip.destination?.country ?? null,
          startDate: trip.startDate,
          endDate: trip.endDate,
          nights: nightsBetween(trip.startDate, trip.endDate),
          purposes: trip.purposes ?? [],
          summary: extras.summary ?? null,
          homeComparison: extras.homeComparison ?? null,
        },
        days: days.map((day) => ({
          date: day.date,
          airMax: day.airMax,
          feelsLike: day.feelsLike,
          feelsLikeMin: day.feelsLikeMin,
          humidityPct: day.humidityPct,
          rainChancePct: day.rainChancePct,
          windSpeedKph: day.windSpeedKph,
          label: day.label,
        })),
      }),
    })

    if (!response.ok) {
      // The function sends a sentence meant for a person; prefer it to
      // anything we could invent from a status code.
      const body = await response.json().catch(() => null)
      throw new Error(body?.error ?? 'That did not work.')
    }

    return normaliseList(await response.json())
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('That took too long. Try again.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Add what the model has no business inventing: ids and tick state.
 *
 * Ids are positional, which is what makes ticks stick to items across
 * reloads. They deliberately do not survive a regenerate — a fresh list is a
 * different list, and carrying ticks across would be a lie.
 */
export function normaliseList(raw) {
  const categories = (raw?.categories ?? [])
    .map((category, categoryIndex) => ({
      name: String(category?.name ?? '').trim() || 'Everything else',
      items: (category?.items ?? [])
        .filter((item) => item && typeof item.label === 'string' && item.label.trim())
        .map((item, itemIndex) => ({
          id: `c${categoryIndex}i${itemIndex}`,
          label: item.label.trim(),
          quantity: Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1,
          // An empty reason is the model correctly declining to explain socks.
          why: typeof item.why === 'string' && item.why.trim() ? item.why.trim() : null,
          checked: false,
        })),
    }))
    .filter((category) => category.items.length > 0)

  if (categories.length === 0) throw new Error('The list came back empty.')

  return {
    generatedAt: new Date().toISOString(),
    // Absent on lists generated before fabrics existed, so the screen treats
    // it as optional rather than breaking on an older saved trip.
    fabrics: typeof raw?.fabrics === 'string' && raw.fabrics.trim() ? raw.fabrics.trim() : null,
    categories,
  }
}

/** Tick or untick one item, leaving everything else alone. */
export function toggleItem(list, itemId) {
  return {
    ...list,
    categories: list.categories.map((category) => ({
      ...category,
      items: category.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item,
      ),
    })),
  }
}

/*
 * Items keep their position when ticked.
 *
 * Wireframe 05 had them sink to the bottom of their category, and that is how
 * this shipped — but packing is a physical job done while looking away from
 * the phone, and a list that rearranges itself under you loses your place.
 * Order is now fixed; the tick, the strikethrough and the header count carry
 * the progress instead.
 */
/** How far through the list someone is. */
export function listProgress(list) {
  const items = (list?.categories ?? []).flatMap((category) => category.items)
  return {
    total: items.length,
    checked: items.filter((item) => item.checked).length,
  }
}

/**
 * The options someone was offered and did not tick.
 *
 * Reads the survey's own option lists so the two can't drift: adding a staple
 * to questions.js automatically makes it something that can be declined.
 */
function declined(field, chosen) {
  const question = QUESTIONS.find((item) => item.field === field)
  if (!question?.options || !Array.isArray(chosen)) return []
  return question.options.filter((option) => !chosen.includes(option))
}

/**
 * Nights, not days — it is what decides how many shirts you need.
 * A trip that departs and returns on the same date is one day, zero nights.
 */
export function nightsBetween(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null

  return Math.max(0, Math.round((end - start) / 86400000))
}
