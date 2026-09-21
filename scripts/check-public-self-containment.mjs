import { collectPublicFileSurface } from './public-file-surface.mjs'

const surface = await collectPublicFileSurface()
const violations = []

surface.undeclaredFiles.forEach((file) => violations.push(`${surface.relativePath(file)}: local dependency is not declared in the public repository manifest`))
surface.missingFiles.forEach((path) => violations.push(`${path}: required public entrypoint is missing`))
surface.missingImports.forEach((path) => violations.push(`${path}: unresolved local import`))

if (violations.length) {
  console.error('Public file surface is not self-contained:')
  violations.forEach((violation) => console.error(`  ${violation}`))
  process.exitCode = 1
} else {
  console.log(`PASS: public file surface is self-contained (${surface.files.length} files traced).`)
}
