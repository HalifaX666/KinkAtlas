import { ArrowLeft, ArrowRight, BookOpen, Eye, HeartHandshake, LockKeyhole, MessageCircle, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RoleCard } from "../components/RoleCard";
import { ShareResultsDialog } from "../components/ShareResultsDialog";
import { RoleProfileBuilderLauncher } from "../components/RoleProfileBuilderLauncher";
import { boundaryItems, boundaryOptions } from "../data/boundaries";
import { getConversationStarter } from "../data/conversationStarters";
import { negotiationQuestions } from "../data/negotiation";
import { competencyDefinitions } from "../data/readiness";
import { traitById } from "../data/traits";
import { useAssessment } from "../context/AssessmentContext";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { activityRecommendations } from "../engine/activityRecommendations";
import { generateRecommendations } from "../engine/recommendations";
import { evaluateReadiness } from "../engine/readinessScoring";
import { matchRoles } from "../engine/roleMatching";
import type { EditableRoleProfileEntry } from "../engine/roleProfileOptimizer";
import type { ReadinessBand } from "../types";

const readinessLabels: Record<ReadinessBand, string> = { strong: "Established", developing: "Building", explore: "Further reflection", important: "Needs more reflection" };
const blindSpotLabels = { notice: "Reflection cue", concern: "Worth reviewing", critical: "Important concept" } as const;

export function ResultsPage() {
  const { answers } = useAssessment();
  const [sharing, setSharing] = useState(false);
  const [currentRoleSet, setCurrentRoleSet] = useState<EditableRoleProfileEntry[] | null>(null);
  const traitScores = useMemo(() => calculateTraitScores(answers.discovery), [answers.discovery]);
  const roleResults = useMemo(() => matchRoles(traitScores, answers.discovery), [traitScores, answers.discovery]);
  const activityGuidance = useMemo(() => activityRecommendations(answers.boundaries, boundaryItems), [answers.boundaries]);
  const readiness = useMemo(() => evaluateReadiness(answers.readiness), [answers.readiness]);
  const recommendations = useMemo(() => generateRecommendations(roleResults, readiness.competencies), [roleResults, readiness.competencies]);
  const shareData = useMemo(() => ({ roleResults, roleSet: currentRoleSet ?? [], readiness, boundaries: answers.boundaries, negotiation: answers.negotiation }), [roleResults, currentRoleSet, readiness, answers.boundaries, answers.negotiation]);
  const assessmentIsComplete = negotiationQuestions.every((question) => answers.negotiation[question.id] !== undefined);
  const topTraits = Object.entries(traitScores)
    .sort(([, left], [, right]) => (right?.value ?? 0) - (left?.value ?? 0))
    .slice(0, 10);

  if (Object.keys(answers.discovery).length === 0)
    return (
      <div className="page-width empty-results">
        <Sparkles />
        <h1>Your map is still blank.</h1>
        <p>Complete the private questionnaire to create a first set of explainable suggestions.</p>
        <Link className="button primary" to="/assessment">
          Start exploring <ArrowRight size={18} />
        </Link>
      </div>
    );

  return (
    <div className="results-page">
      <header className="results-hero page-width">
        <div className="results-hero-copy">
          <span className="eyebrow">Your private results</span>

          <h1>A map, not a verdict.</h1>

          <p>These are role-alignment suggestions, not identities assigned to you. A role match does not establish readiness, boundaries, compatibility, or consent.</p>

          <div className="results-read-guide">
            <Link className="button primary results-read-guide-button" to="/about#how-to-read-results" target="_blank" rel="noopener noreferrer">
              <span className="results-read-guide-copy">
                <span className="results-read-guide-title">Learn how to read your results</span>

                <span className="results-read-guide-note">*Opens in a new tab</span>
              </span>

              <ArrowRight size={18} />
            </Link>

            <Link className="quiet-button results-return-assessment" to="/assessment" state={assessmentIsComplete ? { returnTo: "review" } : undefined}>
              <ArrowLeft size={16} />
              Go back to assessment
            </Link>
          </div>
        </div>

        <div className="result-privacy">
          <LockKeyhole />
          <strong>Your answers and results were not uploaded or stored.</strong>
          <span>Reloading this page erases your session.</span>
        </div>
      </header>
      <section className="section page-width">
        <div className="section-heading">
          <span className="eyebrow">01 · Your kink map</span>
          <h2>Strongest dimensions</h2>
          <p>Independent dimensions can be strong at the same time. Directing does not cancel yielding; intensity does not cancel care.</p>
        </div>
        <div className="trait-map">
          {topTraits.map(([id, score]) => (
            <div className="trait-bar" key={id}>
              <div>
                <strong>{traitById[id as keyof typeof traitById].label}</strong>
                <span>{score!.evidence} responses</span>
              </div>
              <div className="bar-track">
                <span style={{ width: `${Math.round(score!.value * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <RoleProfileBuilderLauncher roleResults={roleResults} onRoleSetChange={setCurrentRoleSet} />
      <section className="page-width role-set-export-section" aria-labelledby="role-set-export-heading">
        <div>
          <span className="eyebrow">When you are ready</span>
          <h2 id="role-set-export-heading">Take your role set with you</h2>
          <p>Create shareable cards from your current role set for a profile, a conversation with someone you trust, or a manual post to FetLife. You choose whether and where to share; KinkAtlas never connects to or posts to a FetLife profile.</p>
        </div>
        <button className="button primary share-results-button" type="button" disabled={currentRoleSet === null} onClick={() => setSharing(true)}>
          <Share2 size={18} />
          Create my role cards
        </button>
      </section>

      <section className="section page-width">
        <div className="section-heading">
          <span className="eyebrow">03 · Role discovery</span>
          <h2>Role discovery</h2>
          <p>
            <strong>Alignment</strong> describes how closely your answers resemble a role’s themes. <strong>Confidence</strong> describes how much relevant information was available. Confidence is not the sort order: a Medium-confidence role can appear above a High-confidence role when its overall evidence and alignment rank higher.
          </p>
        </div>
        <div className="role-grid">
          {roleResults.slice(0, 12).map((result) => (
            <RoleCard result={result} key={result.role.id} />
          ))}
        </div>
      </section>

      <section className="editorial-band">
        <div className="page-width">
          <div className="section-heading">
            <span className="eyebrow">04 · Reflection</span>
            <h2>Reflection</h2>
            <p>These scenario results remain separate from role discovery.</p>
          </div>
          <div className="safety-disclaimer">
            <HeartHandshake />
            <p>
              <strong>This is not a safety score.</strong> It reflects knowledge and attitudes expressed through your answers. It cannot evaluate real-world behavior or certify anyone as a safe partner.
            </p>
          </div>
          <div className="reflection-grid">
            <div className="result-panel">
              <h3>
                <ShieldCheck />
                Established foundations
              </h3>
              {readiness.competencies
                .filter((item) => item.band === "strong")
                .map((item) => (
                  <ResultLine key={item.competency} title={competencyDefinitions[item.competency].label} text={competencyDefinitions[item.competency].description} band={readinessLabels[item.band]} />
                ))}
            </div>
            <div className="result-panel">
              <h3>
                <BookOpen />
                Areas to explore
              </h3>
              {readiness.competencies
                .filter((item) => item.band !== "strong")
                .map((item) => (
                  <ResultLine key={item.competency} title={competencyDefinitions[item.competency].label} text={competencyDefinitions[item.competency].description} band={readinessLabels[item.band]} />
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section page-width">
        <div className="section-heading">
          <span className="eyebrow">05 · Potential blind spots</span>
          <h2>Patterns worth a second look</h2>
          <p>Reflection cue marks an early signal; Worth reviewing marks a pattern for closer attention; Important concept marks a critical misconception. These describe response patterns, not you. Each explanation describes why it appeared, and critical flags remain visible regardless of other answers.</p>
        </div>
        {readiness.criticalFlags.length > 0 && (
          <div className="critical-flags">
            {readiness.criticalFlags.map((flag) => (
              <article key={flag.id}>
                <strong>{flag.title}</strong>
                <p>{flag.description}</p>
              </article>
            ))}
          </div>
        )}
        {readiness.blindSpots.length > 0 ? (
          <div className="blind-grid">
            {readiness.blindSpots.map((spot) => (
              <article key={spot.id}>
                <Eye />
                <div>
                  <span className={`signal signal-${spot.severity}`}>{blindSpotLabels[spot.severity]}</span>
                  <h3>{spot.title}</h3>
                  <p>
                    <strong>Why this appeared:</strong> {spot.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <p>No consistent reflection signals appeared. This is limited information, not a certification.</p>
          </div>
        )}
      </section>

      <section className="section page-width">
        <div className="section-heading">
          <span className="eyebrow">06 · Wants & boundaries</span>
          <h2>Independent by design</h2>
          <p>These choices guide activity suggestions but never alter role alignment or ordering.</p>
        </div>
        <div className="list-panel boundary-results">
          {activityGuidance.map((guidance) => (
            <article className="boundary-result" key={guidance.item.id}>
              <h3>{guidance.item.label}</h3>
              <p className="boundary-result-description">{guidance.item.description}</p>
              <p className="boundary-response">
                <span>Your response</span>
                <strong>{boundaryOptions.find((option) => option.value === answers.boundaries[guidance.item.id])?.label}</strong>
              </p>
              <small>
                {guidance.status} · {guidance.message}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="section page-width conversation-starters">
        <div className="section-heading">
          <span className="eyebrow">07 · Communication</span>
          <h2>Conversation starters</h2>
          <p>These turn your answers into language you can adapt when talking with a partner. They describe preferences you expressed in the assessment, not rules you are required to follow.</p>
        </div>
        <div className="list-panel">
          {negotiationQuestions
            .filter((question) => answers.negotiation[question.id])
            .slice(0, 8)
            .map((question) => (
              <div key={question.id}>
                <span>{question.domain}</span>
                <strong>{getConversationStarter(question.id, answers.negotiation[question.id])}</strong>
              </div>
            ))}
        </div>
      </section>

      <section className="section page-width">
        <div className="section-heading">
          <span className="eyebrow">08 · Learning path</span>
          <h2>Useful next steps</h2>
        </div>
        <div className="learning-grid">
          {recommendations.map((item, index) => (
            <article key={item.title}>
              <span>0{index + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div className="page-width">
          <MessageCircle />
          <h2>Take language, not permission.</h2>
          <p>A previously expressed interest is a reason to talk—not consent to act. Consent remains specific, informed, voluntary, ongoing, and withdrawable.</p>
          <Link className="button secondary" to="/philosophy">
            Review consent philosophy
          </Link>
        </div>
      </section>
      {sharing && currentRoleSet !== null && <ShareResultsDialog data={shareData} onClose={() => setSharing(false)} />}
    </div>
  );
}

function ResultLine({ title, text, band }: { title: string; text: string; band: string }) {
  return (
    <div className="result-line">
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <span>{band}</span>
    </div>
  );
}
