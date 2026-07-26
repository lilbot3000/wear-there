import './Welcome.css'

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
        {/* Wired up in Phase 3, when the survey exists. */}
        <button type="button" className="button button--secondary">
          Start my style survey
        </button>
        <p className="welcome__hint">2–3 minutes · answered once</p>
      </div>
    </main>
  )
}
