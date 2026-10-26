import { RoleEmblem } from './RoleEmblem'
import type { SharePackage } from '../sharing/sharePackage'

export function SharedResultView({ sharePackage, privateShare = false }: { sharePackage: SharePackage; privateShare?: boolean }) {
  const result = sharePackage.result
  return <div className="shared-result-view">
    <header className="results-hero page-width">
      <div className="results-hero-copy"><span className="eyebrow">{privateShare ? 'Private shared result' : 'Shared KinkAtlas result'}</span><h1>Their KinkAtlas</h1><p>This historical result is shown as it was shared. It has not been rescored, reranked, or updated with newer definitions.</p></div>
      <div className="result-privacy"><strong>Sharing is not consent.</strong><span>A result never gives or implies consent to any activity.</span></div>
    </header>
    <section className="section page-width current-role-cards" aria-labelledby="shared-cards-heading">
      <div className="section-heading"><span className="eyebrow">Role cards</span><h2 id="shared-cards-heading">Their cards</h2><p>These cards are part of the saved historical share.</p></div>
      {sharePackage.cards.length ? <ol className="current-role-cards-grid" aria-label="Shared role cards">{sharePackage.cards.map((card) => <li key={card.roleId}><article className="role-identity-card role-identity-card-results" data-role-id={card.roleId}>
        <div className="role-identity-brand"><span>KinkAtlas</span></div>
        <div className="role-identity-emblem"><RoleEmblem recipe={card.emblem} /></div>
        <div className="role-identity-copy"><span className="role-identity-family">{card.familyLabel}</span><h3>{card.label}</h3><p>{card.summary}</p></div>
        <dl className={`role-attribute-list${card.attributes.length ? '' : ' role-attribute-list-empty'}`}>{card.attributes.map((attribute) => <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>)}</dl>
        <div className="role-identity-context"><span>{card.sourceLabel}</span>{card.assessmentDetails.map((detail) => <small key={detail}>{detail}</small>)}</div>
        <div className="role-identity-link role-identity-static-footer"><span>Historical shared card</span></div>
      </article></li>)}</ol> : <div className="empty-panel"><p>The shared role set was empty. That is a valid result.</p></div>}
    </section>
    <section className="section page-width historical-result" aria-labelledby="shared-result-heading">
      <div className="section-heading"><span className="eyebrow">Historical result</span><h2 id="shared-result-heading">Their result experience</h2><p>Created {new Date(sharePackage.createdAt).toLocaleDateString()}.</p></div>
      <details open><summary>Current Role Set and definitions</summary>{result.currentRoleSet.length ? <ol className="historical-role-list">{result.currentRoleSet.map((role) => <li key={role.roleId}><strong>{role.label}</strong>{role.definition && <p>{role.definition}</p>}<small>{role.roleId === result.chosenPrimaryRoleId ? 'Primary role' : role.source === 'user-selected' ? 'Added by user' : 'Suggested by assessment'}</small></li>)}</ol> : <p>The shared role set was empty.</p>}</details>
      <details><summary>Strongest dimensions</summary><ol>{result.strongestDimensions.map((item) => <li key={item.traitId}><strong>{item.label}</strong> · {item.evidence} responses</li>)}</ol></details>
      <details><summary>Role Discovery</summary><div className="historical-discovery-grid">{result.roleDiscovery.map((role) => <article key={role.roleId}><h3>{role.label}</h3><p>{role.definition}</p><p><strong>{role.alignment}</strong> · {role.confidence} · {role.evidenceBreadth}% evidence breadth</p><p>{role.explanationSummary}</p></article>)}</div></details>
      <details><summary>Reflection, boundaries, and guidance</summary><div className="historical-section-grid">
        <section><h3>Reflection</h3>{result.readiness.map((item) => <p key={item.competency}><strong>{item.label}:</strong> {item.band}</p>)}</section>
        <section><h3>Potential blind spots</h3>{result.blindSpots.length ? result.blindSpots.map((item) => <p key={item.id}><strong>{item.title}:</strong> {item.description}</p>) : <p>None were displayed.</p>}</section>
        <section><h3>Important concepts</h3>{result.criticalFlags.length ? result.criticalFlags.map((item) => <p key={item.id}><strong>{item.title}:</strong> {item.description}</p>) : <p>None were displayed.</p>}</section>
        <section><h3>Wants &amp; boundaries</h3>{result.boundaries.length ? result.boundaries.map((item) => <p key={item.id}><strong>{item.label}:</strong> {item.responseLabel}. {item.message}</p>) : <p>None were displayed.</p>}</section>
        <section><h3>Conversation starters</h3>{result.conversationStatements.length ? result.conversationStatements.map((item) => <p key={item.questionId}><strong>{item.domain}:</strong> {item.statement}</p>) : <p>None were displayed.</p>}</section>
        <section><h3>Learning path</h3>{result.learningRecommendations.map((item) => <p key={item.title}><strong>{item.title}:</strong> {item.description}</p>)}</section>
      </div></details>
      <p className="share-disclaimer"><strong>Privacy receipt:</strong> {sharePackage.privacyReceipt.included.join(', ')}. Excluded: {sharePackage.privacyReceipt.excluded.join(', ')}.</p>
    </section>
  </div>
}
