import type { AnswerOption, AuthorityEvidenceClassification, DiscoveryQuestion, RoleCategoryId, RoleEvidenceRequirement, TraitId } from '../types'

type QuestionSeed = [string, RoleCategoryId, string, TraitId[], string[]?]

const weighted = (traits: TraitId[], level: number) => Object.fromEntries(
  traits.map((trait, index) => [trait, Math.max(0, Math.min(1, level * Math.max(.55, 1 - index * .12)))]),
) as Partial<Record<TraitId, number>>

const noInterest = (traits: TraitId[]) => Object.fromEntries(
  traits.map((trait, index) => [trait, .04 + index * .015]),
) as Partial<Record<TraitId, number>>

const addNeutralAnswers = (answers: AnswerOption[]): AnswerOption[] => [
  ...answers,
  { id: 'unknown', label: 'I don’t know yet', noScore: true },
  { id: 'prefer-not', label: 'Prefer not to answer', noScore: true },
]

const defaultInterestAnswers = (traits: TraitId[], phase: 'broad' | 'refine'): AnswerOption[] => addNeutralAnswers([
  { id: 'strong', label: 'Yes — that really appeals to me', effects: weighted(traits, 1) },
  { id: 'some', label: 'Yes — that somewhat appeals to me', effects: weighted(traits, phase === 'broad' ? .68 : .72) },
  { id: 'curious', label: 'Maybe — I’m curious', effects: weighted(traits, .48) },
  { id: 'no', label: 'No — that doesn’t appeal to me', effects: noInterest(traits) },
])

const customAnswers: Partial<Record<string, AnswerOption[]>> = {
  'd-power-give': [
    { id: 'strong', label: 'Negotiated authority and its responsibilities strongly appeal to me', effects: { dominance: 1, givingControl: .95, leadership: .82, responsibility: .85 } },
    { id: 'some', label: 'I’d rather guide an activity than hold broader authority', effects: { leadership: .8, responsibility: .65 } },
    { id: 'curious', label: 'I’m curious, but I don’t know what scope would appeal', effects: { dominance: .45, givingControl: .45, leadership: .48, responsibility: .55 } },
    { id: 'no', label: 'Negotiated authority doesn’t appeal to me', effects: { dominance: .04, givingControl: .05, leadership: .14 } },
  ],
  'd-flexibility': [
    { id: 'strong', label: 'Both directing and yielding strongly appeal to me', effects: { switching: 1, dominance: .82, submission: .82 } },
    { id: 'some', label: 'I lean one way but want access to both', effects: { switching: .75, dominance: .6, submission: .6 } },
    { id: 'curious', label: 'I’m curious about changing positions, but unsure', effects: { switching: .52, dominance: .35, submission: .35 } },
    { id: 'no', label: 'A more consistent position appeals to me', effects: { switching: .06, dominance: .3, submission: .3 } },
  ],
  'd-rope': [
    { id: 'strong', label: 'Learning to tie another adult appeals most', effects: { ropeGiving: 1, technicalInterest: .88, restraint: .45, ropeReceiving: .12 } },
    { id: 'some', label: 'Being tied or restrained appeals most', effects: { ropeReceiving: 1, restraint: .9, ropeGiving: .1, technicalInterest: .2 } },
    { id: 'curious', label: 'Both sides are interesting, but I am unsure', effects: { ropeGiving: .66, ropeReceiving: .66, restraint: .62, technicalInterest: .5 } },
    { id: 'no', label: 'Rope and restraint do not appeal to me', effects: { ropeGiving: .04, ropeReceiving: .05, restraint: .06, technicalInterest: .12 } },
  ],
  'd-intensity': [
    { id: 'strong', label: 'Creating intense sensation for someone appeals most', effects: { painGiving: 1, physicalIntensity: .82, sensorySeeking: .58, painReceiving: .1 } },
    { id: 'some', label: 'Receiving intense sensation appeals most', effects: { painReceiving: 1, physicalIntensity: .85, sensorySeeking: .68, painGiving: .1 } },
    { id: 'curious', label: 'Sensory contrast interests me more than pain', effects: { sensorySeeking: .82, physicalIntensity: .48, painGiving: .28, painReceiving: .28 } },
    { id: 'no', label: 'Strong or painful sensation does not appeal', effects: { painGiving: .04, painReceiving: .05, physicalIntensity: .06, sensorySeeking: .18 } },
  ],
  'd-structure': [
    { id: 'strong', label: 'Setting and maintaining agreed structure appeals', effects: { disciplineGiving: 1, structure: .88, protocol: .62, ritual: .5, disciplineReceiving: .08 } },
    { id: 'some', label: 'Receiving agreed structure or accountability appeals', effects: { disciplineReceiving: 1, structure: .88, protocol: .58, ritual: .48, disciplineGiving: .08 } },
    { id: 'curious', label: 'Ritual and protocol appeal more than discipline', effects: { protocol: .9, ritual: .9, structure: .68, disciplineGiving: .25, disciplineReceiving: .25 } },
    { id: 'no', label: 'Formal structure and discipline do not appeal', effects: { structure: .06, protocol: .05, ritual: .1, disciplineGiving: .04, disciplineReceiving: .04 } },
  ],
  'd-care': [
    { id: 'strong', label: 'Offering care or protection appeals most', effects: { caregiving: 1, emotionalConnection: .82, beingCaredFor: .18 } },
    { id: 'some', label: 'Receiving care and reassurance appeals most', effects: { beingCaredFor: 1, emotionalConnection: .85, caregiving: .18 } },
    { id: 'curious', label: 'A mutual caregiving dynamic appeals', effects: { caregiving: .72, beingCaredFor: .72, emotionalConnection: .9 } },
    { id: 'no', label: 'Care roles are not central to what appeals', effects: { caregiving: .06, beingCaredFor: .07, emotionalConnection: .3 } },
  ],
  'd-brat': [
    { id: 'strong', label: 'Playfully provoking or resisting appeals most', effects: { brattiness: 1, playfulness: .9, challenge: .82, bratHandling: .12 } },
    { id: 'some', label: 'Responding to playful resistance appeals most', effects: { bratHandling: 1, challenge: .85, playfulness: .76, brattiness: .12 } },
    { id: 'curious', label: 'Both sides of that playful tension appeal', effects: { brattiness: .7, bratHandling: .7, playfulness: .9, challenge: .76 } },
    { id: 'no', label: 'Negotiated resistance does not appeal', effects: { brattiness: .04, bratHandling: .05, playfulness: .25, challenge: .1 } },
  ],
  'd-pet': [
    { id: 'strong', label: 'Guiding or caring for an adult pet role appeals', effects: { caregiving: .95, roleplay: .78, playfulness: .62, beingCaredFor: .1 } },
    { id: 'some', label: 'Expressing an adult pet role or receiving care appeals', effects: { beingCaredFor: .95, roleplay: .9, playfulness: .82, caregiving: .12 } },
    { id: 'curious', label: 'The roleplay interests me without a preferred side', effects: { roleplay: .72, playfulness: .68, caregiving: .4, beingCaredFor: .4 } },
    { id: 'no', label: 'Adult pet roleplay does not appeal', effects: { roleplay: .08, caregiving: .18, beingCaredFor: .18, playfulness: .3 } },
  ],
  'd-visibility': [
    { id: 'strong', label: 'Being watched or displayed appeals most', effects: { exhibitionism: 1, performance: .72, voyeurism: .08 } },
    { id: 'some', label: 'Consensually observing appeals most', effects: { voyeurism: 1, exhibitionism: .08, performance: .18 } },
    { id: 'curious', label: 'Performing for an agreed audience appeals', effects: { performance: 1, exhibitionism: .7, voyeurism: .2 } },
    { id: 'no', label: 'Audience-aware experiences do not appeal', effects: { exhibitionism: .04, voyeurism: .05, performance: .06 } },
  ],
  'r-authority-style': [
    { id: 'strong', label: 'Agreed authority appeals more than leading one activity', effects: { dominance: 1, givingControl: .95, leadership: .58, structure: .72 } },
    { id: 'some', label: 'I’d rather lead an activity without broader authority', effects: { leadership: 1, structure: .42 } },
    { id: 'curious', label: 'Both kinds of direction might appeal in different situations', effects: { dominance: .58, givingControl: .62, leadership: .72, structure: .52 } },
    { id: 'no', label: 'Neither kind of direction is a main interest for me', effects: { dominance: .05, givingControl: .05, leadership: .08, structure: .3 } },
  ],
  'r-rope-motivation': [
    { id: 'strong', label: 'The technical craft of tying is the main appeal', effects: { ropeGiving: 1, technicalInterest: 1, restraint: .5, performance: .32 } },
    { id: 'some', label: 'Creating restraint appeals more than technical rope craft', effects: { restraint: 1, ropeGiving: .58, technicalInterest: .22, performance: .2 } },
    { id: 'curious', label: 'Visual composition and expression are the main appeal', effects: { performance: 1, ropeGiving: .68, technicalInterest: .55, restraint: .42 } },
    { id: 'no', label: 'None of those rope-giving motivations appeal', effects: { ropeGiving: .04, technicalInterest: .06, restraint: .08, performance: .12 } },
  ],
  'r-service-receive-style': [
    { id: 'strong', label: 'I’d enjoy directing and receiving clearly structured service', effects: { serviceReceiving: 1, givingControl: .72, structure: .78, emotionalConnection: .52, ritual: .42 } },
    { id: 'some', label: 'Thoughtful care matters more than directing how it happens', effects: { serviceReceiving: 1, emotionalConnection: .92, givingControl: .2, structure: .35, ritual: .28 } },
    { id: 'curious', label: 'Ceremonial or symbolic service appeals most to me', effects: { serviceReceiving: .82, ritual: 1, structure: .7, emotionalConnection: .58, givingControl: .35 } },
    { id: 'no', label: 'Receiving service is not a central interest', effects: { serviceReceiving: .04, givingControl: .15, structure: .28, emotionalConnection: .3, ritual: .18 } },
  ],
  'r-service-position': [
    { id: 'strong', label: 'I’d enjoy actively giving service without broader authority', effects: { serviceGiving: 1, leadership: .82, pleasureGiving: .72 } },
    { id: 'some', label: 'Giving service as part of chosen submission appeals most', effects: { serviceGiving: 1, submission: .88, receivingControl: .62, leadership: .18 } },
    { id: 'curious', label: 'Practical care matters more than position or authority', effects: { serviceGiving: .9, caregiving: 1, responsibility: .78 } },
    { id: 'no', label: 'Providing service is not a central interest', effects: { serviceGiving: .04, leadership: .22, pleasureGiving: .25, caregiving: .25 } },
  ],
  'r-service-receive-position': [
    { id: 'strong', label: 'I’d enjoy receiving service without holding broader authority', effects: { serviceReceiving: 1, pleasureReceiving: .88, sensorySeeking: .45 } },
    { id: 'some', label: 'Directing how service is provided is the main appeal', effects: { serviceReceiving: 1, givingControl: .82, structure: .78, pleasureReceiving: .5, submission: .05 } },
    { id: 'curious', label: 'Being cared for matters more than service or position', effects: { beingCaredFor: 1, emotionalConnection: .88, serviceReceiving: .55, pleasureReceiving: .4 } },
    { id: 'no', label: 'Receiving service is not a central interest', effects: { serviceReceiving: .04, pleasureReceiving: .2, beingCaredFor: .25 } },
  ],
  'r-praise-direction': [
    { id: 'strong', label: 'Giving specific praise or recognition appeals most', effects: { pleasureGiving: 1, emotionalConnection: .82, psychologicalIntensity: .62, responsibility: .68, pleasureReceiving: .08 } },
    { id: 'some', label: 'Receiving praise or recognition appeals most', effects: { pleasureReceiving: 1, emotionalConnection: .88, psychologicalIntensity: .65, pleasureGiving: .08 } },
    { id: 'curious', label: 'Both directions may appeal in different moments', effects: { pleasureGiving: .75, pleasureReceiving: .75, emotionalConnection: .9, switching: .62, psychologicalIntensity: .55 } },
    { id: 'no', label: 'Praise is not a central part of what appeals', effects: { pleasureGiving: .18, pleasureReceiving: .18, emotionalConnection: .3, psychologicalIntensity: .12 } },
  ],
  'r-praise-context': [
    { id: 'strong', label: 'Warm emotional connection is the main appeal', effects: { emotionalConnection: 1, pleasureGiving: .62, pleasureReceiving: .62, protocol: .15, structure: .2 } },
    { id: 'some', label: 'Recognition tied to an agreed goal or action is the main appeal', effects: { structure: .82, responsibility: .72, pleasureGiving: .6, pleasureReceiving: .6, emotionalConnection: .58 } },
    { id: 'curious', label: 'Formal approval within a negotiated protocol is the main appeal', effects: { protocol: 1, ritual: .72, structure: .75, emotionalConnection: .48 } },
    { id: 'no', label: 'None of these praise contexts is central', effects: { emotionalConnection: .22, protocol: .08, structure: .18, pleasureGiving: .15, pleasureReceiving: .15 } },
  ],
  'r-objectification-direction': [
    { id: 'strong', label: 'Creating an agreed objectification frame for another adult appeals most', effects: { objectification: 1, givingControl: .78, responsibility: .82, roleplay: .68, receivingControl: .06 } },
    { id: 'some', label: 'Entering an agreed objectified role appeals most', effects: { objectification: 1, receivingControl: .78, roleplay: .82, emotionalConnection: .58, givingControl: .06 } },
    { id: 'curious', label: 'Changing sides or co-creating the frame appeals most', effects: { objectification: .9, switching: 1, roleplay: .82, givingControl: .48, receivingControl: .48 } },
    { id: 'no', label: 'Objectification framing does not appeal', effects: { objectification: .03, givingControl: .18, receivingControl: .18, roleplay: .2 } },
  ],
  'r-objectification-frame': [
    { id: 'strong', label: 'A carefully limited depersonalization frame appeals to me', effects: { objectification: 1, roleplay: .72, psychologicalIntensity: .82 } },
    { id: 'some', label: 'Symbolic display appeals more than depersonalization', effects: { objectification: .42, roleplay: .72, psychologicalIntensity: .4 } },
    { id: 'curious', label: 'The idea is interesting but emotionally uncertain', effects: { objectification: .5, roleplay: .45, psychologicalIntensity: .58 } },
    { id: 'no', label: 'Depersonalization themes do not appeal', effects: { objectification: .03, roleplay: .22, psychologicalIntensity: .14 } },
  ],
  'r-objectification-focus': [
    { id: 'strong', label: 'The object or display symbolism is central to the appeal', effects: { objectification: 1, fetishInterest: .65, performance: .7 } },
    { id: 'some', label: 'Audience-aware display appeals without depersonalization', effects: { performance: .9, objectification: .18, fetishInterest: .35 } },
    { id: 'curious', label: 'Material or object symbolism is interesting but not central', effects: { fetishInterest: .72, objectification: .4, performance: .38 } },
    { id: 'no', label: 'Object or depersonalization symbolism does not appeal', effects: { objectification: .03, fetishInterest: .2, performance: .15 } },
  ],
  'r-structure-style': [
    { id: 'strong', label: 'Clear practical expectations matter more than formality or symbolism', effects: { structure: 1, protocol: .3, ritual: .2 } },
    { id: 'some', label: 'Formal expectations and etiquette are the main appeal', effects: { protocol: 1, structure: .72, ritual: .58 } },
    { id: 'curious', label: 'Repeated symbolic rituals are the main appeal', effects: { ritual: 1, protocol: .62, structure: .5 } },
    { id: 'no', label: 'None of these forms of structure are central', effects: { structure: .06, protocol: .04, ritual: .05 } },
  ],
  'r-exploration-context': [
    { id: 'strong', label: 'Private or self-directed learning appeals most', effects: { exploration: 1, communityConnection: .15, playfulness: .42 } },
    { id: 'some', label: 'Shared vocabulary and community learning appeal most', effects: { communityConnection: 1, exploration: .72, playfulness: .38 } },
    { id: 'curious', label: 'Low-pressure playful sampling appeals most', effects: { playfulness: 1, exploration: .82, communityConnection: .35 } },
    { id: 'no', label: 'Active exploration is not a current priority', effects: { exploration: .05, communityConnection: .18, playfulness: .25 } },
  ],
  'r-yielding-motivation': [
    { id: 'strong', label: 'A chosen submissive role or frame appeals most', effects: { submission: 1, receivingControl: .68, surrender: .55 } },
    { id: 'some', label: 'The feeling of deliberately letting go appeals most', effects: { surrender: 1, receivingControl: .72, submission: .5 } },
    { id: 'curious', label: 'Giving someone control of a specific task appeals without a broader role', effects: { receivingControl: 1, submission: .28, surrender: .4 } },
    { id: 'no', label: 'None of these yielding motivations appeal', effects: { submission: .04, receivingControl: .05, surrender: .05 } },
  ],
  'r-receiving-focus': [
    { id: 'strong', label: 'Being the focus of pleasure appeals most', effects: { pleasureReceiving: 1, sensorySeeking: .48, physicalIntensity: .25 } },
    { id: 'some', label: 'Varied sensory contrast appeals most', effects: { sensorySeeking: 1, pleasureReceiving: .55, physicalIntensity: .42 } },
    { id: 'curious', label: 'Strong physical intensity appeals most', effects: { physicalIntensity: 1, sensorySeeking: .72, pleasureReceiving: .38 } },
    { id: 'no', label: 'None of these receiving experiences are central', effects: { pleasureReceiving: .05, sensorySeeking: .08, physicalIntensity: .06 } },
  ],
}

const authorityEvidenceClassifications: Partial<Record<string, Partial<Record<string, AuthorityEvidenceClassification>>>> = {
  'd-power-give': { strong: 'explicit-authority', some: 'activity-leadership', curious: 'ambiguous', no: 'authority-rejection' },
  'd-flexibility': { strong: 'ambiguous', some: 'ambiguous', curious: 'ambiguous', no: 'ambiguous' },
  'r-lead': { strong: 'activity-leadership', some: 'activity-leadership', curious: 'activity-leadership', no: 'activity-leadership' },
  'r-authority-style': { strong: 'explicit-authority', some: 'activity-leadership', curious: 'ambiguous', no: 'authority-rejection' },
  'r-both-power': { strong: 'explicit-authority', some: 'explicit-authority', curious: 'ambiguous', no: 'authority-rejection' },
  'r-service-receive-style': { strong: 'ambiguous', some: 'activity-leadership', curious: 'activity-leadership', no: 'activity-leadership' },
  'r-service-position': { strong: 'activity-leadership', some: 'ambiguous', curious: 'activity-leadership' },
  'r-service-receive-position': { strong: 'activity-leadership', some: 'activity-leadership' },
  'r-service-direct': { strong: 'activity-leadership', some: 'activity-leadership', curious: 'activity-leadership', no: 'activity-leadership' },
  'r-primal-give': { strong: 'activity-leadership', some: 'activity-leadership', curious: 'activity-leadership', no: 'activity-leadership' },
  'r-owner': { strong: 'ambiguous', some: 'ambiguous', curious: 'ambiguous', no: 'ambiguous' },
  'r-hum-give': { strong: 'activity-leadership', some: 'activity-leadership', curious: 'activity-leadership', no: 'activity-leadership' },
  'r-story-lead': { strong: 'activity-leadership', some: 'activity-leadership', curious: 'activity-leadership', no: 'activity-leadership' },
  'r-objectification-direction': { strong: 'ambiguous', some: 'ambiguous', curious: 'ambiguous', no: 'ambiguous' },
  'r-lifestyle-power': { strong: 'ambiguous', some: 'ambiguous', curious: 'ambiguous', no: 'authority-rejection' },
}

const qualificationEvidence: Partial<Record<string, Partial<Record<string, RoleEvidenceRequirement[]>>>> = {
  'd-power-receive': { strong: ['explicit-submission'], some: ['explicit-submission'] },
  'r-surrender': { strong: ['explicit-submission'], some: ['explicit-submission'] },
  'r-yielding-motivation': { strong: ['explicit-submission'], some: ['explicit-submission'] },
  'r-service-position': { some: ['explicit-submission'] },
  'r-owner': { strong: ['explicit-ownership'], some: ['explicit-ownership'] },
  'd-care': { strong: ['explicit-protection'] },
  'r-care-give': { strong: ['explicit-protection'], some: ['explicit-protection'] },
  'r-protector': { strong: ['explicit-protection'], some: ['explicit-protection'] },
}

const broad: QuestionSeed[] = [
  ['d-power-give','power-exchange','Would you enjoy taking responsibility for directing an experience within clearly agreed limits?',['dominance','givingControl','leadership','responsibility']],
  ['d-power-receive','power-exchange','Would you enjoy giving a trusted person some agreed control for a set time?',['submission','receivingControl','surrender']],
  ['d-flexibility','power-exchange','Would you enjoy moving between directing and yielding, depending on the person or moment?',['switching','dominance','submission']],
  ['d-position-give','play-position','Would you enjoy doing or giving an activity without holding broader authority?',['leadership','pleasureGiving']],
  ['d-position-receive','play-position','Would you enjoy receiving or being the focus of an activity without giving up broader authority?',['pleasureReceiving','sensorySeeking']],
  ['d-service','service','Would you enjoy showing care or devotion through practical, attentive, or ritual acts?',['serviceGiving','emotionalConnection','ritual']],
  ['d-rope','rope-bondage','Do restraint, rope aesthetics, or learning to tie appeal to you?',['ropeGiving','ropeReceiving','restraint','technicalInterest'],['rope']],
  ['d-intensity','pain-sensation','Do strong physical sensations appeal to you, including pain within agreed limits?',['painGiving','painReceiving','physicalIntensity','sensorySeeking'],['pain','impact']],
  ['d-structure','discipline-protocol','Do clear rules, rituals, expectations, or agreed consequences appeal to you?',['structure','protocol','ritual','disciplineGiving','disciplineReceiving']],
  ['d-care','caregiving','Would you enjoy nurturing, protecting, reassuring, or being cared for?',['caregiving','beingCaredFor','emotionalConnection']],
  ['d-brat','brat-dynamics','Does playful, agreed resistance—or responding to it—appeal to you?',['brattiness','bratHandling','playfulness','challenge']],
  ['d-primal','primal','Does instinctive physical play—such as pursuit, escape, growling, or rough energy—appeal to you?',['primality','physicalIntensity','spontaneity'],['primal']],
  ['d-pet','pet-owner','Does adult animal-inspired roleplay involving care, play, training, or expression appeal to you?',['roleplay','caregiving','beingCaredFor','playfulness'],['pet-play']],
  ['d-psych','psychological-play','Do agreed experiences involving anticipation, embarrassment, fear, or mental intensity appeal to you?',['psychologicalIntensity','roleplay','challenge'],['psychological']],
  ['d-visibility','exhibition-observation','Would you enjoy being observed, observing, or performing for an agreed audience?',['exhibitionism','voyeurism','performance'],['visibility']],
  ['d-roleplay','roleplay','Would you enjoy stepping into a fictional character, story, or shared imaginary setting?',['roleplay','playfulness','exploration'],['roleplay']],
  ['d-material','fetish-material','Do particular clothing, materials, gear, or objects hold a strong sensory or symbolic appeal for you?',['fetishInterest','sensorySeeking','technicalInterest'],['materials']],
  ['d-lifestyle','relationship-style','Would you enjoy an agreed dynamic that continues beyond individual scenes?',['lifestyleOrientation','structure','emotionalConnection','responsibility']],
  ['d-community','community-identity','Would shared kink language or community feel valuable, even if no single role fits?',['communityConnection','exploration']],
  ['d-exploration','community-identity','Would you enjoy trying unfamiliar possibilities slowly, with room to stay undecided?',['exploration','communityConnection','playfulness']],
]

const refine: QuestionSeed[] = [
  ['r-lead','power-exchange','Does taking the lead appeal partly because you like being responsible for the outcome?',['leadership','responsibility']],
  ['r-authority-style','power-exchange','Which feels more relevant: agreed authority or leading a specific activity?',['dominance','givingControl','leadership','structure']],
  ['r-surrender','power-exchange','Does deliberately letting go appeal even without a particular activity involved?',['surrender','submission','receivingControl']],
  ['r-yielding-motivation','power-exchange','If yielding appeals to you, what matters most about it?',['submission','receivingControl','surrender']],
  ['r-both-power','power-exchange','Would access to both sides of a power exchange feel important to you?',['switching','dominance','submission']],
  ['r-top','play-position','Would you enjoy leading an activity even when neither person has authority outside that activity?',['leadership','pleasureGiving']],
  ['r-bottom','play-position','Would receiving a sensation appeal even without a submissive role or identity?',['sensorySeeking','pleasureReceiving']],
  ['r-receiving-focus','play-position','When you receive an experience, what sounds most appealing?',['pleasureReceiving','sensorySeeking','physicalIntensity']],
  ['r-positions','play-position','Do you prefer choosing positions activity by activity rather than adopting a stable role?',['switching','exploration','spontaneity']],
  ['r-service-give','service','Does anticipating and completing useful acts feel rewarding in its own right?',['serviceGiving','emotionalConnection']],
  ['r-service-receive','service','Would thoughtful service feel meaningful to you, not just convenient?',['serviceReceiving','emotionalConnection']],
  ['r-service-receive-style','service','What would matter most when receiving agreed service?',['serviceReceiving','givingControl','structure','emotionalConnection','ritual']],
  ['r-service-position','service','If giving service appeals to you, what gives it meaning?',['serviceGiving','leadership','pleasureGiving','submission','caregiving','responsibility']],
  ['r-service-receive-position','service','If receiving service appeals to you, what kind of experience matters most?',['serviceReceiving','pleasureReceiving','givingControl','beingCaredFor','emotionalConnection']],
  ['r-service-direct','service','Would you enjoy planning and leading an experience around another person’s pleasure?',['serviceGiving','pleasureGiving','leadership','responsibility']],
  ['r-rope-give','rope-bondage','Does learning the technical craft of safely tying another adult appeal?',['ropeGiving','technicalInterest','responsibility'],['rope']],
  ['r-rope-receive','rope-bondage','Does the bodily or emotional experience of being restrained with rope appeal?',['ropeReceiving','restraint','sensorySeeking'],['rope']],
  ['r-rope-both','rope-bondage','Would you want to explore both tying and being tied?',['ropeGiving','ropeReceiving','switching'],['rope']],
  ['r-rope-motivation','rope-bondage','If tying another adult appealed, which motivation would be most central?',['ropeGiving','technicalInterest','restraint','performance'],['rope']],
  ['r-pain-give','pain-sensation','Does carefully creating intense sensation for another adult appeal?',['painGiving','responsibility','physicalIntensity'],['pain']],
  ['r-pain-receive','pain-sensation','Could receiving controlled pain feel focusing, pleasurable, or emotionally meaningful?',['painReceiving','physicalIntensity','sensorySeeking'],['pain']],
  ['r-sensation','pain-sensation','Are contrast and texture more appealing than pain itself?',['sensorySeeking','exploration'],['sensation']],
  ['r-discipline-give','discipline-protocol','Would giving an agreed consequence feel meaningful when the rules and exceptions are clear?',['disciplineGiving','structure','responsibility']],
  ['r-discipline-receive','discipline-protocol','Would agreed accountability or correction feel meaningful to you?',['disciplineReceiving','structure','receivingControl']],
  ['r-protocol','discipline-protocol','Do formal words, rituals, or repeated routines add meaning to a dynamic?',['protocol','ritual','structure']],
  ['r-structure-style','discipline-protocol','If structure appeals to you, what matters most about it?',['structure','protocol','ritual']],
  ['r-care-give','caregiving','Does offering steadiness, reassurance, or protection appeal as a central part of a dynamic?',['caregiving','responsibility','emotionalConnection']],
  ['r-care-receive','caregiving','Does being deliberately nurtured or reassured appeal as a central experience?',['beingCaredFor','emotionalConnection']],
  ['r-protector','caregiving','Would supporting someone and maintaining dependable boundaries feel rewarding?',['caregiving','leadership','responsibility']],
  ['r-brat','brat-dynamics','Would playful provocation feel fun when real refusal stays clearly separate?',['brattiness','playfulness','challenge']],
  ['r-tamer','brat-dynamics','Would responding to negotiated provocation with calm direction and wit appeal?',['bratHandling','leadership','playfulness','responsibility']],
  ['r-primal-give','primal','In an explicitly bounded scene, does pursuit or containment appeal more than escape?',['primality','givingControl','physicalIntensity'],['primal']],
  ['r-primal-receive','primal','In an explicitly bounded scene, do evasion, capture themes, or being pursued appeal?',['primality','receivingControl','challenge'],['primal']],
  ['r-owner','pet-owner','Does a negotiated ownership, possession, or adult pet-owner dynamic centered on guidance, care, and structure appeal?',['caregiving','givingControl','structure','responsibility'],['pet-play']],
  ['r-pet','pet-owner','Does playful animal-inspired expression or receiving role-based care appeal?',['roleplay','beingCaredFor','playfulness'],['pet-play']],
  ['r-hum-give','psychological-play','Would creating carefully limited embarrassment or status play appeal to you?',['psychologicalIntensity','givingControl','responsibility'],['psychological']],
  ['r-hum-receive','psychological-play','Would receiving carefully limited embarrassment or status play appeal to you?',['psychologicalIntensity','receivingControl','emotionalConnection'],['psychological']],
  ['r-praise-direction','psychological-play','When praise or recognition is part of an agreed interaction, which direction appeals most?',['pleasureGiving','pleasureReceiving','emotionalConnection','psychologicalIntensity','responsibility','switching']],
  ['r-praise-context','psychological-play','What would make praise or recognition meaningful in an agreed interaction?',['emotionalConnection','pleasureGiving','pleasureReceiving','structure','responsibility','protocol','ritual']],
  ['r-exhibit','exhibition-observation','Would being watched or displayed for a specifically agreed audience add excitement?',['exhibitionism','performance'],['visibility']],
  ['r-voyeur','exhibition-observation','Would observing others with everyone’s clear agreement add excitement?',['voyeurism','exploration'],['visibility']],
  ['r-story-lead','roleplay','Would you enjoy shaping the setup and pace of a fictional scenario?',['roleplay','leadership','givingControl'],['roleplay']],
  ['r-story-enter','roleplay','Would you enjoy fully stepping into an agreed character or fictional world?',['roleplay','psychologicalIntensity','emotionalConnection'],['roleplay']],
  ['r-material-sense','fetish-material','Is the sensory quality of particular clothing, gear, or material especially compelling?',['fetishInterest','sensorySeeking'],['materials']],
  ['r-material-craft','fetish-material','Does learning about, collecting, or caring for specialized gear appeal?',['fetishInterest','technicalInterest','ritual'],['materials']],
  ['r-objectification-frame','fetish-material','Do carefully limited objectification or depersonalization themes appeal apart from humiliation?',['objectification','roleplay','psychologicalIntensity'],['psychological','roleplay']],
  ['r-objectification-focus','fetish-material','If objectification appeals to you, is the object or display symbolism itself important?',['objectification','fetishInterest','performance'],['psychological','visibility','materials']],
  ['r-objectification-direction','fetish-material','In a carefully agreed objectification frame, which position would matter most to you?',['objectification','givingControl','receivingControl','responsibility','roleplay','emotionalConnection','switching'],['psychological','roleplay']],
  ['r-lifestyle-power','relationship-style','Would clearly limited authority in everyday routines appeal to you?',['lifestyleOrientation','structure']],
  ['r-lifestyle-ritual','relationship-style','Would repeated rituals help an ongoing relationship dynamic feel meaningful?',['lifestyleOrientation','ritual','emotionalConnection']],
  ['r-community','community-identity','Would shared vocabulary and learning with other adults feel valuable?',['communityConnection','exploration']],
  ['r-exploration-context','community-identity','What kind of exploration would feel most useful to you?',['exploration','communityConnection','playfulness']],
]

const makeQuestion = ([id, domain, prompt, traits, activityTags]: QuestionSeed, phase: 'broad' | 'refine'): DiscoveryQuestion => ({
  id,
  kind: 'discovery',
  domain,
  prompt,
  phase,
  traits,
  activityTags,
  answers: (customAnswers[id] ? addNeutralAnswers(customAnswers[id]!) : defaultInterestAnswers(traits, phase)).map((answer) => {
    const authorityEvidence = authorityEvidenceClassifications[id]?.[answer.id]
    const reviewedQualifications = qualificationEvidence[id]?.[answer.id] ?? []
    const qualifications: RoleEvidenceRequirement[] = [
      ...(authorityEvidence === 'explicit-authority' ? ['explicit-authority' as const] : []),
      ...reviewedQualifications,
    ]
    return {
      ...answer,
      authorityEvidence,
      qualificationEvidence: qualifications.length ? qualifications : undefined,
    }
  }),
})

export const discoveryQuestions: DiscoveryQuestion[] = [
  ...broad.map((seed) => makeQuestion(seed, 'broad')),
  ...refine.map((seed) => makeQuestion(seed, 'refine')),
]

export const discoveryQuestionById = Object.fromEntries(discoveryQuestions.map((question) => [question.id, question])) as Record<string, DiscoveryQuestion>
