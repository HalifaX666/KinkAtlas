import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const distRoot = resolve('dist')
const forbidden = [
  'KINKATLAS_E2E_PERSONA_HARNESS_V1',
  '__kinkatlas_e2e_persona',
  'balanced-authority-pattern',
  'multiple-hard-limits-pattern',
]

if (!existsSync(distRoot)) {
  console.error('Production bundle is missing. Run npm run build before the E2E smoke suite.')
  process.exit(1)
}

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

const bundleFiles = filesUnder(distRoot).filter((path) => /\.(?:css|html|js|json|map|txt|xml)$/i.test(path))
const findings = bundleFiles.flatMap((path) => {
  const content = readFileSync(path, 'utf8')
  return forbidden.filter((marker) => content.includes(marker)).map((marker) => `${path}: ${marker}`)
})

if (findings.length) {
  console.error('E2E persona harness leaked into the production bundle:')
  findings.forEach((finding) => console.error(`  ${finding}`))
  process.exit(1)
}

console.log(`PASS: production bundle excludes the E2E persona harness (${bundleFiles.length} files scanned).`)
