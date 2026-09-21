import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { collectPublicFileSurface } from './public-file-surface.mjs'

const surface = await collectPublicFileSurface()
const textExtensions = new Set(['.css', '.env', '.html', '.js', '.jsx', '.json', '.md', '.mjs', '.ts', '.tsx', '.txt', '.xml', '.yml', '.yaml'])
const checks = [
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { label: 'cloud access key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: 'repository access token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { label: 'service token', pattern: /\b(?:xox[baprs]-[A-Za-z0-9-]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,})\b/g },
  {
    label: 'assigned credential',
    pattern:
      /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|client[_-]?secret|smtp[_-]?(?:password|token))\b\s*[:=]\s*["'`][^"'`\r\n]{12,}["'`]/gi,
  },
]
const findings = []

for (const path of surface.files) {
  if (!textExtensions.has(extname(path).toLocaleLowerCase('en-US'))) continue
  const content = await readFile(path, 'utf8')
  for (const check of checks) {
    check.pattern.lastIndex = 0
    if (check.pattern.test(content)) findings.push(`${surface.relativePath(path)}: ${check.label}`)
  }
}

if (findings.length) {
  console.error('Potential secrets detected on the public file surface (values suppressed):')
  findings.forEach((finding) => console.error(`  ${finding}`))
  process.exitCode = 1
} else {
  console.log(`PASS: no secrets detected across ${surface.files.length} public-surface files.`)
}
