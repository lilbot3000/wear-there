/**
 * The five kinds of answer the survey collects. Each takes the current value
 * and reports changes upward; none of them know about the stepper around them.
 */

import { useEffect, useRef, useState } from 'react'

import { describeAgainstClimate } from '../lib/climate.js'
import { placeLabel, searchCities } from '../lib/geocode.js'

/* ------------------------------------------------------------------ city */

export function CityInput({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | searching | empty | error
  const inputRef = useRef(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setStatus('idle')
      return undefined
    }

    // Wait for a pause in typing, and abandon the previous request, so results
    // always match the latest keystroke rather than whichever call finished last.
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('searching')
      try {
        const places = await searchCities(trimmed, { signal: controller.signal })
        setResults(places)
        setStatus(places.length === 0 ? 'empty' : 'idle')
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('error')
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  if (value) {
    return (
      <div className="survey-city">
        <div className="card survey-city__chosen">
          <div>
            <div className="survey-city__name">{placeLabel(value)}</div>
            {value.region ? (
              <div className="text-secondary">{value.region}</div>
            ) : null}
          </div>
          <button
            type="button"
            className="pill"
            onClick={() => {
              onChange(null)
              setQuery('')
              setResults([])
              // Focus lands back in the field so changing your mind is one tap.
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="survey-city">
      <input
        ref={inputRef}
        type="text"
        className="survey-input"
        placeholder="Start typing a city"
        value={query}
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
      />

      {status === 'searching' ? (
        <p className="text-secondary survey-city__note">Looking…</p>
      ) : null}

      {status === 'empty' ? (
        <p className="text-secondary survey-city__note">
          We couldn&rsquo;t find that one. Try the nearest big town.
        </p>
      ) : null}

      {status === 'error' ? (
        <p className="text-secondary survey-city__note">
          Search isn&rsquo;t responding. Check your connection and try again.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="survey-city__results">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="survey-city__result"
                onClick={() => onChange(place)}
              >
                <span className="survey-city__name">{place.city}</span>
                <span className="text-secondary">
                  {[place.region, place.country].filter(Boolean).join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- choice */

export function ChoiceInput({ question, value, onChange }) {
  return (
    <div className="survey-stack">
      {question.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`pill pill--block ${value === option.value ? 'is-selected' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- multi */

export function MultiInput({ question, value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  const atLimit = question.max ? selected.length >= question.max : false

  const toggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option))
      return
    }
    // With a limit, picking another drops the oldest rather than silently
    // doing nothing, which is far less frustrating than a dead tap.
    const next = question.max ? [...selected, option].slice(-question.max) : [...selected, option]
    onChange(next)
  }

  return (
    <>
      <div className="survey-wrap">
        {question.options.map((option) => {
          const isSelected = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              className={`pill ${isSelected ? 'is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
          )
        })}
      </div>
      {question.max ? (
        <p className="micro-label survey-hint">
          {atLimit
            ? `That's your ${question.max}. Tapping another swaps the first out.`
            : `Pick up to ${question.max}`}
        </p>
      ) : null}
    </>
  )
}

/* ---------------------------------------------------------------- slider */

export function SliderInput({ question, value, range, climate, onChange }) {
  const current = value ?? question.fallback

  // Neil's benchmark: a bare number is hard to answer, so translate it into a
  // day they have lived — "About a typical May or October day in London."
  // Recomputed live as the slider moves, from the cached climate data.
  const benchmark = describeAgainstClimate(current, climate)

  return (
    <div className="survey-slider">
      <div className="survey-slider__value">{current}°</div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={current}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={question.question}
      />
      <div className="survey-slider__scale micro-label">
        <span>{range.min}°</span>
        <span>{range.max}°</span>
      </div>
      <p className="survey-slider__caption">{question.caption(current)}</p>
      {benchmark ? (
        <p className="survey-slider__benchmark">{benchmark}</p>
      ) : null}
    </div>
  )
}

/* ----------------------------------------------------------------- scale */

export function ScaleInput({ question, value, onChange }) {
  return (
    <div className="survey-stack">
      {question.labels.map((label, index) => {
        const scaleValue = index + 1
        return (
          <button
            key={label}
            type="button"
            className={`pill pill--block ${value === scaleValue ? 'is-selected' : ''}`}
            aria-pressed={value === scaleValue}
            onClick={() => onChange(scaleValue)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
