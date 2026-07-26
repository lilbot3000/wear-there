# Wear There — Product Brief

**Author:** Lily Bowerman · **Date:** 25 July 2026 · **Status:** Draft v1

## One-liner

Wear There tells you what to pack for a trip based on what the weather will *feel like to you* — not just what the forecast says.

## Problem

People taking holidays to unfamiliar climates routinely pack wrong. Weather apps give them a number ("21°C in Lisbon") but not what that means for *them*: 21°C with Atlantic humidity feels different from 21°C at home, and it feels different to someone who runs hot than to someone who's always cold. The result is suitcases full of unworn clothes, missing essentials, and panic-buying at the destination.

Generic packing checklists don't solve this — they ignore both the actual forecast and the traveller's personal comfort and style.

## Solution

A mobile-first web app that:

1. Learns the user's clothing preferences and temperature comfort once, through a short survey (~11 questions, 2–3 minutes).
2. Takes a destination city and travel dates.
3. Fetches the real forecast, including feels-like temperature and humidity, and adjusts it by the user's personal comfort profile.
4. Generates a personalised packing list — the thing users screenshot, share, and tick off while packing.

## Target user

**Primary:** Holiday travellers taking 1–3 leisure trips a year, often to climates unlike home (e.g. Brits going to Dubai, Reykjavik, or Singapore). They plan trips days-to-weeks ahead, pack on their phone the night before, and are not weather-literate — they want an answer, not data.

**Not targeting in v1:** business travellers, digital nomads, multi-stop backpackers.

## Goals

- A traveller can go from "never seen this app" to a packing list they trust in under 5 minutes.
- The list is *personal*: two different users going to the same city on the same dates get visibly different lists.
- The experience feels sleek, modern, and gender-neutral — temperature drives the colour of every screen (cold trips render blue, hot trips render yellow-to-red), so the app is beautiful and informative at the same time.

## Success criteria (v1)

- 5–10 friends complete the survey and generate a packing list **without any explanation from me**.
- At least 3 of them use the list while actually packing for a real trip.
- Qualitative bar: at least one "how did it know?" reaction to a personalised suggestion.

## Rough scope

**In:** preference survey, single-city trip with dates and purpose, feels-like-to-you forecast, AI-generated packing list with tick-boxes, saved recent trips (on-device), the "Bright Line" temperature-driven visual design.

**Out (for now):** accounts/login, multi-stop trips, shopping/purchase suggestions, wardrobe inventory, native mobile apps, social features.

## Constraints

- Built solo (non-engineer + Claude Code); stack must stay simple.
- Running cost near £0: free hosting, free weather data, pay-as-you-go AI at pennies.
- No custom domain needed for v1 (`wear-there.vercel.app` or similar).

## Companion documents

- [MVP Spec](02-mvp-spec.md) — exact v1 feature set and cut lines
- [Technical Design](03-technical-design.md) — architecture, data, tradeoffs
- [UX / Design Spec](04-ux-design-spec.md) — flows, wireframes, visual language
