import { useState } from 'react'

import { lastForecastDay, today, dayCount, FORECAST_DAYS } from '../lib/forecast.js'
import { navigate } from '../lib/router.js'
import { isAtCapacity, newTripId, saveTrip } from '../lib/trips.js'
import { CityInput } from '../survey/inputs.jsx'

import './NewTrip.css'

/** Trip purposes shape the packing list in Phase 5. Pick up to two. */
const PURPOSES = [
  'Beach',
  'City break',
  'Outdoors',
  'Formal',
  'Business',
  'Family',
]

const MAX_PURPOSES = 2

/**
 * S3 · New trip (wireframe 03).
 *
 * Three things: where, when, and what for. The dates are constrained rather
 * than validated — the pickers simply cannot be set outside the forecast
 * window, so there is no error message to write, per the MVP spec's
 * "invalid dates are prevented, not error-messaged".
 */
export default function NewTrip() {
  const [destination, setDestination] = useState(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [purposes, setPurposes] = useState([])

  const earliest = today()
  const latest = lastForecastDay()
  const atCapacity = isAtCapacity()

  // The return date can never precede departure, so its floor moves with the
  // departure date rather than letting an impossible range be selected.
  const earliestReturn = start || earliest
  const length = start && end ? dayCount(start, end) : 0
  const tooLong = length > FORECAST_DAYS

  const ready = destination && start && end && !tooLong && !atCapacity

  const togglePurpose = (name) =>
    setPurposes((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name].slice(-MAX_PURPOSES),
    )

  const onDepartChange = (value) => {
    setStart(value)
    // Nudge an earlier return forward rather than leaving a nonsense range.
    if (end && value && end < value) setEnd(value)
  }

  const createTrip = () => {
    const trip = {
      id: newTripId(),
      destination,
      startDate: start,
      endDate: end,
      purposes,
      createdAt: new Date().toISOString(),
    }
    saveTrip(trip)
    navigate(`/trip/${trip.id}`)
  }

  return (
    <main className="new-trip">
      <header className="new-trip__header">
        <h1 className="heading heading--screen">Where and when?</h1>
      </header>

      {atCapacity ? (
        <div className="card new-trip__warning">
          <b>You have 10 trips saved.</b>
          <div className="text-secondary">
            That is the limit. Delete one from Home to plan another.
          </div>
        </div>
      ) : null}

      <section className="new-trip__section">
        <p className="micro-label">Destination</p>
        <CityInput value={destination} onChange={setDestination} />
      </section>

      <section className="new-trip__section">
        <p className="micro-label">Dates</p>
        <div className="new-trip__dates">
          <label className="new-trip__date">
            <span className="text-secondary">Depart</span>
            <input
              type="date"
              value={start}
              min={earliest}
              max={latest}
              onChange={(event) => onDepartChange(event.target.value)}
            />
          </label>
          <label className="new-trip__date">
            <span className="text-secondary">Return</span>
            <input
              type="date"
              value={end}
              min={earliestReturn}
              max={latest}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        </div>

        {/* Once valid dates are in, the useful fact is the trip length. The
            forecast-window caveat only belongs before dates are chosen, or
            when the trip has actually outrun it. */}
        <p className="new-trip__note">
          {tooLong
            ? `Forecasts only reach ${FORECAST_DAYS} days, so that is the longest trip we can read.`
            : length > 0
              ? `${length} ${length === 1 ? 'day' : 'days'}.`
              : `Pick dates within the next ${FORECAST_DAYS} days — that is as far as forecasts reach.`}
        </p>
      </section>

      <section className="new-trip__section">
        <p className="micro-label">Trip purpose · pick up to {MAX_PURPOSES}</p>
        <div className="new-trip__purposes">
          {PURPOSES.map((name) => (
            <button
              key={name}
              type="button"
              className={`pill ${purposes.includes(name) ? 'is-selected' : ''}`}
              aria-pressed={purposes.includes(name)}
              onClick={() => togglePurpose(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="micro-label new-trip__hint">
          Optional, but it shapes the packing list — a wedding needs different
          things from a hiking week.
        </p>
      </section>

      <div className="new-trip__actions">
        <button type="button" className="button button--inline" onClick={() => navigate('/')}>
          Back
        </button>
        <button
          type="button"
          className="button button--inline"
          disabled={!ready}
          onClick={createTrip}
        >
          See my forecast
        </button>
      </div>
    </main>
  )
}
