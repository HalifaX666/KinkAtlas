import { useState } from "react";
import { Link } from "react-router-dom";

const questions = [
  ["What is KinkAtlas?", "KinkAtlas is a private self-reflection tool that suggests role vocabulary from patterns in your answers. It does not decide your identity."],
  ["How does KinkAtlas work?", "It uses deterministic, rules-based assessment with reviewed question-to-theme mappings and role evidence rules."],
  ["Does KinkAtlas use AI to generate my results?", "Generative AI does not analyze your answers or generate your results."],
  ["Does KinkAtlas automatically save my assessment?", "No. Unsaved answers stay in browser memory and may be lost when you refresh or close the tab. Saving happens only when you choose it."],
  ["What does Save my assessment do?", "It encrypts your full assessment in your browser before storing it so you can return later on the same browser."],
  ["What is My KinkAtlas?", "My KinkAtlas is the saved-assessment area for this browser. You can reopen, rename, share, or delete saves there."],
  ["What does Link & QR share?", "It shares your cards and approved historical result content. It does not include your raw answer-by-answer assessment responses."],
  ["Is the QR different from the link?", "No. The QR opens the exact same hosted share as the short link."],
  ["Who can view my Link & QR share?", "Anyone who has the link or scans the QR can view that shared result."],
  ["Can I delete a share?", "Yes. Deleting the hosted share stops its link and QR from loading, but it cannot recall screenshots, downloads, or copies someone already made."],
  ["Why might I get fewer than five suggested roles?", "Suggestions require enough relevant evidence. Fewer than five suggestions—or zero suggestions—is valid; KinkAtlas does not fill the set with weak matches."],
  ["What do Alignment and Confidence mean?", "Alignment is how closely your answers resemble a role’s themes. Confidence is how much relevant information was available. Confidence does not determine ranking."],
  ["What does Evidence breadth mean?", "Evidence breadth is how much of a role’s relevant theme set had usable answer evidence; it is not match strength."],
  ["Do boundaries affect my role results?", "No. Hard limits and boundaries do not lower role alignment or change role ranking. They guide activity suggestions independently."],
  ["Does a suggested role mean I should identify with it?", "No. Role suggestions are vocabulary suggestions, not identity assignments. Keep, question, combine, or decline any label."],
  ["Does a role imply consent?", "No. A role does not imply consent. Consent is specific, informed, voluntary, ongoing, and withdrawable."],
  ["Can I add roles manually?", "Yes. You can add, remove, reorder, and choose a primary role in your role set. Manual selections do not gain assessment scores or confidence."],
  ["Can I leave my role set empty?", "Yes. Leaving the role set empty is valid."],
  ["What is Reflection?", "Reflection is a separate look at knowledge and attitudes expressed in scenario answers. It is not role alignment, a readiness guarantee, or a safety assessment."],
  ["What are Potential blind spots?", "They are answer-based reflection signals shown with severity and context. They are prompts to review, not judgments about your behavior."],
  ["Are these results a safety assessment?", "No. KinkAtlas does not certify safety, predict behavior, or replace education, communication, or consent negotiation."],
  ["Why can two people use the same role label differently?", "Role vocabulary varies across people, communities, and contexts. KinkAtlas descriptions are starting points; ask what a label means to the person using it."],
] as const;

export function FaqPage() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  return (
    <div className="page-width article-page faq-page">
      <header>
        <span className="eyebrow">FAQ</span>

        <h1>
          Common questions,
          <br />
          <em>clear answers.</em>
        </h1>

        <p className="lede">A concise guide to what KinkAtlas measures, what it leaves to you, and how your session stays private.</p>
      </header>

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="sr-only">
          Frequently asked questions
        </h2>

        <div className="faq-list">
          {questions.map(([question, answer], index) => {
            const isOpen = openQuestion === index;

            return (
              <div className={`faq-item${isOpen ? " open" : ""}`} key={question}>
                <button type="button" className="faq-question" aria-expanded={isOpen} aria-controls={`faq-answer-${index}`} onClick={() => setOpenQuestion((current) => (current === index ? null : index))}>
                  <span>{question}</span>
                  <span className="faq-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>

                <div id={`faq-answer-${index}`} className="faq-answer" aria-hidden={!isOpen}>
                  <div className="faq-answer-inner">
                    <p>{answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="faq-footer-link">
        Want the longer explanation? <Link to="/about#how-it-works">Read How it works</Link> or <Link to="/philosophy">review the consent philosophy</Link>.
      </p>
    </div>
  );
}
