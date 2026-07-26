# Wear There — Step-by-Step Build Guide

**Who this is for:** you (Lily), building with Claude Code. Each phase is one comfortable working session. Steps marked 🙋 are things only you can do (accounts, clicking buttons on websites); steps marked 🤖 are prompts to give Claude Code, which does the coding while you review.

**The strategy:** get a nearly-empty version of the app live on the internet in Phase 1, then build features in slices. Every `git push` updates the live site automatically, so there's no scary "launch day" — the app is always live and just keeps getting better.

---

## Phase 0 · Accounts and tools (~30 min, one-time)

1. 🙋 **GitHub** — you have this already. ✓
2. 🙋 **Vercel** — go to vercel.com, "Sign up", choose **Continue with GitHub**. Free Hobby plan. No card needed.
3. 🙋 **Anthropic API** — go to platform.claude.com, create an account, add a payment card under Billing, and buy **$5 of credit**. Then:
   - Set a **monthly spending limit** (e.g. $5) under Billing → Limits, so there are no surprises.
   - Create an **API key** (API Keys → Create Key, name it `wear-there`). Copy it somewhere safe (e.g. your password manager). You'll paste it into Vercel in Phase 1 and never need it again. Treat it like a bank card number: never paste it into the code or share it.
4. 🙋 **Node.js** — Claude Code will check whether your Mac has it and install it if not. Just ask: *"Check if I have Node.js installed, and install it if not."*

**Checkpoint:** you can log into Vercel and the Anthropic console, and you have an API key saved.

---

## Phase 1 · Repo, skeleton, and first deploy (~1 hour)

1. 🙋 On GitHub, create a new repository called `wear-there` (public or private, your choice). Don't add any files.
2. 🤖 *"Set up the wear-there project: a Vite + React app per the tech design doc, connect it to my new GitHub repo, move the docs into a `docs/` folder in the repo, and copy my design files from Downloads into a `design/` folder (the wireframe HTML files and Design.pdf). Make the home page the Welcome screen skeleton for now: 'Wear There' in Bricolage Grotesque with the full-spectrum gradient bar from the UX spec. Commit and push."*
3. 🙋 On vercel.com: **Add New → Project → Import** your `wear-there` repo. Accept the defaults (Vercel detects Vite automatically) and click Deploy.
4. 🙋 Still in Vercel: Project → **Settings → Environment Variables**. Add one called `ANTHROPIC_API_KEY`, paste your key as the value, save. (It sits unused until Phase 4 — adding it now means Phase 4 "just works".)
5. 🙋 Open the URL Vercel gives you (something like `wear-there.vercel.app`) **on your phone**.

**Checkpoint:** a live ivory page with the serif masthead, on your phone, at a URL you can send to anyone. From now on, every push goes live in about a minute.

---

## Phase 2 · Design foundation (~1 session)

1. 🤖 *"Build the Bright Line design system from the UX spec: CSS variables for the full colour table, Bricolage Grotesque for headings and Plus Jakarta Sans for UI, the `tempColour` intensity function from the UX spec (edge and body colours sampled from the ramps, body clamped to the contrast-safe segments), and the core components — card, primary ink button, outlined secondary button, selection pill, gradient comfort chip, checkbox with the oversized red tick, survey progress bar, and gradient bar. Make a hidden `/styleguide` page showing them all (including a slider that drives the gradient from a feels-like number) so we can compare against `design/wireframes.html`."*
2. 🙋 Open `/styleguide` on your phone next to your wireframes. This is the moment to be fussy — say "the red is too orange", "cards need more air", whatever you see. Drag the temperature slider and check cold really goes pale-to-deep blue and hot goes yellow-to-red, with no purple in between.

**Checkpoint:** the styleguide page matches your wireframes, and the gradient responds to temperature. Everything built after this inherits the look for free.

---

## Phase 3 · The survey (~1 session)

1. 🤖 *"Build F1 from the MVP spec: the Welcome screen per the UX spec, then the 11-step survey (starting with 'Where's home?' using Open-Meteo's geocoding for the city type-ahead) matching wireframe screen 02 — progress bar, one question per screen, full-width selection pills — saving answers to localStorage under `wearthere.profile` per the tech design. Then the 'My style' screen that shows answers and lets me edit any step. Follow the UX spec's voice and copy rules."*
2. 🙋 Fill the survey in honestly, as yourself, on your phone. Close the browser, reopen — your answers should still be there. Check the wording sounds like a sharp, well-travelled friend, not a form.

**Checkpoint:** a stranger could land on the site, do the survey in under 3 minutes, and see their style summary.

---

## Phase 4 · Weather and the personal forecast (~1 session)

1. 🤖 *"Build F2 and F3: the New trip screen per wireframe 03 (city type-ahead with disambiguation, Depart/Return limited to the 14-day window, purpose pills picking up to 2), Open-Meteo forecast fetch, and `comfort.js` implementing the comfort mapping from the tech design — including the home-city comparison. Write unit tests for comfort.js covering the threshold edges. Then the Personalised forecast screen per wireframes 04/04b: gradient bar driven by the trip's feels-like, day cards with gradient comfort chips, and the home-comparison sub-line."*
2. 🙋 Create a real trip — somewhere you'd actually go. Do the temperatures and phrases pass the sniff test? Try a hot place and a cold place. Try "Paris" and check the disambiguation works.

**Checkpoint:** "Lisbon, 10-17 Aug" shows a daily forecast that talks about *you* ("hot for you all week"), with no AI involved yet — this part is free and instant.

---

## Phase 5 · The AI packing list (~1 session)

This is the only phase touching money, and it's pennies.

1. 🤖 *"Build F4: the `/api/generate-list` Vercel serverless function per the tech design — claude-haiku-4-5, structured JSON output, the prompt covering weather, preferences, and trip purpose, reading ANTHROPIC_API_KEY from the environment. Then the generating screen (animated gradient bar, cycling status lines) and the packing list per wireframe 05: category micro-labels, item cards with the checkbox and one-line reason, the oversized red tick on completion, and the regenerate button with confirmation. Voice per the UX spec."*
2. 🙋 For local testing Claude will need the API key available on your machine — it will tell you to run one Vercel command to pull the environment variable down securely. Follow its lead.
3. 🙋 Generate lists for three very different trips: a beach week, a winter city break, a wedding. Judge them like she'd judge them: Would you actually pack this? Does the wedding trip include a proper outfit? If lists feel generic, tell Claude what's off — the fix is usually the prompt, occasionally upgrading the model.
4. 🙋 Glance at platform.claude.com → Usage afterwards. You should see a few cents of spend, which makes the economics real.

**Checkpoint:** the full magic moment works end to end: survey → trip → forecast → a packing list that feels like it knows you.

---

## Phase 6 · My trips (~half a session)

1. 🤖 *"Build F5: the My trips screen per wireframe 06 — trip cards with dates, purpose, and the temperature dot, '+ New' at top right, up to 10 trips — reopening a trip with ticks intact, delete with undo, and the prompt to remove an old trip when saving an 11th."*
2. 🙋 Make a few trips, tick some items, delete one, undo it. Close and reopen the browser.

**Checkpoint:** you can pack for a trip across several sittings and nothing is forgotten.

---

## Phase 7 · Polish and the friend test (~1–2 sessions)

1. 🤖 *"Go through the States & edge cases table and the accessibility section of the UX spec and implement every row: city not found, dates too far out, generation failure with retry, offline behaviour, empty home screen. Then review every screen against the copy rules and the launch checklist in the MVP spec."*
2. 🤖 *"Add the finishing touches: the list 'composing' animation, favicon, page titles, and make sure a screenshot of the packing list looks composed."*
3. 🙋 Test on your iPhone and, if you can borrow one, an Android phone.
4. 🙋 **The real test:** send the link to your first 5 friends with zero instructions — that's your success bar. Watch where they hesitate. Collect every confused moment and bring the list back to Claude to fix.

**Checkpoint:** the MVP spec's launch checklist is all ticked, and friends are generating lists without asking you anything.

---

## Ongoing habits

- **One phase per session, commit and push at the end of each.** If something breaks, ask Claude to compare against the docs — they're the source of truth, so keep them updated when you change your mind about something.
- **Watch spend occasionally** at platform.claude.com → Usage. At friend-scale it should be pence per month.
- **Ideas that aren't in the MVP spec go in the "out of scope" table**, not into the build. Shopping suggestions, trip-type extras, and °F are all queued for v1.1 — resist them until friends are using v1.
- When you're ready for `wearthere.com`, buy the domain anywhere and add it in Vercel → Settings → Domains. Ten minutes, no code changes.
