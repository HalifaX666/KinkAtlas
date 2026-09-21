import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildRobots, buildSitemap, indexableRoutes, normalizeSiteUrl } from '../../scripts/generate-site-metadata.mjs'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('launch deployment metadata', () => {
  it('keeps the SPA deployment and applies restrictive compatible headers', () => {
    const config = read('netlify.toml')
    expect(config).toContain('command = "npm run build"')
    expect(config).toContain('publish = "dist"')
    expect(config).toMatch(/from = "\/\*"[\s\S]*to = "\/index\.html"[\s\S]*status = 200/)
    for (const header of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security', 'X-Frame-Options']) expect(config).toContain(header)
    expect(config).toContain("connect-src 'self'")
    expect(config).not.toMatch(/connect-src[^\n]*\*/)
    expect(config).toContain("script-src 'self'")
    expect(config).toContain("style-src 'self' 'unsafe-inline'")
    expect(config).toContain("img-src 'self' data: blob:")
    expect(config).toContain("frame-ancestors 'none'")
    expect(config).toMatch(/for = "\/results"[\s\S]*X-Robots-Tag = "noindex, nofollow"/)
    expect(config).toMatch(/for = "\/roles\/\*"[\s\S]*X-Robots-Tag = "noindex, follow"/)
  })

  it('provides complete non-sensitive base and social metadata', () => {
    const html = read('index.html')
    for (const value of ['lang="en"', 'charset="UTF-8"', 'name="viewport"', 'name="theme-color"', 'name="description"', 'property="og:title"', 'property="og:description"', 'property="og:type"', 'property="og:site_name"', 'property="og:image"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"', 'href="/favicon.svg"']) expect(html).toContain(value)
    expect(html).toContain('content="summary_large_image"')
    expect(html).not.toMatch(/assessment result|role recommendation|https?:\/\/localhost/i)
  })

  it('keeps crawl rules public without exposing internal paths', () => {
    expect(read('public/robots.txt')).toBe('User-agent: *\nAllow: /\n')
    expect(buildRobots(undefined)).toBe('User-agent: *\nAllow: /\n')
    expect(buildRobots('https://example.test')).toContain('Sitemap: https://example.test/sitemap.xml')
  })

  it('generates a valid domain-bound sitemap containing only intended routes', () => {
    const sitemap = buildSitemap('https://example.test')
    expect(indexableRoutes).toEqual(['/', '/about', '/faq', '/contact', '/philosophy', '/terms', '/assessment'])
    for (const route of indexableRoutes) expect(sitemap).toContain(`<loc>https://example.test${route}</loc>`)
    expect(sitemap).not.toMatch(/\/results|\/roles\//)
    expect(normalizeSiteUrl('https://example.test/')).toBe('https://example.test')
    expect(normalizeSiteUrl('http://localhost:5173')).toBeUndefined()
    expect(normalizeSiteUrl('https://example.test/path')).toBeUndefined()
  })

  it('ships the expected favicon and 1200 by 630 social preview', () => {
    expect(read('public/favicon.svg')).toMatch(/<svg[\s\S]*KinkAtlas compass/)
    const image = readFileSync(resolve(process.cwd(), 'public/social-preview.png'))
    expect(image.toString('ascii', 1, 4)).toBe('PNG')
    expect(image.readUInt32BE(16)).toBe(1200)
    expect(image.readUInt32BE(20)).toBe(630)
  })

  it('runs all required CI checks without deployment credentials', () => {
    const workflow = read('.github/workflows/ci.yml')
    for (const command of ['npm ci', 'npm run typecheck', 'npm test', 'npm run role-library:check', 'npm run build', 'npm run calibrate', 'npm run production-boundary', 'npm run public-self-containment', 'npm run public-surface:check', 'npm run secrets:check']) expect(workflow).toContain(command)
    expect(workflow).toContain('node-version: 22')
    expect(workflow).toContain('pull_request:')
    expect(workflow).not.toMatch(/deploy|upload-artifact|\$\{\{\s*secrets\./i)
  })
})
