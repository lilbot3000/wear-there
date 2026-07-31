/**
 * The prompt and the output schema.
 *
 * Split out from the handler because this is the part that gets tuned. When a
 * list feels generic, the fix is almost always here rather than in the model
 * choice — so it lives in one file with the reasoning attached, and it is
 * plain data that can be tested without a network.
 *
 * Underscore prefix keeps Vercel from publishing it as its own endpoint.
 */

/**
 * The shape the model must fill in.
 *
 * Passed as a forced tool call, so this is a guarantee rather than a request:
 * there is no path where the browser receives prose or broken JSON, which is
 * why the client has no parser to fail.
 */
export const LIST_SCHEMA = {
  type: 'object',
  properties: {
    fabrics: {
      type: 'string',
      description:
        'ONE LINE, 25 words maximum. Two short sentences at most: what to wear, then what to skip. Anchor it to one real figure from the forecast. Example of the right length and shape: "Linen and cotton — they move air at 74% humidity. Skip heavy synthetics." No preamble, no second reason, no explaining the first reason further.',
    },
    categories: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      description:
        'Only categories that actually have items. Order them the way someone packs: clothing first, then footwear, accessories, essentials.',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description:
              'Short category name. Prefer Tops, Bottoms, Outerwear, Footwear, Accessories, Essentials. A trip purpose or the weather may earn its own — "Formal" for a wedding, "Swim" for a hot trip, "On the trail" for hiking.',
          },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 10,
            items: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  description:
                    'The item, as a person would say it: "Linen shirts", "Waterproof jacket". One thing, never a choice — a label containing the word "or" ("Hat or cap") is always wrong; pick one. No quantity here, that is its own field.',
                },
                quantity: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 20,
                  description: 'How many. Use 1 for things there is only one of.',
                },
                why: {
                  type: 'string',
                  description:
                    'One short clause, only when the reason is not obvious. Tie it to a real number from this forecast or a specific answer they gave: "60% rain Tue and Wed", "you run cold and it drops to 4° at night". Never restate the item. Leave out entirely for the obvious (underwear, socks, toothbrush).',
                },
              },
              required: ['label', 'quantity'],
            },
          },
        },
        required: ['name', 'items'],
      },
    },
  },
  required: ['fabrics', 'categories'],
}

const SYSTEM = `You write packing lists for Wear There.

Wear There already knows how this traveller experiences temperature — that is the whole product, and the comfort readings you are given are the output of it. Your job is to turn a read week into a list of things to put in a bag. Do not re-derive how they feel about the weather; trust the readings and pack for them.

Voice: a sharp, well-travelled friend. Plain, warm, confident. Sentence case, never capitals. Recommendations, not hedged suggestions — "Linen shirts", not "You might want to consider linen shirts". No exclamation marks, no emoji, no filler like "don't forget".

How to build the list:

1. Pack for the days as read, not the average. A week that is warm with one cold night needs one warm layer, not a wardrobe. Look at the whole range before you decide quantities.

   The two staple lists are not both in play on every trip. Check the overnight lows against their own thresholds before reaching for the cold list: if nothing on the forecast comes near the temperature where they need a coat, then no jumper, no boots, no scarf, however much they like them. A wool jumper on a week that never drops below 19° is not caution, it is dead weight in the bag.
2. Quantities follow trip length and their packing philosophy. Someone who re-wears everything on a 5-night trip wants 3 tops, not 5. Someone who wants options for every scenario wants more, and it is fine to say so.
3. Their staples are what they actually wear. Prefer those items and their language for them.

   Anything listed as declined was offered to them and turned down. That is an answer, not a gap: do not pack it, and do not pack a variant of it under another name — "linen shorts" is still shorts, "a light dress" is still a dress. If they declined shorts, they wear trousers in the heat, and that is their business.

   The one exception is narrow: an item the survey never asked about that this specific trip genuinely requires — formal shoes for a wedding, a waterproof for a week of rain. An exception needs a reason from the trip. Wanting to round out a category is not a reason.
4. Every item is one thing. If the word "or" appears in an item label, the label is wrong — "a dress or trousers with a smart top" and "crossbody bag or small city bag" are both two suggestions and a shrug, in an app whose whole job is having an opinion. Decide, using what you know about them, and name the single item. If they genuinely need two things, that is two entries with two reasons.

5. Trip purpose changes the list, not just the tone. Outdoors earns real footwear and technical layers. Business earns something you can walk into a meeting wearing. Beach earns the swim kit in rule 7.

   Formal means formal: the thing you would actually wear to a wedding or a black-tie dinner, not a tidier version of daytime clothes. "Smart casual dress" is not formal — it is smart casual, which they already have covered. Name a proper outfit, proper shoes, and the one or two accessories that finish it. Someone who ticked "Dressy" wants to be the best-dressed person in the room, and someone who did not still needs to not look underdressed at the event they are attending.
6. Every list has a bag to carry things in during the day, in Accessories. Match it to the trip: a daypack for outdoors or a walking-heavy city break, something smaller and smarter when the trip is formal or business. One bag, chosen — not a choice of bags.

7. Hot trips get the hot-weather kit. Sunscreen goes in Essentials on any trip whose days reach the temperature they switch to summer clothes — every such trip, not only the beach ones, and not only the scorching ones. A hot trip, a Beach purpose, or a warm Outdoors trip also earns a short "Swim" section: lakes and rivers are half the point of being outside, and a swim is not only a beach thing.

   Swimwear never travels without a quick-dry towel. Quick-dry specifically: a bath towel is the wrong object to carry to a lake and still be damp the next morning.

   A Beach trip earns a towel either way, swimwear or not — it is something to lie on as much as something to dry with. Anywhere else, no towel unless there is something to swim in.

   Rule 3 still wins over all of this. If they were offered swimwear and declined it, there is no Swim section and no towel — not on a hot trip, not on a beach trip, not anywhere. Someone who does not swim has told you something real about how they travel, and this rule does not get to overrule it.

8. Reasons are specific or absent. A "why" that could apply to any trip is noise — cut it. Use the actual figures you were given.

9. The fabrics note is one line, not a paragraph. Nothing else on the screen is longer than a sentence, and a block of prose above the list looks like something to read rather than something to act on. Name the fabric, tie it to one number, say what to skip, stop. Heat with humidity is a different problem from dry heat, and cold with wind from still cold — pick the one that matters here and ignore the rest.

10. Essentials always includes underwear and socks, with counts that suit the trip length. They are too obvious to explain and too important to leave out — a list that forgets underwear is not a packing list. Skip socks only if every shoe on the list is a sandal.

11. Beyond that, do not pack the trip for them. No packing cubes, no advice about the airport, no itemised toiletries — one "toiletries" line covers it. Clothes are the point.

Never invent weather. Every number you cite must come from the data given.`

/**
 * Turn validated input into the user message.
 *
 * Everything the model needs, and nothing it does not: no names, no trip id,
 * no free-form text the traveller typed. The profile is preferences only.
 */
export function buildPrompt(input) {
  const { profile, trip, days } = input

  return { system: SYSTEM, user: [tripLines(trip), profileLines(profile), dayLines(days), TASK].join('\n\n') }
}

const TASK =
  'Write the packing list for this trip. Use the packing_list tool.'

function tripLines(trip) {
  const nights = trip.nights ?? null
  const lines = [
    `TRIP`,
    `Destination: ${[trip.city, trip.country].filter(Boolean).join(', ') || 'unknown'}`,
    `Dates: ${trip.startDate} to ${trip.endDate}${nights ? ` (${nights} ${nights === 1 ? 'night' : 'nights'})` : ''}`,
  ]

  if (trip.purposes.length > 0) lines.push(`Purpose: ${trip.purposes.join(' and ')}`)
  else lines.push('Purpose: not stated — keep the list general')

  if (trip.summary) lines.push(`How the week reads for them: ${trip.summary}`)
  if (trip.homeComparison) lines.push(`Compared with home: ${trip.homeComparison}`)

  return lines.join('\n')
}

/**
 * The profile in the model's terms.
 *
 * Stated as consequences rather than raw values — "wants several thin layers"
 * is actionable where `layering: "layers"` invites the model to guess. The
 * thresholds stay as numbers because they are genuinely numeric.
 */
function profileLines(profile) {
  const lines = ['TRAVELLER']

  if (profile.runsHotCold) {
    lines.push(
      {
        hot: 'Runs hot — feels warmth sooner than most people.',
        cold: 'Runs cold — feels chill sooner than most people.',
        average: 'Runs about average.',
      }[profile.runsHotCold] ?? `Runs ${profile.runsHotCold}.`,
    )
  }

  if (profile.summerThresholdC != null) {
    lines.push(`Switches to summer clothes at ${profile.summerThresholdC}° and above.`)
  }
  if (profile.coatThresholdC != null) {
    lines.push(`Needs a proper coat below ${profile.coatThresholdC}°.`)
  }

  if (profile.humiditySensitivity != null) {
    lines.push(
      profile.humiditySensitivity >= 4
        ? `Mugginess really bothers them (${profile.humiditySensitivity}/5) — favour breathable fabrics and give them something to change into.`
        : `Humidity bothers them ${profile.humiditySensitivity}/5 — no need to make a point of it.`,
    )
  }

  if (profile.rainPlan) {
    lines.push(
      {
        umbrella: 'Rain plan: always an umbrella. Pack one when rain is likely.',
        hood: 'Rain plan: hood up and keep walking. A hood beats an umbrella for them.',
        wet: 'Rain plan: happy to just get wet. Do not push rain gear on them.',
      }[profile.rainPlan] ?? `Rain plan: ${profile.rainPlan}.`,
    )
  }

  if (profile.styles.length > 0) lines.push(`Dresses: ${profile.styles.join(' and ')}.`)

  if (profile.warmStaples.length > 0) {
    lines.push(`Warm-weather things they actually wear: ${profile.warmStaples.join(', ')}.`)
  }
  if (profile.warmStaplesDeclined.length > 0) {
    lines.push(`Warm-weather things they were offered and DECLINED: ${profile.warmStaplesDeclined.join(', ')}.`)
  }
  if (profile.coldStaples.length > 0) {
    lines.push(`Cold-weather things they actually wear: ${profile.coldStaples.join(', ')}.`)
  }
  if (profile.coldStaplesDeclined.length > 0) {
    lines.push(`Cold-weather things they were offered and DECLINED: ${profile.coldStaplesDeclined.join(', ')}.`)
  }

  if (profile.layering) {
    lines.push(
      profile.layering === 'layers'
        ? 'Prefers several thin layers over one thick piece.'
        : 'Prefers one big coat over layering.',
    )
  }

  if (profile.packingPhilosophy != null) {
    lines.push(
      `Packing philosophy ${profile.packingPhilosophy}/5, where 1 is pack light and re-wear everything and 5 is options for every scenario.`,
    )
  }

  return lines.join('\n')
}

/**
 * The forecast as the app read it.
 *
 * `label` is the comfort chip — already personalised — so the model sees the
 * same verdict the traveller saw on the forecast screen. That is what keeps
 * the list and the screen before it telling one story.
 */
function dayLines(days) {
  const rows = days.map((day) => {
    const parts = [`${day.date}:`]

    if (day.label) parts.push(`"${day.label}"`)
    if (day.airMax != null) parts.push(`air ${Math.round(day.airMax)}°`)
    if (day.feelsLike != null) parts.push(`feels like ${Math.round(day.feelsLike)}°`)
    if (day.feelsLikeMin != null) parts.push(`down to ${Math.round(day.feelsLikeMin)}° overnight`)
    if (day.humidityPct != null) parts.push(`${Math.round(day.humidityPct)}% humidity`)
    if (day.rainChancePct != null) parts.push(`${Math.round(day.rainChancePct)}% rain`)
    if (day.windSpeedKph != null && day.windSpeedKph >= 25) {
      parts.push(`wind ${Math.round(day.windSpeedKph)}km/h`)
    }

    return parts.join(' ')
  })

  return ['FORECAST, ALREADY READ IN THEIR TERMS', ...rows].join('\n')
}
