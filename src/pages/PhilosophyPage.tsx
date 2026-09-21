import { ArrowRight, CircleSlash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const principles = [
  ['Role ≠ consent','A role can describe a preference, identity, or agreed position. It never grants activity-specific permission.'],
  ['Interest ≠ consent','Curiosity, fantasy, and desire can coexist with “not now,” “not with this person,” or a hard limit.'],
  ['Compatibility ≠ consent','Shared or complementary interests begin a conversation. They do not complete one.'],
  ['Previous consent ≠ current consent','Consent is revisable. A yes from yesterday, earlier in a scene, or in another relationship does not decide the present.'],
  ['Submission ≠ absence of agency','Yielding can be meaningful precisely because the person yielding retains choice and the ability to change their mind.'],
  ['Dominance ≠ entitlement','Negotiated authority carries responsibility. It does not create a right to another person’s body, attention, or obedience.'],
  ['Safeword ≠ only stop signal','Safewords can help. Freezing, unusual silence, distress, confusion, or uncertainty may also mean it is time to pause.'],
  ['Hard limits ≠ challenges','A hard limit is off the table. Nobody should treat it as a test, an invitation to persuade, or a problem to solve.'],
]

export function PhilosophyPage() {
  return <div className="page-width article-page"><header><span className="eyebrow">Consent philosophy</span><h1>Agency is the center,<br /><em>not the footnote.</em></h1><p className="lede">Kink can involve intensity, imagination, vulnerability, and power. Clear distinctions help those experiences remain chosen.</p></header>
    <div className="principle-grid">{principles.map(([title,text]) => <article key={title}><CircleSlash2 aria-hidden="true" /><h2>{title}</h2><p>{text}</p></article>)}</div>
    <aside className="disclaimer-panel"><h2>What this questionnaire can—and cannot—say</h2><p>It can reflect patterns in the answers you choose and point toward concepts worth considering. It cannot observe behavior, assess a relationship, diagnose anyone, or certify someone as safe or ready.</p><p><strong>A questionnaire response is not consent.</strong> Consent is specific, informed, voluntary, ongoing, and can be withdrawn.</p></aside>
    <Link className="button primary" to="/assessment">Start exploring <ArrowRight size={18} /></Link>
  </div>
}
