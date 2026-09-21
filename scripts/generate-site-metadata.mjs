import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const indexableRoutes = ['/', '/about', '/faq', '/contact', '/philosophy', '/assessment']

export function normalizeSiteUrl(value) {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) return undefined
    return url.origin
  } catch {
    return undefined
  }
}

export function buildRobots(siteUrl) {
  return `User-agent: *\nAllow: /${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml` : ''}\n`
}

export function buildSitemap(siteUrl) {
  const entries = indexableRoutes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

export function writeSiteMetadata({ distDirectory = resolve('dist'), siteUrlValue = process.env.VITE_SITE_URL } = {}) {
  if (!existsSync(distDirectory)) throw new Error(`Build output does not exist: ${distDirectory}`)
  const siteUrl = normalizeSiteUrl(siteUrlValue)
  writeFileSync(resolve(distDirectory, 'robots.txt'), buildRobots(siteUrl), 'utf8')

  if (!siteUrl) {
    console.warn('VITE_SITE_URL is not configured; canonical URL, og:url, sitemap.xml, and the robots sitemap directive were intentionally omitted.')
    return { siteUrl: undefined, sitemapWritten: false }
  }

  writeFileSync(resolve(distDirectory, 'sitemap.xml'), buildSitemap(siteUrl), 'utf8')
  const indexPath = resolve(distDirectory, 'index.html')
  const html = readFileSync(indexPath, 'utf8')
    .replace('<!-- site-url-metadata -->', `<link rel="canonical" href="${siteUrl}/" />\n    <meta property="og:url" content="${siteUrl}/" />`)
    .replaceAll('content="/social-preview.png"', `content="${siteUrl}/social-preview.png"`)
  writeFileSync(indexPath, html, 'utf8')
  console.log(`Generated canonical metadata and sitemap for ${siteUrl}.`)
  return { siteUrl, sitemapWritten: true }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined
if (invokedPath === import.meta.url) writeSiteMetadata({ distDirectory: resolve(fileURLToPath(new URL('../dist/', import.meta.url))) })
