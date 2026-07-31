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
| Cold | `#D6E9FF → #B9D2F5 → #8FB0E4 → #4E75C4 → #3558A5` | Feels-like at the cold end |
| Hot | `#F7D46A → #F5B841 → #F0952F → #E2662F → #D13C37` | Feels-like at the hot end |
| Full spectrum (brand) | `#D6E9FF → #5B9BE8 → #FFE14D → #FF9A1F → #E11D2E` | Welcome screen only — the brand mark |

**The intensity function.** One small helper drives every temperature colour in the app: `tempColour(feelsLike, profile)` computes an intensity `t` from 0–1 — how far the day sits past *your* comfort thresholds (from comfort.js), so it's personal, not absolute — and returns two colours sampled from the ramp:

- `edge` — the bright flash inside the chip's left padding, where no glyph lands. Hot: `#F7D46A → #F5B841 → #F0952F` as `t` rises; cold: `#C3D9F5 → #A8C4EE → #8FB0E4`.
- `body` — the gradient under the text, sampled from the **original mockup ramps**. These are deliberately *not* clamped to the WCAG-safe range; see the accepted exception below.
  - Hot: `#F5B841 → #F0952F → #E2662F → #D13C37 → #B02A2E` (1.9:1 to 6.6:1)
  - Cold: `#8FB0E4 → #6E93D8 → #4E75C4 → #3558A5 → #2A4585` (2.6:1 to 9.4:1)

  A chip does not use a single body colour: it spans a **sliding window** covering half the ramp, sliding toward the deep end as intensity rises. That produces a visible sweep *within* a chip and tonal separation *between* days — a barely-warm day reads light yellow-orange, a scorching one deep red, with the switch point personal rather than absolute.

  **Reference bands** (from the mockups, sampled at the chip's deep end): a mid-cold chip resolves to ≈ `#3558A5`, a mid-hot chip to ≈ `#D13C37`. The exact temperature producing those depends on the traveller's thresholds — the Lisbon mockup treats 26° as mild, implying a summer threshold near 26, so 29° lands mid-intensity there and higher-intensity for someone whose threshold is 22. That is the system working as intended.

  **Accepted contrast exception — do not "fix" this.** These ramps are not clamped to the WCAG-safe range. Chips carry white bold text throughout, and at the bright end that falls below AA's 4.5:1 (about 1.8:1 on the lightest orange, 2.6:1 on the lightest periwinkle). This is deliberate, to keep the brighter, more editorial palette of the original mockups. Do **not** auto-darken the ramps and do **not** switch any chip to dark text.

  **How readability is measured.** The right value to judge a chip by is the lightest colour a glyph *actually* sits on, not the lightest pixel in the chip. The chip's left padding and the gradient's first stop are pinned to the same token (`--chip-padding-x`), so text begins exactly at the body colour and the brighter edge never touches a letter; from there the gradient only darkens. `tempColour()` exposes that value as `lightestUnderText`, and `/styleguide` reports it per chip — real ratios, never rounded up, hidden, or suppressed, so the tradeoff stays visible over time.

Where the colours appear:
- **Comfort chips (intense)** — `linear-gradient(90deg, edge, body 16px)`, white text, per the approved chip screenshots in `design/`. The bright stop occupies only the left padding where no text sits. Because both stops come from `tempColour`, a 30° day and a 40° day both read "hot" but the scorcher's chip runs visibly deeper at both ends; likewise a nippy day vs. a brutal one on the blue side.
- **Comfort chips (mild)** — days comfort.js classifies as mild use the bright solid colours from the original mockups, with white bold text:
  - Mild warm: background `#F4B446` (yellow-orange), text white
  - Mild cool: background `#98BAEA` (baby blue), text white

  **Accepted contrast exception.** These two measure ~1.83:1 and ~1.99:1 against white, both failing WCAG AA's 4.5:1. This is a deliberate choice to keep the brighter, more editorial palette of the mockups, and it is the only place in the app where the contrast floor is knowingly crossed. Do **not** resolve it by darkening the backgrounds or switching these two chips to dark text. The `/styleguide` page reports their real failing ratios rather than hiding or rounding them, so the tradeoff stays visible instead of quietly becoming invisible.
- **Gradient bar** — an 8px rounded bar under the headline on forecast screens. It renders the ramp from its palest stop **up to the trip's intensity point**, so the bar itself communicates extremity: a warm week's bar ends amber, a heatwave sweeps the full ramp into deep red, a mild spring trip stays pale blue. No text sits on bars, so no contrast constraint.
- **Trip dots** — on My trips, each trip's dot is its `body` colour (Lisbon deep red, Reykjavík deep blue, Dubai amber-red).

### Chip phrasing

Chips describe a day rather than reading it out, and vary with both intensity and conditions. Weather wins over temperature when it's the thing you'd actually mention: a humid, rainy 29° is "Muggy + brolly", not "Hot for you". `comfortLabel()` owns this vocabulary.

Keep the phrasing plain. Mild British colour is welcome ("brolly", "properly hot"), but avoid words whose everyday meaning is regional enough to be ambiguous — "close" for muggy was cut for exactly this reason, since it reads as "close to something".

Keep phrases short, too. Chips never wrap, so a long label just makes the pill wider — fine where a chip can size to its content, a problem anywhere it can't. The longest current phrase, "Comfortably warm", needs about 150px; treat that as the ceiling. Character count is a poor proxy for width, so measure rather than count.

| Band | Plain | With conditions |
|---|---|---|
| Hot, rising | Warm for you · Hot for you · Properly hot · Scorching for you | Warm and humid · Hot and sticky · Warm + brolly · Muggy + brolly |
| Mild | Comfortably warm · Fresh but fine | Mild but muggy · Mild + brolly |
| Cold, deepening | Cool for you · Cold for you · Bundle up · Bitter, full layers | Cold and blowy · Biting wind chill · Cold + brolly |

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

**Colour in the survey.** Most survey screens are deliberately monochrome, because nothing on them is a temperature. The exceptions earn it:

- **The threshold sliders** carry the temperature spectrum across their own range — deep blue through pale neutral to red — with the thumb and the big numeral taking the colour of the current value. This is the one control in the app that *is* a temperature scale, so colouring it is the system working rather than decoration. It also teaches the colour language before the forecast screens speak it.
- **The progress bar** reveals the full brand gradient as you advance, rather than growing a grey bar.

Absolute spectrum (`spectrumColour()`), distinct from the personal ramps: `-10° #2A4585 → -2° #4E75C4 → 5° #8FB0E4 → 12° #C3D9F5 → 17° #F7D46A → 23° #F0952F → 29° #E2662F → 35° #D13C37`. The pale middle is what makes a track read as a range, but it is unreadable as text, so the numeral uses `spectrumTextColour()` — same hue, deepened only as far as the large-text contrast floor requires. Unlike the comfort chips there is no design reason to cross that floor here; this is a plain numeral, not the mockup palette.

**The temperature benchmark.** A bare number is hard to answer — most people don't know their thresholds in degrees. So under each temperature slider, a quiet card translates the current value into a day they have lived, using their home city from question 1: *"A typical June or July day in London."* It updates live as the slider moves. Values beyond the local range anchor to the extremes instead (*"The hottest day there recently felt like 35°"*, or *"Hotter than anything London has felt in the last 3 years"*), which quietly flags a threshold their home never reaches. Data is Open-Meteo's free historical archive (last 3 whole years of daily feels-like highs), fetched once when home is chosen and cached, so it is ready by the time the sliders appear. If home is unset or the lookup fails, the sliders simply work without the card.

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

"Your list" heading; then the **fabrics note** — two or three sentences of plain prose under a "Fabrics" micro-label, saying what these conditions do to fabric and which one handles them ("linen dries fast and moves air, which is what 74% humidity demands"). It sits above the categories because it explains why the items below are what they are. Prose rather than a card, so it reads as advice instead of another thing to tick.

Then category micro-labels ("Tops", "Essentials"); each item is a card with checkbox, bold item name ("Linen shirts ×3"), and the one-line reason in grey ("Feels-like 31° and you're humidity-sensitive"). Ticking draws the oversized red ✓ and strikes the label through; ticks persist instantly. "↻ Regenerate list" as a quiet secondary action at the bottom, with confirmation: "This writes a fresh list and clears your ticks."

**Ticked items keep their position.** This screen originally sank them to the bottom of their category, which reads well as a wireframe and badly in a suitcase: packing is done while looking away from the phone, and a list that rearranges itself under you loses your place. The tick, the strikethrough and the header count carry the progress instead.

### S7 · Home / My trips (screen 06)

Home is where you land once a profile exists; Welcome is only shown to people who have not started the survey.

**The style card.** Home leads with a plain-spoken read on how you feel temperature — "You run hot", "You run cold", "You run about average" — with the concrete thresholds beneath it in secondary text.

There is a fourth state. The hot/cold question and the two threshold sliders describe the same thing from different angles, and usually agree. When they contradict — someone who says they run hot but wants it warmer than most before changing clothes — the card reads **"You are a special snowflake"** and explains the mismatch, noting the app goes by the temperatures rather than the self-assessment. The tolerance is deliberately generous (3° of drift from the average comfort midpoint), so a merely unusual profile is not accused of inconsistency; only a genuinely self-contradicting one is. `describeTemperament()` owns this.

**The trips list.** "My trips" heading with "+ New" in warm neutral at the right. Each trip is a card: thumbnail placeholder, "Lisbon / 10–17 Aug · Beach", and the temperature dot at the right edge. Up to 10 trips; saving an 11th prompts a deletion. Swipe or overflow to delete, with undo toast. "My style" accessible from here — survey answers as an editable summary list ("Runs cold · Summer from 22° · Smart-casual"); tapping a row reopens that step.

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
- **Comfort chips knowingly sit below AA**, by design decision rather than oversight — see the accepted exception in the gradient system section above. Measured on `lightestUnderText`, chips range from ~1.8:1 at the mild-warm end to ~9:1 at bitter cold; roughly a third clear 4.5:1 outright, and every chip's deep end does. The `/styleguide` readout keeps the real numbers visible rather than letting the tradeoff fade from view.
- One build rule still holds and matters: the gradient's pixel stop must never exceed the chip's left padding, so the bright edge colour stays off the text. Both are bound to `--chip-padding-x` for exactly this reason.
- **Everything outside the chips clears 4.5:1** — body copy, headings, secondary text, micro-labels, and buttons are all unaffected by this exception.
- Colour never carries meaning alone: every chip says its meaning in words ("Hot for you"), and gradient bars are decorative reinforcement.
- Tap targets: full-row for checkboxes, ≥ 44px; survey pills ≥ 48px tall.
- Respects `prefers-reduced-motion` (gradient shimmer and tick flourish become simple fades).
