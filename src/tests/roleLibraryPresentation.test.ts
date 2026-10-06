import { describe, expect, it } from 'vitest'
import { roleEmblemPrimaryGeometryFingerprint, roleEmblemRecipe, roleEmblemRecipeByRoleId, roleEmblemRecipes, type RoleEmblemCommand } from '../data/roleEmblems'
import { rolePresentations } from '../data/rolePresentation'
import { roles } from '../data/roles'
import { roleLibrary } from '../taxonomy/roleLibrary'
import { roleLibraryPath, roleLibraryRoleBySlug, roleLibraryRoleForScoredId, roleLibraryRoleForScoredRole, roleLibrarySlug, rolePathForScoredRole } from '../taxonomy/roleLibrarySlugs'

const PILOT_IDS = [
  'role:dominant-4cfaa6ab', 'role:submissive-70cf87f8', 'role:switch-39921a74',
  'role:top-d5cdfcf7', 'role:bottom-479ad21a', 'role:vers-1a60a8ce',
  'role:rigger-5d2f2d93', 'role:rope-bottom-f8a5d024', 'role:brat-19c33c26',
  'role:brat-tamer-e2e114dd', 'role:primal-predator-a89f810a',
  'role:primal-prey-544c0478', 'role:primal-switch-705db664',
  'role:pet-8f0d1b30', 'role:owner-4b1b8aa3',
]

describe('public role identity presentation', () => {
  it('resolves a distinct production emblem identity for all 812 roles', () => {
    const fingerprints = roleEmblemRecipes.map(roleEmblemPrimaryGeometryFingerprint)
    expect(roleEmblemRecipes).toHaveLength(812)
    expect(roleEmblemRecipeByRoleId.size).toBe(812)
    expect(new Set(roleEmblemRecipes.map((recipe) => recipe.identityKey)).size).toBe(812)
    expect(new Set(fingerprints).size).toBe(812)
    roleLibrary.roles.forEach((role) => {
      const recipe = roleEmblemRecipeByRoleId.get(role.id)
      expect(recipe, role.id).toBeDefined()
      expect(recipe?.roleId).toBe(role.id)
      expect(recipe?.commands.length).toBeGreaterThan(0)
      expect(recipe?.identityKey).toContain(role.id)
      expect(roleEmblemPrimaryGeometryFingerprint(roleEmblemRecipe(role.id))).toBe(roleEmblemPrimaryGeometryFingerprint(recipe!))
    })
  })

  it('fingerprints only normalized visible geometry and contains no catalog barcode', () => {
    const coordinatePairs = (command: RoleEmblemCommand): readonly (readonly [number, number])[] => {
      if (command.kind === 'line') return [command.from, command.to]
      if (command.kind === 'polyline') return command.points
      if (command.kind === 'circle') return [command.center]
      return [command.start, command.control1, command.control2, command.end]
    }
    roleEmblemRecipes.forEach((recipe) => {
      expect(roleEmblemPrimaryGeometryFingerprint(recipe)).not.toContain(recipe.roleId)
      recipe.commands.forEach((command) => {
        coordinatePairs(command).forEach(([x, y]) => {
          expect(x, recipe.roleId).toBeGreaterThanOrEqual(0)
          expect(x, recipe.roleId).toBeLessThanOrEqual(100)
          expect(y, recipe.roleId).toBeGreaterThanOrEqual(0)
          expect(y, recipe.roleId).toBeLessThanOrEqual(120)
        })
        if (command.kind === 'circle') expect(command.radius, recipe.roleId).toBeGreaterThan(0)
        const isOldCatalogTick = command.kind === 'line'
          && command.from[1] === 114
          && (command.to[1] === 107 || command.to[1] === 111)
        expect(isOldCatalogTick, recipe.roleId).toBe(false)
      })
    })
  })

  it('shares visual family DNA while preserving distinct role identities', () => {
    const recipes = ['Rigger', 'Rope Bottom', 'Rope Top', 'Rope Switch'].map((label) => {
      const role = roleLibrary.roles.find((candidate) => candidate.label === label)!
      return roleEmblemRecipeByRoleId.get(role.id)!
    })
    expect(new Set(recipes.map((recipe) => recipe.motif))).toEqual(new Set(['rope']))
    expect(new Set(recipes.map((recipe) => recipe.identityKey)).size).toBe(4)

    const primalRecipes = ['Primal Predator', 'Primal Prey', 'Primal Switch'].map((label) => {
      const role = roleLibrary.roles.find((candidate) => candidate.label === label)!
      return roleEmblemRecipeByRoleId.get(role.id)!
    })
    expect(new Set(primalRecipes.map((recipe) => recipe.familyKey)).size).toBe(1)
    expect(new Set(primalRecipes.map(roleEmblemPrimaryGeometryFingerprint)).size).toBe(3)
  })

  it.each([
    ['Alpha Woman', 'Anaconda', 'Antagonist', 'Antagonizer', 'Anthropologist', 'Apprentice', 'Archangel', 'Artist', 'Ashtray', 'Asswhore', 'Attention Seeker'],
    ['Alien', 'Anal Angel', 'Angel'],
    ['Alpha slave', 'Anal Master', 'Ass Master'],
    ['Anal Princess', 'Anal Slut', 'Anal Toy', 'Anal Whore', 'Attention Slut'],
  ])('keeps consecutive visually reviewed roles distinct without labels or metadata', (...labels) => {
    const fingerprints = labels.map((label) => {
      const role = roleLibrary.roles.find((candidate) => candidate.label === label)!
      return roleEmblemPrimaryGeometryFingerprint(roleEmblemRecipe(role))
    })
    expect(new Set(fingerprints).size).toBe(labels.length)
  })

  it('keeps the curated pilot complete, valid, and presentation-only', () => {
    const libraryIds = new Set(roleLibrary.roles.map((role) => role.id))
    expect(rolePresentations.map((entry) => entry.roleId)).toEqual(PILOT_IDS)
    expect(new Set(rolePresentations.map((entry) => entry.roleId)).size).toBe(rolePresentations.length)
    expect(new Set(rolePresentations.map((entry) => entry.emblem)).size).toBe(rolePresentations.length)
    rolePresentations.forEach((entry) => {
      expect(libraryIds.has(entry.roleId), entry.roleId).toBe(true)
      expect(entry.shortSummary.trim()).not.toBe('')
      expect(entry.meaning.trim()).not.toBe('')
      expect(entry.canLookLike.trim()).not.toBe('')
      expect(entry.notAutomatic.trim()).not.toBe('')
      expect(entry.attributes.length).toBeGreaterThanOrEqual(4)
      expect(entry.attributes.length).toBeLessThanOrEqual(6)
      expect(entry.attributes.every((attribute) => attribute.label.trim() && attribute.value.trim())).toBe(true)
      expect(entry).not.toHaveProperty('score')
      expect(entry).not.toHaveProperty('weight')
    })
  })

  it('leaves semantic taxonomy baselines unchanged', () => {
    expect(roleLibrary.roles).toHaveLength(812)
    expect(roleLibrary.roles.filter((role) => role.definition)).toHaveLength(708)
    expect(roleLibrary.roles.filter((role) => !role.definition)).toHaveLength(104)
    expect(roleLibrary.relationships).toHaveLength(59)
    expect(Object.keys(roleLibrary.families)).toHaveLength(26)
    expect(Object.fromEntries(['direct-primary', 'competitive', 'contextual', 'manual-only'].map((policy) => [policy, roleLibrary.roles.filter((role) => role.primaryPolicy === policy).length]))).toEqual({
      'direct-primary': 27,
      competitive: 22,
      contextual: 181,
      'manual-only': 582,
    })
  })
})

describe('public role slugs', () => {
  it('creates a unique URL-safe round-trip for all 812 roles', () => {
    const slugs = roleLibrary.roles.map(roleLibrarySlug)
    expect(slugs).toHaveLength(812)
    expect(new Set(slugs).size).toBe(812)
    slugs.forEach((slug, index) => {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(roleLibraryRoleBySlug.get(slug)?.id).toBe(roleLibrary.roles[index].id)
      expect(roleLibraryPath(roleLibrary.roles[index])).toBe(`/roles/${slug}`)
    })
  })

  it.each([
    ['dominant', 'Dominant'], ['submissive', 'submissive'], ['switch', 'Switch'],
    ['top', 'Top'], ['bottom', 'Bottom'], ['vers', 'Vers'], ['rigger', 'Rigger'],
    ['rope-bottom', 'Rope Bottom'], ['brat', 'Brat'], ['brat-tamer', 'Brat Tamer'],
    ['primal-predator', 'Primal Predator'], ['primal-prey', 'Primal Prey'],
    ['primal-switch', 'Primal Switch'], ['pet', 'Pet'], ['owner', 'Owner'],
  ])('resolves /roles/%s to %s', (slug, label) => {
    expect(roleLibraryRoleBySlug.get(slug)?.label).toBe(label)
  })

  it('preserves scored deep links that differ from a library label slug', () => {
    expect(roleLibraryRoleBySlug.get('service-dominant')?.label).toBe('Service Dom')
    expect(roleLibraryRoleBySlug.get('gentle-dominant')?.label).toBe('Gentle Dom')
    expect(roleLibraryRoleBySlug.get('pleasure-dominant')?.label).toBe('Pleasure Dom')
    expect(roleLibraryRoleBySlug.get('versatile-player')?.label).toBe('Vers')
    expect(roleLibraryRoleForScoredId('primal-hunter')?.label).toBe('Primal Hunter')
  })

  it('gives every scored Role Discovery result exactly one usable human-readable role URL', () => {
    const paths = roles.map(rolePathForScoredRole)
    expect(paths).toHaveLength(101)
    expect(new Set(paths).size).toBe(101)
    paths.forEach((path, index) => {
      const role = roles[index]
      const libraryRole = roleLibraryRoleForScoredRole(role)
      expect(path).toMatch(/^\/roles\/[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(path).not.toContain('role:')
      expect(path).toBe(libraryRole
        ? roleLibraryPath(libraryRole)
        : `/roles/${roleLibrarySlug({ label: role.name })}`)
    })

    expect(rolePathForScoredRole(roles.find((role) => role.id === 'praise-focused-player')!)).toBe('/roles/praise-receiver')
    expect(rolePathForScoredRole(roles.find((role) => role.id === 'rope-bottom')!)).toBe('/roles/rope-bottom')
    expect(rolePathForScoredRole(roles.find((role) => role.id === 'pet')!)).toBe('/roles/pet')
    expect(rolePathForScoredRole(roles.find((role) => role.id === 'voyeur')!)).toBe('/roles/voyeur')
    expect(rolePathForScoredRole(roles.find((role) => role.id === 'objectification-player')!)).toBe('/roles/objectification-roleplayer')
  })
})
