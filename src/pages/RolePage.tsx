import { ArrowLeft, BookOpen, Compass, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { alignmentLabels } from '../components/RoleCard'
import { QuestionCard } from '../components/QuestionCard'
import { categories } from '../data/categories'
import { discoveryQuestions } from '../data/questions'
import { roleById } from '../data/roles'
import { useAssessment } from '../context/AssessmentContext'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { explainRoleResult } from '../engine/roleExplanation'
import { matchRole } from '../engine/roleMatching'
import type { RoleExplanationSignal } from '../types'

export function RolePage() {
  const { roleId } = useParams()
  const role = roleId ? roleById[roleId] : undefined
  const { answers, answerDiscovery } = useAssessment()
  const scores = useMemo(() => calculateTraitScores(answers.discovery), [answers.discovery])
  const result = useMemo(() => role ? matchRole(role, scores, answers.discovery) : undefined, [role, scores, answers.discovery])
  const explanation = useMemo(() => result ? explainRoleResult(result) : undefined, [result])
  const initialBand = useRef(result?.alignment)

  if (!role || !result || !explanation) return <div className="page-width empty-results"><Compass /><h1>Role not found.</h1><p>This role may be unavailable or the link may be incomplete.</p><div className="empty-results-actions"><Link className="button primary" to="/assessment">Start exploring</Link><Link className="button secondary" to="/">Return home</Link></div></div>

  const category = categories.find((item) => item.id === role.primaryCategory)
  const facetLabels = role.facets.filter((id) => id !== role.primaryCategory).map((id) => categories.find((item) => item.id === id)?.label).filter(Boolean)
  const relevantTraits = new Set([...Object.keys(role.traits), ...Object.keys(role.differentiatingTraits)])
  const refinementQuestions = discoveryQuestions.filter((question) => question.phase === 'refine' && question.traits.some((trait) => relevantTraits.has(trait))).slice(0, 5)
  const related = (role.relatedRoleIds ?? []).flatMap((id) => roleById[id] ? [roleById[id]] : []).slice(0, 4)
  const confidenceLabel = result.confidence === 'moderate' ? 'Medium' : `${result.confidence[0].toUpperCase()}${result.confidence.slice(1)}`

  return <div className="page-width role-detail">
    <Link className="back-link" to="/results"><ArrowLeft size={16} />Back to your map</Link>
    <header><div><span className="eyebrow">{category?.label}{facetLabels.length ? ` · ${facetLabels.join(' · ')}` : ''}</span><h1>{role.name}</h1>{role.aliases.length > 0 && <p className="aliases">Also called {role.aliases.join(', ')}</p>}<p className="lede">{explanation.summary}</p></div>
      <div className="role-reading"><span className={`band band-${result.alignment}`}>{alignmentLabels[result.alignment]}</span><strong>{confidenceLabel} confidence</strong><small>{result.relevantAnswers} relevant responses · {Math.round(result.coverage * 100)}% evidence breadth</small>{initialBand.current !== result.alignment && <p><RefreshCw size={14} />Refined from {initialBand.current ? alignmentLabels[initialBand.current] : 'an earlier result'}</p>}</div>
    </header>

    <section className="role-definition-grid">
      <article><Sparkles /><h2>What this vocabulary describes</h2><p>{role.description}</p></article>
      <article><ShieldCheck /><h2>What it does not imply</h2><p>{role.notImplied}</p></article>
      <article><BookOpen /><h2>Consent & negotiation</h2><ul>{explanation.consentConsiderations.map((consideration) => <li key={consideration}>{consideration}</li>)}</ul><p>A role label never replaces specific, ongoing consent.</p></article>
    </section>

    <section className="section role-evidence"><div className="section-heading"><span className="eyebrow">Why this appeared</span><h2>Evidence from your answers</h2><p>These signals come directly from the traits observed by the scoring engine. They are context for reflection, not a claim about identity.</p></div>
      <div className="signal-groups">
        <SignalGroup title="Strongest support" signals={explanation.supportingSignals} empty="No strong supporting signals were observed yet." />
        <SignalGroup title="What distinguishes it" signals={explanation.differentiatingSignals} empty="More answers may help distinguish this from nearby vocabulary." />
        {(explanation.limitingSignals.length > 0 || explanation.contrarySignals.length > 0) && <SignalGroup title="Limiting or contrary signals" signals={[...explanation.limitingSignals, ...explanation.contrarySignals]} empty="" />}
      </div>
      <details className="calculation-disclosure"><summary>How was this calculated?</summary><div><p><strong>Alignment</strong> describes how closely your observed preferences resemble this role’s weighted themes, including supporting, differentiating, and contrary signals.</p><p><strong>Confidence</strong> describes the amount and coverage of relevant information—not certainty that a label fits.</p><p>{explanation.confidenceExplanation}</p><p>{explanation.coverageExplanation}</p></div></details>
    </section>

    <section className="section reflection-prompts"><div className="section-heading"><span className="eyebrow">Questions to reflect on</span><h2>Does the vocabulary feel useful?</h2><p>These optional prompts do not affect scoring. They are simply a way to test the terminology against your own experience.</p></div><ol>{explanation.reflectionQuestions.map((question) => <li key={question}>{question}</li>)}</ol></section>

    {refinementQuestions.length > 0 && <section className="section refine-section"><div className="section-heading"><span className="eyebrow">Refine this result</span><h2>Add discriminating context</h2><p>These optional assessment questions focus on traits that distinguish this role from nearby suggestions.</p></div><div className="refinement-grid">{refinementQuestions.map((question) => <QuestionCard key={question.id} question={question} selected={answers.discovery[question.id]} onAnswer={(answerId) => answerDiscovery(question.id, answerId)} />)}</div></section>}

    {related.length > 0 && <section className="related-roles"><div className="section-heading"><span className="eyebrow">Related vocabulary</span><h2>Useful distinctions</h2><p>Nearby terms can overlap without meaning the same thing. Compare the emphasis and keep only the language that resonates.</p></div><div>{related.map((candidate) => <Link key={candidate.id} to={`/roles/${candidate.id}`}><strong>{candidate.name}</strong><span>{role.comparisonNotes?.[candidate.id] ?? candidate.description}</span>{role.comparisonNotes?.[candidate.id] && <em>Compare why these differ</em>}</Link>)}</div></section>}
  </div>
}

function SignalGroup({ title, signals, empty }: { title: string; signals: RoleExplanationSignal[]; empty: string }) {
  return <article className="signal-group"><h3>{title}</h3>{signals.length > 0 ? <ul>{signals.map((signal) => <li key={`${signal.strength}-${signal.traitId}`}><strong>{signal.label}</strong><small>{signal.description}</small></li>)}</ul> : <p>{empty}</p>}</article>
}
