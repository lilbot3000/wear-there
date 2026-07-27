import { useState } from 'react'

import {
  DEFAULT_PROFILE,
  contrastRatio,
  tempColour,
  temperatureBar,
  temperatureIntensity,
} from '../lib/temperature.js'

import './StyleGuide.css'

/* Sample temperatures used to show the full sweep of the system. */
const SCALE = [-10, -5, 0, 5, 10, 14, 18, 22, 26, 30, 34, 40]

const RUNS = [
  { value: 'hot', label: 'Runs hot' },
  { value: 'average', label: 'Average' },
  { value: 'cold', label: 'Runs cold' },
]

function chipLabel(side) {
  if (side === 'hot') return 'Hot for you'
  if (side === 'cold') return 'Cold for you'
  return 'Mild for you'
}

/** Shows the measured contrast so the safety invariant proves itself. */
function ContrastBadge({ background, text }) {
  const ratio = contrastRatio(background, text)
  const passes = ratio >= 4.5
  return (
    <span className={`sg-contrast ${passes ? 'is-pass' : 'is-fail'}`}>
      {ratio.toFixed(2)}:1 {passes ? 'pass' : 'fail'}
    </span>
  )
}

function Section({ title, note, children }) {
  return (
    <section className="sg-section">
      <h2 className="sg-section__title">{title}</h2>
      {note ? <p className="sg-section__note">{note}</p> : null}
      <div className="sg-section__body">{children}</div>
    </section>
  )
}

export default function StyleGuide() {
  const [feelsLike, setFeelsLike] = useState(31)
  const [runsHotCold, setRunsHotCold] = useState('average')
  const [checked, setChecked] = useState(true)
  const [selectedPill, setSelectedPill] = useState('Cold')
  const [purposes, setPurposes] = useState(['Beach'])

  const profile = { ...DEFAULT_PROFILE, runsHotCold }
  const colour = tempColour(feelsLike, profile)
  const intensity = temperatureIntensity(feelsLike, profile)
  const bar = temperatureBar(feelsLike, profile)

  const togglePurpose = (name) =>
    setPurposes((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name].slice(-2),
    )

  return (
    <div className="sg">
      <header className="sg-header">
        <h1 className="heading heading--display">Bright Line</h1>
        <p className="sg-header__note">
          Wear There design system. Compare against{' '}
          <code>design/wireframes.html</code>. Not linked from the app.
        </p>
      </header>

      {/* ------------------------------------------------ temperature system */}
      <Section
        title="Temperature system"
        note="Drag the slider. Colour is driven by how far the day sits past your personal thresholds, so the same temperature reads differently depending on whether you run hot or cold."
      >
        <div className="sg-controls">
          <label className="sg-slider">
            <span className="micro-label">Feels like</span>
            <input
              type="range"
              min="-15"
              max="45"
              step="1"
              value={feelsLike}
              onChange={(event) => setFeelsLike(Number(event.target.value))}
            />
          </label>

          <div className="sg-runs">
            <span className="micro-label">You</span>
            <div className="sg-row">
              {RUNS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`pill ${runsHotCold === option.value ? 'is-selected' : ''}`}
                  onClick={() => setRunsHotCold(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sg-live">
          <div className="heading heading--display">{feelsLike}° feels-like</div>
          <div className="gradient-bar" style={{ background: bar }} />
          <div className="sg-row">
            <span className="chip" style={colour.chipStyle}>
              {chipLabel(colour.side)}
            </span>
            <ContrastBadge background={colour.body} text={colour.text} />
          </div>

          <dl className="sg-readout">
            <div>
              <dt>Side</dt>
              <dd>{colour.side}</dd>
            </div>
            <div>
              <dt>Intensity</dt>
              <dd>{intensity.t.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Edge</dt>
              <dd>{colour.edge ?? '—'}</dd>
            </div>
            <div>
              <dt>Body</dt>
              <dd>{colour.body}</dd>
            </div>
          </dl>
        </div>
      </Section>

      {/* -------------------------------------------------- the whole sweep */}
      <Section
        title="The whole sweep"
        note="Every chip the system can produce with the current profile. Check for two things: no purple or green anywhere, and every contrast reading passing."
      >
        <div className="sg-scale">
          {SCALE.map((temperature) => {
            const swatch = tempColour(temperature, profile)
            return (
              <div key={temperature} className="sg-scale__row">
                <span className="sg-scale__temp">{temperature}°</span>
                <span className="chip" style={swatch.chipStyle}>
                  {chipLabel(swatch.side)}
                </span>
                <ContrastBadge background={swatch.body} text={swatch.text} />
                <span
                  className="gradient-bar sg-scale__bar"
                  style={{ background: temperatureBar(temperature, profile) }}
                />
              </div>
            )
          })}
        </div>
      </Section>

      {/* ------------------------------------------------------- typography */}
      <Section title="Typography" note="Bricolage Grotesque for display, Plus Jakarta Sans for everything else.">
        <div className="heading heading--display">31° feels-like</div>
        <div className="heading heading--screen">Lisbon</div>
        <p style={{ margin: 0 }}>
          Body text in Plus Jakarta Sans. Your packing list, tuned to how hot or
          cold it actually feels to you.
        </p>
        <p className="text-secondary" style={{ margin: 0 }}>
          Secondary text, used for the reason under each packing item.
        </p>
        <p className="micro-label" style={{ margin: 0 }}>
          Micro-label, step 3 of 11
        </p>
      </Section>

      {/* ---------------------------------------------------------- colour */}
      <Section title="Colour" note="The fixed part of the palette. Temperature colours are generated, not listed.">
        <div className="sg-swatches">
          {[
            ['Ink', '#1C1C1E'],
            ['Secondary', '#6F6F73'],
            ['Micro', '#9A9A9E'],
            ['Warm neutral', '#6B6560'],
            ['Accent', '#E11D2E'],
            ['Card', '#FAFAFA'],
            ['Page', '#F4F4F4'],
          ].map(([name, hex]) => (
            <div key={hex} className="sg-swatch">
              <span className="sg-swatch__chip" style={{ background: hex }} />
              <span className="sg-swatch__name">{name}</span>
              <span className="sg-swatch__hex">{hex}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------------- buttons */}
      <Section
        title="Buttons"
        note="One style throughout. Buttons are never filled with ink, so no screen carries a heavy black slab."
      >
        <button type="button" className="button">
          Generate my packing list
        </button>
        <button type="button" className="button">
          Start my style survey
        </button>
        <button type="button" className="button button--inline">
          Next
        </button>
      </Section>

      {/* ----------------------------------------------------------- pills */}
      <Section title="Selection pills" note="Survey answers use the full-width variant; trip purpose uses the inline one, capped at two.">
        <div className="sg-stack">
          {['Hot', 'Cold', 'Average'].map((option) => (
            <button
              key={option}
              type="button"
              className={`pill pill--block ${selectedPill === option ? 'is-selected' : ''}`}
              onClick={() => setSelectedPill(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="sg-row sg-row--wrap">
          {['Beach', 'City break', 'Outdoors', 'Formal', 'Business', 'Family'].map(
            (name) => (
              <button
                key={name}
                type="button"
                className={`pill ${purposes.includes(name) ? 'is-selected' : ''}`}
                onClick={() => togglePurpose(name)}
              >
                {name}
              </button>
            ),
          )}
        </div>
      </Section>

      {/* ----------------------------------------------------------- cards */}
      <Section title="Cards">
        <div className="card card--row">
          <div>
            <b>Tue 11</b>
            <div className="text-secondary">29° · 65% humid</div>
          </div>
          <span className="chip" style={tempColour(29, profile).chipStyle}>
            {chipLabel(tempColour(29, profile).side)}
          </span>
        </div>
        <div className="card card--row">
          <div>
            <b>Mon 2</b>
            <div className="text-secondary">3° · feels like -2°</div>
          </div>
          <span className="chip" style={tempColour(-2, profile).chipStyle}>
            {chipLabel(tempColour(-2, profile).side)}
          </span>
        </div>
      </Section>

      {/* ------------------------------------------------------- checkboxes */}
      <Section title="Checkboxes" note="Tap one. The oversized tick is the single flourish in the system.">
        <div className="card">
          <div className={`checkbox-row ${checked ? 'is-checked' : ''}`}>
            <button
              type="button"
              aria-pressed={checked}
              aria-label="Linen shirts"
              className={`checkbox ${checked ? 'is-checked' : ''}`}
              onClick={() => setChecked((value) => !value)}
            />
            <div>
              <div className="checkbox-row__label">Linen shirts ×3</div>
              <div className="text-secondary">
                Feels-like 31° and you&rsquo;re humidity-sensitive
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------- progress */}
      <Section title="Progress">
        <div className="progress">
          <div className="progress__fill" style={{ width: '27%' }} />
        </div>
        <p className="micro-label" style={{ margin: 0 }}>
          Step 3 of 11
        </p>
      </Section>

      {/* ---------------------------------------------------- gradient bars */}
      <Section title="Gradient bars" note="Brand bar uses the full spectrum. Trip bars reach only as far as the trip's intensity.">
        <div className="gradient-bar" />
        <div className="gradient-bar" style={{ background: temperatureBar(33, profile) }} />
        <div className="gradient-bar" style={{ background: temperatureBar(-4, profile) }} />
      </Section>
    </div>
  )
}
