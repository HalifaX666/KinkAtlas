import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const repositoryRoot = resolve(process.cwd())
const roleLibrary = JSON.parse(readFileSync(resolve(repositoryRoot, 'src/data/role-library/role-library.json'), 'utf8'))

export function publicRoleSlug(role) {
  return role.label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const publicRoleRecords = roleLibrary.roles.map((role) => ({
  ...role,
  slug: publicRoleSlug(role),
}))

export const publicRoleRoutes = publicRoleRecords.map((role) => `/roles/${role.slug}`)

if (new Set(publicRoleRoutes).size !== publicRoleRoutes.length) {
  throw new Error('Public role routes contain duplicate slugs.')
}

export function roleMetadataDescription(role) {
  const definition = role.definition?.trim()
  if (!definition) return `Explore ${role.label} as role vocabulary for reflection. A role label never assigns identity or implies consent.`
  if (definition.length <= 180) return definition
  return `${definition.slice(0, 177).replace(/\s+\S*$/, '').trimEnd()}...`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceMeta(html, attribute, key, content) {
  const expression = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/?>`, 'i')
  if (!expression.test(html)) throw new Error(`Missing ${attribute} metadata: ${key}`)
  return html.replace(expression, `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`)
}

function publicDocument(baseHtml, { title, description, canonicalPath, ogType = 'website', body }, siteUrl) {
  let html = baseHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  html = replaceMeta(html, 'name', 'description', description)
  html = replaceMeta(html, 'name', 'robots', 'index, follow')
  html = replaceMeta(html, 'property', 'og:title', title)
  html = replaceMeta(html, 'property', 'og:description', description)
  html = replaceMeta(html, 'property', 'og:type', ogType)
  html = replaceMeta(html, 'name', 'twitter:title', title)
  html = replaceMeta(html, 'name', 'twitter:description', description)

  const canonicalUrl = siteUrl ? `${siteUrl}${canonicalPath === '/' ? '/' : canonicalPath}` : undefined
  html = html.replace('<!-- site-url-metadata -->', canonicalUrl
    ? `<link rel="canonical" href="${canonicalUrl}" />\n    <meta property="og:url" content="${canonicalUrl}" />`
    : '')
  if (siteUrl) html = html.replaceAll('content="/social-preview.png"', `content="${siteUrl}/social-preview.png"`)
  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

function roleLibraryBody() {
  const links = publicRoleRecords.map((role) => `<li><a href="/roles/${role.slug}">${escapeHtml(role.label)}</a></li>`).join('')
  return `<main><header><p>Role Library</p><h1>Explore the language of kink.</h1><p>Browse reviewed role vocabulary without taking the assessment. Opening a role never assigns it to you.</p></header><nav aria-label="Role Library entries"><ul>${links}</ul></nav></main>`
}

function roleBody(role) {
  const familyLabels = role.familyIds.map((id) => roleLibrary.families[id]).filter(Boolean)
  const family = familyLabels.length ? `<p>${escapeHtml(familyLabels.join(' · '))}</p>` : ''
  return `<main><nav aria-label="Role page navigation"><a href="/roles">Back to Role Library</a></nav><article>${family}<h1>${escapeHtml(role.label)}</h1><p>${escapeHtml(role.definition)}</p><p>A role can be useful language without becoming your identity, and no role implies consent.</p></article></main>`
}

export function buildRoleLibraryHtml(baseHtml, siteUrl) {
  return publicDocument(baseHtml, {
    title: 'Role Library | KinkAtlas',
    description: 'Browse kink and BDSM role vocabulary with reviewed definitions, related terms, and clear assessment boundaries.',
    canonicalPath: '/roles',
    body: roleLibraryBody(),
  }, siteUrl)
}

export function buildRolePageHtml(baseHtml, role, siteUrl) {
  return publicDocument(baseHtml, {
    title: `${role.label} | KinkAtlas`,
    description: roleMetadataDescription(role),
    canonicalPath: `/roles/${role.slug ?? publicRoleSlug(role)}`,
    ogType: 'article',
    body: roleBody(role),
  }, siteUrl)
}

function writeHtml(path, html) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, html, 'utf8')
}

export function writePublicRolePages({ baseHtml, distDirectory, siteUrl }) {
  writeHtml(resolve(distDirectory, 'roles/index.html'), buildRoleLibraryHtml(baseHtml, siteUrl))
  publicRoleRecords.forEach((role) => {
    writeHtml(resolve(distDirectory, 'roles', role.slug, 'index.html'), buildRolePageHtml(baseHtml, role, siteUrl))
  })
  return publicRoleRecords.length
}
