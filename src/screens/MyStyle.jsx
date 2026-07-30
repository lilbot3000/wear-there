import { useEffect, useState } from 'react'

import { navigate, useRedirect } from '../lib/router.js'
import { isProfileComplete, loadProfile } from '../lib/profile.js'
import { QUESTIONS } from '../survey/questions.js'

import './MyStyle.css'

/**
 * S7 · My style.
 *
 * Doubles as the "Your style, saved" confirmation at the end of the survey
 * (?saved=1) and as the permanent place to review and edit answers. Every row
 * jumps back to its own survey step, so editing one answer never means
 * re-running the whole thing.
 */
export default function MyStyle({ justSaved }) {
  const [profile, setProfile] = useState(() => loadProfile())

  // Re-read on return from an edit, since the survey writes straight to
  // storage rather than passing state back up.
  useEffect(() => {
    const refresh = () => setProfile(loadProfile())
    window.addEventListener('popstate', refresh)
    return () => window.removeEventListener('popstate', refresh)
  }, [])

  // Nothing saved yet means someone landed here directly; send them to the
  // survey rather than showing an empty summary.
  useRedirect(profile ? null : '/survey/1')
  if (!profile) return null

  const complete = isProfileComplete(profile)

  return (
    <main className="style-screen">
      <header className="style-screen__header">
        <h1 className="heading heading--screen">
          {justSaved ? 'Your style, saved' : 'My style'}
        </h1>
        <p className="style-screen__intro">
          {justSaved
            ? 'That is the only time you will answer these. Every trip from here is built on them.'
            : 'Tap anything to change it. Your next packing list picks the change up straight away.'}
        </p>
      </header>

      {!complete ? (
        <div className="card style-screen__unfinished">
          <div>
            <b>A few answers are still missing.</b>
            <div className="text-secondary">
              Packing lists need the full picture to feel right.
            </div>
          </div>
          <button
            type="button"
            className="pill"
            onClick={() => navigate(`/survey/${firstUnansweredStep(profile)}`)}
          >
            Finish
          </button>
        </div>
      ) : null}

      <ul className="style-list">
        {QUESTIONS.map((question, index) => (
          <li key={question.id}>
            <button
              type="button"
              className="style-row"
              onClick={() => navigate(`/survey/${index + 1}`)}
            >
              <span className="style-row__text">
                <span className="micro-label">{question.label}</span>
                <span className="style-row__value">
                  {question.summary(profile[question.field])}
                </span>
              </span>
              <span className="style-row__chevron" aria-hidden="true">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="style-screen__actions">
        {/* Planning a trip arrives in Phase 4; until then this is the way back. */}
        <button type="button" className="button" onClick={() => navigate('/')}>
          Back to start
        </button>
      </div>
    </main>
  )
}

function firstUnansweredStep(profile) {
  const index = QUESTIONS.findIndex((question) => {
    const value = profile[question.field]
    if (question.type === 'multi') return !Array.isArray(value)
    return value === null || value === undefined
  })
  return index === -1 ? 1 : index + 1
}
