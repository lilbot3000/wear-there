/**
 * A very small router.
 *
 * The app is a handful of screens reached in a mostly linear order, so a
 * routing library would be more machinery than the job needs. This gives us
 * real URLs (so the browser's back button works, and /styleguide is
 * bookmarkable) in about thirty lines.
 */

import { useEffect, useState } from 'react'

function normalise(pathname) {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * Go to a path. `replace` swaps the current history entry instead of adding
 * one, which is what you want for redirects the user shouldn't be able to go
 * "back" into.
 */
export function navigate(path, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState({}, '', path)
  } else {
    window.history.pushState({}, '', path)
  }
  // pushState doesn't fire popstate, so tell our own listeners by hand.
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * Redirect to `to`, or do nothing when it's null.
 *
 * Navigating during render would update the router's state while another
 * component is still rendering, which React warns about. Doing it in an effect
 * keeps the redirect to the commit phase, where it belongs. Callers pass null
 * when no redirect is needed and return null themselves for the one frame
 * before it takes effect.
 */
export function useRedirect(to) {
  useEffect(() => {
    if (to) navigate(to, { replace: true })
  }, [to])
}

/** Current path plus query, re-rendering on navigation and on back/forward. */
export function useRoute() {
  const read = () => ({
    path: normalise(window.location.pathname),
    query: new URLSearchParams(window.location.search),
  })

  const [route, setRoute] = useState(read)

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])

  return route
}
