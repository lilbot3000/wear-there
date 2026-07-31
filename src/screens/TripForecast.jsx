import { useEffect, useState } from 'react'

import { readTrip } from '../lib/comfort.js'
import {
  fetchTripAndHome,
  formatDateRange,
  formatDayLabel,
} from '../lib/forecast.js'
import { loadProfile } from '../lib/profile.js'
import { navigate, useRedirect } from '../lib/router.js'
import { tempColour, temperatureBar } from '../lib/temperature.js'
import { deleteTrip, loadTrip, updateTrip } from '../lib/trips.js'

import './TripForecast.css'

/**
 * S4 · Personalised forecast (wireframes 04 and 04b).
 *
 * The payoff screen: the survey answers stop being a form and start being a
 * reading of the week. Everything here is the same forecast every weather app
 * has — the difference is entirely in how it is described.
 */
export default function TripForecast({ tripId }) {
  const [trip] = useState(() => loadTrip(tripId))
  const [profile] = useState(() => loadProfile())
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (!trip || !profile) return undefined

    const controller = new AbortController()
    setState({ status: 'loading' })

    fetchTripAndHome(
      trip.destination,
      profile.home,
      trip.startDate,
      trip.endDate,
      { signal: controller.signal },
    )
      .then(({ trip: days, homeDays }) => {
        if (days.length === 0) {
          setState({ status: 'empty' })
          return
        }

        const reading = readTrip(days, profile, homeDays)
        setState({ status: 'ready', reading })

        // Record a snapshot so Home can show this trip's temperature dot
        // without refetching every forecast on every visit. Updated in place,
        // so opening a trip doesn't reshuffle the list.
        updateTrip(trip.id, {
          forecastSnapshot: {
            feelsLike: reading.feelsLike,
            // The trip's typical day, not its first — the dot should describe
            // the week rather than whichever day happens to come first.
            dotColour: tempColour(reading.feelsLike, profile).body,
            summary: reading.summary,
            homeComparison: reading.homeComparison,
            // The days as read, so the packing list can be written from the
            // same reading the traveller just saw rather than refetching and
            // risking a list that disagrees with the screen behind it.
            days: reading.days.map((day) => ({
              date: day.date,
              airMax: day.airMax,
              feelsLike: day.feelsLike,
              feelsLikeMin: day.feelsLikeMin,
              humidityPct: day.humidityPct,
              rainChancePct: day.rainChancePct,
              windSpeedKph: day.windSpeedKph,
              label: day.label,
            })),
            fetchedAt: new Date().toISOString(),
          },
        })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [trip, profile])

  useRedirect(trip ? null : '/')
  if (!trip) return null

  return (
    <main className="trip">
      <header className="trip__header">
        <h1 className="heading heading--screen trip__city">{trip.destination.city}</h1>

        <p className="trip__meta">
          {formatDateRange(trip.startDate, trip.endDate)}
          {state.status === 'ready' && state.reading.homeComparison
            ? ` · ${state.reading.homeComparison}`
            : ''}
        </p>

        {trip.purposes?.length > 0 ? (
          <div className="trip__purposes">
            {trip.purposes.map((purpose) => (
              <span key={purpose} className="pill is-selected trip__purpose">
                {purpose}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {state.status === 'loading' ? (
        <p className="trip__status">Reading {trip.destination.city}&rsquo;s forecast…</p>
      ) : null}

      {state.status === 'error' ? (
        <div className="card trip__error">
          <b>That didn&rsquo;t work.</b>
          <div className="text-secondary">
            The forecast service didn&rsquo;t respond. Check your connection.
          </div>
          <button
            type="button"
            className="button button--inline trip__retry"
            onClick={() => setState({ status: 'loading' })}
          >
            Try again
          </button>
        </div>
      ) : null}

      {state.status === 'empty' ? (
        <div className="card trip__error">
          <b>No forecast for those dates.</b>
          <div className="text-secondary">
            They may be beyond the forecast window. Try dates closer to today.
          </div>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <Reading reading={state.reading} profile={profile} />

          {/* The way onward from the payoff screen. Reads differently once a
              list exists, so returning to a trip doesn't look like an offer to
              rewrite what you already ticked. */}
          <button
            type="button"
            className="button trip__generate"
            onClick={() => navigate(`/trip/${trip.id}/list`)}
          >
            {trip.packingList ? 'See my packing list' : 'Generate my packing list'}
          </button>
        </>
      ) : null}

      {/* Mirrors the survey's footer: a quiet action on the left, the way
          onward as a button on the right. */}
      <div className="trip__actions">
        <button
          type="button"
          className="trip__delete"
          onClick={() => {
            deleteTrip(trip.id)
            navigate('/')
          }}
        >
          Delete this trip
        </button>
        <button
          type="button"
          className="button button--inline"
          onClick={() => navigate('/')}
        >
          Home
        </button>
      </div>
    </main>
  )
}

function Reading({ reading, profile }) {
  return (
    <>
      {/* The bar's reach is the trip's intensity: a mild week stays pale, a
          heatwave sweeps the ramp into deep red. */}
      <div
        className="gradient-bar trip__bar"
        style={{ background: temperatureBar(reading.feelsLike, profile) }}
        role="presentation"
      />

      <p className="trip__summary">{reading.summary}</p>

      <div className="trip__days">
        {reading.days.map((day) => (
          <div key={day.date} className="card card--row trip__day">
            <div className="trip__day-left">
              <b>{formatDayLabel(day.date)}</b>
              <div className="text-secondary">{dayDetail(day)}</div>
            </div>
            <span className="chip trip__chip" style={day.colour.chipStyle}>
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* The point of the whole app in one line: the numbers are the same as
          any weather app's, the verdict is not. Uses the trip's own
          temperature so it lands as a specific fact rather than a boast. */}
      <p className="trip__footnote">
        Anyone can tell you it&rsquo;s {reading.feelsLike}°. This is what
        that feels like for <em>you</em>.
      </p>
    </>
  )
}

/**
 * The sub-line under each day. Shows the feels-like alongside the air
 * temperature only when they differ enough to be worth explaining — that gap
 * is the whole reason this app exists, so it earns the space when it's real
 * and stays quiet when it isn't.
 */
function dayDetail(day) {
  // Lead with the air temperature, as the wireframes do, then add the
  // feels-like only when the gap is big enough to be the point — that gap is
  // the reason this app exists, so it earns its space when real and stays
  // quiet when it isn't.
  const parts = [`${Math.round(day.airMax)}°`]

  // The low earns permanent space: a day is not one temperature, and a 25°
  // afternoon that falls to 6° needs a layer the high gives no hint of.
  // Called "low" rather than "overnight" on purpose — this is the coldest
  // point of the calendar day, which lands around dawn, so the cold of
  // *this* evening is actually tomorrow's low.
  if (typeof day.airMin === 'number' && Number.isFinite(day.airMin)) {
    parts.push(`low ${Math.round(day.airMin)}°`)
  }

  if (Math.abs(day.feelsLike - day.airMax) >= 3) {
    parts.push(`feels like ${Math.round(day.feelsLike)}°`)
  }

  if (day.muggy) parts.push(`${Math.round(day.humidityPct)}% humid`)

  if (day.wet) parts.push(`rain ${Math.round(day.rainChancePct)}%`)
  else if (day.windy) parts.push(`windy`)

  // The number above is objective; this says whether it is cold *for you*,
  // which is the part that decides whether a layer goes in the bag. Only on
  // warm days, where the drop is the thing you would otherwise miss.
  if (day.coldNight && day.side === 'hot') parts.push('cold by dawn')

  return parts.join(' · ')
}
