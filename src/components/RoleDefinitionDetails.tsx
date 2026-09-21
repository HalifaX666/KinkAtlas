import { buildRelatedRoleProfiles } from '../engine/roleProfileExploration'
import { roleLibraryRoleById } from '../taxonomy/roleLibrary'

type RoleDisplayStatus = 'recommended' | 'selected'

function recommendationLabel(roleId: string, displayStatus?: RoleDisplayStatus): string {
  if (displayStatus === 'recommended') return 'In your role set · Suggested'
  if (displayStatus === 'selected') return 'Added by you'
  const role = roleLibraryRoleById.get(roleId)
  if (role?.decisionPathway === 'explicit-confirmation') return 'Can be recommended after confirmation'
  if (role?.decisionPathway === 'manual-only') return 'Explore manually'
  return 'Can be recommended'
}

export function RoleDefinitionDetails({ roleId, displayStatus }: { roleId: string; displayStatus?: RoleDisplayStatus }) {
  const role = roleLibraryRoleById.get(roleId)
  if (!role) return null
  const relatedRoles = buildRelatedRoleProfiles([roleId], 3)
  const hasReviewedDefinition = Boolean(role.definition?.trim())
  return <details className="profile-role-definition">
    <summary>About this role</summary>
    {hasReviewedDefinition
      ? <><p>{role.definition}</p><small>{recommendationLabel(roleId, displayStatus)}</small></>
      : <><p>KinkAtlas doesn’t currently have a description for this term. If it interests you, explore how different people and communities use it, and clarify what it means to you before using it in a dynamic. You can still add it to your role set.</p><small>Explore manually · {recommendationLabel(roleId, displayStatus)}</small></>}
    {displayStatus === 'selected' && <p>You added this role yourself rather than receiving it as an assessment suggestion. It does not create an assessment score or confidence.</p>}
    {relatedRoles.length > 0 && <p><strong>Related roles:</strong> {relatedRoles.map((related) => related.label).join(', ')}</p>}
    <p className="profile-role-nonimplication"><strong>Does not imply:</strong> Seeing or selecting this role does not imply consent, compatibility, readiness, or activity boundaries.</p>
  </details>
}

export default RoleDefinitionDetails
