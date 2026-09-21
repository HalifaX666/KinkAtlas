import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollRestoration() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    let targetId = ''
    try {
      targetId = hash ? decodeURIComponent(hash.slice(1)) : ''
    } catch {
      targetId = ''
    }
    const target = targetId ? document.getElementById(targetId) : null
    if (target?.scrollIntoView) {
      target.scrollIntoView({ block: 'start' })
      return
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}
