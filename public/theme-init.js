(() => {
  const storageKey = 'kinkatlas-theme'
  const allowed = new Set(['system', 'light', 'dark'])
  let preference = 'system'

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (allowed.has(stored)) preference = stored
  } catch {
    // A blocked preference store should never block the application.
  }

  const resolved = preference === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : preference
  const root = document.documentElement
  root.dataset.themePreference = preference
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
})()
