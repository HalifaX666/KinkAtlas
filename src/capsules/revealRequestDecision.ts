import { buildSharedDisclosurePayload, privacyReceiptForPayload } from './capsuleData'
import { REVEAL_REQUEST_SECTION_IDS, type RevealRequest, type RevealRequestSectionId, type SharedDisclosurePayload } from './capsuleTypes'
import type { EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'

export const revealRequestSectionLabels: Readonly<Record<RevealRequestSectionId, string>> = Object.freeze({
  currentRoleSet: 'Current Role Set',
  roleDefinitions: 'Role definitions',
})

export interface RevealRequestPrivacyReceipt {
  requested: string[]
  selected: string[]
  excluded: string[]
}

export function buildRevealRequestDisclosure(
  roleSet: EditableRoleProfileEntry[],
  request: RevealRequest,
  selectedSections: readonly RevealRequestSectionId[],
): SharedDisclosurePayload {
  const requested = new Set<RevealRequestSectionId>(request.requestedSections)
  if (new Set(selectedSections).size !== selectedSections.length || selectedSections.some((section) => !requested.has(section))) {
    throw new Error('Selected disclosure sections must be a subset of the validated Reveal Request.')
  }
  return buildSharedDisclosurePayload(roleSet, {
    currentRoleSet: selectedSections.includes('currentRoleSet'),
    roleDefinitions: selectedSections.includes('roleDefinitions'),
  })
}

export function revealRequestPrivacyReceipt(
  request: RevealRequest,
  payload: SharedDisclosurePayload,
): RevealRequestPrivacyReceipt {
  const selected = REVEAL_REQUEST_SECTION_IDS
    .filter((section) => payload.disclosureManifest[section])
    .map((section) => revealRequestSectionLabels[section])
  const baseReceipt = privacyReceiptForPayload(payload)
  return {
    requested: request.requestedSections.map((section) => revealRequestSectionLabels[section]),
    selected,
    excluded: baseReceipt.notIncluded,
  }
}
