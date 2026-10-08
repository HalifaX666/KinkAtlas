import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildRobots, buildSitemap, indexableRoutes, normalizeSiteUrl } from '../../scripts/generate-site-metadata.mjs'
import { buildRolePageHtml, publicRoleRecords, publicRoleRoutes, writePublicRolePages } from '../../scripts/public-role-pages.mjs'
import { roleLibrarySlug } from '../taxonomy/roleLibrarySlugs'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('launch deployment metadata', () => {
  it('keeps the SPA deployment and applies restrictive compatible headers', () => {
    const config = read('netlify.toml')
    expect(config).toContain('command = "npm run build"')
    expect(config).toContain('publish = "dist"')
    expect(config).toMatch(/from = "\/roles"[\s\S]*to = "\/roles\/index\.html"[\s\S]*status = 200/)
    expect(config).toMatch(/from = "\/roles\/:role"[\s\S]*to = "\/roles\/:role\/index\.html"[\s\S]*status = 200/)
    expect(config).toMatch(/from = "\/\*"[\s\S]*to = "\/index\.html"[\s\S]*status = 200/)
    for (const header of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security', 'X-Frame-Options']) expect(config).toContain(header)
    expect(config).toContain("connect-src 'self'")
    expect(config).not.toMatch(/connect-src[^\n]*\*/)
    expect(config).toContain("script-src 'self'")
    expect(config).toContain("style-src 'self' 'unsafe-inline'")
    expect(config).toContain("img-src 'self' data: blob:")
    expect(config).toContain("frame-ancestors 'none'")
    expect(config).toMatch(/for = "\/results"[\s\S]*X-Robots-Tag = "noindex, nofollow"/)
    expect(config).not.toMatch(/for = "\/roles(?:\/\*)?"[\s\S]*X-Robots-Tag = "noindex/)
  })

  it('provides complete non-sensitive base and social metadata', () => {
    const html = read('index.html')
    for (const value of ['lang="en"', 'charset="UTF-8"', 'name="viewport"', 'name="theme-color"', 'name="description"', 'property="og:title"', 'property="og:description"', 'property="og:type"', 'property="og:site_name"', 'property="og:image"', 'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"', 'name="twitter:image"', 'href="/favicon.svg"']) expect(html).toContain(value)
    expect(html).toContain('content="summary_large_image"')
    expect(html).toContain('<!-- site-url-metadata -->')
    expect(html).toContain('content="/social-preview.png"')
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toMatch(/assessment result|role recommendation|https?:\/\/localhost/i)
  })

  it('keeps crawl rules public without exposing internal paths', () => {
    expect(read('public/robots.txt')).toBe('User-agent: *\nAllow: /\n')
    expect(buildRobots(undefined)).toBe('User-agent: *\nAllow: /\n')
    expect(buildRobots('https://example.test')).toContain('Sitemap: https://example.test/sitemap.xml')
  })

  it('generates a valid domain-bound sitemap containing every canonical public role route', () => {
    const sitemap = buildSitemap('https://example.test')
    expect(indexableRoutes).toEqual(['/', '/about', '/faq', '/contact', '/philosophy', '/terms', '/roles', '/assessment'])
    for (const route of indexableRoutes) expect(sitemap).toContain(`<loc>https://example.test${route}</loc>`)
    expect(publicRoleRoutes).toHaveLength(1107)
    expect(new Set(publicRoleRoutes).size).toBe(1107)
    expect(publicRoleRecords.every((role) => `/roles/${roleLibrarySlug(role)}` === `/roles/${role.slug}`)).toBe(true)
    for (const route of publicRoleRoutes) expect(sitemap).toContain(`<loc>https://example.test${route}</loc>`)
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(urls).toHaveLength(indexableRoutes.length + 1107)
    expect(new Set(urls).size).toBe(urls.length)
    expect(sitemap).not.toMatch(/\/results/)
    expect(normalizeSiteUrl('https://example.test/')).toBe('https://example.test')
    expect(normalizeSiteUrl('http://localhost:5173')).toBeUndefined()
    expect(normalizeSiteUrl('https://example.test/path')).toBeUndefined()
  })

  it('builds crawler-visible, escaped role HTML with safe optional canonical metadata', () => {
    const baseHtml = read('index.html')
    const dominant = publicRoleRecords.find((role) => role.label === 'Dominant')
    const html = buildRolePageHtml(baseHtml, dominant, 'https://example.test')

    expect(html).toContain('<title>Dominant | KinkAtlas</title>')
    expect(html).toContain('A Dominant is someone who takes negotiated authority')
    expect(html).toContain('<h1>Dominant</h1>')
    expect(html).toContain('content="article"')
    expect(html).toContain('rel="canonical" href="https://example.test/roles/dominant"')
    expect(html).toContain('property="og:url" content="https://example.test/roles/dominant"')
    expect(html).not.toMatch(/assessment answers|session state|localStorage|Your Kink Map/i)
    expect(buildRolePageHtml(baseHtml, dominant, 'https://example.test')).toBe(html)

    const escaped = buildRolePageHtml(baseHtml, {
      ...dominant,
      label: 'Rope & <"test">',
      slug: 'rope-test',
      definition: 'Uses <rope> & "quotes" without private data.',
    }, undefined)
    expect(escaped).toContain('<h1>Rope &amp; &lt;&quot;test&quot;&gt;</h1>')
    expect(escaped).toContain('Uses &lt;rope&gt; &amp; &quot;quotes&quot; without private data.')
    expect(escaped).not.toMatch(/undefined\/roles|rel="canonical"|property="og:url"/)
  })

  it('writes one deterministic clean-URL HTML file for every public role', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'kinkatlas-public-roles-'))
    try {
      const count = writePublicRolePages({
        baseHtml: read('index.html'),
        distDirectory: directory,
        siteUrl: 'https://example.test',
      })
      const roleDirectories = readdirSync(resolve(directory, 'roles'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
      expect(count).toBe(1107)
      expect(roleDirectories).toHaveLength(1107)
      expect(existsSync(resolve(directory, 'roles/index.html'))).toBe(true)
      expect(existsSync(resolve(directory, 'roles/dominant/index.html'))).toBe(true)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
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
    for (const command of ['npm ci', 'npm run typecheck', 'npm run lint', 'npm run styles:check', 'npm run test:coverage', 'npm run role-library:check', 'npm run build', 'npm run calibrate', 'npm run production-boundary', 'npm run public-self-containment', 'npm run public-surface:check', 'npm run secrets:check', 'npx playwright install --with-deps chromium firefox webkit', 'npm run test:e2e:ci']) expect(workflow).toContain(command)
    expect(workflow).toContain('node-version: 22')
    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('uses: actions/upload-artifact@v4')
    expect(workflow).toContain('name: vitest-coverage')
    expect(workflow).toContain('path: coverage/')
    expect(workflow).toContain('name: playwright-failure-artifacts')
    expect(workflow).toContain('test-results/')
    expect(workflow).not.toMatch(/\bdeploy\b|\$\{\{\s*secrets\./i)
  })
})
