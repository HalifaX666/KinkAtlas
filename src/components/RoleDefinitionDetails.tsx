import { buildRelatedRoleProfiles } from '../engine/roleProfileExploration'
import { explainRoleAssessment, type RoleAssessmentExplanation } from '../engine/roleAssessmentExplanation'
import { roleLibraryRoleById } from '../taxonomy/roleLibrary'

function roleHandlingMessage(roleId: string): string {
  switch (roleLibraryRoleById.get(roleId)?.decisionPathway) {
    case 'explicit-confirmation': return 'This exact label is eligible for an assessment suggestion only after direct confirmation.'
    case 'manual-only': return 'This term remains available for self-exploration, but KinkAtlas does not automatically recommend it from the assessment.'
    case 'direct-interest': return 'This role can be suggested only when a relevant interest is directly confirmed.'
    case 'hybrid': return 'This role can be suggested when qualifying broad evidence and direct confirmation are both present.'
    default: return 'This role is eligible for an assessment suggestion when the current evidence supports it.'
  }
}

export function RoleDefinitionDetails({ roleId, assessmentExplanation = explainRoleAssessment({}) }: { roleId: string; assessmentExplanation?: RoleAssessmentExplanation }) {
  const role = roleLibraryRoleById.get(roleId)
  if (!role) return null
  const relatedRoles = buildRelatedRoleProfiles([roleId], 3)
  const hasReviewedDefinition = Boolean(role.definition?.trim())
  return <details className="profile-role-definition">
    <summary>About this role</summary>
    {hasReviewedDefinition
      ? <p>{role.definition}</p>
      : <p>KinkAtlas doesn’t currently have a description for this term. If it interests you, explore how different people and communities use it, and clarify what it means to you before using it in a dynamic. You can still add it to your role set.</p>}
    <div className="profile-role-assessment" data-explanation-kind={assessmentExplanation.kind}>
      <strong>How this relates to your results</strong>
      {assessmentExplanation.manualSelection && <p><b>{assessmentExplanation.manualSelection.heading}.</b> {assessmentExplanation.manualSelection.message}</p>}
      <p><b>{assessmentExplanation.heading}.</b> {assessmentExplanation.message}</p>
    </div>
    <div className="profile-role-handling">
      <strong>How KinkAtlas handles this role</strong>
      <p>{roleHandlingMessage(roleId)}</p>
    </div>
    {relatedRoles.length > 0 && <p><strong>Related roles:</strong> {relatedRoles.map((related) => related.label).join(', ')}</p>}
    <p className="profile-role-nonimplication"><strong>Does not imply:</strong> Seeing or selecting this role does not imply consent, compatibility, readiness, or activity boundaries.</p>
  </details>
}

export default RoleDefinitionDetails
