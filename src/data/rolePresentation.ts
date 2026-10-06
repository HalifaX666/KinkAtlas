export type RoleEmblemId =
  | 'dominant-axis'
  | 'submissive-open'
  | 'switch-weave'
  | 'top-outward'
  | 'bottom-inward'
  | 'vers-balance'
  | 'rigger-knot'
  | 'rope-bottom-loop'
  | 'brat-spark'
  | 'brat-tamer-frame'
  | 'primal-predator-track'
  | 'primal-prey-motion'
  | 'primal-switch-orbit'
  | 'pet-companion'
  | 'owner-steward'

export interface RolePresentationAttribute {
  label: string
  value: string
}

export interface RolePresentation {
  roleId: string
  emblem: RoleEmblemId
  shortSummary: string
  meaning: string
  canLookLike: string
  notAutomatic: string
  attributes: RolePresentationAttribute[]
}

export const rolePresentations: RolePresentation[] = [
  {
    roleId: 'role:dominant-4cfaa6ab',
    emblem: 'dominant-axis',
    shortSummary: 'Negotiated authority paired with the responsibility to use it well.',
    meaning: 'A Dominant takes an agreed role in directing a scene or dynamic. The appeal may be making decisions, setting structure, holding focus, or carrying responsibility for what has been negotiated.',
    canLookLike: 'It can be as contained as directing one scene or as recurring as a carefully negotiated relationship dynamic. Some Dominants are formal; others lead with warmth, playfulness, service, or quiet certainty.',
    notAutomatic: 'Dominant does not mean controlling every activity, being harsh, knowing everything, or having authority that was never agreed.',
    attributes: [
      { label: 'Authority direction', value: 'Giving' },
      { label: 'Responsibility', value: 'Core' },
      { label: 'Structure', value: 'Variable' },
      { label: 'Play position', value: 'Not inherent' },
      { label: 'Scope', value: 'Negotiated' },
    ],
  },
  {
    roleId: 'role:submissive-70cf87f8',
    emblem: 'submissive-open',
    shortSummary: 'Choosing to yield agreed authority while keeping agency fully intact.',
    meaning: 'A submissive finds meaning in offering another person some measure of direction or authority. That choice can feel freeing, intimate, grounding, challenging, or simply natural within the right connection.',
    canLookLike: 'Submission may live in a single scene, a few rituals, specific decisions, or a broader relationship agreement. The person yielding still helps shape the dynamic through their wants, limits, judgment, and consent.',
    notAutomatic: 'Submission is not inferiority, passivity, bottoming in every activity, or blanket permission. A submissive remains an equal human being with the same right to question, renegotiate, and stop.',
    attributes: [
      { label: 'Authority direction', value: 'Receiving' },
      { label: 'Agency', value: 'Always present' },
      { label: 'Structure', value: 'Variable' },
      { label: 'Play position', value: 'Not inherent' },
      { label: 'Scope', value: 'Negotiated' },
    ],
  },
  {
    roleId: 'role:switch-39921a74',
    emblem: 'switch-weave',
    shortSummary: 'More than one side of a dynamic can feel right.',
    meaning: 'A Switch is comfortable moving between positions such as directing and yielding. The shift may depend on a partner, activity, mood, relationship, or the kind of energy a particular scene invites.',
    canLookLike: 'Some Switches enjoy changing roles within the same encounter. Others have a clear preference with one person and a different one elsewhere, or move between positions over longer stretches of time.',
    notAutomatic: 'Switch does not require a perfect fifty-fifty balance, constant role changes, or equal interest in every activity on both sides.',
    attributes: [
      { label: 'Authority direction', value: 'Both' },
      { label: 'Role flexibility', value: 'Core' },
      { label: 'Context', value: 'Highly relevant' },
      { label: 'Balance', value: 'Not necessarily equal' },
    ],
  },
  {
    roleId: 'role:top-d5cdfcf7',
    emblem: 'top-outward',
    shortSummary: 'The active, giving, or directing position in an activity.',
    meaning: 'Top describes what someone does in a scene or activity. A Top might tie, strike, tease, stimulate, or otherwise take the active side while staying responsive to the person receiving.',
    canLookLike: 'The role can be technically focused, sensual, playful, service-minded, intense, or matter-of-fact. Its shape comes from the activity and the agreement around it.',
    notAutomatic: 'Topping is not the same as being Dominant. It does not create broader authority, and it says nothing by itself about how someone relates outside the activity.',
    attributes: [
      { label: 'Play position', value: 'Giving' },
      { label: 'Activity focus', value: 'Core' },
      { label: 'Authority', value: 'Not inherent' },
      { label: 'Power exchange', value: 'Optional' },
      { label: 'Style', value: 'Variable' },
    ],
  },
  {
    roleId: 'role:bottom-479ad21a',
    emblem: 'bottom-inward',
    shortSummary: 'The receiving position in a scene or activity.',
    meaning: 'A Bottom receives what is being done: rope, sensation, impact, attention, or another negotiated activity. Receiving can be active and communicative, with plenty of influence over pace, form, and intensity.',
    canLookLike: 'Bottoming might center pleasure, endurance, stillness, performance, curiosity, or the experience of letting someone else carry the active task.',
    notAutomatic: 'Bottom does not mean submissive, powerless, passive, or interested in every receiving role. Activity position and negotiated authority are separate questions.',
    attributes: [
      { label: 'Play position', value: 'Receiving' },
      { label: 'Activity focus', value: 'Core' },
      { label: 'Authority', value: 'Not inherent' },
      { label: 'Agency', value: 'Always present' },
      { label: 'Style', value: 'Variable' },
    ],
  },
  {
    roleId: 'role:vers-1a60a8ce',
    emblem: 'vers-balance',
    shortSummary: 'Comfort with both giving and receiving sexual positions.',
    meaning: 'Vers is short for versatile. It is commonly used for someone who enjoys more than one sexual position rather than treating one side as their only fit.',
    canLookLike: 'A person may enjoy both positions fairly evenly, lean strongly toward one, or find that their preference changes with chemistry, setting, and what everyone wants that day.',
    notAutomatic: 'Vers does not promise equal interest, switching during every encounter, or flexibility around acts that have not been discussed.',
    attributes: [
      { label: 'Play position', value: 'Both' },
      { label: 'Role flexibility', value: 'High' },
      { label: 'Context', value: 'Partner-dependent' },
      { label: 'Authority', value: 'Not inherent' },
    ],
  },
  {
    roleId: 'role:rigger-5d2f2d93',
    emblem: 'rigger-knot',
    shortSummary: 'The person who ties, combining rope craft with attentive responsibility.',
    meaning: 'A Rigger works with rope: building ties, shaping movement, creating restraint, or making something visually expressive. For many, learning the craft is as important as the finished scene.',
    canLookLike: 'Rope can be practical, meditative, connective, performative, playful, or intensely physical. A Rigger may lead the activity without taking a Dominant role in the wider relationship.',
    notAutomatic: 'Being a Rigger does not automatically mean dominance, expertise, suspension skill, or permission to tie. Competence and consent are specific to the tie being considered.',
    attributes: [
      { label: 'Position', value: 'Giving' },
      { label: 'Rope focus', value: 'Core' },
      { label: 'Technical craft', value: 'High' },
      { label: 'Power exchange', value: 'Optional' },
      { label: 'Structure', value: 'Variable' },
    ],
  },
  {
    roleId: 'role:rope-bottom-f8a5d024',
    emblem: 'rope-bottom-loop',
    shortSummary: 'The person receiving rope, with agency inside every loop and line.',
    meaning: 'A Rope Bottom is the person being tied. They may be drawn to restraint, pressure, stillness, movement, visual form, vulnerability, connection, or the distinctive problem-solving of moving in rope.',
    canLookLike: 'One scene might be gentle floor work; another might emphasize challenge or art. Rope bottoming also involves communication, body awareness, and active participation in risk decisions.',
    notAutomatic: 'The role does not automatically mean submission, masochism, flexibility, silence, or consent to suspension. Being in rope never removes the ability to call for a change or an end.',
    attributes: [
      { label: 'Position', value: 'Receiving' },
      { label: 'Rope focus', value: 'Core' },
      { label: 'Body awareness', value: 'High' },
      { label: 'Power exchange', value: 'Optional' },
      { label: 'Sensation', value: 'Variable' },
    ],
  },
  {
    roleId: 'role:brat-19c33c26',
    emblem: 'brat-spark',
    shortSummary: 'Playful challenge, mischief, and a taste for lively pushback.',
    meaning: 'A Brat enjoys teasing, testing, provoking, or making a partner work for cooperation. The back-and-forth is often the point: wit, attention, and a satisfying response can matter more than simple obedience.',
    canLookLike: 'Bratting can be cheeky banter, deliberate rule-bending, a grin before a challenge, or negotiated resistance that gives both people something enjoyable to play against.',
    notAutomatic: 'Brat is not another word for immature, inconsiderate, or unable to consent. Genuine refusal remains refusal, and no partner is obliged to tame or punish brattiness.',
    attributes: [
      { label: 'Interaction', value: 'Playful challenge' },
      { label: 'Provocation', value: 'Core theme' },
      { label: 'Playfulness', value: 'High' },
      { label: 'Power exchange', value: 'Common, not required' },
      { label: 'Position', value: 'Variable' },
    ],
  },
  {
    roleId: 'role:brat-tamer-e2e114dd',
    emblem: 'brat-tamer-frame',
    shortSummary: 'Meeting playful resistance with steadiness, wit, and an agreed response.',
    meaning: 'A Brat Tamer likes the spark of a challenge and knows how to answer it. The pleasure can come from holding composure, matching cleverness, setting structure, or delivering the kind of consequence both people wanted to invite.',
    canLookLike: 'Some Tamers answer with humor; others use rules, patience, attention, or theatrical firmness. The role works best when the form of pushback and the desired response are understood together.',
    notAutomatic: "Taming does not mean erasing someone's personality, treating every disagreement as play, or claiming authority outside the negotiated dynamic.",
    attributes: [
      { label: 'Interaction', value: 'Responsive challenge' },
      { label: 'Steadiness', value: 'Core theme' },
      { label: 'Structure', value: 'Common' },
      { label: 'Playfulness', value: 'High' },
      { label: 'Authority', value: 'Negotiated' },
    ],
  },
  {
    roleId: 'role:primal-predator-a89f810a',
    emblem: 'primal-predator-track',
    shortSummary: 'The pursuing, assertive side of negotiated instinctive play.',
    meaning: 'A Primal Predator leans into pursuit: tracking, chasing, catching, pinning, or meeting another person with raw, focused energy. It is less about pretending not to think and more about choosing a direct physical language.',
    canLookLike: 'The play may involve chase, growling, wrestling, biting, intense eye contact, or a quiet sense of being on the hunt. Specific behaviors and risks vary widely and need their own agreements.',
    notAutomatic: 'Predator vocabulary does not excuse aggression, erase judgment, or permit pursuit outside consent. It names a role inside a bounded fantasy, not a real-world entitlement.',
    attributes: [
      { label: 'Primal position', value: 'Pursuing' },
      { label: 'Physical intensity', value: 'Variable to high' },
      { label: 'Instinctive style', value: 'Core' },
      { label: 'Power exchange', value: 'Optional' },
      { label: 'Structure', value: 'Light but explicit' },
    ],
  },
  {
    roleId: 'role:primal-prey-544c0478',
    emblem: 'primal-prey-motion',
    shortSummary: 'The evasive, responsive side of negotiated instinctive play.',
    meaning: 'Primal Prey brings movement and response to the chase. Running, resisting capture, testing an escape, or choosing when to be caught can make the role energetic rather than passive.',
    canLookLike: 'For some people the appeal is speed and evasion; for others it is the charged attention of being pursued or the physical contest around capture. The person in the prey role helps define the entire scene.',
    notAutomatic: 'Prey is not helplessness, inferiority, or permission to ignore a stop. It does not mean wanting fear, pain, capture, or pursuit in any context that was not agreed.',
    attributes: [
      { label: 'Primal position', value: 'Evasive' },
      { label: 'Responsiveness', value: 'Core' },
      { label: 'Physical intensity', value: 'Variable to high' },
      { label: 'Agency', value: 'Active' },
      { label: 'Power exchange', value: 'Optional' },
    ],
  },
  {
    roleId: 'role:primal-switch-705db664',
    emblem: 'primal-switch-orbit',
    shortSummary: 'Freedom to pursue, evade, or move between both sides of primal play.',
    meaning: 'A Primal Switch enjoys more than one position in instinctive play. The same person may want to hunt in one scene, be chased in another, or let the balance shift as the encounter unfolds.',
    canLookLike: 'Wrestling can reverse who has momentum; a chase can turn; different partners can bring out different instincts. Switching gives that movement a name without fixing a required pattern.',
    notAutomatic: 'The label does not mean every role is always welcome, that limits change mid-scene, or that both positions appeal equally.',
    attributes: [
      { label: 'Primal position', value: 'Both' },
      { label: 'Role flexibility', value: 'Core' },
      { label: 'Physical intensity', value: 'Variable' },
      { label: 'Context', value: 'Highly relevant' },
      { label: 'Power exchange', value: 'Optional' },
    ],
  },
  {
    roleId: 'role:pet-8f0d1b30',
    emblem: 'pet-companion',
    shortSummary: 'Animal-inspired expression, companionship, or play between adults.',
    meaning: 'A Pet steps into an animal-inspired or companion-like persona. The appeal might be dropping everyday language, expressing affection physically, following simple cues, playing, performing, or enjoying a different kind of attention.',
    canLookLike: 'Pet play may be tender, mischievous, structured, erotic, social, or entirely nonsexual. Some people choose a specific animal persona; others simply like the broader pet frame.',
    notAutomatic: 'Pet does not mean childish, less human, submissive, owned, or unable to make adult decisions. No particular behavior, gear, or partner role is required.',
    attributes: [
      { label: 'Roleplay', value: 'Core' },
      { label: 'Companionship', value: 'Common' },
      { label: 'Playfulness', value: 'Variable to high' },
      { label: 'Power exchange', value: 'Optional' },
      { label: 'Sexual context', value: 'Optional' },
    ],
  },
  {
    roleId: 'role:owner-4b1b8aa3',
    emblem: 'owner-steward',
    shortSummary: 'A negotiated role built around stewardship, structure, and symbolic belonging.',
    meaning: 'An Owner participates in an agreed ownership-style dynamic. Depending on the people involved, that can emphasize care, responsibility, training, ritual, authority, belonging, or a shared symbolic language.',
    canLookLike: 'The role may pair with Pet, property, slave, or other chosen vocabulary. Some dynamics are playful and scene-based; others use recurring expectations and a strong sense of mutual commitment.',
    notAutomatic: 'Owner is not literal legal ownership and does not cancel personhood, privacy, independence, or consent. The title carries only the meaning and scope the adults involved have agreed to give it.',
    attributes: [
      { label: 'Stewardship', value: 'Core theme' },
      { label: 'Authority', value: 'Negotiated' },
      { label: 'Caregiving', value: 'Common' },
      { label: 'Structure', value: 'Variable' },
      { label: 'Roleplay', value: 'Optional' },
    ],
  },
]

export const rolePresentationById = new Map(rolePresentations.map((presentation) => [presentation.roleId, presentation]))
