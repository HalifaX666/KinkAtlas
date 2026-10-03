import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const allowedExternalTokens = new Set()

export function analyzeCssCustomProperties(sources, allowedTokens = allowedExternalTokens) {
  const definitions = new Set()
  const references = []

  for (const { file, css } of sources) {
    for (const match of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) definitions.add(match[1])
    for (const match of css.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(,)?/g)) {
      references.push({ file, token: match[1], hasFallback: Boolean(match[2]) })
    }
  }

  const undefinedReferences = references.filter(({ token }) => !definitions.has(token) && !allowedTokens.has(token))
  return { definitions, references, undefinedReferences }
}

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return cssFiles(target)
    return entry.isFile() && entry.name.endsWith('.css') ? [target] : []
  }))
  return nested.flat()
}

export async function checkDesignTokens(rootDirectory) {
  const styleRoot = path.join(rootDirectory, 'src', 'styles')
  const files = await cssFiles(styleRoot)
  const sources = await Promise.all(files.map(async (file) => ({ file: path.relative(rootDirectory, file), css: await readFile(file, 'utf8') })))
  return analyzeCssCustomProperties(sources)
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const result = await checkDesignTokens(process.cwd())
  if (result.undefinedReferences.length) {
    console.error('Undefined CSS custom properties:')
    result.undefinedReferences.forEach(({ file, token, hasFallback }) => console.error(`- ${token} in ${file}${hasFallback ? ' (fallback present)' : ''}`))
    process.exitCode = 1
  } else {
    console.log(`PASS: ${result.references.length} CSS custom-property references resolve to ${result.definitions.size} defined design tokens.`)
  }
}
