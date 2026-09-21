import { ArrowRight, Brain, Compass, HeartHandshake, LockKeyhole, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PrivacyNote } from "../components/PrivacyNote";
import { CompletionCounter } from "../components/CompletionCounter";

const pillars = [
  { icon: Compass, title: "Discover", text: "Find vocabulary for dynamics and experiences that may appeal—without having an identity assigned to you." },
  { icon: Brain, title: "Learn", text: "Reflect on consent, communication, risk awareness, and the limits of what a quiz can know." },
  { icon: ShieldCheck, title: "Define", text: "Name wants, curiosity, uncertainty, and hard limits independently of role results." },
  { icon: MessageCircle, title: "Communicate", text: "Clarify how you prefer to negotiate, check in, pause, and follow up." },
];

export function HomePage() {
  return (
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <span className="eyebrow">A private map for adult self-reflection</span>
          <h1>
            Find the words for <em>what you want.</em>
          </h1>
          <p className="lede">Explore your interests, discover kink vocabulary, understand your boundaries, and identify areas worth learning more about—privately, on your device.</p>
          <div className="hero-actions">
            <Link className="button primary" to="/assessment">
              Start exploring <ArrowRight size={18} />
            </Link>
            <a className="button secondary" href="/about#how-it-works">
              How this works
            </a>
          </div>
          <div className="hero-trust">
            <span>No account</span>
            <span>No answer storage</span>
            <span>18+ only</span>
          </div>

          <div className="hero-completion-count">
            <CompletionCounter />
          </div>
        </div>
        <div className="atlas-preview" aria-label="Example of a kink map">
          <div className="orbit orbit-one">
            <span>Structure</span>
          </div>
          <div className="orbit orbit-two">
            <span>Care</span>
          </div>
          <div className="orbit orbit-three">
            <span>Play</span>
          </div>
          <div className="atlas-core">
            <Sparkles size={22} />
            <strong>Your map</strong>
            <small>
              many dimensions,
              <br />
              never one score
            </small>
          </div>
        </div>
      </section>
      <div className="page-width">
        <PrivacyNote />
      </div>
      <section id="how" className="section page-width">
        <div className="section-heading">
          <span className="eyebrow">Four separate lenses</span>
          <h2>Clarity comes from keeping different questions apart.</h2>
          <p>What appeals to you is not the same as what you call yourself, what you know, what your boundaries are, or what you consent to right now.</p>
        </div>
        <div className="pillar-grid">
          {pillars.map(({ icon: Icon, title, text }, index) => (
            <article className="pillar" key={title}>
              <span className="step">0{index + 1}</span>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="editorial-band">
        <div className="page-width split-section">
          <div>
            <span className="eyebrow">A suggestion, not a verdict</span>
            <h2>Role discovery you can question.</h2>
            <p>Each result shows the traits that raised or limited it, how many relevant answers support it, and confidence separately from alignment.</p>
            <Link className="text-link" to="/philosophy">
              Read our consent philosophy <ArrowRight size={16} />
            </Link>
          </div>
          <article className="sample-card">
            <div className="role-card-head">
              <div>
                <span className="eyebrow">Power exchange</span>
                <h3>Service Dominant</h3>
              </div>
              <span className="band band-explore">Worth exploring</span>
            </div>
            <p>Your answers suggest that direction, responsibility, and creating pleasure may overlap for you.</p>
            <div className="sample-traits">
              <span>Leadership ↑</span>
              <span>Service giving ↑</span>
              <span>Protocol ↔</span>
            </div>
            <small>Example only—not a result</small>
          </article>
        </div>
      </section>
      <section className="section page-width consent-callout">
        <HeartHandshake aria-hidden="true" />
        <div>
          <span className="eyebrow">The line that never moves</span>
          <h2>A result is never consent.</h2>
          <p>Consent is specific, informed, voluntary, ongoing, and can be withdrawn. A role, interest, previous answer, or apparent compatibility never replaces a conversation in the present.</p>
        </div>
      </section>
      <section className="section page-width">
        <div className="section-heading">
          <span className="eyebrow">Common questions</span>
          <h2>Before you begin</h2>
        </div>
        <div className="faq-grid">
          <details>
            <summary>Will my answers be saved?</summary>
            <p>No. Answers live only in browser memory. Reloading or closing this tab erases them. The app has no account, database, tracking pixel, or answer-storage API.</p>
          </details>
          <details>
            <summary>Can this tell me which role I am?</summary>
            <p>No. It suggests vocabulary that may be useful. Identity remains yours to choose, change, combine, or decline.</p>
          </details>
          <details>
            <summary>Does a strong readiness result mean someone is safe?</summary>
            <p>No. It reflects answers to limited scenarios, not real-world conduct. It cannot certify anyone as a safe partner.</p>
          </details>
          <details>
            <summary>What happens to a hard limit?</summary>
            <p>It stays independent of role alignment. It puts the related activity off the table, not the role. A limit is never scored as a weakness or treated as something to overcome.</p>
          </details>
        </div>
      </section>
      <section className="final-cta">
        <div className="page-width">
          <Sparkles aria-hidden="true" />
          <h2>Your map can be complex.</h2>
          <p>Strong, uncertain, curious, contradictory—all of it can be useful information.</p>
          <Link className="button primary" to="/assessment">
            Begin private exploration <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
