import { useEffect, useRef, useState } from 'react'

import { generateList, listProgress, toggleItem } from '../lib/packing.js'
import { loadProfile } from '../lib/profile.js'
import { navigate, useRedirect } from '../lib/router.js'
import { temperatureBar } from '../lib/temperature.js'
import { loadTrip, updateTrip } from '../lib/trips.js'

import './PackingList.css'

/**
 * S5 · Generating and S6 · Packing list (wireframe 05).
 *
 * One component for both, because they are one moment: the wait is part of the
 * reveal, not a separate screen someone navigates to. The list is the second
 * hero screen and the thing people screenshot, so it stays quiet — no chrome
 * competing with the items.
 */
export default function PackingList({ tripId }) {
  const [trip] = useState(() => loadTrip(tripId))
  const [profile] = useState(() => loadProfile())
  const [list, setList] = useState(() => trip?.packingList ?? null)
  const [state, setState] = useState(() => (trip?.packingList ? 'ready' : 'generating'))
  const [error, setError] = useState(null)
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)

  const days = trip?.forecastSnapshot?.days ?? null

  // Generation needs the forecast this trip was read against. The forecast
  // screen records it, and it is the only route here, so a trip without one is
  // an old trip or a hand-typed URL — send it through the screen that fills
  // the gap rather than showing an error about it.
  const redirectTo = !trip ? '/' : !days && !list ? `/trip/${tripId}` : null
  useRedirect(redirectTo)

  // A ref, not state: the effect must not re-run when a regenerate is
  // requested, or it would fire twice and bill twice.
  const wanted = useRef(0)

  useEffect(() => {
    if (state !== 'generating' || !trip || !profile || !days) return undefined

    let live = true
    const attempt = ++wanted.current

    generateList(trip, profile, days, {
      summary: trip.forecastSnapshot?.summary,
      homeComparison: trip.forecastSnapshot?.homeComparison,
    })
      .then((fresh) => {
        if (!live || attempt !== wanted.current) return
        setList(fresh)
        setState('ready')
        updateTrip(trip.id, { packingList: fresh })
      })
      .catch((problem) => {
        if (!live || attempt !== wanted.current) return
        setError(problem.message)
        setState('error')
      })

    return () => {
      live = false
    }
  }, [state, trip, profile, days])

  // Render nothing for the frame before a redirect lands, so the generating
  // screen never flashes on the way somewhere else.
  if (redirectTo || !profile) return null

  const bar = temperatureBar(trip.forecastSnapshot?.feelsLike ?? 18, profile)

  function tick(itemId) {
    const next = toggleItem(list, itemId)
    setList(next)
    updateTrip(trip.id, { packingList: next })
  }

  function regenerate() {
    setConfirmingRegenerate(false)
    setError(null)
    setList(null)
    setState('generating')
    updateTrip(trip.id, { packingList: null })
  }

  if (state === 'generating') {
    return <Generating city={trip.destination.city} bar={bar} />
  }

  if (state === 'error') {
    return (
      <main className="packing">
        <Header trip={trip} bar={bar} list={null} />
        <div className="card packing__error">
          <b>That didn&rsquo;t work.</b>
          <div className="text-secondary">{error}</div>
          <button
            type="button"
            className="button button--inline packing__retry"
            onClick={() => setState('generating')}
          >
            Try again
          </button>
        </div>
        <Footer tripId={trip.id} />
      </main>
    )
  }

  return (
    <main className="packing">
      <Header trip={trip} bar={bar} list={list} />

      {/* Sets up everything below it: why these items and not other ones.
          Optional, so lists saved before fabrics existed still open. */}
      {list.fabrics ? (
        <section className="packing__fabrics">
          <p className="micro-label">Fabrics</p>
          <p className="packing__fabrics-note">{list.fabrics}</p>
        </section>
      ) : null}

      {list.categories.map((category) => (
        <section key={category.name} className="packing__category">
          <p className="micro-label">{category.name}</p>

          <ul className="packing__items">
            {/* Rendered in the order they arrived — ticking must never move
                an item, or you lose your place mid-pack. */}
            {category.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`card packing__item ${item.checked ? 'is-checked' : ''}`}
                  aria-pressed={item.checked}
                  onClick={() => tick(item.id)}
                >
                  <span
                    className={`checkbox ${item.checked ? 'is-checked' : ''}`}
                    aria-hidden="true"
                  />
                  <span className="packing__item-text">
                    <span className="packing__item-label">
                      {item.label}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </span>
                    {/* Absent on the obvious — the model is told to explain
                        only what needs explaining, and socks do not. */}
                    {item.why ? (
                      <span className="packing__item-why">{item.why}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Quiet, and below the list — regenerating is the rare choice, and it
          costs someone their ticks. */}
      <div className="packing__regenerate">
        {confirmingRegenerate ? (
          <div className="card packing__confirm">
            <b>This writes a fresh list and clears your ticks.</b>
            <div className="packing__confirm-actions">
              <button
                type="button"
                className="packing__cancel"
                onClick={() => setConfirmingRegenerate(false)}
              >
                Keep this one
              </button>
              <button type="button" className="button button--inline" onClick={regenerate}>
                Write a new list
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="packing__regenerate-button"
            onClick={() => setConfirmingRegenerate(true)}
          >
            ↻ Regenerate list
          </button>
        )}
      </div>

      <Footer tripId={trip.id} />
    </main>
  )
}

/* ------------------------------------------------------------- generating */

const STATUS_INTERVAL_MS = 2600

/**
 * S5 · Generating.
 *
 * The gradient bar shimmers rather than a spinner turning, so the wait uses
 * the app's own language. Status lines name what is actually happening, which
 * is both true and the reason the wait feels short.
 */
function Generating({ city, bar }) {
  const lines = [
    `Reading ${city}'s forecast…`,
    'Checking it against your style…',
    'Writing your list…',
  ]

  const [index, setIndex] = useState(0)

  useEffect(() => {
    // Stops on the last line rather than looping — a cycle that restarts reads
    // as a hang.
    const timer = setInterval(() => {
      setIndex((current) => Math.min(current + 1, lines.length - 1))
    }, STATUS_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [lines.length])

  return (
    <main className="packing packing--generating">
      <div className="packing__generating-inner">
        <div className="packing__shimmer" style={{ background: bar }} role="presentation" />
        <p className="packing__status" aria-live="polite">
          {lines[index]}
        </p>
      </div>
    </main>
  )
}

/* ----------------------------------------------------------------- parts */

function Header({ trip, bar, list }) {
  const progress = list ? listProgress(list) : null
  const done = progress && progress.checked === progress.total

  return (
    <header className="packing__header">
      <h1 className="heading heading--screen">Your list</h1>
      <p className="packing__meta">
        {trip.destination.city}
        {progress
          ? ` · ${done ? 'all packed' : `${progress.checked} of ${progress.total} packed`}`
          : ''}
      </p>
      <div className="gradient-bar packing__bar" style={{ background: bar }} role="presentation" />
    </header>
  )
}

function Footer({ tripId }) {
  return (
    <div className="packing__actions">
      <button type="button" className="packing__back" onClick={() => navigate(`/trip/${tripId}`)}>
        Back to forecast
      </button>
      <button type="button" className="button button--inline" onClick={() => navigate('/')}>
        Home
      </button>
    </div>
  )
}
