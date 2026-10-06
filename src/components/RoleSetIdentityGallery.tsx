import type { EditableRoleProfileEntry } from '../engine/roleProfileOptimizer'
import { buildRoleSetCardPresentations, roleLibraryRoleForIdentity } from '../data/roleIdentity'
import type { RoleResult } from '../types'
import { RoleIdentityCard } from './RoleIdentityCard'

export function RoleSetIdentityGallery({ roleSet, roleResults }: { roleSet: EditableRoleProfileEntry[]; roleResults: RoleResult[] }) {
  const presentations = buildRoleSetCardPresentations(roleSet, roleResults)

  return <section className="section page-width current-role-cards" aria-labelledby="current-role-cards-heading">
    <div className="section-heading">
      <span className="eyebrow">02 · Your role set</span>
      <h2 id="current-role-cards-heading">Your Role Cards</h2>
      <p>This is the role set you currently keep. Editing the set below updates these cards and Export & Share immediately.</p>
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
    </ol> : <div className="empty-panel"><p>Your role set is empty. That is valid; you can add vocabulary in the editor below whenever you want.</p></div>}
  </section>
}
