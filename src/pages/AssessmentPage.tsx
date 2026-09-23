import { ArrowLeft, ArrowRight, Check, LockKeyhole, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PrivacyNote } from "../components/PrivacyNote";
import { QuestionCard } from "../components/QuestionCard";
import { boundaryItems, boundaryOptions } from "../data/boundaries";
import { categories } from "../data/categories";
import { discoveryQuestions } from "../data/questions";
import { negotiationQuestions } from "../data/negotiation";
import { readinessQuestions } from "../data/readiness";
import { useAssessment } from "../context/AssessmentContext";
import { recordAssessmentCompletion } from "../services/completionCount";
import { discoveryProgress, selectNextDiscoveryQuestion } from "../engine/adaptiveQuestioning";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { selectRefinementQuestions } from "../engine/refinementRouting";
import type { BoundaryValue } from "../types";

type Phase = "intro" | "discovery" | "refinement" | "readiness" | "boundaries" | "negotiation";

const readinessSet = readinessQuestions.filter((question, index, all) => all.findIndex((item) => item.domain === question.domain) === index);

const phaseLabels: {
  id: Exclude<Phase, "intro">;
  label: string;
}[] = [
  { id: "discovery", label: "Discover" },
  { id: "refinement", label: "Refine" },
  { id: "readiness", label: "Reflect" },
  { id: "boundaries", label: "Define" },
  { id: "negotiation", label: "Communicate" },
];

export function AssessmentPage() {
  const { answers, answerDiscovery, answerRefinement, answerReadiness, answerBoundary, answerNegotiation, removeDiscoveryAnswer, reset } = useAssessment();

  const location = useLocation();
  const navigate = useNavigate();
  const assessmentIsComplete = negotiationQuestions.every((question) => answers.negotiation[question.id] !== undefined);
  const returningToReview = (location.state as { returnTo?: string } | null)?.returnTo === "review" && assessmentIsComplete;

  const [phase, setPhase] = useState<Phase>(returningToReview ? "negotiation" : "intro");
  const [discoveryHistory, setDiscoveryHistory] = useState<string[]>([]);
  const [discoveryCursor, setDiscoveryCursor] = useState<number | null>(null);
  const [refinementIndex, setRefinementIndex] = useState(0);
  const [readinessIndex, setReadinessIndex] = useState(0);
  const [negotiationIndex, setNegotiationIndex] = useState(returningToReview ? negotiationQuestions.length - 1 : 0);

  const completionRequested = useRef(false);

  const traitScores = useMemo(() => calculateTraitScores(answers.discovery), [answers.discovery]);
  const refinementQuestions = useMemo(() => selectRefinementQuestions(answers, traitScores), [answers, traitScores]);

  const refinementQuestion = refinementQuestions[refinementIndex];
  const nextDiscoveryQuestion = useMemo(() => selectNextDiscoveryQuestion(answers, traitScores), [answers, traitScores]);

  const discoveryQuestion = useMemo(() => (discoveryCursor === null ? nextDiscoveryQuestion : discoveryQuestions.find((question) => question.id === discoveryHistory[discoveryCursor])), [discoveryCursor, discoveryHistory, nextDiscoveryQuestion]);

  const allBoundariesAnswered = useMemo(() => boundaryItems.every((item) => answers.boundaries[item.id] !== undefined), [answers.boundaries]);

  const answerDiscoveryAndAdvance = (answerId: string) => {
    if (!discoveryQuestion) return;

    const questionId = discoveryQuestion.id;
    const previousAnswer = answers.discovery[questionId];

    if (discoveryCursor !== null) {
      if (previousAnswer !== answerId) {
        const invalidatedQuestionIds = discoveryHistory.slice(discoveryCursor + 1);
        answerDiscovery(questionId, answerId);
        invalidatedQuestionIds.forEach(removeDiscoveryAnswer);
        setDiscoveryHistory((current) => current.slice(0, discoveryCursor + 1));
        setDiscoveryCursor(null);
        return;
      }

      setDiscoveryCursor((current) => (current !== null && current < discoveryHistory.length - 1 ? current + 1 : null));
      return;
    }

    answerDiscovery(questionId, answerId);
    setDiscoveryHistory((current) => (current.includes(questionId) ? current : [...current, questionId]));
  };

  const backFromDiscovery = () => {
    if (discoveryCursor !== null) {
      if (discoveryCursor === 0) setPhase("intro");
      else setDiscoveryCursor((current) => (current === null ? null : current - 1));
      return;
    }

    if (discoveryHistory.length) setDiscoveryCursor(discoveryHistory.length - 1);
    else setPhase("intro");
  };

  const viewResults = () => {
    if (!completionRequested.current) {
      completionRequested.current = true;
      void recordAssessmentCompletion();
    }

    navigate("/results");
  };

  if (phase === "intro") {
    return (
      <div className="page-width onboarding">
        <PrivacyNote compact />

        <div className="onboarding-card">
          <span className="eyebrow">Before we begin</span>

          <h1>A private reflection for adults.</h1>

          <p className="lede">There are no identities to earn and no perfect answers. Choose what feels most accurate now; uncertainty and declining to answer are valid information.</p>

          <div className="onboarding-list">
            <div>
              <Check />
              <p>
                <strong>Intended for adults 18+</strong>
                <span>Educational self-reflection, not medical or psychological advice.</span>
              </p>
            </div>

            <div>
              <LockKeyhole />
              <p>
                <strong>Answers stay in memory</strong>
                <span>No account, browser storage, database, or answer transmission. Reloading erases your session.</span>
              </p>
            </div>

            <div>
              <Check />
              <p>
                <strong>Suggestions are not assignments</strong>
                <span>No result defines your identity, readiness, compatibility, or consent.</span>
              </p>
            </div>

            <div>
              <Check />
              <p>
                <strong>You can always decline to answer</strong>
                <span>“Prefer not to answer” and “I don’t know” are valid responses and never count against you.</span>
              </p>
            </div>
          </div>

          <div className="notice">This questionnaire cannot evaluate real-world behavior or certify anyone as a safe partner.</div>

          <button className="button primary" onClick={() => setPhase("discovery")}>
            I’m 18 or older—begin
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const activePhase = phaseLabels.findIndex((item) => item.id === phase);

  return (
    <div className="assessment-layout">
      <header className="assessment-header page-width">
        <div>
          <span className="eyebrow">Private assessment</span>
          <h1>{phaseLabels[activePhase]?.label}</h1>
        </div>

        <button
          className="quiet-button"
          onClick={() => {
            reset();
            setPhase("intro");
            setDiscoveryHistory([]);
            setDiscoveryCursor(null);
            setRefinementIndex(0);
            setReadinessIndex(0);
            setNegotiationIndex(0);
          }}
        >
          <RotateCcw size={15} />
          Start over
        </button>
      </header>

      <nav className="stage-nav page-width" aria-label="Assessment stages">
        {phaseLabels.map((item, index) => (
          <span key={item.id} className={index === activePhase ? "active" : index < activePhase ? "done" : ""}>
            <i>{index < activePhase ? "✓" : index + 1}</i>
            {item.label}
          </span>
        ))}
      </nav>

      {phase === "discovery" && (
        <section className="question-stage page-width">
          {discoveryQuestion ? (
            <>
              <div className="question-meta">
                <div>
                  <span className="eyebrow">{categories.find((category) => category.id === discoveryQuestion.domain)?.label}</span>

                  <p>
                    {discoveryProgress(answers.discovery).stage} · {discoveryProgress(answers.discovery).detail}
                  </p>
                </div>

                <span>Question {discoveryCursor === null ? discoveryHistory.length + 1 : discoveryCursor + 1}</span>
              </div>

              <QuestionCard question={discoveryQuestion} selected={answers.discovery[discoveryQuestion.id]} onAnswer={answerDiscoveryAndAdvance} focusPrompt />

              <div className="question-controls">
                <button className="quiet-button" onClick={backFromDiscovery}>
                  <ArrowLeft size={16} />
                  Back
                </button>

                <p>Choose an answer to continue automatically.</p>
              </div>
            </>
          ) : (
            <StageComplete
              title="Your discovery map has enough coverage for a first reading."
              text="Next, Refine can look more closely at relevant role patterns without changing your underlying Discovery alignment."
              onBack={backFromDiscovery}
              onContinue={() => {
                setRefinementIndex(0);
                setPhase("refinement");
              }}
            />
          )}
        </section>
      )}

      {phase === "refinement" && (
        <section className="question-stage page-width">
          {refinementQuestion ? (
            <>
              <div className="question-meta">
                <div>
                  <span className="eyebrow">Role refinement</span>

                  <p>Role style and intersection exploration · separate from Discovery alignment</p>
                </div>

                <span>
                  {refinementIndex + 1} of {refinementQuestions.length}
                </span>
              </div>

              <QuestionCard
                question={refinementQuestion}
                selected={answers.refinement[refinementQuestion.id]}
                onAnswer={(answerId) => {
                  answerRefinement(refinementQuestion.id, answerId);
                  setRefinementIndex((index) => index + 1);
                }}
                focusPrompt
              />

              <div className="question-controls">
                <button
                  className="quiet-button"
                  onClick={() => {
                    if (refinementIndex === 0) {
                      setPhase("discovery");
                      setDiscoveryCursor(discoveryHistory.length ? discoveryHistory.length - 1 : null);
                    } else {
                      setRefinementIndex((index) => index - 1);
                    }
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <p>Refine can distinguish supported patterns, but it cannot create a parent role or change your Discovery score.</p>
              </div>
            </>
          ) : (
            <StageComplete
              title={refinementQuestions.length ? "Refinement complete." : "No extra refinement is needed yet."}
              text={refinementQuestions.length ? "These answers add context to supported role patterns without changing your original Discovery alignment." : "Your Discovery evidence is preserved as-is. As refinement branches are added, only relevant follow-up questions will appear here."}
              onBack={() => {
                if (refinementQuestions.length) {
                  setRefinementIndex(refinementQuestions.length - 1);
                } else {
                  setPhase("discovery");
                  setDiscoveryCursor(discoveryHistory.length ? discoveryHistory.length - 1 : null);
                }
              }}
              onContinue={() => setPhase("readiness")}
            />
          )}
        </section>
      )}

      {phase === "readiness" && (
        <section className="question-stage page-width">
          {readinessIndex < readinessSet.length ? (
            <>
              <div className="question-meta">
                <div>
                  <span className="eyebrow">Reflection scenario</span>

                  <p>Knowledge and attitudes · separate from discovery</p>
                </div>

                <span>
                  {readinessIndex + 1} of {readinessSet.length}
                </span>
              </div>

              <QuestionCard
                question={readinessSet[readinessIndex]}
                selected={answers.readiness[readinessSet[readinessIndex].id]}
                onAnswer={(answerId) => {
                  answerReadiness(readinessSet[readinessIndex].id, answerId);

                  setReadinessIndex((index) => index + 1);
                }}
                focusPrompt
              />

              <div className="question-controls">
                <button
                  className="quiet-button"
                  onClick={() => {
                    if (readinessIndex === 0) {
                      setRefinementIndex(refinementQuestions.length ? refinementQuestions.length - 1 : 0);
                      setPhase("refinement");
                    } else {
                      setReadinessIndex((index) => index - 1);
                    }
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <p>These scenarios measure concepts expressed in your answers, not conduct.</p>
              </div>
            </>
          ) : (
            <StageComplete title="Reflection complete." text="Your responses can identify foundations and possible blind spots. They cannot certify safety or predict behavior." onBack={() => setReadinessIndex(readinessSet.length - 1)} onContinue={() => setPhase("boundaries")} />
          )}
        </section>
      )}

      {phase === "boundaries" && (
        <section className="wide-stage page-width">
          <div className="section-heading">
            <span className="eyebrow">Wants & boundaries</span>

            <h2>These choices stand on their own.</h2>

            <p>Your boundaries stay separate from role alignment. A limit can remove an activity from suggestions without making a role less valid or less aligned. Choose a response for every item. If you would rather not answer something, select “Prefer not to answer.”</p>
          </div>

          <div className="boundary-grid">
            {boundaryItems.map((item) => (
              <label className="boundary-item" key={item.id}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>

                <select
                  value={answers.boundaries[item.id] ?? ""}
                  onChange={(event) => {
                    if (event.target.value) {
                      answerBoundary(item.id, event.target.value as BoundaryValue);
                    }
                  }}
                >
                  <option value="" disabled hidden>
                    Choose an answer
                  </option>

                  {boundaryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="stage-actions">
            <button
              className="quiet-button"
              onClick={() => {
                setReadinessIndex(readinessSet.length - 1);
                setPhase("readiness");
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <button
              className="button primary"
              disabled={!allBoundariesAnswered}
              onClick={() => {
                if (!allBoundariesAnswered) return;

                setPhase("negotiation");
              }}
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}

      {phase === "negotiation" && (
        <section className="question-stage page-width">
          {negotiationIndex < negotiationQuestions.length ? (
            <>
              <div className="question-meta">
                <div>
                  <span className="eyebrow">Negotiation preference</span>

                  <p>No answer below grants consent.</p>
                </div>

                <span>
                  {negotiationIndex + 1} of {negotiationQuestions.length}
                </span>
              </div>

              <QuestionCard
                question={negotiationQuestions[negotiationIndex]}
                selected={answers.negotiation[negotiationQuestions[negotiationIndex].id]}
                onAnswer={(answerId) => {
                  answerNegotiation(negotiationQuestions[negotiationIndex].id, answerId);

                  setNegotiationIndex((index) => index + 1);
                }}
                focusPrompt
              />

              <div className="question-controls">
                <button
                  className="quiet-button"
                  onClick={() => {
                    if (negotiationIndex === 0) setPhase("boundaries");
                    else setNegotiationIndex((index) => index - 1);
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <p>Preferences are conversation prompts, not agreements.</p>
              </div>
            </>
          ) : (
            <StageComplete title="Your first map is ready." text="Everything on the next page was calculated here in your browser. Your answers and results were not uploaded or stored." button="View my results" onBack={() => setNegotiationIndex(negotiationQuestions.length - 1)} onContinue={viewResults} />
          )}
        </section>
      )}
    </div>
  );
}

function StageComplete({ title, text, button = "Continue", onContinue, onBack }: { title: string; text: string; button?: string; onContinue: () => void; onBack: () => void }) {
  return (
    <>
      <div className="stage-complete">
        <span className="complete-mark">
          <Check />
        </span>

        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      <div className="question-controls stage-complete-controls">
        <button type="button" className="quiet-button" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </button>

        <button type="button" className="button primary" onClick={onContinue}>
          {button}
          <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
