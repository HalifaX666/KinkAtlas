import { Link } from "react-router-dom";

export function TermsPage() {
  return (
    <div className="page-width article-page about-page terms-page">
      <header>
        <span className="eyebrow">Terms of Use</span>
        <h1>Terms of Use</h1>
        <p className="lede">Effective date: September 21, 2026</p>
        <p>Welcome to KinkAtlas. These Terms of Use (“Terms”) govern your access to and use of the KinkAtlas website, assessment, role library, results, educational materials, exports, and related features (collectively, “KinkAtlas” or the “Service”).</p>
        <p>By accessing or using KinkAtlas, or by selecting an on-screen control indicating that you agree to these Terms, you agree to be bound by them.</p>
        <p>If you do not agree to these Terms, do not use KinkAtlas.</p>
      </header>

      <section aria-labelledby="terms-adults-heading">
        <h2 id="terms-adults-heading">1. Adults only</h2>
        <p>KinkAtlas is intended only for adults who are at least 18 years old.</p>
        <p>By accessing or using KinkAtlas, you represent that:</p>
        <ul>
          <li>you are at least 18 years old;</li>
          <li>you are legally permitted to access adult-oriented educational content where you live; and</li>
          <li>you have the legal capacity to agree to these Terms.</li>
        </ul>
        <p>If the law where you live requires a higher age to access this type of content or to enter into these Terms, you must meet that higher age requirement.</p>
        <p>KinkAtlas is not intended for minors.</p>
      </section>

      <section aria-labelledby="terms-purpose-heading">
        <h2 id="terms-purpose-heading">2. Educational and self-reflection purpose</h2>
        <p>KinkAtlas is an educational and self-reflection tool intended to help users explore topics such as interests, role vocabulary, boundaries, communication preferences, relationship dynamics, and related concepts.</p>
        <p>KinkAtlas does not provide medical, psychological, psychiatric, therapeutic, legal, relationship, sexual-health, or other professional advice.</p>
        <p>Use of KinkAtlas does not create a doctor-patient, therapist-client, lawyer-client, counsellor-client, or other professional relationship.</p>
        <p>Information provided through KinkAtlas should not be relied upon as professional advice or as an instruction or assurance that any particular activity is appropriate or safe.</p>
      </section>

      <section aria-labelledby="terms-results-heading">
        <h2 id="terms-results-heading">3. Assessment results are not diagnoses or verdicts</h2>
        <p>KinkAtlas assessment results are generated from the answers you provide using deterministic, rules-based application logic and curated KinkAtlas data.</p>
        <p>Results may include role-alignment suggestions, educational information, reflection prompts, boundary-related guidance, conversation starters, or other recommendations for further exploration.</p>
        <p>KinkAtlas results:</p>
        <ul>
          <li>do not determine or define your identity;</li>
          <li>do not constitute a medical or psychological diagnosis;</li>
          <li>do not establish emotional, psychological, physical, or relationship readiness;</li>
          <li>do not determine compatibility with another person;</li>
          <li>do not certify that you or another person is safe, trustworthy, reliable, or suitable;</li>
          <li>do not predict real-world behaviour;</li>
          <li>do not establish consent;</li>
          <li>do not establish that an activity is safe or appropriate; and</li>
          <li>are not a substitute for communication, education, judgment, risk assessment, or professional advice.</li>
        </ul>
        <p>You are responsible for deciding whether any result, role, description, or label feels meaningful or useful to you.</p>
      </section>

      <section aria-labelledby="terms-consent-heading">
        <h2 id="terms-consent-heading">4. Consent is separate from interests and results</h2>
        <p>Consent must remain separate from KinkAtlas results.</p>
        <p>A role, interest, fantasy, preference, assessment answer, previous experience, relationship dynamic, Role Set, or KinkAtlas result does not grant or imply consent to any activity.</p>
        <p>Consent between people must be specific, informed, voluntary, ongoing, and capable of being withdrawn.</p>
        <p>Consent to one activity does not imply consent to another activity, and past consent does not establish present or future consent.</p>
        <p>KinkAtlas does not provide consent, authorize activities, determine another person's boundaries, or replace direct communication between people.</p>
        <p>No person should use KinkAtlas results to pressure, manipulate, persuade, or override another person's boundaries or decisions.</p>
      </section>

      <section aria-labelledby="terms-decisions-heading">
        <h2 id="terms-decisions-heading">5. Your decisions and activities</h2>
        <p>You are responsible for your own decisions, conduct, communication, relationships, activities, and risk-management choices.</p>
        <p>KinkAtlas cannot evaluate the intentions, conduct, reliability, judgment, safety, health, compatibility, or suitability of you or another person.</p>
        <p>Before participating in any activity, you should independently consider the circumstances that may be relevant to you, including communication, consent, education, physical and emotional risks, applicable laws, health considerations, equipment, environment, experience, and emergency planning where appropriate.</p>
        <p>The existence of educational material on KinkAtlas does not mean that KinkAtlas recommends, endorses, or represents that a particular activity is appropriate for you.</p>
      </section>

      <section aria-labelledby="terms-privacy-heading">
        <h2 id="terms-privacy-heading">6. Assessment privacy</h2>
        <p>KinkAtlas does not require an account to complete the assessment.</p>
        <p>Assessment answers and generated assessment results are processed in your browser and kept in browser memory for the current assessment session. They are not intentionally saved by KinkAtlas in localStorage, sessionStorage, cookies, IndexedDB, an account, or an assessment-results database.</p>
        <p>Refreshing or closing the assessment page may clear your current assessment state.</p>
        <p>When you choose to view a completed assessment, KinkAtlas may send an empty same-origin request used to increment an aggregate completion counter. Assessment answers, results, roles, readiness information, boundaries, negotiation preferences, and other assessment content are not included in that request.</p>
        <p>The completion counter is intended to record only an aggregate number of completed assessments and should not be interpreted as a count of unique individuals.</p>
        <p>KinkAtlas infrastructure and third-party service providers may process limited technical information associated with normal website requests, such as IP addresses, browser or device information, request information, or security-related logs. Such processing does not mean that KinkAtlas stores your assessment answers or results.</p>
        <p>If you voluntarily use another feature, such as a contact form, information you choose to provide through that feature may be transmitted and processed separately.</p>
        <p>The <Link to="/about#privacy">KinkAtlas Privacy Policy</Link> provides additional information about technical data, third-party services, retention, and privacy practices.</p>
      </section>

      <section aria-labelledby="terms-ai-heading">
        <h2 id="terms-ai-heading">7. No generative AI analysis of assessment responses</h2>
        <p>KinkAtlas assessment results are produced using deterministic application logic and curated KinkAtlas data.</p>
        <p>KinkAtlas does not use generative artificial intelligence to analyze your assessment responses or generate your assessment results.</p>
        <p>If KinkAtlas introduces a separate feature that uses generative artificial intelligence in the future, that use will be identified separately where appropriate and does not change how assessment scoring works unless KinkAtlas expressly states otherwise.</p>
      </section>

      <section aria-labelledby="terms-role-sets-heading">
        <h2 id="terms-role-sets-heading">8. Role Sets and manually selected roles</h2>
        <p>KinkAtlas may suggest a starting Role Set based on your assessment results.</p>
        <p>You may add, remove, replace, or reorder roles yourself.</p>
        <p>A role that you manually select should not be interpreted as having received an assessment score, match, recommendation, certification, or other evaluation from KinkAtlas unless the Service expressly indicates otherwise.</p>
        <p>Role Sets are intended as tools for exploration and communication, not as definitive statements about identity.</p>
      </section>

      <section aria-labelledby="terms-exports-heading">
        <h2 id="terms-exports-heading">9. Exports and sharing</h2>
        <p>KinkAtlas may allow you to copy, download, export, or otherwise share assessment results, Role Sets, or related information.</p>
        <p>Any decision to export, copy, download, publish, send, or share that information is made by you.</p>
        <p>KinkAtlas does not automatically post information to, connect to, read from, or modify a FetLife profile or any other third-party social-media or community profile unless a separate feature expressly states otherwise.</p>
        <p>You are responsible for deciding what information you share, where you share it, and with whom.</p>
        <p>Once you share information outside KinkAtlas, the recipient or third-party platform may copy, retain, redistribute, or otherwise use that information according to its own practices and policies.</p>
      </section>

      <section aria-labelledby="terms-accuracy-heading">
        <h2 id="terms-accuracy-heading">10. Accuracy and limitations</h2>
        <p>KinkAtlas is provided for informational, educational, and exploratory purposes.</p>
        <p>Although care is taken in developing the assessment logic, role library, explanations, educational materials, and supporting content, KinkAtlas does not guarantee that:</p>
        <ul>
          <li>every result will feel accurate or relevant to you;</li>
          <li>every role, interest, identity, practice, or concept will be represented;</li>
          <li>a description will match the terminology used by every individual or community;</li>
          <li>assessment logic will capture every relevant circumstance;</li>
          <li>educational information will be complete or suitable for a particular situation;</li>
          <li>KinkAtlas will always be available, uninterrupted, secure, or error-free; or</li>
          <li>features, terminology, scoring rules, role definitions, or content will remain unchanged.</li>
        </ul>
        <p>Language relating to kink, sexuality, relationships, roles, and community practices can vary substantially between people, communities, cultures, and contexts.</p>
      </section>

      <section aria-labelledby="terms-use-heading">
        <h2 id="terms-use-heading">11. Acceptable use</h2>
        <p>You may use KinkAtlas for lawful personal, educational, and non-commercial purposes unless another applicable licence expressly permits additional uses.</p>
        <p>You must not:</p>
        <ul>
          <li>use KinkAtlas in violation of applicable law;</li>
          <li>attempt to gain unauthorized access to KinkAtlas systems, infrastructure, accounts, data, or services;</li>
          <li>interfere with, damage, overload, disrupt, reverse engineer, or circumvent security or technical protections of the Service except where expressly permitted by law or an applicable software licence;</li>
          <li>use automated systems in a manner that materially disrupts the Service or circumvents reasonable technical restrictions;</li>
          <li>introduce malware, malicious code, or other harmful material;</li>
          <li>falsely represent a KinkAtlas result as medical, psychological, professional, educational, safety, or competency certification;</li>
          <li>represent a KinkAtlas result as proof that another person has consented to an activity;</li>
          <li>use KinkAtlas content or results to pressure, manipulate, threaten, exploit, or override another person's boundaries or consent;</li>
          <li>falsely imply that KinkAtlas endorses, approves, certifies, sponsors, or is affiliated with you, another person, a product, organization, or service; or</li>
          <li>use KinkAtlas in a manner that infringes the intellectual-property or other legal rights of another person.</li>
        </ul>
      </section>

      <section aria-labelledby="terms-ip-heading">
        <h2 id="terms-ip-heading">12. Intellectual property</h2>
        <p>KinkAtlas software and KinkAtlas-authored content may be made available under different licensing terms.</p>
        <p>Where KinkAtlas source code is distributed under an identified open-source or software licence, that licence governs your use of that source code.</p>
        <p>Unless expressly stated otherwise, KinkAtlas-authored educational materials, assessment content, questions, role-library content, descriptions, written explanations, branding, logos, graphics, visual assets, and other original content remain protected by applicable copyright, trademark, and other intellectual-property laws.</p>
        <p>You may use and share exports generated for your own personal use subject to these Terms.</p>
        <p>Except where permitted by an applicable licence or by law, you may not reproduce, republish, sell, sublicense, or commercially exploit substantial portions of KinkAtlas-authored content.</p>
        <p>You may not remove ownership notices, falsely present KinkAtlas content as your own original product, or use KinkAtlas branding in a manner that falsely suggests affiliation, sponsorship, or endorsement.</p>
      </section>

      <section aria-labelledby="terms-third-party-heading">
        <h2 id="terms-third-party-heading">13. Third-party services and links</h2>
        <p>KinkAtlas may use or rely upon third-party services for functions such as hosting, domain-name services, security, analytics, form processing, email delivery, or other infrastructure.</p>
        <p>KinkAtlas may also contain links or references to websites, communities, services, resources, or platforms operated by third parties.</p>
        <p>Third-party services are operated independently and may have their own terms, policies, availability, security practices, and privacy practices.</p>
        <p>KinkAtlas is not responsible for third-party websites, services, content, conduct, policies, or availability.</p>
        <p>References to platforms or services such as FetLife do not imply affiliation, endorsement, sponsorship, partnership, or technical integration unless expressly stated.</p>
      </section>

      <section aria-labelledby="terms-changes-heading">
        <h2 id="terms-changes-heading">14. Changes to KinkAtlas</h2>
        <p>KinkAtlas may add, modify, replace, suspend, or discontinue features, content, assessment logic, scoring methods, educational materials, role definitions, or other parts of the Service.</p>
        <p>KinkAtlas does not guarantee that any particular feature or content will remain available indefinitely.</p>
        <p>Where practical, changes will be designed so that they do not retroactively alter information that you have already exported or independently saved.</p>
      </section>

      <section aria-labelledby="terms-changes-terms-heading">
        <h2 id="terms-changes-terms-heading">15. Changes to these Terms</h2>
        <p>These Terms may be updated from time to time.</p>
        <p>The effective date at the top of the Terms identifies the current version.</p>
        <p>Changes will apply prospectively from the stated effective date. Where applicable law requires additional notice or consent for a change, KinkAtlas will follow those requirements.</p>
        <p>Your continued use of KinkAtlas after revised Terms become effective constitutes acceptance of the revised Terms to the extent permitted by applicable law.</p>
        <p>If you do not agree with revised Terms, you should stop using KinkAtlas.</p>
      </section>

      <section aria-labelledby="terms-suspension-heading">
        <h2 id="terms-suspension-heading">16. Suspension or restriction of access</h2>
        <p>KinkAtlas may restrict or suspend access to some or all of the Service where reasonably necessary to protect the Service, its users, its infrastructure, third parties, or legal rights, or where these Terms have been materially violated.</p>
        <p>Because KinkAtlas may operate without individual user accounts, some forms of access restriction may not be technically available.</p>
        <p>You may stop using KinkAtlas at any time.</p>
      </section>

      <section aria-labelledby="terms-warranties-heading">
        <h2 id="terms-warranties-heading">17. Disclaimer of warranties</h2>
        <p>To the fullest extent permitted by applicable law, KinkAtlas is provided on an “as is” and “as available” basis.</p>
        <p>Except for warranties or rights that cannot lawfully be excluded, no representation, warranty, condition, or guarantee is made, express or implied, regarding the Service, including its availability, accuracy, completeness, reliability, security, fitness for a particular purpose, merchantability, suitability, or non-infringement.</p>
        <p>KinkAtlas does not warrant that use of the Service will prevent injury, misunderstanding, relationship conflict, misuse, unlawful conduct, or other harm.</p>
        <p>Nothing in these Terms excludes any warranty, condition, right, or remedy that cannot legally be excluded or limited.</p>
      </section>

      <section aria-labelledby="terms-liability-heading">
        <h2 id="terms-liability-heading">18. Limitation of liability</h2>
        <p>To the fullest extent permitted by applicable law, the creator, operator, contributors, and service providers of KinkAtlas will not be liable for indirect, incidental, special, consequential, exemplary, or similar damages arising from or relating to:</p>
        <ul>
          <li>your access to, use of, reliance on, or inability to use KinkAtlas;</li>
          <li>assessment results, Role Sets, educational content, or other information provided through KinkAtlas;</li>
          <li>decisions or activities undertaken by you or another person;</li>
          <li>interactions, communications, relationships, or disputes between users or other persons;</li>
          <li>information that you choose to export, publish, disclose, or share;</li>
          <li>the acts or omissions of third parties; or</li>
          <li>interruption, modification, suspension, loss, or discontinuation of the Service.</li>
        </ul>
        <p>The limitations in this section apply only to the extent permitted by applicable law.</p>
        <p>Nothing in these Terms excludes or limits liability, statutory rights, warranties, or remedies where exclusion or limitation is prohibited by law.</p>
      </section>

      <section aria-labelledby="terms-governing-law-heading">
        <h2 id="terms-governing-law-heading">19. Governing law and disputes</h2>
        <p>These Terms and your use of KinkAtlas are governed by the laws of the Province of Ontario and the federal laws of Canada applicable there, without regard to conflict-of-law principles.</p>
        <p>Subject to any rights that you cannot waive under applicable law, disputes relating to these Terms or KinkAtlas will be subject to the jurisdiction of the courts of Ontario, Canada.</p>
        <p>Nothing in these Terms prevents you from relying on mandatory consumer-protection, privacy, or other legal rights that apply to you or from bringing a proceeding in another jurisdiction where applicable law gives you a non-waivable right to do so.</p>
      </section>

      <section aria-labelledby="terms-severability-heading">
        <h2 id="terms-severability-heading">20. Severability and waiver</h2>
        <p>If a court or other authority with jurisdiction determines that part of these Terms is invalid, illegal, or unenforceable, that provision will be interpreted or limited to the minimum extent necessary where legally permitted, and the remaining provisions will continue in effect.</p>
        <p>A failure by KinkAtlas to enforce a provision of these Terms does not waive the right to enforce that provision later.</p>
      </section>

      <section aria-labelledby="terms-entire-agreement-heading">
        <h2 id="terms-entire-agreement-heading">21. Entire agreement</h2>
        <p>These Terms, together with any other terms or notices expressly incorporated into them, constitute the agreement governing your use of KinkAtlas.</p>
        <p>The <Link to="/about#privacy">KinkAtlas Privacy Policy</Link> separately explains how personal information and technical information are handled.</p>
        <p>If a specific KinkAtlas feature is subject to additional terms, those additional terms will apply to that feature.</p>
      </section>

      <section aria-labelledby="terms-contact-heading">
        <h2 id="terms-contact-heading">22. Contact</h2>
        <p>Questions about these Terms may be submitted through the <Link to="/contact">KinkAtlas Contact page</Link>.</p>
        <p>Questions relating specifically to privacy or personal information should be submitted using the contact method identified in the <Link to="/about#privacy">KinkAtlas Privacy Policy</Link>.</p>
      </section>
    </div>
  );
}
