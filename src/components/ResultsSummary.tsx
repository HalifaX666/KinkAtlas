import { ArrowRight, BookOpen, Compass, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roleLibraryRoleForIdentity } from '../data/roleIdentity'
import { traitById } from '../data/traits'
import { explainRoleResult } from '../engine/roleExplanation'
import type { EditableRoleProfileEntry, RoleProfileOptimization } from '../engine/roleProfileOptimizer'
import { relationshipsForLibraryRole } from '../taxonomy/roleLibrary'
import { roleLibraryPath } from '../taxonomy/roleLibrarySlugs'
import type { RoleResult, TraitId, TraitScore } from '../types'

const confidenceLabels = {
  high: 'High confidence',
  moderate: 'Medium confidence',
  low: 'Low confidence',
} as const

interface ResultsSummaryProps {
  suggestedRoleSet: EditableRoleProfileEntry[]
  optimization: RoleProfileOptimization
  roleResults: RoleResult[]
  topTraits: Array<[string, TraitScore | undefined]>
  onOpenFullReflection: () => void
}

function suggestedThemeLabels(suggestedRoleSet: EditableRoleProfileEntry[], roleResults: RoleResult[]): string[] {
  const resultById = new Map(roleResults.map((result) => [result.role.id, result]))
  const labels = suggestedRoleSet.flatMap((entry) => {
    const result = entry.assessmentRoleId ? resultById.get(entry.assessmentRoleId) : undefined
    return result?.supportingTraits.map((signal) => traitById[signal.id].label) ?? []
  })
  return [...new Set(labels)].slice(0, 4)
}

function overviewCopy(count: number): string {
  if (count === 0) return "Your answers haven't provided enough evidence for a specific role suggestion yet. You can still explore the role library and choose language that feels useful."
  if (count === 1) return 'Your answers point toward one role suggestion to explore. It is vocabulary supported by the available evidence, not an identity assigned to you.'
  return `Your answers point toward ${count} role suggestions. Together they represent supported parts of your answers without requiring you to adopt any of the labels.`
}

export function ResultsSummary({ suggestedRoleSet, optimization, roleResults, topTraits, onOpenFullReflection }: ResultsSummaryProps) {
  const resultById = new Map(roleResults.map((result) => [result.role.id, result]))
  const suggestedResults = suggestedRoleSet.flatMap((entry) => {
    const result = entry.assessmentRoleId ? resultById.get(entry.assessmentRoleId) : undefined
    return result ? [result] : []
  })
  const confidenceCounts = {
    high: suggestedResults.filter((result) => result.confidence === 'high').length,
    moderate: suggestedResults.filter((result) => result.confidence === 'moderate').length,
    low: suggestedResults.filter((result) => result.confidence === 'low').length,
  }
  const unscoredSuggestionCount = suggestedRoleSet.length - suggestedResults.length
  const themes = suggestedThemeLabels(suggestedRoleSet, roleResults)

  return <>
    <section className="section page-width results-overview" id="results-overview" aria-labelledby="results-overview-heading">
      <div className="section-heading">
        <span className="eyebrow">01 · Personal overview</span>
        <h2 id="results-overview-heading">What your answers suggest</h2>
      </div>
      <div className="results-overview-grid">
        <div className="results-overview-main">
          <Compass aria-hidden="true" />
          <p>{overviewCopy(suggestedRoleSet.length)}</p>
          {themes.length > 0 && <p><strong>Themes that came through:</strong> {themes.join(', ')}.</p>}
          <p className="results-identity-caveat">These findings describe patterns in the answers available to KinkAtlas. They do not determine identity, readiness, boundaries, compatibility, or consent.</p>
        </div>
        <div className="results-evidence-summary" aria-label="Suggestion evidence summary">
          <h3>Evidence at a glance</h3>
          {suggestedRoleSet.length > 0 ? <ul>
            {confidenceCounts.high > 0 && <li><strong>{confidenceCounts.high}</strong> with high confidence</li>}
            {confidenceCounts.moderate > 0 && <li><strong>{confidenceCounts.moderate}</strong> with medium confidence</li>}
            {confidenceCounts.low > 0 && <li><strong>{confidenceCounts.low}</strong> with low confidence</li>}
            {unscoredSuggestionCount > 0 && <li><strong>{unscoredSuggestionCount}</strong> supported without a scored confidence label</li>}
          </ul> : <p>No role suggestion met the current evidence and eligibility rules.</p>}
          <p>Confidence describes how much relevant answer evidence supports a suggestion—not certainty about your identity. Unanswered areas remain unknown, not rejected.</p>
        </div>
      </div>
      <nav className="results-section-nav" aria-label="Explore your results">
        <a href="#suggested-role-set">Suggested roles</a>
        <a href="#your-role-set">Your Role Set</a>
        <a href="#role-discovery">Role Discovery</a>
        <a href="#reflection">Reflection</a>
        <a href="#boundaries">Wants &amp; boundaries</a>
        <button type="button" onClick={onOpenFullReflection}><FileText size={16} />Full Reflection</button>
      </nav>
      <details className="calculation-disclosure results-theme-detail">
        <summary>See answer-theme detail</summary>
        <p>These normalized dimensions are supporting context, not identity scores. Independent dimensions can be strong at the same time.</p>
        <div className="trait-map">
          {topTraits.map(([id, score]) => (
            <div className="trait-bar" key={id}>
              <div>
                <strong id={`trait-${id}-label`}>{traitById[id as TraitId].label}</strong>
                <span>{score?.evidence ?? 0} responses</span>
              </div>
              <div className="bar-track" role="meter" aria-labelledby={`trait-${id}-label`} aria-valuemin={0} aria-valuemax={1} aria-valuenow={score?.value ?? 0} aria-valuetext={`${Math.round((score?.value ?? 0) * 100)}% normalized dimension strength`}>
                <span aria-hidden="true" style={{ width: `${Math.round((score?.value ?? 0) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </details>
    </section>

    <section className="section page-width suggested-role-set" id="suggested-role-set" aria-labelledby="suggested-role-set-heading">
      <div className="section-heading">
        <span className="eyebrow">02 · Assessment suggestion</span>
        <h2 id="suggested-role-set-heading">Suggested Role Set</h2>
        <p>KinkAtlas selected this starting set from the available assessment evidence. The order and suggested primary are unchanged from the recommendation model; you decide whether any label is useful.</p>
      </div>
      {suggestedRoleSet.length > 0 ? <ol className="suggested-role-list" aria-label="Suggested Role Set">
        {suggestedRoleSet.map((entry, index) => {
          const recommendation = optimization.recommendations.find((item) => item.candidate.roleId === entry.roleId)
          const result = entry.assessmentRoleId ? resultById.get(entry.assessmentRoleId) : undefined
          const explanation = result ? explainRoleResult(result) : undefined
          const role = roleLibraryRoleForIdentity(entry.roleId, entry.assessmentRoleId)
          const hasRelatedVocabulary = relationshipsForLibraryRole(entry.roleId).length > 0
          const isPrimary = optimization.primary?.candidate.roleId === entry.roleId
          const vocabularyConfirmed = recommendation?.candidate.vocabularyConfirmation === 'confirmed'
          return <li key={entry.roleId}>
            <div className="suggested-role-heading">
              <div>
                <span className="suggested-role-position">Suggestion {index + 1}</span>
                <h3>{entry.label}</h3>
              </div>
              {isPrimary && <span className="suggested-primary-label">Suggested primary</span>}
            </div>
            {entry.definition && <p className="suggested-role-meaning"><strong>What it means</strong>{entry.definition}</p>}
            <div className="suggested-role-reason">
              <strong>Why it was suggested</strong>
              <p>{recommendation?.candidate.evidenceExplanation ?? explanation?.summary ?? 'The available assessment evidence met this role’s reviewed suggestion rules.'}</p>
              {recommendation?.candidate.evidenceThemes?.length ? <p><span>Relevant themes:</span> {recommendation.candidate.evidenceThemes.join(', ')}.</p> : null}
            </div>
            <div className="suggested-role-confidence">
              <strong>{result ? confidenceLabels[result.confidence] : vocabularyConfirmed ? 'Directly confirmed vocabulary' : 'No scored confidence label'}</strong>
              <p>{explanation?.confidenceExplanation ?? (vocabularyConfirmed ? 'Direct confirmation can support this suggestion without creating an alignment percentage or confidence score.' : 'This reviewed evidence pathway does not produce a scored alignment or confidence label.')}</p>
            </div>
            {recommendation?.candidate.notImplied && <p className="suggested-role-distinction"><strong>Does not imply:</strong> {recommendation.candidate.notImplied}</p>}
            {role && <Link className="text-link" to={roleLibraryPath(role)}>{hasRelatedVocabulary ? 'Explore meaning and related roles' : 'Explore this role in detail'} <ArrowRight size={16} /></Link>}
          </li>
        })}
      </ol> : <div className="empty-panel suggested-role-empty">
        <BookOpen aria-hidden="true" />
        <div><h3>No specific role suggestion yet</h3><p>Your answers have not provided enough evidence for an automatic suggestion. This is a valid result—not a failed assessment.</p><Link className="text-link" to="/roles">Explore the role library <ArrowRight size={16} /></Link></div>
      </div>}
      {!optimization.primary && suggestedRoleSet.length > 0 && <p className="suggested-primary-empty">KinkAtlas did not identify a defensible suggested primary for this set. The suggestions remain available without one.</p>}
    </section>
  </>
}
