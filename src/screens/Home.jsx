import {
  describeTemperament,
  isProfileComplete,
  isStorageAvailable,
  loadProfile,
} from '../lib/profile.js'
import { navigate } from '../lib/router.js'

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
  const trips = [] // Phase 6 loads these from storage.

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
        <section className="home__style">
          <p className="micro-label">My style</p>
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

      <section className="home__trips">
        <p className="micro-label">My trips</p>

        {trips.length === 0 ? (
          <div className="card home__empty">
            <b>No trips yet.</b>
            <div className="text-secondary">
              Planning a trip is the next thing being built. Once it is here,
              every trip you plan will be listed on this screen.
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
