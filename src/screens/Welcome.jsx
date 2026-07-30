import { isProfileComplete, loadProfile } from '../lib/profile.js'
import { navigate } from '../lib/router.js'

import './Welcome.css'

export default function Welcome() {
  // Someone returning with answers already saved shouldn't be invited to redo
  // the survey. Phase 6 replaces this with the trips list.
  const returning = isProfileComplete(loadProfile())

  return (
    <main className="welcome">
      <div className="welcome__body">
        <h1 className="welcome__title">Wear There</h1>
        <p className="welcome__tagline">
          Your packing list, tuned to how hot or cold it actually feels to you.
        </p>
        <div className="gradient-bar welcome__bar" role="presentation" />
      </div>

      <div className="welcome__actions">
        {returning ? (
          <>
            <button type="button" className="button" onClick={() => navigate('/style')}>
              See my style
            </button>
            <p className="welcome__hint">Answered and saved. Change it any time.</p>
          </>
        ) : (
          <>
            <button type="button" className="button" onClick={() => navigate('/survey')}>
              Start my style survey
            </button>
            <p className="welcome__hint">2–3 minutes · answered once</p>
          </>
        )}
      </div>
    </main>
  )
}
