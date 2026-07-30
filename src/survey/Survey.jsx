import { useEffect, useState } from 'react'

import { fetchHomeClimate } from '../lib/climate.js'
import { navigate, useRedirect } from '../lib/router.js'
import { EMPTY_PROFILE, loadProfile, saveProfile } from '../lib/profile.js'
import { QUESTIONS, TOTAL_STEPS, sliderRange } from './questions.js'
import { CityInput, ChoiceInput, MultiInput, ScaleInput, SliderInput } from './inputs.jsx'

import './Survey.css'

/**
 * The survey (S2 in the UX spec).
 *
 * One question per screen, saved to localStorage the moment it changes rather
 * than on a submit at the end — so abandoning halfway loses nothing, and the
 * "My style" screen can jump straight to any step to edit it.
 */
export default function Survey({ step }) {
  const [profile, setProfile] = useState(() => loadProfile() ?? EMPTY_PROFILE)
  const climate = useHomeClimate(profile.home)

  const index = step - 1
  const question = QUESTIONS[index]
  const isLast = step === TOTAL_STEPS

  // A slider is never really "unanswered": it opens on a sensible default, so
  // commit that immediately rather than letting someone leave it null by
  // sliding to the value it already shows.
  useEffect(() => {
    if (!question || question.type !== 'slider') return

    const range = sliderRange(question, profile)
    const current = profile[question.field]
    const next =
      current == null
        ? question.fallback
        : Math.min(range.max, Math.max(range.min, current))

    if (next !== current) {
      setProfile(saveProfile({ ...profile, [question.field]: next }))
    }
  }, [question, profile])

  useRedirect(question ? null : '/survey/1')
  if (!question) return null

  const value = profile[question.field]

  const update = (fieldValue) => {
    setProfile(saveProfile({ ...profile, [question.field]: fieldValue }))
  }

  // Multi-selects may legitimately be empty; the rest need a real answer
  // before moving on, since we would otherwise be guessing on their behalf.
  const canContinue = question.type === 'multi' || question.type === 'slider'
    ? true
    : value !== null && value !== undefined

  const goBack = () => {
    if (step === 1) navigate('/')
    else navigate(`/survey/${step - 1}`)
  }

  const goNext = () => {
    if (isLast) navigate('/style?saved=1')
    else navigate(`/survey/${step + 1}`)
  }

  return (
    <main className="survey">
      <div className="progress" aria-hidden="true">
        <div
          className="progress__fill"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <p className="micro-label survey__step">
        Step {step} of {TOTAL_STEPS}
      </p>

      <h1 className="heading survey__question">{question.question}</h1>
      {question.help ? <p className="survey__help">{question.help}</p> : null}

      <div className="survey__answer">
        <QuestionInput
          question={question}
          profile={profile}
          value={value}
          climate={climate}
          onChange={update}
        />
      </div>

      <div className="survey__actions">
        <button type="button" className="survey__back" onClick={goBack}>
          ← Back
        </button>
        <button
          type="button"
          className="button button--inline"
          disabled={!canContinue}
          onClick={goNext}
        >
          {isLast ? 'Save my style' : 'Next'}
        </button>
      </div>
    </main>
  )
}

function QuestionInput({ question, profile, value, climate, onChange }) {
  switch (question.type) {
    case 'city':
      return <CityInput value={value} onChange={onChange} />
    case 'choice':
      return <ChoiceInput question={question} value={value} onChange={onChange} />
    case 'multi':
      return <MultiInput question={question} value={value} onChange={onChange} />
    case 'scale':
      return <ScaleInput question={question} value={value} onChange={onChange} />
    case 'slider':
      return (
        <SliderInput
          question={question}
          value={value}
          range={sliderRange(question, profile)}
          climate={climate}
          onChange={onChange}
        />
      )
    default:
      return null
  }
}

/**
 * The home city's typical temperatures, fetched once home is known.
 *
 * The lookup starts the moment a home city exists — usually on step 1 — so by
 * the time someone reaches the sliders on steps 3 and 4 it has already landed
 * and the benchmark line appears instantly. Errors are swallowed: the
 * benchmark is an aid, not a requirement, and the slider works without it.
 */
function useHomeClimate(home) {
  const [climate, setClimate] = useState(null)

  useEffect(() => {
    if (!home) {
      setClimate(null)
      return undefined
    }

    const controller = new AbortController()
    fetchHomeClimate(home, { signal: controller.signal })
      .then((result) => setClimate(result))
      .catch(() => {})

    return () => controller.abort()
  }, [home])

  return climate
}
