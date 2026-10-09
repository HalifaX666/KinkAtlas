// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  buildPrivateRestoreState,
  buildResultSnapshot,
  buildSharedDisclosurePayload,
  privacyReceiptForPayload,
  restoreRevisionStatus,
  validatePrivateRestoreState,
} from '../capsules/capsuleData'
import {
  createPrivateRestoreArtifact,
  createSharedDisclosureArtifact,
  decryptPrivateRestore,
  decryptSharedDisclosure,
  generateCapsuleSecret,
  parseSharedCapsuleFragment,
} from '../capsules/capsuleTransport'
import { CAPSULE_LIMITS, canonicalJson } from '../capsules/capsuleSchema'
import type { CapsuleJsonValue } from '../capsules/capsuleTypes'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

const evaluation = evaluateAssessmentPersona(assessmentPersonas[0])
const navigation = {
  phase: 'negotiation' as const,
  discoveryHistory: Object.keys(evaluation.persona.answers.discovery),
  discoveryCursor: 3,
  refinementHistory: Object.keys(evaluation.persona.answers.refinement),
  refinementCursor: null,
  readinessIndex: 4,
  negotiationIndex: 5,
}

describe('Phase I.2 Capsule DTOs', () => {
  it('builds a deterministic historical snapshot of displayed results instead of the full scored graph', () => {
    const first = buildResultSnapshot(evaluation.persona.answers, evaluation.yourRoleSet)
    const second = buildResultSnapshot(structuredClone(evaluation.persona.answers), structuredClone(evaluation.yourRoleSet))
    expect(canonicalJson(first as unknown as CapsuleJsonValue)).toBe(canonicalJson(second as unknown as CapsuleJsonValue))
    expect(first.strongestDimensions).toHaveLength(10)
    expect(first.roleDiscovery).toHaveLength(12)
    expect(evaluation.roleResults.length).toBeGreaterThan(12)
    expect(first.roleDiscovery.every((role) => Boolean(role.definition) && Boolean(role.explanation.summary))).toBe(true)
    expect(first.currentRoleSet.map((role) => role.label)).toEqual(evaluation.yourRoleSet.map((role) => role.label))
    expect(first.chosenPrimaryRoleId).toBe(evaluation.yourRoleSet[0].roleId)
  })

  it('preserves all answer maps, navigation, Current Role Set, and historical snapshot', () => {
    const state = buildPrivateRestoreState({
      answers: evaluation.persona.answers,
      navigation,
      currentRoleSet: evaluation.yourRoleSet,
      historicalResultSnapshot: null,
      completionRequested: true,
    })
    validatePrivateRestoreState(state)
    expect(state.answers).toEqual(evaluation.persona.answers)
    expect(Object.keys(state.answers)).toEqual(['discovery', 'refinement', 'readiness', 'boundaries', 'negotiation'])
    expect(state.navigation).toEqual(navigation)
    expect(state.currentRoleSet).toEqual(evaluation.yourRoleSet)
    expect(state.resultSnapshot?.roleDiscovery).toHaveLength(12)
    expect(state.completionRequested).toBe(true)
  })

  it('keeps shared disclosures conservative and derives the receipt from the serialized manifest', () => {
    const payload = buildSharedDisclosurePayload(evaluation.yourRoleSet)
    const receipt = privacyReceiptForPayload(payload)
    expect(payload.disclosureManifest.currentRoleSet).toBe(true)
    expect(payload.disclosureManifest.roleDefinitions).toBe(true)
    expect(Object.entries(payload.disclosureManifest).filter(([, included]) => included).map(([id]) => id)).toEqual(['currentRoleSet', 'roleDefinitions'])
    expect(receipt.included).toEqual(['Current Role Set', 'Role definitions'])
    expect(receipt.notIncluded).toContain('Raw assessment answers')
    expect(Object.keys(payload.sections)).toEqual(['currentRoleSet', 'roleDefinitions'])
    expect(payload.sections).not.toHaveProperty('navigation')
    expect(payload.sections).not.toHaveProperty('restore')
    expect(payload.sections).not.toHaveProperty('rawAnswers')

    const rolesOnly = buildSharedDisclosurePayload(evaluation.yourRoleSet, { currentRoleSet: true, roleDefinitions: false })
    expect(privacyReceiptForPayload(rolesOnly).included).toEqual(['Current Role Set'])
    expect(rolesOnly.sections).not.toHaveProperty('roleDefinitions')
  })

  it('generates independent high-entropy secrets without a word list', () => {
    const first = generateCapsuleSecret()
    const second = generateCapsuleSecret()
    expect(first).toMatch(/^KA1-(?:[A-Za-z0-9_-]{1,6}\.)*[A-Za-z0-9_-]{1,6}$/)
    expect(first).not.toBe(second)
    expect(first.slice(4).replaceAll('.', '')).toHaveLength(43)
  })

  it('round trips encrypted restore and shared disclosure artifacts locally', async () => {
    const state = buildPrivateRestoreState({
      answers: evaluation.persona.answers,
      navigation,
      currentRoleSet: evaluation.yourRoleSet,
      historicalResultSnapshot: null,
      completionRequested: true,
    })
    const restore = await createPrivateRestoreArtifact(state)
    expect(restore.file.name).toBe('kinkatlas-private-restore.kinkatlas-restore')
    expect(restore.serializedEnvelope).not.toContain(restore.secret)
    expect(restore.serializedEnvelope).not.toContain(Object.keys(state.answers.discovery)[0])
    expect(restore.serializedEnvelope).not.toContain(Object.values(state.answers.discovery)[0])
    expect(await restore.file.text()).toBe(restore.serializedEnvelope)
    expect((await decryptPrivateRestore(restore.serializedEnvelope, restore.secret)).answers).toEqual(state.answers)
    await expect(decryptPrivateRestore(restore.serializedEnvelope, 'wrong-restore-secret-value')).rejects.toMatchObject({ code: 'authentication-failed' })

    const disclosurePayload = buildSharedDisclosurePayload(evaluation.yourRoleSet)
    const disclosure = await createSharedDisclosureArtifact(disclosurePayload, 'https://example.test')
    expect(disclosure.link).toMatch(/^https:\/\/example\.test\/capsule#capsule=/)
    expect(disclosure.link).not.toContain(disclosure.secret)
    expect(disclosure.serializedEnvelope).not.toContain(disclosure.secret)
    expect(await disclosure.file.text()).toBe(disclosure.serializedEnvelope)
    expect(await disclosure.file.text()).not.toContain(disclosure.secret)
    expect(parseSharedCapsuleFragment(disclosure.fragment)).toBe(disclosure.serializedEnvelope)
    expect(await decryptSharedDisclosure(disclosure.serializedEnvelope, disclosure.secret)).toEqual(disclosurePayload)
  }, 30_000)

  it('serializes a manually added role without leaking undefined optional fields', async () => {
    const manualRole = {
      roleId: 'role:manual-synthetic',
      label: 'Manual Synthetic',
      source: 'user-selected' as const,
      definition: 'A synthetic manually selected role used only by this test.',
      assessmentRoleId: undefined,
    }
    const state = buildPrivateRestoreState({
      answers: evaluation.persona.answers,
      navigation,
      currentRoleSet: [manualRole],
      historicalResultSnapshot: null,
      completionRequested: true,
    })
    const artifact = await createPrivateRestoreArtifact(state)
    const restored = await decryptPrivateRestore(artifact.serializedEnvelope, artifact.secret)
    expect(restored.currentRoleSet).toEqual([{
      roleId: manualRole.roleId,
      label: manualRole.label,
      source: manualRole.source,
      definition: manualRole.definition,
    }])
  }, 30_000)

  it('rejects oversized encoded fragments before decoding them', () => {
    expect(() => parseSharedCapsuleFragment(`#capsule=${'A'.repeat(CAPSULE_LIMITS.fragmentBytes)}`)).toThrowError(
      expect.objectContaining({ code: 'oversized-input' }),
    )
  })

  it('treats semantic revision drift as historical-only instead of silently rescoring', () => {
    const state = buildPrivateRestoreState({
      answers: evaluation.persona.answers,
      navigation,
      currentRoleSet: evaluation.yourRoleSet,
      historicalResultSnapshot: null,
      completionRequested: false,
    })
    expect(restoreRevisionStatus(state)).toBe('full')
    const older = { ...state, engineRevision: 'kinkatlas-assessment-engine-older' }
    validatePrivateRestoreState(older)
    expect(restoreRevisionStatus(older)).toBe('historical-only')
  })
})
