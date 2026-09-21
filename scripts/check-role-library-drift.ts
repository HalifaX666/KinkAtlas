import { readFile } from 'node:fs/promises'
import { generateRoleLibrary, roleLibraryRuntimePath } from './role-library-pipeline'

const generated = await generateRoleLibrary()
const checkedIn = await readFile(roleLibraryRuntimePath, 'utf8')

if (checkedIn !== generated.serialized) {
  console.error(
    'Role-library drift detected. Regenerate src/data/role-library/role-library.json from the neutral source dataset.',
  )
  process.exitCode = 1
} else {
  console.log(
    `PASS: role-library runtime matches its neutral source (${generated.roleCount} roles, ` +
      `${generated.definitionCount} definitions, ${generated.unavailableCount} unavailable).`,
  )
}
