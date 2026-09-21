import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { collectPublicFileSurface } from './public-file-surface.mjs'
import {
  privateMaterialFileNamePattern,
  privateMaterialTextChecks,
} from './private-material-denylist.mjs'

const surface = await collectPublicFileSurface()
const textExtensions = new Set(['.css', '.html', '.js', '.jsx', '.json', '.md', '.mjs', '.ts', '.tsx', '.txt', '.xml', '.yml', '.yaml'])
const selfReferentialFiles = new Set([
  'scripts/private-material-denylist.mjs',
  'scripts/public-surface-scan.mjs',
])
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const localUserNames = [...new Set([process.env.USERNAME, process.env.USER]
  .filter((value) => typeof value === 'string' && value.length >= 3 && !/^(?:admin|root|user)$/i.test(value)))]
const additionalChecks = [
  { label: 'historical phase markers', pattern: /\bphase\s*\d+(?:\.\d+)?\b/gi },
  { label: 'local machine paths', pattern: /(?:[a-z]:[\\/](?:users|home)[\\/]|\/(?:users|home)\/)/gi },
  {
    label: 'local usernames',
    pattern: localUserNames.length ? new RegExp(`\\b(?:${localUserNames.map(escapePattern).join('|')})\\b`, 'gi') : /$a/gi,
  },
]
const checks = [...privateMaterialTextChecks, ...additionalChecks]
const counts = Object.fromEntries(checks.map((check) => [check.label, 0]))
const violations = []
let prohibitedFileNameCount = 0

for (const path of surface.files) {
  const file = surface.relativePath(path)
  if (privateMaterialFileNamePattern.test(file)) {
    prohibitedFileNameCount += 1
    violations.push(`${file}: source-branded filename`)
  }
  if (!textExtensions.has(extname(path).toLocaleLowerCase('en-US')) || selfReferentialFiles.has(file)) continue
  const content = await readFile(path, 'utf8')
  for (const check of checks) {
    check.pattern.lastIndex = 0
    const matches = content.match(check.pattern) ?? []
    counts[check.label] += matches.length
    if (matches.length) violations.push(`${file}: ${check.label} (${matches.length})`)
  }
}

if (violations.length) {
  console.error('Public file surface contains prohibited private or local material:')
  violations.forEach((violation) => console.error(`  ${violation}`))
  process.exitCode = 1
} else {
  console.log(`PASS: ${surface.files.length} public-surface files contain no prohibited material.`)
  Object.entries(counts).forEach(([label, count]) => console.log(`${label}: ${count}`))
  console.log(`source-branded filenames: ${prohibitedFileNameCount}`)
}
