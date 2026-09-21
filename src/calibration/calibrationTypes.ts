import type {
  ActivityRecommendation,
  AssessmentAnswers,
  BlindSpot,
  BoundaryValue,
  CompetencyId,
  ConfidenceLevel,
  CriticalFlag,
  ReadinessBand,
  ReadinessResult,
  RoleResult,
  TraitId,
  TraitScores,
} from '../types'

export type TraitIntent = 'high' | 'moderate' | 'low' | 'unknown' | 'conflicting'

export type CalibrationExpectation =
  | { kind: 'role-in-top'; roleId: string; top: number }
  | { kind: 'role-above'; higherRoleId: string; lowerRoleId: string }
  | { kind: 'minimum-band'; roleId: string; band: RoleResult['alignment'] }
  | { kind: 'maximum-band'; roleId: string; band: RoleResult['alignment'] }
  | { kind: 'confidence'; roleId: string; allowed: ConfidenceLevel[] }
  | { kind: 'raw-above-ranking'; roleId: string }
  | { kind: 'minimum-role-count'; band: RoleResult['alignment']; count: number }
  | { kind: 'maximum-role-count'; band: RoleResult['alignment']; count: number }
  | { kind: 'readiness-band'; competency: CompetencyId; allowed: ReadinessBand[] }
  | { kind: 'blind-spot'; blindSpotId: string }
  | { kind: 'critical-flag'; flagId: string }
  | { kind: 'activity-status'; itemId: string; status: ActivityRecommendation['status'] }

export interface CalibrationPersona {
  id: string
  name: string
  description: string
  traitIntent: Partial<Record<TraitId, TraitIntent>>
  discoveryAnswers?: AssessmentAnswers['discovery']
  readinessIntent?: string[]
  readinessAnswers?: AssessmentAnswers['readiness']
  boundaryIntent?: Record<string, BoundaryValue>
  expectedStrongRoles?: string[]
  expectedPlausibleRoles?: string[]
  rolesNotExpectedHigh?: string[]
  expectedConfidence?: Partial<Record<string, ConfidenceLevel[]>>
  expectedReadinessObservations?: string[]
  expectedBlindSpots?: string[]
  rationale: string
  expectations: CalibrationExpectation[]
}

export interface ExpectationResult {
  expectation: CalibrationExpectation
  passed: boolean
  message: string
}

export interface PersonaEvaluation {
  persona: CalibrationPersona
  traitScores: TraitScores
  roleResults: RoleResult[]
  readiness: { competencies: ReadinessResult[]; blindSpots: BlindSpot[]; criticalFlags: CriticalFlag[] }
  activityGuidance: ActivityRecommendation[]
  expectationResults: ExpectationResult[]
  passed: boolean
}

export type RoleHealthIssue =
  | 'TOO_FEW_TRAITS'
  | 'TOO_FEW_QUESTIONS'
  | 'LOW_REACHABILITY'
  | 'HIGH_DUPLICATION'
  | 'NO_DIFFERENTIATING_TRAITS'
  | 'NO_CONTRARY_TRAITS_WHERE_EXPECTED'
  | 'SINGLE_TRAIT_DEPENDENCY'
  | 'UNREACHABLE_HIGH_CONFIDENCE'
  | 'POSSIBLE_DUPLICATE_ROLE'

export interface RoleNeighbor {
  roleId: string
  name: string
  similarity: number
}

export interface RoleHealthDiagnostic {
  roleId: string
  name: string
  weightedTraitCount: number
  differentiatingTraitCount: number
  contraryTraitCount: number
  facetCount: number
  questionCount: number
  broadQuestionCount: number
  refinementQuestionCount: number
  estimatedEvidenceCoverage: number
  largestTraitShare: number
  canReachHighConfidence: boolean
  nearestNeighbors: RoleNeighbor[]
  issues: RoleHealthIssue[]
}

export interface TraitCoverageDiagnostic {
  traitId: TraitId
  questionCount: number
  broadQuestionCount: number
  refinementQuestionCount: number
  increasingAnswerPaths: number
  decreasingAnswerPaths: number
  roleCount: number
  genericIntensityOnly: boolean
  issues: ('UNUSED_TRAIT' | 'TOUCHED_ONCE' | 'NO_NEGATIVE_PATH' | 'GENERIC_INTENSITY_ONLY')[]
}

export interface TraitCorrelationDiagnostic {
  left: TraitId
  right: TraitId
  sharedQuestionCount: number
  coOccurrenceRatio: number
  meanEffectDifference: number
  maxEffectDifference: number
}

export interface QuestionCoverageDiagnostic {
  questionId: string
  traitCount: number
  scoredAnswerCount: number
  distinctTraitGroups: number
  distinctTraitProfiles: number
  nearlyIdenticalTraitGroups: boolean
}
