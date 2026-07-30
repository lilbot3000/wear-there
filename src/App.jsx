import MyStyle from './screens/MyStyle.jsx'
import StyleGuide from './screens/StyleGuide.jsx'
import Welcome from './screens/Welcome.jsx'
import Survey from './survey/Survey.jsx'
import { QUESTIONS, TOTAL_STEPS } from './survey/questions.js'
import { loadProfile } from './lib/profile.js'
import { useRedirect, useRoute } from './lib/router.js'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

export default function App() {
  const { path, query } = useRoute()

  // Development-only design system reference, full width and outside the
  // phone-sized shell.
  if (path === '/styleguide') {
    return <StyleGuide />
  }

  return (
    <div className="app-shell">
      <Screen path={path} query={query} />
    </div>
  )
}

function Screen({ path, query }) {
  if (path === '/style') {
    return <MyStyle justSaved={query.get('saved') === '1'} />
  }

  if (path === '/survey' || path.startsWith('/survey/')) {
    return <SurveyRoute path={path} />
  }

  return <Welcome />
}

/**
 * Steps live in the URL (/survey/3) so the browser's back button walks back
 * through the questions, and so "My style" can link straight to one.
 */
function SurveyRoute({ path }) {
  const step = Number.parseInt(path.slice('/survey/'.length), 10)
  const valid = Number.isInteger(step) && step >= 1 && step <= TOTAL_STEPS

  // A bare /survey resumes wherever you left off rather than restarting.
  // Anything out of range falls back to the first question.
  const redirectTo = path === '/survey'
    ? `/survey/${resumeStep()}`
    : valid
      ? null
      : '/survey/1'

  useRedirect(redirectTo)

  if (redirectTo) return null
  return <Survey step={step} />
}

function resumeStep() {
  const profile = loadProfile()
  if (!profile) return 1

  const index = QUESTIONS.findIndex((question) => {
    const value = profile[question.field]
    if (question.type === 'multi') return !Array.isArray(value)
    return value === null || value === undefined
  })

  return index === -1 ? 1 : index + 1
}
