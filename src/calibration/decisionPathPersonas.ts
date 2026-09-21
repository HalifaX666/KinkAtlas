import { buildRoleProfileCandidates, optimizeRoleProfile } from '../engine/roleProfileOptimizer'
import { roleById } from '../data/roles'
import { roleLibrary, type RoleLibraryRole } from '../taxonomy/roleLibrary'
import type { RoleResult } from '../types'

type DirectInterestResponse = 'interested' | 'not-interested' | 'unsure' | 'prefer-not'
type ExactLabelConfirmationState = 'not-asked' | 'confirmed' | 'rejected' | 'unsure'

interface DirectInterestAnswer {
  roleId: string
  response: DirectInterestResponse
}

interface ExactLabelConfirmation {
  roleId: string
  state: ExactLabelConfirmationState
}

export interface DecisionPathCalibrationPersona {
  id: string
  description: string
  roleResults: RoleResult[]
  directAnswers: DirectInterestAnswer[]
  confirmations: ExactLabelConfirmation[]
  expectedEligibleLabels: string[]
  expectedIneligibleLabels: string[]
  expectedScorelessLabels?: string[]
  expectOverlapControl?: string[]
}

const result = (roleId: string, rawScore = .9, confidence: RoleResult['confidence'] = 'high'): RoleResult => ({
  role: roleById[roleId],
  rawScore,
  rankedScore: Math.max(0, rawScore - .04),
  alignment: rawScore >= .72 ? 'strong' : rawScore >= .48 ? 'explore' : 'some',
  confidence,
  relevantAnswers: 6,
  coverage: .82,
  supportingTraits: [],
  limitingTraits: [],
  differentiatingEvidence: [],
  contradictoryEvidence: [],
})

const libraryRole = (label: string) => {
  const role = roleLibrary.roles.find((candidate) => candidate.label === label)
  if (!role) throw new Error(`Missing decision-path calibration role ${label}.`)
  return role
}

const interested = (label: string): DirectInterestAnswer => ({ roleId: libraryRole(label).id, response: 'interested' })
const confirmation = (label: string, state: ExactLabelConfirmationState): ExactLabelConfirmation => ({ roleId: libraryRole(label).id, state })

export const decisionPathCalibrationPersonas: DecisionPathCalibrationPersona[] = [
  {
    id: 'dominant-specific-service-interest',
    description: 'Broad Dominant evidence plus direct interest can qualify a specific Anal Master pathway.',
    roleResults: [result('dominant')], directAnswers: [interested('Anal Master')], confirmations: [],
    expectedEligibleLabels: ['Dominant', 'Anal Master'], expectedIneligibleLabels: [],
  },
  {
    id: 'submissive-niche-direction',
    description: 'A niche receiving-position role requires both Bottom evidence and direct interest.',
    roleResults: [result('bottom')], directAnswers: [interested('Latex Bottom')], confirmations: [],
    expectedEligibleLabels: ['Latex Bottom'], expectedIneligibleLabels: [],
  },
  {
    id: 'switch-directional-activity',
    description: 'Rope Switch requires both broad Switch evidence and direct role interest.',
    roleResults: [result('switch')], directAnswers: [interested('Rope Switch')], confirmations: [],
    expectedEligibleLabels: ['Switch', 'Rope Switch'], expectedIneligibleLabels: [],
  },
  {
    id: 'service-interest-without-broad-authority',
    description: 'A service-oriented user can qualify the existing scored Service Dom pathway without importing pain interests.',
    roleResults: [result('service-dominant')], directAnswers: [], confirmations: [],
    expectedEligibleLabels: ['Service Dom'], expectedIneligibleLabels: [],
  },
  {
    id: 'fetish-specific-direct-interest',
    description: 'A specific material/persona interest can qualify directly without a fabricated trait score.',
    roleResults: [], directAnswers: [interested('Latex pony')], confirmations: [],
    expectedEligibleLabels: ['Latex pony'], expectedIneligibleLabels: [], expectedScorelessLabels: ['Latex pony'],
  },
  {
    id: 'reject-high-scoring-role',
    description: 'Exact rejection suppresses a strongly aligned inferred role.',
    roleResults: [result('dominant', .96)], directAnswers: [], confirmations: [confirmation('Dominant', 'rejected')],
    expectedEligibleLabels: [], expectedIneligibleLabels: ['Dominant'],
  },
  {
    id: 'confirm-niche-identity-label',
    description: 'Exact self-identification makes an explicit-confirmation role eligible without alignment.',
    roleResults: [], directAnswers: [], confirmations: [confirmation('Femboy', 'confirmed')],
    expectedEligibleLabels: ['Femboy'], expectedIneligibleLabels: [], expectedScorelessLabels: ['Femboy'],
  },
  {
    id: 'unsure-exact-label',
    description: 'Unsure exact-label evidence does not qualify an identity label.',
    roleResults: [], directAnswers: [], confirmations: [confirmation('Femboy', 'unsure')],
    expectedEligibleLabels: [], expectedIneligibleLabels: ['Femboy'],
  },
  {
    id: 'overlapping-dominant-labels',
    description: 'A confirmed Domme and inferred Dominant can both qualify while semantic redundancy limits duplicate representation.',
    roleResults: [result('dominant', .93)], directAnswers: [], confirmations: [confirmation('Domme', 'confirmed')],
    expectedEligibleLabels: ['Dominant', 'Domme'], expectedIneligibleLabels: [], expectedScorelessLabels: ['Domme'], expectOverlapControl: ['Dominant', 'Domme'],
  },
  {
    id: 'sparse-evidence',
    description: 'Sparse evidence leaves inferred, direct, and exact-confirmation pathways ineligible.',
    roleResults: [], directAnswers: [], confirmations: [],
    expectedEligibleLabels: [], expectedIneligibleLabels: ['Dominant', 'Latex pony', 'Femboy'],
  },
]

function mappedRoleResult(role: RoleLibraryRole, roleResults: RoleResult[]) {
  return (role.canonicalRoleId
    ? roleResults.find((result) => result.role.id === role.canonicalRoleId)
    : undefined) ?? roleResults.find((result) => role.nearestRoleIds.includes(result.role.id))
}

function evaluateDecisionPath(role: RoleLibraryRole, persona: DecisionPathCalibrationPersona) {
  const mappedResult = mappedRoleResult(role, persona.roleResults)
  const broadEvidenceQualifies = Boolean(
    mappedResult
    && (mappedResult.alignment === 'strong' || mappedResult.alignment === 'explore')
    && mappedResult.confidence !== 'low'
    && !mappedResult.unmetEvidenceRequirements?.length,
  )
  const directInterestConfirmed = persona.directAnswers.some((answer) => answer.roleId === role.id && answer.response === 'interested')
  const confirmationState = persona.confirmations.find((answer) => answer.roleId === role.id)?.state ?? 'not-asked'
  const eligibleForTopFive = confirmationState === 'rejected'
    ? false
    : role.decisionPathway === 'inferred'
      ? broadEvidenceQualifies
      : role.decisionPathway === 'direct-interest'
        ? directInterestConfirmed
        : role.decisionPathway === 'hybrid'
          ? directInterestConfirmed && broadEvidenceQualifies
          : role.decisionPathway === 'explicit-confirmation'
            ? confirmationState === 'confirmed'
            : false
  return { eligibleForTopFive, confirmationState, broadEvidenceQualifies, directInterestConfirmed }
}

function buildDecisionPathCandidates(persona: DecisionPathCalibrationPersona) {
  const candidates = buildRoleProfileCandidates(persona.roleResults)
  return candidates.map((candidate) => {
    const role = roleLibrary.roles.find((item) => item.id === candidate.roleId)!
    const evaluation = evaluateDecisionPath(role, persona)
    const mappedResult = mappedRoleResult(role, persona.roleResults)
    return {
      ...candidate,
      eligible: evaluation.eligibleForTopFive,
      confidence: role.decisionPathway === 'direct-interest' && evaluation.directInterestConfirmed
        ? 'moderate' as const
        : role.decisionPathway === 'hybrid' && evaluation.eligibleForTopFive
          ? mappedResult?.confidence
          : candidate.confidence,
    }
  })
}

export function evaluateDecisionPathPersona(persona: DecisionPathCalibrationPersona) {
  const byLabel = new Map(roleLibrary.roles.map((role) => [role.label, role]))
  const labels = [...new Set([...persona.expectedEligibleLabels, ...persona.expectedIneligibleLabels])]
  const evaluations = labels.map((label) => {
    const role = byLabel.get(label)!
    return {
      label,
      evaluation: evaluateDecisionPath(role, persona),
    }
  })
  const candidates = buildDecisionPathCandidates(persona)
  const candidateByLabel = new Map(candidates.map((candidate) => [candidate.label, candidate]))
  const overlapCandidates = persona.expectOverlapControl?.map((label) => candidateByLabel.get(label)!).filter(Boolean) ?? []
  const overlapResult = overlapCandidates.length ? optimizeRoleProfile(overlapCandidates) : undefined
  const failures = [
    ...persona.expectedEligibleLabels.filter((label) => !evaluations.find((item) => item.label === label)?.evaluation.eligibleForTopFive).map((label) => `${label} should be eligible.`),
    ...persona.expectedIneligibleLabels.filter((label) => evaluations.find((item) => item.label === label)?.evaluation.eligibleForTopFive).map((label) => `${label} should be ineligible.`),
    ...(persona.expectedScorelessLabels ?? []).filter((label) => candidateByLabel.get(label)?.rawAlignment !== undefined).map((label) => `${label} received a fabricated alignment score.`),
    ...(overlapResult && overlapResult.recommendations.length !== 1 ? ['Overlapping confirmed/inferred labels consumed more than one Top-5 slot.'] : []),
  ]
  return { persona, evaluations, overlapResult, failures, passed: failures.length === 0 }
}

export const decisionPathCalibrationResults = decisionPathCalibrationPersonas.map(evaluateDecisionPathPersona)
