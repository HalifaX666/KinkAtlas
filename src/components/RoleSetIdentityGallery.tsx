import type { EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import { buildRoleSetCardPresentations, roleLibraryRoleForIdentity } from '../data/roleIdentity'
import type { RoleResult } from '../types'
import { RoleIdentityCard } from './RoleIdentityCard'

export function RoleSetIdentityGallery({ roleSet, roleResults, isEdited = false }: { roleSet: EditableRoleProfileEntry[]; roleResults: RoleResult[]; isEdited?: boolean }) {
  const presentations = buildRoleSetCardPresentations(roleSet, roleResults)

  return <section className="section page-width current-role-cards" id="your-role-set" aria-labelledby="current-role-cards-heading">
    <div className="section-heading">
      <span className="eyebrow">03 · Your choices</span>
      <h2 id="current-role-cards-heading">Your Role Set</h2>
      <p>{isEdited ? 'This personal set now differs from the assessment suggestion. Your changes do not rewrite the original Suggested Role Set or assessment evidence.' : 'This editable set starts with the assessment suggestion. Keep what feels useful, reorder or replace roles, add your own vocabulary, or leave the set empty.'} Editing it updates these cards and Share immediately.</p>
    </div>
    {roleSet.length ? <ol className="current-role-cards-grid" aria-label="Current role cards">
      {presentations.map((presentation, index) => {
        const entry = roleSet[index]
        const role = roleLibraryRoleForIdentity(presentation.roleId, entry?.assessmentRoleId)
        if (!role) return null
        return <li key={presentation.roleId}>
          <RoleIdentityCard
            role={role}
            variant="results"
            headingLevel={3}
            presentation={presentation}
          />
        </li>
      })}
    </ol> : <div className="empty-panel"><p>Your Role Set is empty. That is a valid personal choice; the original Suggested Role Set remains visible above, and you can add vocabulary in the editor below whenever you want.</p></div>}
  </section>
}
