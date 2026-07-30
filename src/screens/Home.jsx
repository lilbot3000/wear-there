import { formatDateRange } from '../lib/forecast.js'
import {
  describeTemperament,
  isProfileComplete,
  isStorageAvailable,
  loadProfile,
} from '../lib/profile.js'
import { navigate } from '../lib/router.js'
import { MAX_TRIPS, loadTrips } from '../lib/trips.js'

import './Home.css'

/**
 * S3 · Home.
 *
 * Where you land once your style is saved. Three jobs: get to your profile,
 * start a trip, and see the trips you already have. The trips list is empty
 * until Phase 6 gives trips somewhere to live, so it shows its empty state for
 * now — the shape is here so the screen doesn't have to be rebuilt later.
 */
export default function Home() {
  const profile = loadProfile()
  const complete = isProfileComplete(profile)
  const storageWorks = isStorageAvailable()
  const temperament = describeTemperament(profile)
  const trips = loadTrips()
  const atCapacity = trips.length >= MAX_TRIPS

  return (
    <main className="home">
      {/* No "My style" link here: the card below goes to the same screen, and
          one route to a destination is clearer than two. */}
      <header className="home__header">
        <h1 className="home__masthead">Wear There</h1>
      </header>

      <div className="gradient-bar home__bar" role="presentation" />

      {!storageWorks ? (
        <div className="card home__warning">
          <b>This browser is not letting us save.</b>
          <div className="text-secondary">
            Anything you enter will disappear when you close the tab. Private
            browsing is the usual cause.
          </div>
        </div>
      ) : null}

      {/* Someone can reach Home with a half-finished profile by going back
          mid-survey, so offer the way to finish rather than pretending. */}
      {!complete ? (
        <div className="card home__unfinished">
          <div>
            <b>Your style is not finished.</b>
            <div className="text-secondary">
              Packing lists need the full picture to feel like yours.
            </div>
          </div>
          <button type="button" className="pill" onClick={() => navigate('/survey')}>
            Finish
          </button>
        </div>
      ) : (
        <section className="home__section">
          <div className="home__section-head">
            <h2 className="heading heading--screen">My style</h2>
          </div>
          <button type="button" className="home__style-card card" onClick={() => navigate('/style')}>
            <span className="home__style-text">
              <span className="home__style-headline">{temperament?.headline}</span>
              <span className="home__style-detail">{temperament?.detail}</span>
            </span>
            <span className="home__chevron" aria-hidden="true">
              →
            </span>
          </button>
        </section>
      )}

      <section className="home__section">
        {/* "+ New" carries the action, as in wireframe 06, rather than a
            separate full-width button competing with it. */}
        <div className="home__section-head">
          <h2 className="heading heading--screen">My trips</h2>
          {complete && !atCapacity ? (
            <button
              type="button"
              className="home__new"
              onClick={() => navigate('/trip/new')}
            >
              + New
            </button>
          ) : null}
        </div>

        {atCapacity ? (
          <p className="home__note">
            That is all {MAX_TRIPS} slots used. Delete one to plan another.
          </p>
        ) : null}

        {trips.length === 0 ? (
          <div className="card home__empty">
            <b>No trips yet.</b>
            <div className="text-secondary">
              Plan one and it will live here, with the forecast read in your
              terms.
            </div>
          </div>
        ) : (
          <ul className="home__trip-list">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  className="home__trip card"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  <span className="home__trip-text">
                    <span className="home__trip-city">{trip.destination.city}</span>
                    <span className="text-secondary">
                      {formatDateRange(trip.startDate, trip.endDate)}
                      {trip.purposes?.length > 0 ? ` · ${trip.purposes.join(', ')}` : ''}
                    </span>
                  </span>
                  {/* The trip's temperature at a glance, from the snapshot
                      saved when its forecast last loaded. A trip not yet
                      opened gets a neutral dot rather than a different shape,
                      so the column stays even. */}
                  <span
                    className="dot home__trip-dot"
                    style={{
                      background: trip.forecastSnapshot?.dotColour ?? 'rgba(28, 28, 30, 0.15)',
                    }}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
