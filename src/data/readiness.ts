import type { BlindSpot, CompetencyId, ReadinessQuestion } from '../types'

export const competencyDefinitions: Record<CompetencyId, { label: string; description: string }> = {
  ongoingConsent: { label: 'Ongoing consent', description: 'Noticing change and treating consent as revisable.' },
  negotiation: { label: 'Negotiation specificity', description: 'Clarifying activities, limits, context, and duration.' },
  communication: { label: 'Communication', description: 'Making room for direct, usable information.' },
  boundaries: { label: 'Boundary recognition', description: 'Respecting limits without challenge or inference.' },
  selfAdvocacy: { label: 'Self-advocacy', description: 'Naming uncertainty, needs, and changed limits.' },
  powerAwareness: { label: 'Power awareness', description: 'Accounting for pressure and unequal influence.' },
  stopSignals: { label: 'Stop signals', description: 'Using words, behavior, and context to recognize a need to pause.' },
  uncertainty: { label: 'Responding to uncertainty', description: 'Slowing down when information becomes unclear.' },
  riskAwareness: { label: 'Risk awareness', description: 'Seeking appropriate knowledge and planning for foreseeable risk.' },
  accountability: { label: 'Accountability', description: 'Responding to mistakes with care, honesty, and repair.' },
  emotionalAwareness: { label: 'Emotional awareness', description: 'Considering emotional context and impact.' },
  aftercare: { label: 'Aftercare communication', description: 'Discussing varied support and follow-up needs.' },
  privacy: { label: 'Privacy', description: 'Treating personal information and visibility as negotiated.' },
  substances: { label: 'Substances & consent', description: 'Recognizing how capacity and judgment may be affected.' },
  recording: { label: 'Photography & recording', description: 'Seeking separate, specific permission for capture and sharing.' },
  roleAssumptions: { label: 'Role assumptions', description: 'Keeping labels separate from activity consent.' },
  learningMindset: { label: 'Learning mindset', description: 'Recognizing limits of knowledge and seeking education.' },
}

type ScenarioSeed = [string, CompetencyId, string, string, string, string, string?]

const seeds: ScenarioSeed[] = [
  ['c-ongoing-1','ongoingConsent','A scene was negotiated beforehand. Your partner becomes unusually quiet but has not used a safeword.','Pause or slow down and check in; the change may be meaningful.','Use your knowledge of their usual responses, while checking if uncertainty remains.','Continue because the original agreement remains enough.','prior-negotiation'],
  ['c-ongoing-2','ongoingConsent','Someone enthusiastically agreed yesterday but seems hesitant when the planned time arrives.','Treat today’s hesitation as new information and revisit the plan.','Ask once whether they still want to proceed, while making “not today” easy.','Assume yesterday’s enthusiasm is the more accurate answer.','prior-consent'],
  ['c-neg-1','negotiation','Two people agree to “rough play.” What is the most useful next step?','Clarify specific actions, intensity, limits, signals, and likely risks.','Name a few likely activities and rely on check-ins for the rest.','Treat the shared phrase as a sufficiently clear agreement.','vague-negotiation'],
  ['c-neg-2','negotiation','A dynamic includes the phrase “you decide.” How should its scope be understood?','Define which decisions, in what contexts, and how either person can revise the agreement.','Start with low-stakes decisions and discuss scope when something important arises.','Read it as broad authority until an exception is stated.','authority-scope'],
  ['c-comm-1','communication','A partner says “anything is fine” while discussing aftercare.','Offer concrete options and make room for no aftercare or later follow-up.','Choose a common option and ask whether it sounds acceptable.','Assume they have no meaningful preference.','communication-space'],
  ['c-comm-2','communication','You notice that indirect questions keep producing unclear answers.','Try specific, neutral questions and invite correction without pressure.','Repeat the same question later when the mood is different.','Interpret the answers in the way that best fits the plan.','communication-space'],
  ['c-bound-1','boundaries','Someone names an activity as a hard limit but is curious about a related fantasy.','Keep the activity off the table; fantasy and activity preference can differ.','Ask whether the curiosity might someday change the limit, without planning it.','Treat the fantasy as evidence that the limit is flexible.','limits-as-challenge'],
  ['c-bound-2','boundaries','A partner’s limit seems based on information you believe is inaccurate.','Respect it now; offer information only if wanted and without tying it to agreement.','Explain your perspective once, then ask them to reconsider later.','Correct the misunderstanding before accepting the limit.','limits-as-challenge'],
  ['c-self-1','selfAdvocacy','You agreed to try something but become unsure because your partner seems excited.','Name the uncertainty and pause; their excitement does not obligate you.','Continue briefly while deciding, unless discomfort increases.','Prioritize keeping the promise because they planned around it.','self-advocacy'],
  ['c-self-2','selfAdvocacy','You cannot tell whether you dislike an activity or simply feel nervous.','Say that you are unsure and choose more time, information, or a stop.','Try it at low intensity so you can give a definite answer.','Let the other person decide because they have more experience.','self-advocacy'],
  ['c-power-1','powerAwareness','A person with more community status asks a newcomer for a quick answer.','Notice the pressure and create genuine time and space for an unpressured decision.','Ask whether the newcomer feels pressured before accepting the answer.','Assume adults are equally able to say no regardless of status.','power-blindness'],
  ['c-power-2','powerAwareness','In an ongoing authority dynamic, one person wants to change a relationship rule.','Discuss it outside role expectations, with a clear option to decline or revisit.','Have the authority-holder propose the change and invite objections.','Treat rule changes as part of the authority already granted.','authority-scope'],
  ['c-stop-1','stopSignals','A safeword exists, but someone freezes and stops responding normally.','Stop and establish their wellbeing; a safeword is not the only signal.','Reduce intensity and ask a yes/no question before continuing.','Wait for the safeword because that was the agreed system.','safeword-only'],
  ['c-stop-2','stopSignals','In roleplay, “no” may be part of the script. What else is needed?','A clearly distinguishable stop system plus attention to unexpected behavior.','A safeword, with the understanding that it must be spoken to count.','Trust that experienced partners can tell scripted and genuine refusal apart.','safeword-only'],
  ['c-uncertain-1','uncertainty','A check-in receives an answer that sounds positive but does not feel clear.','Pause and seek clearer information without making continuation the default.','Ask the same question once more and continue if the answer stays positive.','Accept the literal answer and avoid second-guessing the person.','uncertainty'],
  ['c-risk-1','riskAwareness','You are curious about a technically complex activity you have only read about.','Seek qualified education and choose a lower-risk alternative until prepared.','Proceed carefully at low intensity using written guidance.','Rely on enthusiasm and communication to manage technical risk.','knowledge-limits'],
  ['c-risk-2','riskAwareness','A familiar activity is being tried with a new person.','Re-negotiate for this person; bodies, communication, and risks differ.','Use the familiar approach, adding more frequent check-ins.','Treat prior successful experience as proof the activity is low risk.','familiarity'],
  ['c-account-1','accountability','After a scene, someone says an agreed limit was crossed. Memories differ.','Prioritize impact and wellbeing, listen, document what is agreed, and discuss repair.','Explain your memory while also apologizing for the impact.','Defend the original intent because the crossing was not deliberate.','defensiveness'],
  ['c-account-2','accountability','You realize mid-scene that you misunderstood part of the negotiation.','Stop, acknowledge the misunderstanding, and re-establish what is wanted now.','Move back to the part you know was agreed and discuss it afterward.','Continue if the misunderstanding does not seem to upset anyone.','defensiveness'],
  ['c-emotion-1','emotionalAwareness','A desired fantasy uses words that connect to a partner’s real insecurity.','Discuss the distinction, possible impact, limits, and alternatives before deciding.','Use gentler versions and monitor their reaction closely.','Assume fantasy context prevents the words from having real impact.','emotional-impact'],
  ['c-after-1','aftercare','Partners prefer different kinds of contact after intense experiences.','Agree on a plan that respects both capacities and includes alternatives or follow-up.','Prioritize the person who received the most intense activity.','Use the same aftercare routine each time for predictability.','aftercare-assumption'],
  ['c-after-2','aftercare','Someone says they usually want space afterward.','Discuss what “space” means and whether any later check-in is wanted.','Give them complete space and check the following day.','Assume no support or follow-up is appropriate.','aftercare-assumption'],
  ['c-privacy-1','privacy','You recognize someone from a private kink event in another setting.','Let them choose whether to acknowledge the connection and protect their privacy.','Greet them without mentioning where you met.','Reference the event quietly because the setting is different.','privacy-assumption'],
  ['c-record-1','recording','A partner agreed to a photo during a scene. What does that establish?','Permission for that capture only; storage and sharing need their own agreement.','Permission to keep it privately unless they later object.','Permission to share it with trusted people who understand the context.','recording-assumption'],
  ['c-substance-1','substances','A planned scene follows unexpected substance use.','Reassess capacity and postpone activities requiring judgment if there is meaningful doubt.','Reduce intensity and add check-ins if both still say yes.','Proceed because the negotiation happened while sober.','substance-capacity'],
  ['c-role-1','roleAssumptions','Someone identifies as submissive. What can you infer about activities they want?','Nothing specific; role language does not establish activity consent.','They may like receiving direction, but each activity still needs discussion.','They probably prefer the receiving side of common activities.','role-assumptions'],
  ['c-role-2','roleAssumptions','Two people have complementary role labels. What does that establish?','A possible conversation starting point, not consent or compatibility.','Likely shared expectations that should still be confirmed.','A basic match unless a specific limit conflicts.','role-assumptions'],
  ['c-learn-1','learningMindset','A friend has practiced an activity for years and offers to teach it.','Consider their experience while still assessing competence, risks, and other education.','Trust them for basics and seek more education for advanced practice.','Treat years of experience as sufficient qualification.','knowledge-limits'],
]

const criticalSignalIds = new Set(['prior-negotiation','prior-consent','authority-scope','limits-as-challenge','safeword-only','recording-assumption','substance-capacity','role-assumptions'])

export const readinessQuestions: ReadinessQuestion[] = seeds.map(([id, domain, prompt, strong, partial, weak, signal]) => ({
  id, kind: 'readiness', domain, prompt,
  answers: [
    { id: 'a', label: strong, competencyEffects: { [domain]: 1 } },
    { id: 'b', label: partial, competencyEffects: { [domain]: .58 }, blindSpotSignals: signal ? [{ id: signal, severity: 'notice', weight: 1 }] : [] },
    { id: 'c', label: weak, competencyEffects: { [domain]: .08 }, blindSpotSignals: signal ? [{ id: signal, severity: criticalSignalIds.has(signal) ? 'critical' : 'concern', weight: 2.5, critical: criticalSignalIds.has(signal) }] : [] },
    { id: 'prefer-not', label: 'Prefer not to answer', noScore: true },
  ],
}))

export const blindSpotLibrary: Record<string, Pick<BlindSpot, 'id' | 'competency' | 'title' | 'description'>> = {
  'prior-negotiation': { id: 'prior-negotiation', competency: 'ongoingConsent', title: 'Prior negotiation vs. ongoing consent', description: 'Some responses placed weight on what was agreed before an experience. Prior negotiation matters, and consent can still change during it.' },
  'prior-consent': { id: 'prior-consent', competency: 'ongoingConsent', title: 'Past enthusiasm and present choice', description: 'Earlier enthusiasm can be useful context, but it does not decide what someone wants now.' },
  'vague-negotiation': { id: 'vague-negotiation', competency: 'negotiation', title: 'Shared words, different meanings', description: 'Broad labels can conceal different expectations. Naming actions, intensity, limits, and signals can make agreement more usable.' },
  'authority-scope': { id: 'authority-scope', competency: 'powerAwareness', title: 'Scope of authority', description: 'Open-ended language can make it difficult to see where authority stops. Specific scope and ways to revise it protect everyone’s agency.' },
  'communication-space': { id: 'communication-space', competency: 'communication', title: 'Making preferences easier to express', description: 'Unclear answers may benefit from concrete options and a low-pressure invitation to correct assumptions.' },
  'limits-as-challenge': { id: 'limits-as-challenge', competency: 'boundaries', title: 'Limits are not challenges', description: 'A limit remains off the table even when curiosity, fantasy, or different information exists alongside it.' },
  'self-advocacy': { id: 'self-advocacy', competency: 'selfAdvocacy', title: 'Room for your own uncertainty', description: 'Some responses may prioritize another person’s expectations while your comfort is unclear. Naming uncertainty is a valid form of self-advocacy.' },
  'power-blindness': { id: 'power-blindness', competency: 'powerAwareness', title: 'Pressure can be structural', description: 'Status, experience, and authority can affect how easy a refusal feels, even when nobody states a threat.' },
  'safeword-only': { id: 'safeword-only', competency: 'stopSignals', title: 'A safeword is not the only signal', description: 'Safewords help communication, but freezing, unusual silence, or uncertainty can also call for a pause.' },
  uncertainty: { id: 'uncertainty', competency: 'uncertainty', title: 'Uncertainty is information', description: 'When information becomes unclear, pausing is a useful response—not a failure of the plan.' },
  'knowledge-limits': { id: 'knowledge-limits', competency: 'learningMindset', title: 'Recognizing knowledge limits', description: 'Communication cannot substitute for technical competence. Some interests merit qualified, hands-on education before practice.' },
  familiarity: { id: 'familiarity', competency: 'riskAwareness', title: 'Familiar activity, new context', description: 'Experience with an activity does not make every body, partner, or setting respond in the same way.' },
  defensiveness: { id: 'defensiveness', competency: 'accountability', title: 'Impact, intent, and repair', description: 'Good intent can coexist with harm or misunderstanding. Listening and repair remain useful even when memories differ.' },
  'emotional-impact': { id: 'emotional-impact', competency: 'emotionalAwareness', title: 'Fantasy can have real impact', description: 'A fictional frame can change meaning, but it does not guarantee that emotionally charged language will stay inside the scene.' },
  'aftercare-assumption': { id: 'aftercare-assumption', competency: 'aftercare', title: 'Aftercare is individual', description: 'Support can mean closeness, space, practical care, or later contact. It is best discussed rather than inferred from role or activity.' },
  'privacy-assumption': { id: 'privacy-assumption', competency: 'privacy', title: 'Contextual privacy', description: 'Recognition in one setting does not grant permission to reveal a kink connection in another.' },
  'recording-assumption': { id: 'recording-assumption', competency: 'recording', title: 'Capture is not sharing consent', description: 'Permission to take an image does not automatically include storing, sending, posting, or reusing it.' },
  'substance-capacity': { id: 'substance-capacity', competency: 'substances', title: 'Capacity can change', description: 'A sober plan does not resolve later questions about judgment, communication, or capacity after substance use.' },
  'role-assumptions': { id: 'role-assumptions', competency: 'roleAssumptions', title: 'Role does not establish consent', description: 'Roles can describe interests or identity. They do not establish consent to an activity, intensity, partner, or moment.' },
}

export const readinessQuestionById = Object.fromEntries(readinessQuestions.map((question) => [question.id, question])) as Record<string, ReadinessQuestion>
