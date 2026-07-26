# Wear There — Technical Design Doc

**Status:** Draft v1 · **Audience:** the builder (Lily + Claude Code)

## 1. Architecture overview

A static frontend plus one serverless function. No database, no auth, no servers to maintain.

```
┌─────────────────────────────┐
│  Browser (mobile-first SPA) │
│  React + Vite               │
│  localStorage:              │
│   · preference profile      │
│   · saved trips + ticks     │
└──────┬──────────────┬───────┘
       │              │
       │ direct       │ POST /api/generate-list
       ▼              ▼
┌──────────────┐  ┌──────────────────────────┐
│  Open-Meteo  │  │ Vercel serverless fn      │
│  geocoding + │  │  · holds ANTHROPIC_API_KEY│
│  forecast    │  │  · calls Claude API       │
│  (keyless)   │  │  · returns JSON list      │
└──────────────┘  └──────────────────────────┘
```

**Why this shape:** Open-Meteo needs no key, so the browser calls it directly. The Claude API key must never reach the browser, so list generation goes through one Vercel function — the only backend code in the project.

## 2. Stack choices & tradeoffs

| Decision | Choice | Alternatives considered |
|---|---|---|
| Frontend | **React + Vite** | Vanilla JS (fewer concepts but screens/state get messy); Next.js (overkill — we need exactly one API route, which plain Vercel functions provide) |
| Styling | **Plain CSS with custom properties** | Tailwind (fine, but one more dependency; editorial design benefits from hand-written CSS) |
| State/storage | **localStorage via a small wrapper** | Database + accounts (explicitly out of MVP scope) |
| Weather | **Open-Meteo** (geocoding, 16-day forecast, `apparent_temperature`, humidity, precipitation probability) | OpenWeatherMap (needs key + card); Met Office (UK-only focus) |
| AI | **Claude API — Haiku 4.5** ($1/$5 per million tokens; a packing list costs ~half a penny), one call per list, structured JSON output enforced by the API | Sonnet (3× the price — upgrade path if Haiku's lists feel generic); generating lists with rules only (loses the "how did it know?" magic) |
| Hosting | **Vercel free tier** | Netlify (equivalent); GitHub Pages (no serverless functions) |

## 3. Data models

All persisted client-side as JSON in localStorage. Versioned with a `schemaVersion` field so future releases can migrate old data.

### PreferenceProfile

```jsonc
{
  "schemaVersion": 1,
  "home": { "city": "London", "country": "United Kingdom", "lat": 51.51, "lon": -0.13 },
  "runsHotCold": "cold",            // "hot" | "average" | "cold"
  "summerThresholdC": 22,            // switches to summer clothes at/above
  "coatThresholdC": 9,               // needs proper coat at/below
  "humiditySensitivity": 4,          // 1–5
  "rainPlan": "umbrella",           // "hood" | "umbrella" | "getWet"
  "styles": ["smart-casual"],       // up to 2
  "warmStaples": ["linen-shirt", "sundress", "sandals"],
  "coldStaples": ["wool-jumper", "boots", "scarf"],
  "layering": "layers",             // "layers" | "bigCoat"
  "packingPhilosophy": 2             // 1 (light) – 5 (options)
}
```

### Trip

```jsonc
{
  "schemaVersion": 1,
  "id": "uuid",
  "city": "Lisbon",
  "country": "Portugal",
  "lat": 38.72, "lon": -9.14,
  "startDate": "2026-08-10",
  "endDate": "2026-08-17",
  "purposes": ["beach"],             // up to 2: city-break | beach | outdoors | wedding-formal | business | visiting-family
  "createdAt": "2026-07-25T10:00:00Z",
  "forecastSnapshot": [              // frozen at generation time
    { "date": "2026-08-10", "highC": 29, "lowC": 19,
      "feelsLikeHighC": 31, "humidityPct": 65,
      "rainChancePct": 5, "comfortPhrase": "Hot for you — your lightest things" }
  ],
  "packingList": {
    "generatedAt": "2026-07-25T10:00:30Z",
    "categories": [
      { "name": "Tops",
        "items": [
          { "id": "uuid", "label": "Linen shirts", "qty": 3,
            "why": "Feels-like tops 31°C and you're humidity-sensitive",
            "checked": false }
        ] }
    ]
  }
}
```

Storage keys: `wearthere.profile`, `wearthere.trips` (array, capped at 10, oldest evicted).

## 4. Key flows

### Personalised comfort mapping (pure function, no AI)

```
input: day forecast + PreferenceProfile
1. t = apparent_temperature (already includes humidity/wind)
2. adjust: runsHot → t - 2°C band shift; runsCold → +2°C
3. classify against personal thresholds:
     t ≥ summerThreshold        → "hot for you"
     t ≤ coatThreshold          → "coat weather for you"
     else                       → banded "mild"/"warm"/"cool" between them
4. modifiers: humidity ≥ 70% AND sensitivity ≥ 4 → append "muggy" note
              rainChance ≥ 50% → append rain note (phrased per rainPlan)
5. home comparison: fetch home city's forecast in the same call batch;
   difference ≥ 6°C → phrases like "a good bit warmer than home"
output: comfortPhrase per day
```

Deterministic and unit-testable — this is the app's core logic and lives in one file (`comfort.js`) with tests.

### List generation (`POST /api/generate-list`)

- Request body: `{ profile, tripSummary, purposes, dailyComfort[] }` — no PII beyond preferences.
- Function builds a prompt covering weather, preferences, and trip purpose (wedding → formal outfit section; hiking → outdoor gear), and uses the API's structured-output feature so the response is **guaranteed valid JSON** matching our schema — no parsing failures to handle.
- Model: `claude-haiku-4-5` — cheapest current model ($1 in / $5 out per million tokens); a typical list uses ~1,500 tokens in and ~1,000 out ≈ **$0.007, about half a penny**. If list quality ever feels generic, swapping one string upgrades to Sonnet at ~3× the cost.
- Timeout 25s; errors return `{ error }` and the client shows retry.

### Weather fetch

- Geocoding: `geocoding-api.open-meteo.com/v1/search?name={query}&count=5` → disambiguation list.
- Forecast: `api.open-meteo.com/v1/forecast?...&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,relative_humidity_2m_max&forecast_days=16`.
- Client-side cache: same city+dates within 1 hour reuses the previous response.

## 5. Security & privacy

- Claude API key lives only in a Vercel environment variable; never in the repo or browser.
- No user accounts, no server-side storage of user data; preferences never leave the device except inside the list-generation request (stateless, not logged).
- Spending cap set in the Anthropic console; the serverless function also rate-limits per IP (a simple in-memory guard is enough at this scale).

## 6. Testing & quality bar

- Unit tests for `comfort.js` (threshold edges, hot/cold shifts, humidity modifier).
- Schema validation test for the AI response parser with malformed fixtures.
- Manual device pass (iPhone Safari, Android Chrome) before sharing the link.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| AI returns unusable/odd lists | Strict JSON schema + validation + retry; keep the comfort logic (the personal part) outside the AI |
| Forecast window blocks users planning far ahead | Clear messaging in v1; climate-averages fallback queued for v1.1 |
| localStorage cleared → trips lost | Stated openly; profile is quick to redo; accounts only if this actually hurts |
| Free-tier terms change | Everything is standard web tech — portable to Netlify/Cloudflare in an afternoon |
