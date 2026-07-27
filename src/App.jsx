import StyleGuide from './screens/StyleGuide.jsx'
import Welcome from './screens/Welcome.jsx'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

export default function App() {
  // Minimal routing. The app is one linear flow, so a router library isn't
  // warranted yet; Phase 3 grows this as real screens arrive.
  const path = window.location.pathname.replace(/\/+$/, '')

  // Development-only design system reference, not linked from the app.
  if (path === '/styleguide') {
    return <StyleGuide />
  }

  return (
    <div className="app-shell">
      <Welcome />
    </div>
  )
}
