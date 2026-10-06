import { ArrowLeft, BookOpen, Compass, ShieldCheck, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RoleIdentityCard } from '../components/RoleIdentityCard'
import { alignmentLabels } from '../components/RoleCard'
import { useAssessment } from '../context/AssessmentContext'
import { roleAssessmentSupport, roleFamilyLabel } from '../data/roleIdentity'
import { rolePresentationById } from '../data/rolePresentation'
import { roleById } from '../data/roles'
import { calculateTraitScores } from '../engine/discoveryScoring'
import { buildRelatedRoleProfiles } from '../engine/roleProfileExploration'
import { explainRoleResult } from '../engine/roleExplanation'
import { matchRole } from '../engine/roleMatching'
import { roleLibraryRoleById, type RoleLibraryRole } from '../taxonomy/roleLibrary'
import { roleLibraryRoleBySlug, roleLibrarySlug } from '../taxonomy/roleLibrarySlugs'
import type { RoleExplanationSignal } from '../types'

function assessmentHandling(role: RoleLibraryRole): string {
  if (role.decisionPathway === 'manual-only' || role.recommendationEligibility === 'exploration-only') return 'KinkAtlas keeps this term available for manual exploration. It is not automatically suggested from assessment patterns.'
  if (role.decisionPathway === 'explicit-confirmation' || role.assessmentMode === 'explicit-selection') return 'KinkAtlas only includes this label as an assessment suggestion after direct confirmation. Related themes alone are not treated as enough.'
  if (role.assessmentMode === 'direct-interest') return 'KinkAtlas can consider this role when you express direct interest in its specific themes. General similarity does not substitute for that evidence.'
  if (role.assessmentMode === 'hybrid') return 'KinkAtlas considers both broader assessment evidence and direct answers connected to this role before suggesting it.'
  return 'KinkAtlas can suggest this role when enough relevant assessment evidence supports it. A suggestion remains vocabulary to consider, not an identity assignment.'
}

export function RoleLibraryRolePage() {
  const { roleId } = useParams()
  const role = roleId ? roleLibraryRoleBySlug.get(roleId) : undefined
  const presentation = role ? rolePresentationById.get(role.id) : undefined
  const { answers, assessmentCompletion } = useAssessment()
  const hasSessionEvidence = Object.keys(answers.discovery).length > 0
  const scoredRoleId = role?.canonicalRoleId ?? (role ? roleLibrarySlug(role) : undefined)
  const scoredRole = scoredRoleId ? roleById[scoredRoleId] : undefined
  const scores = useMemo(() => hasSessionEvidence ? calculateTraitScores(answers.discovery) : undefined, [answers.discovery, hasSessionEvidence])
  const result = useMemo(() => scoredRole && scores ? matchRole(scoredRole, scores, answers.discovery) : undefined, [answers.discovery, scoredRole, scores])
  const explanation = useMemo(() => result ? explainRoleResult(result) : undefined, [result])
  const related = useMemo(() => role ? buildRelatedRoleProfiles([role.id], 6) : [], [role])

  if (!role) return <div className="page-width empty-results"><Compass /><h1>Role not found.</h1><p>This role may be unavailable or the link may be incomplete.</p><div className="empty-results-actions"><Link className="button primary" to="/roles">Browse Role Library</Link><Link className="button secondary" to="/">Return home</Link></div></div>

  const families = role.familyIds.map((id) => roleFamilyLabel({ ...role, familyIds: [id] })).filter(Boolean)
  const confidenceLabel = result ? (result.confidence === 'moderate' ? 'Medium' : `${result.confidence[0].toUpperCase()}${result.confidence.slice(1)}`) : undefined
  const meaning = presentation?.meaning ?? role.definition

  return <div className="page-width role-library-detail">
    <nav className="role-page-backlinks" aria-label="Role page navigation">
      <Link className="back-link" to="/roles"><ArrowLeft size={16} />Back to Role Library</Link>
      {assessmentCompletion.complete && <Link className="text-link" to="/results">Back to your results</Link>}
    </nav>

    <header className="role-library-detail-hero">
      <div className="role-library-detail-intro">
        <span className="eyebrow">{roleFamilyLabel(role)}</span>
        <h1>{role.label}</h1>
        {role.aliases.length > 0 && <p className="aliases">Also called {role.aliases.join(', ')}</p>}
        <p className="lede">{presentation?.shortSummary ?? role.definition ?? "KinkAtlas doesn't have a reviewed explanation for this term yet."}</p>
        <p className="role-page-boundary">A role can be useful language without becoming your identity, and no role implies consent.</p>
      </div>
      <RoleIdentityCard role={role} variant="detail" headingLevel={2} showLink={false} />
    </header>

    <section className="role-editorial-grid">
      <article><Sparkles /><h2>What does this mean?</h2>{meaning ? <p>{meaning}</p> : <p className="role-definition-unavailable">KinkAtlas doesn't have a reviewed explanation for this term yet. The label remains available to browse without a synthesized definition.</p>}</article>
      <article><BookOpen /><h2>At a glance</h2>{presentation ? <dl className="role-page-attributes">{presentation.attributes.map((attribute) => <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>)}</dl> : <div className="role-library-facts"><p><strong>Families</strong><span>{families.length ? families.join(' · ') : 'No reviewed family'}</span></p><p><strong>Assessment support</strong><span>{roleAssessmentSupport(role)}</span></p></div>}</article>
      {presentation && <article><h2>What this can look like</h2><p>{presentation.canLookLike}</p></article>}
      {presentation && <article><ShieldCheck /><h2>What it doesn't automatically mean</h2><p>{presentation.notAutomatic}</p></article>}
    </section>

    <section className="section role-handling"><div className="section-heading"><span className="eyebrow">Assessment boundaries</span><h2>How KinkAtlas handles this role</h2></div><p>{assessmentHandling(role)}</p><p><strong>{roleAssessmentSupport(role)}.</strong> This presentation metadata is descriptive only and never changes scoring, eligibility, or ranking.</p></section>

    {result && explanation && <section className="section role-evidence"><div className="section-heading"><span className="eyebrow">Your current session</span><h2>How this relates to your answers</h2><p>This optional context is separate from the role's meaning and exists only in this browser session.</p></div>
      <div className="role-session-reading"><span className={`band band-${result.alignment}`}>{alignmentLabels[result.alignment]}</span><strong>{confidenceLabel} confidence</strong><span>{result.relevantAnswers} relevant response{result.relevantAnswers === 1 ? '' : 's'} · {Math.round(result.coverage * 100)}% evidence breadth</span></div>
      <div className="signal-groups"><SignalGroup title="Strongest support" signals={explanation.supportingSignals} empty="No strong supporting signals were observed yet." /><SignalGroup title="What distinguishes it" signals={explanation.differentiatingSignals} empty="More answers may help distinguish this from nearby vocabulary." />{(explanation.limitingSignals.length > 0 || explanation.contrarySignals.length > 0) && <SignalGroup title="Limiting or contrary signals" signals={[...explanation.limitingSignals, ...explanation.contrarySignals]} empty="" />}</div>
      <details className="calculation-disclosure"><summary>How was this calculated?</summary><div><p><strong>Alignment</strong> describes how closely your observed preferences resemble this role's weighted themes, including supporting, differentiating, and contrary signals.</p><p><strong>Confidence</strong> describes the amount and coverage of relevant information—not certainty that a label fits.</p><p>{explanation.confidenceExplanation}</p><p>{explanation.coverageExplanation}</p></div></details>
    </section>}

    {scoredRole && <section className="section reflection-prompts"><div className="section-heading"><span className="eyebrow">Questions to reflect on</span><h2>Does the vocabulary feel useful?</h2><p>These optional prompts do not affect scoring. They are simply a way to test the terminology against your own experience.</p><p>Browsing role pages does not change your results. <Link className="text-link" to="/assessment" state={{ returnTo: 'review' }}>Return to the assessment</Link> if you want to reconsider an answer.</p></div><ol>{scoredRole.reflectionQuestions.map((question) => <li key={question}>{question}</li>)}</ol></section>}

    {related.length > 0 && <section className="section related-role-library"><div className="section-heading"><span className="eyebrow">Related vocabulary</span><h2>Useful distinctions</h2><p>These connections come from the reviewed relationship graph, with family links used only as a lower-priority fallback.</p></div><div className="related-role-library-grid">{related.map((candidate) => {
      const relatedRole = roleLibraryRoleById.get(candidate.roleId)
      return relatedRole ? <div className="related-role-entry" key={candidate.roleId}><RoleIdentityCard role={relatedRole} variant="browse" headingLevel={3} /><p><strong>Why it is related:</strong> {candidate.reason}</p></div> : null
    })}</div></section>}
  </div>
}

function SignalGroup({ title, signals, empty }: { title: string; signals: RoleExplanationSignal[]; empty: string }) {
  return <article className="signal-group"><h3>{title}</h3>{signals.length > 0 ? <ul>{signals.map((signal) => <li key={`${signal.strength}-${signal.traitId}`}><strong>{signal.label}</strong><small>{signal.description}</small></li>)}</ul> : <p>{empty}</p>}</article>
}
