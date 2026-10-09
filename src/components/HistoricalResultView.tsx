import type { ResultSnapshot } from '../capsules/capsuleData'

export function HistoricalResultView({ snapshot }: { snapshot: ResultSnapshot }) {
  return <section className="historical-result" aria-labelledby="historical-result-heading">
    <div className="section-heading">
      <span className="eyebrow">Restored historical result</span>
      <h2 id="historical-result-heading">Your saved KinkAtlas result</h2>
      <p>This read-only view reflects the saved assessment and role-library revisions. It has not been rescored or reinterpreted.</p>
      <dl className="capsule-revision-list">
        <div><dt>Engine revision</dt><dd>{snapshot.engineRevision}</dd></div>
        <div><dt>Role-library revision</dt><dd>{snapshot.roleLibraryRevision}</dd></div>
      </dl>
    </div>

    <section aria-labelledby="historical-role-set-heading">
      <h3 id="historical-role-set-heading">Your Role Set</h3>
      {snapshot.currentRoleSet.length ? <ol className="historical-role-list">
        {snapshot.currentRoleSet.map((role) => <li key={role.roleId}>
          <strong>{role.label}</strong>
          {role.definition && <p>{role.definition}</p>}
          <small>{role.source === 'user-selected' ? 'Added by you' : 'Suggested by assessment'}{role.roleId === snapshot.chosenPrimaryRoleId ? ' · Saved primary' : ''}</small>
        </li>)}
      </ol> : <p>Your saved role set was empty.</p>}
    </section>

    <details>
      <summary>Saved strongest dimensions</summary>
      <ol>{snapshot.strongestDimensions.map((item) => <li key={item.traitId}><strong>{item.label}</strong> · {item.evidence} responses</li>)}</ol>
    </details>

    <details>
      <summary>Saved Role Discovery</summary>
      <div className="historical-discovery-grid">{snapshot.roleDiscovery.map((role) => <article key={role.roleId}>
        <h3>{role.label}</h3>
        <p>{role.definition}</p>
        <p><strong>{role.alignment}</strong> · {role.confidence} · {role.evidenceBreadth}% evidence breadth</p>
        <p>{role.explanation.summary}</p>
      </article>)}</div>
    </details>

    <details>
      <summary>Saved reflection and guidance</summary>
      <div className="historical-section-grid">
        <section><h3>Reflection</h3>{snapshot.readiness.map((item) => <p key={item.competency}><strong>{item.label}:</strong> {item.band}</p>)}</section>
        <section><h3>Potential blind spots</h3>{snapshot.blindSpots.length ? snapshot.blindSpots.map((item) => <p key={item.id}><strong>{item.title}:</strong> {item.description}</p>) : <p>None were displayed.</p>}</section>
        <section><h3>Wants &amp; boundaries</h3>{snapshot.boundaries.length ? snapshot.boundaries.map((item) => <p key={item.id}><strong>{item.label}:</strong> {item.responseLabel}. {item.message}</p>) : <p>No boundary guidance was displayed.</p>}</section>
        <section><h3>Conversation starters</h3>{snapshot.conversationStatements.length ? snapshot.conversationStatements.map((item) => <p key={item.questionId}><strong>{item.domain}:</strong> {item.statement}</p>) : <p>None were displayed.</p>}</section>
        <section><h3>Learning path</h3>{snapshot.learningRecommendations.map((item) => <p key={item.title}><strong>{item.title}:</strong> {item.description}</p>)}</section>
      </div>
    </details>
  </section>
}
