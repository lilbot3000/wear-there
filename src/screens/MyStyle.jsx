import { useEffect, useState } from 'react'

import { navigate, useRedirect } from '../lib/router.js'
import { isProfileComplete, isStorageAvailable, loadProfile } from '../lib/profile.js'
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
  const [storageWorks] = useState(isStorageAvailable)

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
            ? 'That is the only time you will answer these. Planning a trip and getting your packing list comes next.'
            : 'Tap anything to change it. Your next packing list picks the change up straight away.'}
        </p>
      </header>

      {/* A silent failure here would look exactly like a successful save until
          the next reload, so say it plainly instead. */}
      {!storageWorks ? (
        <div className="card style-screen__warning">
          <b>This browser is not letting us save.</b>
          <div className="text-secondary">
            Your answers will work for now but disappear when you close the tab.
            Private browsing is the usual cause — try a normal window.
          </div>
        </div>
      ) : null}

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
        <button type="button" className="button" onClick={() => navigate('/')}>
          Done
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
