import { useMemo, useState } from 'react'
import { buildRelatedRoleProfiles } from '../engine/roleProfileExploration'
import { explainRoleAssessment, type RoleAssessmentExplanation } from '../engine/roleAssessmentExplanation'
import { roleLibraryRoleById } from '../taxonomy/roleLibrary'

export function RoleDefinitionDetails({ roleId, assessmentExplanation = explainRoleAssessment({}) }: { roleId: string; assessmentExplanation?: RoleAssessmentExplanation }) {
  const role = roleLibraryRoleById.get(roleId)
  const [isOpen, setIsOpen] = useState(false)
  const relatedRoles = useMemo(() => isOpen ? buildRelatedRoleProfiles([roleId], 3) : [], [isOpen, roleId])
  if (!role) return null
  const hasReviewedDefinition = Boolean(role.definition?.trim())
  return <details className="profile-role-definition" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
    <summary>About this role</summary>
    {hasReviewedDefinition
      ? <p>{role.definition}</p>
      : <p>KinkAtlas doesn’t currently have a description for this term. If it interests you, explore how different people and communities use it, and clarify what it means to you before using it in a dynamic. You can still add it to your role set.</p>}
    <div className="profile-role-assessment" data-explanation-kind={assessmentExplanation.kind}>
      <strong>How this relates to your results</strong>
      {assessmentExplanation.manualSelection && <p><b>{assessmentExplanation.manualSelection.heading}.</b> {assessmentExplanation.manualSelection.message}</p>}
      <p><b>{assessmentExplanation.heading}.</b> {assessmentExplanation.message}</p>
    </div>
    {relatedRoles.length > 0 && <p><strong>Related roles:</strong> {relatedRoles.map((related) => related.label).join(', ')}</p>}
    <p className="profile-role-nonimplication"><strong>Does not imply:</strong> Seeing or selecting this role does not imply consent, compatibility, readiness, or activity boundaries.</p>
  </details>
}

export default RoleDefinitionDetails
