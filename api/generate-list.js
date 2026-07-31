/**
 * POST /api/generate-list — the one piece of backend in the project.
 *
 * It exists for a single reason: the Anthropic API key must never reach the
 * browser. Everything else about Wear There is a static site talking directly
 * to keyless APIs; this function is the exception, and it stays as small as
 * that job allows.
 *
 * See docs/03-technical-design.md § "List generation".
 */

import Anthropic from '@anthropic-ai/sdk'

import { LIST_SCHEMA, buildPrompt } from './_prompt.js'

/** Cheapest current model; a list runs about half a penny. */
const MODEL = 'claude-haiku-4-5'

/** A list is ~1,000 tokens of output. This is headroom, not a target. */
const MAX_TOKENS = 4000

/** Requests per IP per window, and the window itself. */
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000

/**
 * In-memory rate limiting.
 *
 * Resets whenever the function cold-starts, which makes it porous — but the
 * threat here is one friend's browser looping, not a determined attacker, and
 * the real backstop is the spending cap in the Anthropic console. A KV store
 * would be the fix if this ever mattered.
 */
const hits = new Map()

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    // Misconfiguration, not a user error — say so plainly in the log and give
    // the browser something it can show without blaming the traveller.
    console.error('ANTHROPIC_API_KEY is not set')
    return response.status(500).json({ error: 'List generation is not configured.' })
  }

  if (isRateLimited(request)) {
    return response.status(429).json({
      error: 'That is a lot of lists in one hour. Try again shortly.',
    })
  }

  let input
  try {
    input = validate(request.body)
  } catch (error) {
    return response.status(400).json({ error: error.message })
  }

  try {
    const client = new Anthropic({ apiKey: key })
    const { system, user } = buildPrompt(input)

    // Structured output via a forced tool call. The model cannot reply with
    // prose or malformed JSON — the only move available to it is to fill in
    // this schema, so the client never needs a parser that can fail.
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [
        {
          name: 'packing_list',
          description: 'Return the finished packing list.',
          input_schema: LIST_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'packing_list' },
    })

    const block = message.content.find((part) => part.type === 'tool_use')
    if (!block) {
      console.error('No tool_use block in response', { stop: message.stop_reason })
      return response.status(502).json({ error: 'The list came back empty.' })
    }

    return response.status(200).json(block.input)
  } catch (error) {
    // Log the shape of the failure, never the request body — it carries
    // someone's preferences and destination.
    console.error('Generation failed', {
      name: error?.name,
      status: error?.status,
      message: error?.message,
    })
    return response.status(502).json({ error: 'That did not work.' })
  }
}

/* ---------------------------------------------------------------- input */

const MAX_DAYS = 14

/**
 * Check and trim what the browser sent.
 *
 * The client is the only caller today, but it is still the open internet, so
 * everything is bounded before it reaches the prompt: unbounded strings are
 * both a cost problem and a prompt-injection surface.
 */
function validate(body) {
  const data = typeof body === 'string' ? JSON.parse(body) : body
  if (!data || typeof data !== 'object') throw new Error('Missing request body.')

  const { profile, trip, days } = data

  if (!profile || typeof profile !== 'object') throw new Error('Missing profile.')
  if (!trip || typeof trip !== 'object') throw new Error('Missing trip.')
  if (!Array.isArray(days) || days.length === 0) throw new Error('Missing forecast days.')

  return {
    profile: {
      runsHotCold: text(profile.runsHotCold, 20),
      summerThresholdC: number(profile.summerThresholdC),
      coatThresholdC: number(profile.coatThresholdC),
      humiditySensitivity: number(profile.humiditySensitivity),
      rainPlan: text(profile.rainPlan, 20),
      styles: list(profile.styles, 4),
      warmStaples: list(profile.warmStaples, 20),
      coldStaples: list(profile.coldStaples, 20),
      warmStaplesDeclined: list(profile.warmStaplesDeclined, 20),
      coldStaplesDeclined: list(profile.coldStaplesDeclined, 20),
      layering: text(profile.layering, 20),
      packingPhilosophy: number(profile.packingPhilosophy),
      homeCity: text(profile.homeCity, 80),
    },
    trip: {
      city: text(trip.city, 80),
      country: text(trip.country, 80),
      startDate: text(trip.startDate, 10),
      endDate: text(trip.endDate, 10),
      nights: number(trip.nights),
      purposes: list(trip.purposes, 2),
      summary: text(trip.summary, 200),
      homeComparison: text(trip.homeComparison, 120),
    },
    days: days.slice(0, MAX_DAYS).map((day) => ({
      date: text(day.date, 10),
      airMax: number(day.airMax),
      feelsLike: number(day.feelsLike),
      feelsLikeMin: number(day.feelsLikeMin),
      humidityPct: number(day.humidityPct),
      rainChancePct: number(day.rainChancePct),
      windSpeedKph: number(day.windSpeedKph),
      label: text(day.label, 60),
    })),
  }
}

function text(value, max) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, max)
  return trimmed.length > 0 ? trimmed : null
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function list(value, max) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => text(item, 40))
    .filter(Boolean)
    .slice(0, max)
}

/* ----------------------------------------------------------- rate limit */

function isRateLimited(request) {
  const ip =
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
    request.socket?.remoteAddress ??
    'unknown'

  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)

  // Opportunistic cleanup, so a long-lived instance doesn't hold every IP it
  // has ever seen.
  if (hits.size > 500) {
    for (const [addr, times] of hits) {
      if (times.every((at) => now - at >= RATE_WINDOW_MS)) hits.delete(addr)
    }
  }

  return recent.length > RATE_LIMIT
}
