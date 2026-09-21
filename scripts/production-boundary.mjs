import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import {
  privateMaterialFileNamePattern,
  privateMaterialTextChecks,
} from './private-material-denylist.mjs'

const outputDirectory = resolve('dist')
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.svg', '.txt', '.xml'])

async function filesUnder(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry)
    if ((await stat(path)).isDirectory()) files.push(...(await filesUnder(path)))
    else files.push(path)
  }
  return files
}

let files
try {
  files = await filesUnder(outputDirectory)
} catch (error) {
  if (error && typeof error === 'object' && error.code === 'ENOENT') {
    console.error('Production output is missing. Run the production build before the boundary check.')
    process.exit(1)
  }
  throw error
}

const counts = Object.fromEntries(privateMaterialTextChecks.map((check) => [check.label, 0]))
const violations = []
let prohibitedFileNameCount = 0

for (const path of files) {
  const file = relative(outputDirectory, path).replaceAll('\\', '/')
  if (privateMaterialFileNamePattern.test(file)) {
    prohibitedFileNameCount += 1
    violations.push(`${file}: source-branded asset filename`)
  }
  if (!textExtensions.has(extname(path).toLocaleLowerCase('en-US'))) continue
  const content = await readFile(path, 'utf8')
  for (const check of privateMaterialTextChecks) {
    check.pattern.lastIndex = 0
    const matches = content.match(check.pattern) ?? []
    counts[check.label] += matches.length
    if (matches.length) violations.push(`${file}: ${check.label} (${matches.length})`)
  }
}

if (violations.length) {
  console.error('Production output contains prohibited private material:')
  violations.forEach((violation) => console.error(`  ${violation}`))
  process.exitCode = 1
} else {
  console.log(`PASS: ${files.length} production files contain no prohibited private material.`)
  Object.entries(counts).forEach(([label, count]) => console.log(`${label}: ${count}`))
  console.log(`source-branded asset filenames: ${prohibitedFileNameCount}`)
}
