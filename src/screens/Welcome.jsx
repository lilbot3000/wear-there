import { navigate } from '../lib/router.js'

import './Welcome.css'

/**
 * S1 · Welcome. The pitch, shown only to people who haven't started the
 * survey — everyone else lands on Home.
 */
export default function Welcome() {
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
        <button type="button" className="button" onClick={() => navigate('/survey')}>
          Start my style survey
        </button>
        <p className="welcome__hint">2–3 minutes · answered once</p>
      </div>
    </main>
  )
}
