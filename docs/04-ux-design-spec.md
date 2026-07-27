# Wear There — UX / Design Spec

**Status:** Draft v3 · **Design direction:** "Bright Line" — sleek, gender-neutral, temperature-driven colour · **Canvas:** mobile-first (360–430px), presentable on desktop

Codified from the approved design set: `design/wireframes.html`, `design/design.pdf`, and the hi-fi mock screens. Those files are the visual source of truth; this doc translates them into buildable rules.

## 1. Design principles

1. **Temperature is the interface.** Colour always means something: cold renders pale→deep blue, hot renders yellow→red, driven directly from the feels-like number. No decorative colour, no purple, no green.
2. **Confident recommendations.** Wear There has an opinion and it's right: every item comes with a plain-spoken reason ("You run cold — feels-like well below air temp"). Recommendations, never hedged suggestions.
3. **One answer per screen.** Each screen answers a single question ("what will it feel like?", "what do I pack?").
4. **Screenshot-worthy.** The forecast and packing list are what people share — big feels-like number, gradient bar, clean cards.
5. **Personal, never generic.** Copy speaks to *you*: "Hot for you", not "High temperatures expected."

## 2. Visual language

### Type

| Role | Font |
|---|---|
| Display & headings (masthead, "31° feels-like", city names, question text) | **Bricolage Grotesque** 500–700 |
| Body, UI, buttons, chips | **Plus Jakarta Sans** 400–700 |
| Micro-labels ("Step 3 of 11", "Tops", "Trip purpose · pick up to 2") | Plus Jakarta Sans 600, 11–12px, letter-spaced, sentence case, grey `#9A9A9E` — never uppercase |

Both fonts are free on Google Fonts.

### Colour

| Token | Value | Use |
|---|---|---|
| Ink | `#1C1C1E` | Primary text, primary buttons |
| Secondary text | `#6F6F73` | Item reasons, sub-lines |
| Micro-label grey | `#9A9A9E` | Uppercase micro-labels, hints |
| Warm neutral | `#6B6560` | Outlined secondary buttons, selected survey pills, progress bar |
| Accent red | `#E11D2E` (hover `#B5101F`) | Links, the hand-drawn tick, hot-end of gradients |
| Screen background | `#FFFFFF` on page grey `#F4F4F4` | |
| Card | `#FAFAFA` fill, 1px border `rgba(0,0,0,.06)`, radius 16px | All list rows and info cards |

### The temperature gradient system (the signature)

Every gradient is computed from the trip's feels-like temperature — trivial to drive from the number. No purple, no green, ever.

Both ramps end on a saturated jewel tone, never a muddy near-black. The hot ramp lingers in yellow and orange and saves red for genuine heat; the cold ramp runs baby blue, to bright blue, to sapphire.

| Ramp | Stops | Applies when |
|---|---|---|
| Cold | `#D6E9FF → #A8D0F7 → #5B9BE8 → #2E71D6 → #1A46A8` | Feels-like at the cold end |
| Hot | `#FFE14D → #FFC61A → #FF9A1F → #FF6A1F → #E11D2E → #B3122A` | Feels-like at the hot end |
| Full spectrum (brand) | `#D6E9FF → #5B9BE8 → #FFE14D → #FF9A1F → #E11D2E` | Welcome screen only — the brand mark |

**The intensity function.** One small helper drives every temperature colour in the app: `tempColour(feelsLike, profile)` computes an intensity `t` from 0–1 — how far the day sits past *your* comfort thresholds (from comfort.js), so it's personal, not absolute — and returns two colours sampled from the ramp:

- `edge` — sampled from the light half of the ramp. Hot: `#FFE14D → #FFB020 → #FF7A1F` as `t` rises; cold: `#D6E9FF → #9BC8F5 → #5B9BE8`.
- `body` — sampled **only from the contrast-safe segment**. Hot: `#C24A0A → #E11D2E → #B3122A`; cold: `#2E71D6 → #1E56BE → #1A46A8`. Every colour here passes white text at ≥ 4.5:1, so chips vary freely with temperature and the guarantee survives by construction.

  A chip does not use a single body colour: it spans a **sliding window** covering 60% of the safe segment, which slides toward the deep end as intensity rises. So the gradient is visible across the chip's whole readable width, and a scorching day's chip is deeper at both ends than a merely warm one. Because both ends of the window are contrast-safe, everything between them is too — sRGB luminance is convex, so a blend is never lighter than its lighter end.

  **Constraint worth knowing:** vivid orange cannot carry white text. `#C24A0A` (4.91:1) is about as orange as a text-bearing colour can get. Bright orange therefore lives in the edge colours and the decorative bars, while chips resolve orange → red → ruby.

Where the colours appear:
- **Comfort chips (intense)** — `linear-gradient(90deg, edge, body 16px)`, white text, per the approved chip screenshots in `design/`. The bright stop occupies only the left padding where no text sits. Because both stops come from `tempColour`, a 30° day and a 40° day both read "hot" but the scorcher's chip runs visibly deeper at both ends; likewise a nippy day vs. a brutal one on the blue side.
- **Comfort chips (mild)** — days comfort.js classifies as mild switch to quiet pale tints with dark text, so colour intensity matches weather intensity (intense days shout, mild days murmur):
  - Mild hot side: background `#FFEBAD` (bright yellow), text `#7A4A0A` (6.3:1)
  - Mild cold side: background `#D4E8FF` (baby blue), text `#1E4FA3` (6.2:1)
- **Gradient bar** — an 8px rounded bar under the headline on forecast screens. It renders the ramp from its palest stop **up to the trip's intensity point**, so the bar itself communicates extremity: a warm week's bar ends amber, a heatwave sweeps the full ramp into deep red, a mild spring trip stays pale blue. No text sits on bars, so no contrast constraint.
- **Trip dots** — on My trips, each trip's dot is its `body` colour (Lisbon deep red, Reykjavík deep blue, Dubai amber-red).

### Components

| Component | Spec |
|---|---|
| Button (one style only) | Transparent with 1.5px `#6B6560` outline, `#6B6560` text, radius 14px; fills `#6B6560` with white text on press. Used for **every** action, primary or not — "Generate my packing list" looks the same as "Start my style survey". **Buttons are never filled with ink**, so no screen carries a heavy black slab. |
| Selection pill | Radius 20px, 1.5px border `rgba(28,28,30,.2)`; selected state fills `#6B6560` with white text (survey options, trip-purpose chips) |
| Comfort chip | Radius 20px. Intense: padding-pinned gradient fill, white text. Mild: pale tint fill, dark text. Exact values in the gradient system above |
| Card | `#FAFAFA`, radius 16px, 1px hairline border; day rows and packing items live in cards |
| Checkbox | 20px square, radius 6px, 1.5px border at 35% ink; ticked state is an oversized hand-drawn red ✓ in Bricolage Grotesque, rotated −8°, overflowing the box corner — the one moment of flourish |
| Survey progress | 4px track at 8% ink, fill `#6B6560`, plus "Step 3 of 11" micro-label |

### Voice & copy rules

- Voice: a sharp, well-travelled friend. Confident, warm, plain-spoken, gender-neutral. "Trust the linen. Lisbon will run hot for you."
- Every packing item can carry a one-line reason in secondary grey ("60% rain chance Tue–Wed").
- **Never all capitals, anywhere** — including micro-labels, which get their distinct look from size, weight, letter-spacing, and grey colour instead ("Step 3 of 11", not "STEP 3 OF 11"). Note: the wireframe HTML predates this rule and shows caps; this spec wins.
- Dashes are fine, in ranges ("10–17 Aug") and in chip/reason copy ("Cold for you — layer up").
- Sentence case everywhere; exclamation marks rationed.

## 3. User flows

### First-time flow

```
Welcome → 11 survey steps (starting with "Where's home?") → "Your style, saved" →
New trip (city + dates + purpose) → Personalised forecast → Generating →
Packing list
```

### Returning flow

```
My trips → reopen trip → tick items
        ↘ + New → New trip → forecast → list
```

Edit preferences: My trips → "My style" → survey steps pre-filled → save.

## 4. Screens

Wireframes below are schematic; `design/wireframes.html` screens 01–06 are the visual reference.

### S1 · Welcome (screen 01)

Centered, calm, the full-spectrum gradient bar as the brand mark.

```
┌────────────────────────┐
│                        │
│      Wear There        │  ← Bricolage, 32px
│                        │
│  Your packing list,    │
│  tuned to how hot or   │
│  cold it actually      │
│  feels to you.         │  ← Jakarta, secondary grey
│                        │
│  ▬▬▬▬▬▬▬▬▬▬▬▬          │  ← full-spectrum gradient bar
│                        │
│ [ Start my style survey ]│ ← outlined secondary button
│  2–3 minutes · answered │
│  once                   │  ← micro hint, grey
└────────────────────────┘
```

### S2 · Survey (11 steps, screen 02)

Progress bar + "Step 3 of 11" micro-label. One question per screen in Bricolage. Options are full-width selection pills; selected fills warm neutral. "← Back" quiet at bottom-left, "Next" outlined at bottom-right. Each step saves immediately.

### S3 · New trip (screen 03)

"Where and when?" heading; destination card with type-ahead (shows "Paris, France / Paris, Texas" disambiguation); Depart/Return cards side by side (dates beyond the 14-day forecast window disabled with: "Too far out for a real forecast. Check back nearer the time."); then the "Trip purpose · pick up to 2" micro-label over purpose pills (Beach · City break · Outdoors · Formal · Business · Family). "See my forecast" button at the bottom.

### S4 · Personalised forecast (screens 04/04b) — hero screen 1

```
┌────────────────────────┐
│ Lisbon                 │  ← Bricolage, 20px
│ 10–17 Aug · warmer &   │
│ stickier than home     │  ← grey sub-line (home comparison)
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬     │  ← gradient bar from THIS trip's ramp
│ ┌────────────────────┐ │
│ │ Tue 11        (Hot │ │
│ │ 29° · 65% humid for you)│ ← day card + gradient comfort chip
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │ Wed 12      (Muggy │ │
│ │ 27° · rain 60% + brolly)│
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │ Thu 13       (Mild │ │
│ │ 26° · 40% humid for you)│ ← solid single-stop chip
│ └────────────────────┘ │
│ [ Generate my packing list ]│
└────────────────────────┘
```

The hi-fi variant leads with the huge "31° feels-like" headline in Bricolage — use that treatment for the trip summary at top when there's one dominant temperature. A cold trip (04b, Reykjavík) renders the identical layout on the blue ramp: "colder than home, wind chill matters", chips like "Bundle up".

### S5 · Generating

White screen, the trip's gradient bar animating (shimmer left to right), status lines cycling in Bricolage: "Reading Lisbon's forecast...", "Checking it against your style...", "Writing your list...". Target under 15s; never a spinner alone.

### S6 · Packing list (screen 05) — hero screen 2

"Your list" heading; category micro-labels ("Tops", "Essentials"); each item is a card with checkbox, bold item name ("Linen shirts ×3"), and the one-line reason in grey ("Feels-like 31° and you're humidity-sensitive"). Ticking draws the oversized red ✓ and sinks the item to the bottom of its category; ticks persist instantly. "↻ Regenerate list" as a quiet secondary action at the bottom, with confirmation: "This writes a fresh list and clears your ticks."

### S7 · My trips (screen 06)

"My trips" heading with "+ New" in warm neutral at the right. Each trip is a card: thumbnail placeholder, "Lisbon / 10–17 Aug · Beach", and the temperature dot at the right edge. Up to 10 trips; saving an 11th prompts a deletion. Swipe or overflow to delete, with undo toast. "My style" accessible from here — survey answers as an editable summary list ("Runs cold · Summer from 22° · Smart-casual"); tapping a row reopens that step.

## 5. States & edge cases

| Situation | Treatment |
|---|---|
| City not found | Inline: "We couldn't find that one. Try the nearest big town." |
| Dates > 14 days out | Disabled dates + friendly note (see S3) |
| Generation fails | Forecast stays; list area shows "That didn't work. [Try again]" |
| Offline | Saved trips fully readable/tickable; new-trip disabled with note |
| Regenerate | Confirm dialog: "This writes a fresh list and clears your ticks." |
| Empty My trips | Welcome-style prompt replaces trip list |

## 6. Accessibility

- Ink `#1C1C1E` on white passes contrast easily; secondary `#6F6F73` passes for body sizes.
- **Comfort chips are contrast-safe by construction:** the bright stop lives only in the text-free padding, and the `body` colour under the text is sampled exclusively from the ramp segments that pass white text at ≥ 4.5:1 (hot from `#E11D2E`, cold from `#3D66B8`, both darkening with intensity). Mild tints pair with their specified dark text (4.9:1 / 6.1:1). Two build rules: the gradient's pixel stop (16px) must never exceed the chip's left padding, and `tempColour` must clamp `body` sampling to the safe segments — those two invariants make per-chip contrast checking unnecessary.
- Colour never carries meaning alone: every chip says its meaning in words ("Hot for you"), and gradient bars are decorative reinforcement.
- Tap targets: full-row for checkboxes, ≥ 44px; survey pills ≥ 48px tall.
- Respects `prefers-reduced-motion` (gradient shimmer and tick flourish become simple fades).
