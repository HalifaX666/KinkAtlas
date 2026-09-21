import { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { roleById } from '../data/roles'

export const baseDescription = 'KinkAtlas is a private, rules-based self-reflection tool for exploring kink interests, roles, boundaries, and vocabulary without storing your assessment data.'

interface RouteMetadata {
  title: string
  description: string
  robots: 'index, follow' | 'noindex, follow' | 'noindex, nofollow'
  canonicalPath?: string
}

const publicRoutes: Record<string, RouteMetadata> = {
  '/': { title: 'KinkAtlas — Explore your kink vocabulary', description: baseDescription, robots: 'index, follow', canonicalPath: '/' },
  '/about': { title: 'About KinkAtlas', description: 'Learn how KinkAtlas keeps role alignment, reflection, boundaries, readiness, and consent distinct.', robots: 'index, follow', canonicalPath: '/about' },
  '/faq': { title: 'KinkAtlas FAQ', description: 'Clear answers about KinkAtlas results, privacy, role vocabulary, boundaries, consent, and reflection.', robots: 'index, follow', canonicalPath: '/faq' },
  '/contact': { title: 'Contact — KinkAtlas', description: 'Contact KinkAtlas for questions, feedback, bug reports, accessibility issues, privacy questions, or collaboration inquiries.', robots: 'index, follow', canonicalPath: '/contact' },
  '/philosophy': { title: 'Consent philosophy — KinkAtlas', description: 'Read the consent principles that guide KinkAtlas and keep roles, interests, compatibility, and consent separate.', robots: 'index, follow', canonicalPath: '/philosophy' },
  '/assessment': { title: 'Explore — KinkAtlas', description: 'Explore kink interests, dynamics, boundaries, and role vocabulary through a private, rules-based assessment.', robots: 'index, follow', canonicalPath: '/assessment' },
  '/results': { title: 'Your kink map — KinkAtlas', description: 'Review your private, in-session KinkAtlas reflection and vocabulary suggestions.', robots: 'noindex, nofollow' },
}

export function metadataForPath(pathname: string): RouteMetadata {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const knownRoute = publicRoutes[normalizedPath]
  if (knownRoute) return knownRoute

  const roleMatch = matchPath('/roles/:roleId', normalizedPath)
  if (roleMatch?.params.roleId) {
    const role = roleById[roleMatch.params.roleId]
    if (role) return {
      title: `${role.name} — KinkAtlas`,
      description: `Explore ${role.name} as role vocabulary for reflection. A role label never assigns identity or implies consent.`,
      robots: 'noindex, follow',
    }
  }

  return { title: 'Page not found — KinkAtlas', description: 'This KinkAtlas page could not be found.', robots: 'noindex, nofollow' }
}

function configuredSiteOrigin() {
  const value = import.meta.env.VITE_SITE_URL?.trim()
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash ? url.origin : undefined
  } catch {
    return undefined
  }
}

function setNamedMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.append(element)
  }
  element.content = content
}

function setPropertyMeta(property: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    document.head.append(element)
  }
  element.content = content
}

export function DocumentMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const metadata = metadataForPath(pathname)
    const siteOrigin = configuredSiteOrigin()
    const canonicalUrl = siteOrigin && metadata.canonicalPath ? new URL(metadata.canonicalPath, siteOrigin).href : undefined
    const socialImage = siteOrigin ? new URL('/social-preview.png', siteOrigin).href : '/social-preview.png'

    document.title = metadata.title
    setNamedMeta('description', metadata.description)
    setNamedMeta('robots', metadata.robots)
    setPropertyMeta('og:title', metadata.title)
    setPropertyMeta('og:description', metadata.description)
    setPropertyMeta('og:type', 'website')
    setPropertyMeta('og:site_name', 'KinkAtlas')
    setPropertyMeta('og:image', socialImage)
    setNamedMeta('twitter:card', 'summary_large_image')
    setNamedMeta('twitter:title', metadata.title)
    setNamedMeta('twitter:description', metadata.description)
    setNamedMeta('twitter:image', socialImage)

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.append(canonical)
      }
      canonical.href = canonicalUrl
      setPropertyMeta('og:url', canonicalUrl)
    } else {
      canonical?.remove()
      document.querySelector('meta[property="og:url"]')?.remove()
    }
  }, [pathname])

  return null
}
