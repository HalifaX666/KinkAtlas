import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']
const importPattern = /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

const repositoryManifestPath = resolve(projectRoot, 'config/public-repository-files.json')

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return false
    throw error
  }
}

async function filesUnder(directory) {
  if (!(await exists(directory))) return []
  const files = []
  for (const entry of await readdir(directory)) {
    const path = resolve(directory, entry)
    if ((await stat(path)).isDirectory()) files.push(...(await filesUnder(path)))
    else files.push(path)
  }
  return files
}

async function resolveImport(importer, specifier) {
  if (!specifier.startsWith('.')) return undefined
  const candidate = resolve(dirname(importer), specifier.split('?')[0])
  for (const extension of sourceExtensions) {
    const path = `${candidate}${extension}`
    if ((await exists(path)) && !(await stat(path)).isDirectory()) return path
  }
  for (const extension of sourceExtensions.slice(1)) {
    const path = resolve(candidate, `index${extension}`)
    if (await exists(path)) return path
  }
  return null
}

function relativePath(path) {
  return relative(projectRoot, path).replaceAll('\\', '/')
}

function isSourceModule(path) {
  return new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']).has(extname(path).toLocaleLowerCase('en-US'))
}

export async function collectPublicFileSurface() {
  const repositoryManifest = JSON.parse(await readFile(repositoryManifestPath, 'utf8'))
  if (!Array.isArray(repositoryManifest) || repositoryManifest.some((file) => typeof file !== 'string' || !file.length)) {
    throw new Error('config/public-repository-files.json must contain an array of non-empty file paths.')
  }
  if (new Set(repositoryManifest).size !== repositoryManifest.length) {
    throw new Error('config/public-repository-files.json must not contain duplicate paths.')
  }
  if (!repositoryManifest.includes('config/public-repository-files.json')) {
    throw new Error('config/public-repository-files.json must include itself.')
  }
  const invalidPaths = repositoryManifest.filter((file) => file.includes('\\') || file.startsWith('/') || file.split('/').includes('..'))
  if (invalidPaths.length) throw new Error(`Public repository manifest contains invalid paths: ${invalidPaths.join(', ')}`)

  const manifestFiles = new Set(repositoryManifest.map((file) => resolve(projectRoot, file)))
  const initialFiles = [...manifestFiles]

  const files = new Set()
  const dependencyFiles = new Set()
  const missingFiles = []
  const missingImports = []
  const queue = []

  for (const path of initialFiles) {
    if (await exists(path)) {
      files.add(path)
      if (isSourceModule(path)) queue.push(path)
    } else {
      missingFiles.push(relativePath(path))
    }
  }

  while (queue.length) {
    const importer = queue.shift()
    const content = await readFile(importer, 'utf8')
    importPattern.lastIndex = 0
    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1] ?? match[2]
      const dependency = await resolveImport(importer, specifier)
      if (dependency === null) {
        missingImports.push(`${relativePath(importer)} -> ${specifier}`)
      } else if (dependency) {
        dependencyFiles.add(dependency)
        if (!files.has(dependency)) {
          files.add(dependency)
          if (isSourceModule(dependency)) queue.push(dependency)
        }
      }
    }
  }

  return {
    projectRoot,
    files: [...files].sort((left, right) => relativePath(left).localeCompare(relativePath(right))),
    dependencyFiles,
    undeclaredFiles: [...files].filter((file) => !manifestFiles.has(file)),
    missingFiles,
    missingImports,
    relativePath,
  }
}
