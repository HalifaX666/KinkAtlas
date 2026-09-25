import { ArrowRight, Target, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categories } from '../data/categories'
import { explainRoleResult, strongestContributingSignals } from '../engine/roleExplanation'
import type { RoleResult } from '../types'

export const alignmentLabels = { strong: 'Strong alignment', explore: 'Worth exploring', some: 'Some alignment', insufficient: 'Not enough information' }

export function RoleCard({ result }: { result: RoleResult }) {
  const category = categories.find((item) => item.id === result.role.primaryCategory)?.label
  const explanation = explainRoleResult(result)
  const signals = strongestContributingSignals(explanation)
  const confidence = result.confidence === 'moderate' ? 'Medium' : `${result.confidence[0].toUpperCase()}${result.confidence.slice(1)}`
  return <article className="role-card">
    <div className="role-card-head"><div><span className="eyebrow">{category}</span><h3>{result.role.name}</h3></div><div className="result-badges"><span className={`band band-${result.alignment}`}>{alignmentLabels[result.alignment]}</span><span className="confidence-badge">{confidence} confidence</span></div></div>
    <div className="role-meaning"><h4>Role meaning</h4><p>{result.role.description}</p></div>
    <details className="role-card-evidence">
      <summary>Why this result appeared</summary>
      <div className="why-block"><p>{explanation.summary}</p>{signals.length > 0 && <><h4>Strongest contributing signals</h4><div className="trait-chips">{signals.map((item) => <span className="trait-up" key={item.traitId}>{explanation.supportingSignals.some((signal) => signal.traitId === item.traitId) ? <TrendingUp size={14} /> : <Target size={14} />}{item.description}</span>)}</div></>}</div>
      <div className="evidence-row"><span>Based on <strong>{result.relevantAnswers}</strong> relevant response{result.relevantAnswers === 1 ? '' : 's'}</span><span><strong>{Math.round(result.coverage * 100)}%</strong> evidence breadth<small>of this role’s themes had usable answer evidence; not match strength.</small></span></div>
    </details>
    <Link className="text-link" to={`/roles/${result.role.id}`}>Explore this result <ArrowRight size={16} /></Link>
  </article>
}
