export type TraitId = "dominance" | "submission" | "switching" | "givingControl" | "receivingControl" | "leadership" | "surrender" | "serviceGiving" | "serviceReceiving" | "pleasureGiving" | "pleasureReceiving" | "painGiving" | "painReceiving" | "ropeGiving" | "ropeReceiving" | "restraint" | "disciplineGiving" | "disciplineReceiving" | "protocol" | "structure" | "caregiving" | "beingCaredFor" | "brattiness" | "bratHandling" | "primality" | "playfulness" | "psychologicalIntensity" | "physicalIntensity" | "sensorySeeking" | "exhibitionism" | "voyeurism" | "roleplay" | "ritual" | "spontaneity" | "exploration" | "lifestyleOrientation" | "emotionalConnection" | "responsibility" | "challenge" | "technicalInterest" | "performance" | "objectification" | "fetishInterest" | "communityConnection";

export type RoleCategoryId = "power-exchange" | "play-position" | "service" | "rope-bondage" | "pain-sensation" | "discipline-protocol" | "caregiving" | "brat-dynamics" | "primal" | "pet-owner" | "psychological-play" | "exhibition-observation" | "roleplay" | "fetish-material" | "relationship-style" | "community-identity";

export type VocabularyKind = "scored-role" | "alias" | "facet" | "activity" | "relationship-style" | "persona" | "fetish-interest" | "community-identity" | "reference-term";

export type CompetencyId = "ongoingConsent" | "negotiation" | "communication" | "boundaries" | "selfAdvocacy" | "powerAwareness" | "stopSignals" | "uncertainty" | "riskAwareness" | "accountability" | "emotionalAwareness" | "aftercare" | "privacy" | "substances" | "recording" | "roleAssumptions" | "learningMindset";

export type BoundaryValue = "love" | "want" | "curious" | "consider" | "neutral" | "dont-want" | "hard-limit" | "unknown" | "prefer-not";

export interface TraitDefinition {
  id: TraitId;
  label: string;
  cluster: string;
  description: string;
}
export interface RoleCategory {
  id: RoleCategoryId;
  label: string;
  description: string;
}
export type BlindSpotSeverity = "notice" | "concern" | "critical";
export type AuthorityEvidenceClassification = "explicit-authority" | "activity-leadership" | "ambiguous" | "authority-rejection";
export type RoleEvidenceRequirement = "explicit-authority" | "explicit-submission" | "explicit-ownership" | "explicit-protection";
export interface BlindSpotSignal {
  id: string;
  severity: BlindSpotSeverity;
  weight: number;
  critical?: boolean;
}
export interface AnswerOption {
  id: string;
  label: string;
  effects?: Partial<Record<TraitId, number>>;
  competencyEffects?: Partial<Record<CompetencyId, number>>;
  blindSpotSignals?: BlindSpotSignal[];
  authorityEvidence?: AuthorityEvidenceClassification;
  qualificationEvidence?: RoleEvidenceRequirement[];
  noScore?: boolean;
}
export interface DiscoveryQuestion {
  id: string;
  kind: "discovery";
  domain: RoleCategoryId;
  prompt: string;
  context?: string;
  phase: "broad" | "refine";
  traits: TraitId[];
  activityTags?: string[];
  answers: AnswerOption[];
}

export type RefinementFamilyId = "submission" | "dominance" | "primal" | "service" | "pet" | "caregiver-little";

export type RefinementTargetId = "submissive-top" | "submissive-sadist" | "submissive-masochist" | "bratty-sub" | "pleasure-submissive" | "sensual-submissive" | "dominant-bottom" | "dominant-sadist" | "dominant-masochist" | "sensual-dominant" | "primal-sadist" | "primal-masochist" | "primal-top" | "primal-bottom" | "primal-sensualist" | "service-rigger" | "service-brat";

export interface RefinementAnswerOption extends AnswerOption {
  supports?: RefinementTargetId[];
  weakSupports?: RefinementTargetId[];
  rejects?: RefinementTargetId[];
}

export interface RefinementQuestion {
  id: string;
  kind: "refinement";
  family: RefinementFamilyId;
  prompt: string;
  context?: string;
  answers: RefinementAnswerOption[];
}

export type RefinementEvidenceStatus = "supported" | "possible" | "rejected" | "unanswered";

export interface RefinementEvidence {
  targetId: RefinementTargetId;
  status: RefinementEvidenceStatus;
  supportingQuestionIds: string[];
  possibleQuestionIds: string[];
  rejectingQuestionIds: string[];
}
export interface ReadinessQuestion {
  id: string;
  kind: "readiness";
  domain: CompetencyId;
  prompt: string;
  context?: string;
  answers: AnswerOption[];
}
export interface NegotiationQuestion {
  id: string;
  kind: "negotiation";
  domain: string;
  prompt: string;
  context?: string;
  answers: AnswerOption[];
}
export type Question = DiscoveryQuestion | RefinementQuestion | ReadinessQuestion | NegotiationQuestion;
export interface Role {
  id: string;
  name: string;
  aliases: string[];
  vocabularyKind: "scored-role";
  primaryCategory: RoleCategoryId;
  facets: RoleCategoryId[];
  description: string;
  notImplied: string;
  traits: Partial<Record<TraitId, number>>;
  differentiatingTraits: Partial<Record<TraitId, number>>;
  contraryTraits?: Partial<Record<TraitId, number>>;
  evidenceRequirements?: RoleEvidenceRequirement[];
  relevantCompetencies: CompetencyId[];
  educationTopics: string[];
  reflectionQuestions: string[];
  activityTags?: string[];
  relatedRoleIds?: string[];
  comparisonNotes?: Record<string, string>;
}
export interface TraitScore {
  value: number;
  evidence: number;
  positive: number;
  negative: number;
}
export type TraitScores = Partial<Record<TraitId, TraitScore>>;
export type AlignmentBand = "strong" | "explore" | "some" | "insufficient";
export type ConfidenceLevel = "high" | "moderate" | "low";
export interface RoleResult {
  role: Role;
  rawScore: number;
  rankedScore: number;
  alignment: AlignmentBand;
  confidence: ConfidenceLevel;
  relevantAnswers: number;
  coverage: number;
  supportingTraits: { id: TraitId; value: number }[];
  limitingTraits: { id: TraitId; value: number }[];
  differentiatingEvidence: { id: TraitId; value: number }[];
  contradictoryEvidence: { id: TraitId; value: number }[];
  unmetEvidenceRequirements?: RoleEvidenceRequirement[];
}
export interface RoleExplanationSignal {
  traitId: TraitId;
  label: string;
  description: string;
  strength: "strong" | "moderate" | "limiting" | "contrary";
}
export interface RoleExplanation {
  summary: string;
  supportingSignals: RoleExplanationSignal[];
  differentiatingSignals: RoleExplanationSignal[];
  limitingSignals: RoleExplanationSignal[];
  contrarySignals: RoleExplanationSignal[];
  confidenceExplanation: string;
  coverageExplanation: string;
  consentConsiderations: string[];
  reflectionQuestions: string[];
}
export type ReadinessBand = "strong" | "developing" | "explore" | "important";
export interface ReadinessResult {
  competency: CompetencyId;
  value: number;
  evidence: number;
  band: ReadinessBand;
}
export interface BlindSpot {
  id: string;
  title: string;
  description: string;
  competency: CompetencyId;
  evidence: number;
  severity: BlindSpotSeverity;
  critical: boolean;
}
export interface CriticalFlag {
  id: string;
  title: string;
  description: string;
  competency: CompetencyId;
  sourceQuestionIds: string[];
}
export interface ReadinessAssessment {
  competencies: ReadinessResult[];
  blindSpots: BlindSpot[];
  criticalFlags: CriticalFlag[];
}
export interface BoundaryItem {
  id: string;
  label: string;
  description: string;
  tags: string[];
}
export interface ActivityRecommendation {
  item: BoundaryItem;
  status: "explore" | "discuss" | "learn-first" | "off-table";
  message: string;
}
export interface AssessmentAnswers {
  discovery: Record<string, string>;
  refinement: Record<string, string>;
  readiness: Record<string, string>;
  boundaries: Record<string, BoundaryValue>;
  negotiation: Record<string, string>;
}
