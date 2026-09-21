import type { CompetencyId, Role, RoleCategoryId, RoleEvidenceRequirement, TraitId } from '../types'

type RoleSeed = [
  id: string,
  name: string,
  primaryCategory: RoleCategoryId,
  description: string,
  traits: Partial<Record<TraitId, number>>,
  aliases?: string[],
  activityTags?: string[],
]

const categoryGuidance: Record<RoleCategoryId, { competencies: CompetencyId[]; topics: string[]; notImplied: string }> = {
  'power-exchange': { competencies: ['ongoingConsent','negotiation','powerAwareness','accountability'], topics: ['scope and duration of authority','ongoing consent under power imbalance','responsibility and repair'], notImplied: 'Authority is negotiated and limited; the label does not create entitlement or consent.' },
  'play-position': { competencies: ['ongoingConsent','communication','stopSignals'], topics: ['activity-specific negotiation','check-ins and stop signals'], notImplied: 'A play position describes a preference in context, not an identity, hierarchy, or standing permission.' },
  service: { competencies: ['boundaries','selfAdvocacy','communication'], topics: ['service menus and limits','appreciation and expectations'], notImplied: 'Service is not an obligation, and receiving it does not confer unlimited authority.' },
  'rope-bondage': { competencies: ['riskAwareness','ongoingConsent','communication'], topics: ['qualified hands-on education','risk-aware negotiation','circulation and nerve-risk awareness'], notImplied: 'Interest in rope does not establish consent to restraint or any other activity.' },
  'pain-sensation': { competencies: ['riskAwareness','ongoingConsent','stopSignals'], topics: ['intensity scales','risk-aware education','aftercare preferences'], notImplied: 'Enjoying an intense sensation does not mean wanting every kind or intensity of sensation.' },
  'discipline-protocol': { competencies: ['negotiation','powerAwareness','accountability'], topics: ['clear rules and exceptions','proportionate negotiated consequences','ending and revising protocols'], notImplied: 'Rules exist only within their negotiated scope and never override a genuine refusal.' },
  caregiving: { competencies: ['boundaries','emotionalAwareness','aftercare'], topics: ['care without dependency assumptions','caregiver capacity and boundaries'], notImplied: 'Care roles do not make either adult incapable, dependent, or exempt from communicating limits.' },
  'brat-dynamics': { competencies: ['ongoingConsent','communication','stopSignals'], topics: ['distinguishing playful resistance from refusal','unambiguous stop signals'], notImplied: 'Playful resistance never makes a real “no” into consent or permission to push past uncertainty.' },
  primal: { competencies: ['negotiation','riskAwareness','stopSignals'], topics: ['explicitly bounded instinctive play','behaviors that need special negotiation'], notImplied: 'An instinctive style does not remove responsibility, awareness, or the need for explicit agreements.' },
  'pet-owner': { competencies: ['negotiation','boundaries','powerAwareness'], topics: ['adult roleplay boundaries','care and training language','when the role begins and ends'], notImplied: 'These are roles between consenting adults; they do not imply ownership outside negotiated limits.' },
  'psychological-play': { competencies: ['riskAwareness','emotionalAwareness','aftercare'], topics: ['emotional limits and triggers','debriefing and repair','qualified education for higher-risk play'], notImplied: 'Interest in a fantasy or mental frame is not permission for humiliation, fear, or identity attacks.' },
  'exhibition-observation': { competencies: ['privacy','recording','ongoingConsent'], topics: ['bystander and venue consent','recording permissions','revoking future sharing'], notImplied: 'Enjoying being seen never implies consent to photography, recording, sharing, or every audience.' },
  roleplay: { competencies: ['negotiation','roleAssumptions','stopSignals'], topics: ['fiction versus actual limits','role exit and stop signals'], notImplied: 'A fictional role never changes anyone’s real-world agency, rights, or ability to stop.' },
  'fetish-material': { competencies: ['communication','boundaries','riskAwareness'], topics: ['specific materials and limits','allergies and practical risks'], notImplied: 'A focused interest does not define a whole person or create consent involving that object or material.' },
  'relationship-style': { competencies: ['negotiation','powerAwareness','accountability'], topics: ['relationship agreements','renegotiation over time','conflict and repair'], notImplied: 'A relationship style is not a universal hierarchy and does not replace specific, ongoing consent.' },
  'community-identity': { competencies: ['roleAssumptions','learningMindset','boundaries'], topics: ['using labels as optional tools','community norms versus personal agreements'], notImplied: 'Community vocabulary is descriptive and optional; no label determines behavior or consent.' },
}

const categoryReflectionQuestions: Record<RoleCategoryId, string[]> = {
  'power-exchange': ['Does negotiated authority appeal, or mainly the active position?', 'What scope and duration of authority would actually feel meaningful?', 'How much structure would add to the experience rather than restrict it?'],
  'play-position': ['Does the activity position appeal without a broader role or hierarchy?', 'Which activities make this position feel most relevant?', 'How much flexibility between positions would you want?'],
  service: ['Is the service itself rewarding, or is its relational meaning more important?', 'Would you prefer clear requests, rituals, or room to anticipate needs?', 'What would help service remain chosen rather than expected?'],
  'rope-bondage': ['Is rope craft, restraint, visual expression, or emotional context most central?', 'Would the interest still appeal without a power dynamic?', 'How much technical learning would you want before exploring?'],
  'pain-sensation': ['Is the sensation itself central, or the emotional context around it?', 'Which forms and intensities interest you, and which do not?', 'Does giving or receiving intensity appeal independently of power roles?'],
  'discipline-protocol': ['Is practical structure, formal protocol, or symbolic ritual most meaningful?', 'How should exceptions and revisions be handled?', 'Would this interest stay inside a scene or recur over time?'],
  caregiving: ['Is giving or receiving care central, or one part of another dynamic?', 'What boundaries keep care sustainable for everyone involved?', 'Which kinds of reassurance or follow-up actually feel supportive?'],
  'brat-dynamics': ['Is playful provocation appealing without a submissive role?', 'How would genuine refusal remain unmistakable?', 'Does wit, challenge, structure, or attention matter most?'],
  primal: ['Is pursuit, evasion, physical contest, or shared instinctive energy most appealing?', 'Would fixed positions add meaning or feel restrictive?', 'Which behaviors would need especially explicit boundaries?'],
  'pet-owner': ['Is care, expression, play, training language, or structure most central?', 'When would the role begin and end?', 'Which parts appeal independently of authority?'],
  'psychological-play': ['Is anticipation, role framing, challenge, or emotional intensity most central?', 'Which words or themes would need firm boundaries?', 'What kind of debriefing would help separate play from real-world meaning?'],
  'exhibition-observation': ['Is being seen, observing, or performing the main appeal?', 'Which audiences and settings would be specifically acceptable?', 'How should privacy and recording permissions be handled?'],
  roleplay: ['Is character, story, performance, or changing positions most central?', 'Which real-world limits must remain explicit inside the fiction?', 'Would the scenario appeal without a power hierarchy?'],
  'fetish-material': ['Is the sensory quality, symbolism, craft, or presentation most central?', 'Does the interest stand alone or support another kind of play?', 'Which practical risks or material limits would matter?'],
  'relationship-style': ['Which parts belong only in scenes and which, if any, belong in daily life?', 'How would either person revise or end the structure?', 'Does recurring ritual appeal more than recurring authority?'],
  'community-identity': ['Is shared vocabulary, belonging, or personal exploration most useful?', 'Which labels feel clarifying and which feel too narrow?', 'Would this language still help outside a community setting?'],
}

const roleReflectionQuestions: Partial<Record<string, string[]>> = {
  dominant: ['Does responsibility for directing the interaction appeal to you?', 'Does negotiated authority appeal beyond individual activities?', 'How much structure do you actually want in a dynamic?'],
  top: ['Is taking the active role enough, without broader negotiated authority?', 'Which activities would make Top vocabulary useful?', 'Do you want responsibility for an activity, a dynamic, or both?'],
  rigger: ['Is the craft of tying itself appealing, or mainly the control or restraint involved?', 'Would technical learning appeal even without a power dynamic?', 'Is functional restraint, visual composition, or connection most central?'],
  'rope-bottom': ['Is being tied appealing independently of submission?', 'Is sensation, stillness, visual expression, or emotional context most central?', 'Would non-rope restraint hold the same appeal?'],
  masochist: ['Is receiving intense sensation appealing independently of submission?', 'Is the sensation itself central, or the emotional context surrounding it?', 'Which kinds of intensity are interesting and which are not?'],
  sadist: ['Is creating pain specifically appealing, or is varied intensity the stronger interest?', 'Does the interest depend on a power role?', 'How central are pacing, feedback, and responsibility to the appeal?'],
  'service-dominant': ['Is service to another person’s experience central to how authority feels meaningful?', 'Would the role still fit without pleasure-giving?', 'How would requests and responsibility remain clearly scoped?'],
  brat: ['Does playful resistance appeal without a submissive identity?', 'What keeps provocation distinct from a genuine refusal?', 'Is attention, challenge, humor, or structure most central?'],
  'service-top': ['Is the appeal providing service as an active position rather than holding authority?', 'Would service still appeal without submission or protocol?', 'Which forms of service feel chosen and sustainable?'],
  'service-bottom': ['Is receiving service appealing as the focus of an activity rather than as authority?', 'Does pleasure, care, or directing the service matter most?', 'What keeps receiving service separate from entitlement?'],
  'praise-giver': ['Is giving recognition rewarding without holding authority?', 'Does warmth, reinforcement, or formal approval matter most?', 'How would another person define praise that feels welcome?'],
  'praise-focused-player': ['Does receiving recognition appeal without a submissive role?', 'Is warmth, reinforcement, or formal approval most meaningful?', 'Which words would feel genuine rather than pressuring?'],
  objectifier: ['Does creating a bounded depersonalized frame appeal without broader authority?', 'Is symbolism, display, or narrative most central?', 'What language and stop signals would keep the frame clearly consensual?'],
  'objectified-roleplayer': ['Does entering an objectified role appeal without submission?', 'Is symbolism, display, or fictional framing most central?', 'What boundaries would keep role language separate from real-world worth?'],
}

const relatedRoleMap: Partial<Record<string, string[]>> = {
  dominant: ['top', 'service-dominant', 'nurturing-dominant', 'brat-tamer'],
  top: ['dominant', 'pleasure-top', 'impact-top', 'sensation-top'],
  'service-dominant': ['dominant', 'pleasure-dominant', 'nurturing-dominant', 'service-submissive'],
  'service-top': ['top', 'service-dominant', 'domestic-service-giver', 'pleasure-top'],
  'service-bottom': ['bottom', 'service-receiver', 'care-receiver', 'service-top'],
  rigger: ['bondage-top', 'decorative-rigger', 'rope-bottom', 'bondage-switch'],
  'rope-bottom': ['rope-model', 'restraint-enthusiast', 'rigger', 'bondage-switch'],
  sadist: ['impact-top', 'sensual-sadist', 'sensation-top', 'masochist'],
  masochist: ['bottom', 'endurance-masochist', 'sensation-player', 'sadist'],
  brat: ['playful-provocateur', 'tease', 'brat-switch', 'submissive'],
  'brat-tamer': ['playful-disciplinarian', 'disciplinarian', 'dominant', 'brat'],
  caregiver: ['protector', 'nurturing-dominant', 'aftercare-enthusiast', 'care-receiver'],
  owner: ['handler', 'trainer', 'dominant', 'caregiver'],
  'praise-giver': ['praise-focused-player', 'pleasure-top', 'caregiver', 'service-dominant'],
  'praise-focused-player': ['praise-giver', 'care-receiver', 'pleasure-top', 'protocol-enthusiast'],
  objectifier: ['objectification-player', 'objectified-roleplayer', 'humiliation-giver', 'authority-roleplayer'],
  'objectified-roleplayer': ['objectification-player', 'objectifier', 'humiliation-receiver', 'immersive-roleplayer'],
}

const roleComparisonNotes: Partial<Record<string, Record<string, string>>> = {
  dominant: { top: 'Both can involve taking an active role. Dominant vocabulary more often emphasizes negotiated authority or control, while Top usually describes who performs an activity.' },
  top: { dominant: 'Top usually describes an activity position. Dominant more often describes negotiated authority whose scope must be explicitly defined.' },
  rigger: { 'bondage-top': 'Both may involve creating restraint. Rigger vocabulary more strongly emphasizes rope craft and technical learning; Bondage Top can center restraint without rope craft being the main interest.' },
  masochist: { bottom: 'Masochist vocabulary centers receiving pain or intensity. Bottom describes the receiving position more broadly and does not imply interest in pain.' },
  brat: { submissive: 'Brat vocabulary centers negotiated provocation or playful resistance. It can overlap with submission, but it does not require a submissive identity.' },
}

const seeds: RoleSeed[] = [
  ['dominant','Dominant','power-exchange','A Dominant takes negotiated authority or responsibility within a power-exchange scene or relationship. Dominance concerns agreed direction or decision-making rather than simply performing an activity.',{ dominance:.95, givingControl:.9, leadership:.85, responsibility:.8, structure:.45 },['Dom']],
  ['submissive','Submissive','power-exchange','A submissive chooses to yield some negotiated authority or direction within a scene or relationship. Submission does not remove agency, limits, or the ability to withdraw consent.',{ submission:.95, receivingControl:.9, surrender:.85, emotionalConnection:.45 },['sub']],
  ['switch','Switch','power-exchange','A Switch is comfortable with more than one side of a power or play dynamic, such as directing and yielding. The preferred position can change with the partner, activity, setting, or time.',{ switching:1, dominance:.65, submission:.65, givingControl:.55, receivingControl:.55 },[]],
  ['top','Top','play-position','A Top takes the active, giving, or directing position in an activity. Topping concerns what someone does during that activity and does not, by itself, mean dominance or broader authority.',{ leadership:.65, pleasureGiving:.55, physicalIntensity:.5, dominance:.35 },[]],
  ['bottom','Bottom','play-position','A Bottom takes the receiving position in an activity or scene. Bottoming concerns participation in that activity and does not, by itself, mean submission, passivity, or reduced agency.',{ pleasureReceiving:.55, sensorySeeking:.65, physicalIntensity:.5, submission:.3 },[]],
  ['versatile-player','Versatile Player','play-position','A Versatile Player, or Vers, is comfortable in both giving and receiving activity positions. Unlike a Switch, this describes position flexibility rather than necessarily changing authority roles.',{ switching:.75, exploration:.8, spontaneity:.55, sensorySeeking:.5 },['Vers']],
  ['service-dominant','Service Dominant','service','A Service Dominant holds negotiated authority while using it to support a partner’s needs, comfort, growth, or desired experience. Service describes the style of dominance rather than submission to the recipient.',{ dominance:.75, serviceGiving:.9, pleasureGiving:.8, leadership:.65, responsibility:.8 },['Service Dom']],
  ['service-submissive','Service Submissive','service','A Service Submissive expresses chosen submission through practical help, caretaking, tasks, or attentive support. The service is an expression of yielding within agreed limits.',{ submission:.7, serviceGiving:.95, structure:.55, emotionalConnection:.55 },['Service sub']],
  ['service-receiver','Service Receiver','service','A Service Receiver requests, receives, and appreciates negotiated acts of service. Receiving service does not, by itself, establish dominance or entitlement.',{ serviceReceiving:.95, structure:.55, givingControl:.45, emotionalConnection:.4 },[]],
  ['service-top','Service Top','service','A Service Top takes the active role primarily to create an experience another person wants. This activity-focused service does not require dominance, submission, or broader authority.',{ serviceGiving:1, leadership:.82, pleasureGiving:.78, responsibility:.7, dominance:.15 },[]],
  ['service-bottom','Service Bottom','service','A Service Bottom receives an activity partly to support the active partner’s goals, learning, or enjoyment. The role is activity-specific and does not, by itself, imply submission.',{ serviceReceiving:1, pleasureReceiving:.88, emotionalConnection:.58, sensorySeeking:.42, submission:.15 },[]],
  ['rigger','Rigger','rope-bondage','A Rigger ties or otherwise works with rope in bondage, art, performance, or connection-focused practice. Rigger describes rope craft and responsibility, not automatic dominance.',{ ropeGiving:1, technicalInterest:.9, responsibility:.8, leadership:.45 },['Rope Top'],['rope']],
  ['rope-bottom','Rope Bottom','rope-bondage','A Rope Bottom receives rope or is the person being tied. This activity position can center sensation, stillness, vulnerability, or visual expression without automatically indicating submission.',{ ropeReceiving:1, restraint:.85, sensorySeeking:.65, emotionalConnection:.45 },['Rope Bunny'],['rope']],
  ['bondage-switch','Bondage Switch','rope-bondage','A Bondage Switch takes both active and receiving positions in negotiated bondage. Which position fits can change with the scene or partner.',{ ropeGiving:.75, ropeReceiving:.75, switching:.65, technicalInterest:.6, restraint:.7 },[] ,['rope']],
  ['sadist','Sadist','pain-sensation','A Sadist enjoys giving consensual pain, discomfort, or intense sensation. Sadism concerns creating that experience for a willing partner and does not automatically imply dominance.',{ painGiving:1, physicalIntensity:.8, psychologicalIntensity:.45, responsibility:.65 },[] ,['impact','pain']],
  ['masochist','Masochist','pain-sensation','A Masochist enjoys receiving consensual pain, discomfort, or intense sensation. Masochism concerns the experience of intensity and does not automatically imply submission.',{ painReceiving:1, physicalIntensity:.85, sensorySeeking:.7, surrender:.35 },[] ,['impact','pain']],
  ['sensation-player','Sensation Player','pain-sensation','A Sensation Player explores sensory contrast such as texture, temperature, pressure, or intensity. Pain can be included, but it is not necessarily the focus.',{ sensorySeeking:1, exploration:.85, physicalIntensity:.55, playfulness:.4 },[] ,['sensation']],
  ['disciplinarian','Disciplinarian','discipline-protocol','A Disciplinarian applies negotiated rules, accountability, correction, or consequences within a structured dynamic. The role depends on agreed scope rather than unilateral punishment.',{ disciplineGiving:1, structure:.85, givingControl:.7, responsibility:.85 },[]],
  ['discipline-receiver','Discipline Receiver','discipline-protocol','A Discipline Receiver participates in negotiated accountability, correction, or consequences. Receiving discipline is a chosen structure and does not remove the ability to question, revise, or stop it.',{ disciplineReceiving:1, structure:.8, receivingControl:.65, challenge:.45 },[]],
  ['protocol-enthusiast','Protocol Enthusiast','discipline-protocol','A Protocol Enthusiast values formal expectations, etiquette, symbols, or repeated forms. Protocol can add structure or meaning without requiring a particular power position.',{ protocol:1, ritual:.9, structure:.85, lifestyleOrientation:.45 },[]],
  ['caregiver','Caregiver','caregiving','A Caregiver offers negotiated nurturing, reassurance, guidance, or practical support. Caregiving can be dominant, equal, or nonsexual and does not itself confer authority.',{ caregiving:1, responsibility:.85, emotionalConnection:.75, leadership:.4 },[]],
  ['care-receiver','Care Receiver','caregiving','A Care Receiver welcomes negotiated reassurance, nurturing attention, guidance, or practical support. Receiving care does not imply helplessness, dependence, or submission.',{ beingCaredFor:1, emotionalConnection:.8, receivingControl:.35, playfulness:.35 },[]],
  ['protector','Protector','caregiving','A Protector offers agreed steadiness, advocacy, watchfulness, or practical help. Unlike a general Caregiver, this role centers protection and dependable responsibility, not authority over another person.',{ caregiving:.8, responsibility:1, leadership:.75, structure:.5 },[]],
  ['brat','Brat','brat-dynamics','A Brat uses negotiated teasing, mischief, resistance, or playful defiance to create interaction. Bratting can overlap with submission but does not require a submissive role or turn genuine refusal into play.',{ brattiness:1, playfulness:.9, challenge:.85, submission:.35 },[]],
  ['brat-tamer','Brat Tamer','brat-dynamics','A Brat Tamer responds specifically to negotiated brattiness with steadiness, wit, structure, or agreed consequences. Unlike a generic Dominant, the role centers the playful challenge-and-response dynamic.',{ bratHandling:1, leadership:.75, challenge:.8, playfulness:.7, responsibility:.65 },[]],
  ['playful-provocateur','Playful Provocateur','brat-dynamics','A Playful Provocateur creates negotiated challenge, teasing, or mischief without necessarily placing it inside a power hierarchy. The focus is playful interaction rather than submission.',{ brattiness:.7, playfulness:1, spontaneity:.75, roleplay:.35 },[]],
  ['primal-hunter','Primal Hunter','primal','A Primal Hunter takes the pursuing, capturing, or assertive position in negotiated primal play. The role describes an agreed fantasy position, not permission to pursue someone outside it.',{ primality:1, givingControl:.65, physicalIntensity:.75, spontaneity:.7 },['Primal Predator'],['primal']],
  ['primal-prey','Primal Prey','primal','Primal Prey takes the pursued, evasive, or captured position in negotiated primal play. The fantasy can involve yielding to instinctive energy without reducing real-world agency.',{ primality:1, receivingControl:.65, physicalIntensity:.7, challenge:.7 },[] ,['primal']],
  ['primal-switch','Primal Switch','primal','A Primal Switch moves between pursuing and receiving positions in negotiated primal play. Which position fits can change with the scene or partner.',{ primality:.95, switching:.8, spontaneity:.8, physicalIntensity:.65 },[] ,['primal']],
  ['owner','Owner','pet-owner','An Owner participates in a consensual ownership-style dynamic centered on bounded authority, guidance, care, or training. Ownership is symbolic and negotiated; it does not remove another person’s agency or legal personhood.',{ givingControl:.8, caregiving:.65, structure:.75, responsibility:.85, roleplay:.5 },[] ,['pet-play']],
  ['pet','Pet','pet-owner','A Pet adopts an adult animal-inspired or companion-like role. Pet play can center affection, expression, play, care, training, or structure depending on the people involved.',{ receivingControl:.55, beingCaredFor:.7, playfulness:.85, roleplay:.75 },[] ,['pet-play']],
  ['trainer','Trainer','pet-owner','A Trainer uses negotiated teaching, repetition, feedback, or structure to help another person develop agreed behaviors or skills. Training can involve power exchange, but the title creates no authority on its own.',{ leadership:.8, structure:.85, caregiving:.5, responsibility:.75, roleplay:.6 },[] ,['pet-play']],
  ['humiliation-giver','Humiliation Giver','psychological-play','A Humiliation Giver creates carefully negotiated embarrassment, degradation, or status play for another adult. The role concerns a bounded psychological frame, not the person’s real worth.',{ psychologicalIntensity:1, givingControl:.7, roleplay:.55, responsibility:.75 },[] ,['psychological']],
  ['humiliation-receiver','Humiliation Receiver','psychological-play','A Humiliation Receiver enters a carefully bounded experience of embarrassment, degradation, or status play. The role does not make degrading language true outside the agreed frame.',{ psychologicalIntensity:1, receivingControl:.65, roleplay:.6, emotionalConnection:.55 },[] ,['psychological']],
  ['mind-game-enthusiast','Mind Game Enthusiast','psychological-play','A Mind Game Enthusiast explores suspense, anticipation, ambiguity, or mental challenge inside explicit limits. The role centers psychological intensity rather than real deception or coercion.',{ psychologicalIntensity:.95, challenge:.75, exploration:.7, roleplay:.45 },[] ,['psychological']],
  ['exhibitionist','Exhibitionist','exhibition-observation','An Exhibitionist enjoys being seen, displayed, or observed in an agreed context. The role never implies involving unaware bystanders or consenting to recording or sharing.',{ exhibitionism:1, performance:.85, psychologicalIntensity:.4 },[] ,['visibility']],
  ['voyeur','Voyeur','exhibition-observation','A Voyeur enjoys watching other people or observing a scene in an agreed context. The role requires the knowledge and consent of everyone being observed.',{ voyeurism:1, psychologicalIntensity:.45, exploration:.5 },[] ,['visibility']],
  ['performer','Kink Performer','exhibition-observation','A Kink Performer uses theatrical presentation or expressive play for a specifically agreed audience. Performance centers presentation and audience awareness rather than a fixed power position.',{ performance:1, exhibitionism:.75, roleplay:.7, technicalInterest:.4 },[] ,['visibility']],
  ['fantasy-director','Fantasy Director','roleplay','A Fantasy Director frames, guides, or co-creates an agreed fictional scenario. Directing the story does not automatically create authority outside that roleplay.',{ roleplay:1, leadership:.7, givingControl:.5, exploration:.65 },[] ,['roleplay']],
  ['immersive-roleplayer','Immersive Roleplayer','roleplay','An Immersive Roleplayer enters an agreed character or fictional world with emotional, narrative, or sensory depth. The fiction remains separate from real-world identity and limits.',{ roleplay:1, psychologicalIntensity:.7, emotionalConnection:.55, exploration:.6 },[] ,['roleplay']],
  ['roleplay-switch','Roleplay Switch','roleplay','A Roleplay Switch tries contrasting fictional positions and can change who directs the story. This flexibility concerns scenario roles rather than necessarily changing an ongoing power dynamic.',{ roleplay:.95, switching:.75, playfulness:.65, exploration:.8 },['Scenario Switch'] ,['roleplay']],
  ['gear-enthusiast','Gear Enthusiast','fetish-material','A Gear Enthusiast has a focused interest in the design, symbolism, ritual, craft, or sensory qualities of specialized clothing and equipment. The gear can be central without determining a power role.',{ fetishInterest:.9, technicalInterest:.65, ritual:.55, sensorySeeking:.5 },[] ,['materials']],
  ['lifestyle-dominant','Lifestyle Dominant','relationship-style','A Lifestyle Dominant holds negotiated authority and responsibility that recur beyond individual scenes. The broader duration distinguishes the role from scene-bounded dominance, while its scope remains revisable.',{ dominance:.85, lifestyleOrientation:1, structure:.8, responsibility:.9, ritual:.45 },[]],
  ['lifestyle-submissive','Lifestyle Submissive','relationship-style','A Lifestyle Submissive participates in a recurring, negotiated structure for yielding authority beyond individual scenes. Ongoing submission still preserves agency, limits, and the ability to renegotiate.',{ submission:.85, lifestyleOrientation:1, structure:.8, surrender:.65 },[]],
  ['relationship-switch','Relationship Switch','relationship-style','A Relationship Switch changes authority positions across time or contexts within an ongoing relationship. The role concerns recurring relational dynamics rather than only changing activity positions in a scene.',{ switching:.9, lifestyleOrientation:.85, emotionalConnection:.75, structure:.45 },[]],
  ['kink-explorer','Kink Explorer','community-identity','A Kink Explorer is actively discovering interests, language, and possibilities without needing a settled role label. Exploration describes an open process rather than inexperience or indecision.',{ exploration:1, communityConnection:.4, playfulness:.45 },['Explorer']],
  ['kinkster','Kinkster','community-identity','Kinkster is broad, self-chosen vocabulary for someone connected to kink interests, practices, or communities. It does not specify a role, level of experience, or set of activities.',{ communityConnection:.85, exploration:.7, switching:.4, lifestyleOrientation:.35 },[]],
  ['community-connector','Community Connector','community-identity','A Community Connector values building relationships, shared learning, language, or events within kink community spaces. The role centers connection rather than any particular activity or power position.',{ communityConnection:1, emotionalConnection:.65, responsibility:.45 },[]],
  ['gentle-dominant','Gentle Dominant','power-exchange','A Gentle Dominant practices negotiated dominance through patience, warmth, reassurance, and low-intimidation direction. The gentle style does not lessen the need to define authority and responsibility.',{ dominance:.85, givingControl:.8, caregiving:.8, emotionalConnection:.7, responsibility:.9 },['Gentle Dom']],
  ['authority-holder','Authority Holder','power-exchange','An Authority Holder accepts clearly scoped, negotiated decision-making responsibility without centering a particular play activity. The role concerns agreed authority rather than simply taking an active position.',{ givingControl:1, responsibility:.95, structure:.8, leadership:.8, dominance:.65 },[]],
  ['pleasure-dominant','Pleasure Dominant','power-exchange','A Pleasure Dominant uses negotiated authority to direct, control, or design another person’s pleasure. Authority distinguishes the role from a Pleasure Top, whose active position can remain activity-specific.',{ dominance:.8, givingControl:.8, pleasureGiving:1, responsibility:.8, sensorySeeking:.55 },['Pleasure Dom']],
  ['obedience-submissive','Obedience-focused Submissive','power-exchange','An Obedience-focused Submissive chooses to follow clear direction within explicitly negotiated limits. The focus is agreed obedience, not the loss of agency or a duty to comply outside scope.',{ submission:.9, receivingControl:.9, structure:.8, surrender:.75, responsibility:.55 },[]],
  ['impact-top','Impact Top','play-position','An Impact Top gives negotiated impact sensation in a scene. The role is activity-specific and does not automatically make the person a Dominant or establish authority elsewhere.',{ painGiving:.9, leadership:.65, physicalIntensity:.8, responsibility:.75, dominance:.25 },[],['impact','pain']],
  ['sensation-top','Sensation Top','play-position','A Sensation Top creates or directs negotiated sensory experiences involving texture, temperature, pressure, sound, or other stimuli. The role is activity-scoped and does not require broader authority.',{ sensorySeeking:.85, pleasureGiving:.75, leadership:.6, technicalInterest:.55, responsibility:.75 },[],['sensation']],
  ['pleasure-top','Pleasure Top','play-position','A Pleasure Top takes the active role in creating or directing another person’s pleasure. Topping describes the activity position and does not establish authority beyond it.',{ pleasureGiving:1, leadership:.65, sensorySeeking:.55, responsibility:.65, dominance:.2 },[]],
  ['scene-switch','Scene Switch','play-position','A Scene Switch changes between active and receiving positions within individual scenes or activities. The flexibility is scene-bounded and does not necessarily describe an ongoing authority dynamic.',{ switching:.95, spontaneity:.7, exploration:.75, pleasureGiving:.6, pleasureReceiving:.6 },[]],
  ['domestic-service-giver','Domestic Service Giver','service','A Domestic Service Giver performs chosen practical tasks that create comfort, order, or support. The service can be meaningful with or without submission or power exchange.',{ serviceGiving:1, structure:.75, caregiving:.65, responsibility:.8, ritual:.4 },[]],
  ['devotional-service-giver','Devotional Service Giver','service','A Devotional Service Giver uses chosen acts of service to express dedication or emotional commitment. Devotion describes the meaning of the service, not an unlimited obligation.',{ serviceGiving:1, emotionalConnection:.9, ritual:.75, submission:.55, surrender:.45 },[]],
  ['service-switch','Service Switch','service','A Service Switch both provides and receives negotiated service depending on context. Changing service positions does not by itself determine who holds authority.',{ serviceGiving:.85, serviceReceiving:.85, switching:.8, emotionalConnection:.65, structure:.5 },[]],
  ['ceremonial-service-receiver','Ceremonial Service Receiver','service','A Ceremonial Service Receiver receives negotiated service through formal, symbolic, or repeated forms. The ritual meaning distinguishes it from purely practical service.',{ serviceReceiving:1, protocol:.8, ritual:.9, structure:.65, emotionalConnection:.5 },[]],
  ['decorative-rigger','Decorative Rigger','rope-bondage','A Decorative Rigger ties another adult with emphasis on visual composition, expression, and rope craft. The role centers aesthetic rope work rather than automatic dominance.',{ ropeGiving:1, technicalInterest:.85, performance:.65, ritual:.45, responsibility:.75 },[],['rope']],
  ['bondage-top','Bondage Top','rope-bondage','A Bondage Top takes the active or giving position in negotiated restraint. The label describes that activity position and does not by itself establish dominance or broader authority.',{ ropeGiving:.8, restraint:1, leadership:.65, responsibility:.8, technicalInterest:.65 },[],['rope']],
  ['rope-model','Rope Model','rope-bondage','A Rope Model participates in the visual, expressive, or performative experience of being tied. The role centers presentation in rope and does not automatically imply submission.',{ ropeReceiving:1, performance:.85, restraint:.75, exhibitionism:.55, sensorySeeking:.5 },[],['rope','visibility']],
  ['restraint-enthusiast','Restraint Enthusiast','rope-bondage','A Restraint Enthusiast is interested in restricted movement as a sensation or dynamic. The interest can include rope but does not center rope craft or require a fixed power position.',{ restraint:1, sensorySeeking:.7, receivingControl:.55, physicalIntensity:.45, exploration:.5 },[],['rope']],
  ['sensual-sadist','Sensual Sadist','pain-sensation','A Sensual Sadist blends consensual pain-giving or intensity with pleasure, pacing, and emotional attentiveness. This style of sadism does not automatically imply dominance.',{ painGiving:.9, pleasureGiving:.85, sensorySeeking:.75, emotionalConnection:.65, responsibility:.8 },[] ,['pain','impact','sensation']],
  ['endurance-masochist','Endurance Masochist','pain-sensation','An Endurance Masochist is drawn to sustained, negotiated intensity and the experience of meeting a physical challenge. The focus is duration and endurance, not submission.',{ painReceiving:1, physicalIntensity:.95, challenge:.9, surrender:.5, responsibility:.55 },[],['pain','impact']],
  ['intensity-switch','Intensity Switch','pain-sensation','An Intensity Switch both creates and receives strong sensation in different contexts. Which side fits can change without implying a change in broader authority.',{ painGiving:.8, painReceiving:.8, switching:.85, physicalIntensity:.85, sensorySeeking:.65 },[],['pain','impact']],
  ['impact-enthusiast','Impact Enthusiast','pain-sensation','An Impact Enthusiast has a focused interest in negotiated impact experiences without adopting a fixed giving or receiving position. The activity is central rather than a particular power role.',{ physicalIntensity:.85, sensorySeeking:.7, exploration:.65, painGiving:.55, painReceiving:.55 },[],['impact','pain']],
  ['ritual-dominant','Ritual Dominant','discipline-protocol','A Ritual Dominant uses repeated symbolic actions, forms, or ceremonies to express negotiated authority and responsibility. Ritual shapes the style of dominance rather than expanding its scope.',{ dominance:.75, ritual:1, protocol:.9, structure:.8, responsibility:.85 },['Ritual Dom']],
  ['protocol-submissive','Protocol Submissive','discipline-protocol','A Protocol Submissive expresses chosen submission through formal expectations, etiquette, or repeated forms. Following protocol remains limited to the negotiated dynamic.',{ submission:.75, protocol:1, ritual:.9, structure:.85, serviceGiving:.5 },[]],
  ['accountability-partner','Accountability Partner','discipline-protocol','An Accountability Partner participates in an explicit, mutually negotiated structure for goals, feedback, and follow-through. The role can be reciprocal and does not inherently create a hierarchy.',{ structure:.9, responsibility:.9, disciplineGiving:.55, disciplineReceiving:.55, emotionalConnection:.65 },[]],
  ['nurturing-dominant','Nurturing Dominant','caregiving','A Nurturing Dominant combines negotiated authority with reassurance, attentive care, and responsibility. Unlike a Caregiver, the role explicitly includes agreed direction or decision-making.',{ caregiving:1, dominance:.7, givingControl:.65, emotionalConnection:.85, responsibility:.95 },['Nurturing Dom']],
  ['nurtured-submissive','Nurtured Submissive','caregiving','A Nurtured Submissive chooses to yield within a dynamic where reassurance, support, and attentive care are central. Receiving care supports the submission but does not replace agency.',{ beingCaredFor:1, submission:.7, receivingControl:.6, emotionalConnection:.9, surrender:.55 },[]],
  ['aftercare-enthusiast','Aftercare Enthusiast','caregiving','An Aftercare Enthusiast places special value on negotiated support, decompression, and follow-up around intense experiences. The role centers care before or after play rather than authority.',{ caregiving:.75, beingCaredFor:.75, emotionalConnection:1, responsibility:.7, ritual:.45 },[]],
  ['brat-switch','Brat Switch','brat-dynamics','A Brat Switch moves between playful provocation and responding to negotiated resistance. The role includes both sides of the brat dynamic rather than a fixed authority position.',{ brattiness:.85, bratHandling:.85, switching:.9, playfulness:1, challenge:.8 },[]],
  ['tease','Tease','brat-dynamics','A Tease builds anticipation, desire, or playful frustration through words, attention, or delayed gratification. Teasing can occur in any power position and does not promise eventual access.',{ brattiness:.8, playfulness:1, challenge:.7, spontaneity:.75, performance:.45 },[]],
  ['playful-disciplinarian','Playful Disciplinarian','brat-dynamics','A Playful Disciplinarian meets negotiated mischief with lighthearted structure and proportionate agreed consequences. The role combines playfulness with discipline rather than generic control.',{ bratHandling:.9, disciplineGiving:.8, playfulness:.85, structure:.7, responsibility:.85 },[]],
  ['primal-companion','Primal Companion','primal','A Primal Companion shares embodied, instinctive energy without centering pursuit, capture, or a fixed position. The role emphasizes mutual presence rather than hunter-and-prey roles.',{ primality:1, emotionalConnection:.75, spontaneity:.8, physicalIntensity:.65, switching:.45 },[],['primal']],
  ['roughhousing-player','Roughhousing Player','primal','A Roughhousing Player takes part in negotiated physical contest, grappling themes, or energetic bodily play. The role centers mutual physical challenge rather than a fixed hunter or prey position.',{ primality:.75, physicalIntensity:.9, challenge:.85, playfulness:.65, switching:.55 },[],['primal']],
  ['chase-player','Chase Player','primal','A Chase Player explores negotiated pursuit and evasion while remaining flexible about position. The chase is central, while pursuer and pursued roles can change.',{ primality:.9, challenge:.85, spontaneity:.8, switching:.7, physicalIntensity:.65 },[],['primal']],
  ['handler','Handler','pet-owner','A Handler guides, cares for, or cues someone in an adult pet role within a clearly bounded frame. The role can include authority, training, or affection according to the agreement.',{ caregiving:.85, leadership:.85, structure:.8, responsibility:.9, roleplay:.75 },[],['pet-play']],
  ['puppy-player','Puppy Player','pet-owner','A Puppy Player adopts an adult canine-inspired role that can center playfulness, expression, community, physical activity, or negotiated care. It does not require submission or ownership.',{ roleplay:1, playfulness:1, beingCaredFor:.6, communityConnection:.55, physicalIntensity:.4 },[],['pet-play']],
  ['kitten-player','Kitten Player','pet-owner','A Kitten Player adopts an adult feline-inspired role that can center affection, independence, playfulness, or negotiated care. It does not require submission or ownership.',{ roleplay:1, playfulness:.9, beingCaredFor:.65, brattiness:.55, emotionalConnection:.55 },[],['pet-play']],
  ['pet-switch','Pet Play Switch','pet-owner','A Pet Play Switch changes between adult pet and guiding positions across contexts. Switching these roleplay positions does not automatically change authority outside pet play.',{ roleplay:.95, switching:.9, caregiving:.65, beingCaredFor:.65, playfulness:.85 },[],['pet-play']],
  ['fear-play-enthusiast','Fear Play Enthusiast','psychological-play','A Fear Play Enthusiast explores carefully negotiated suspense, startle, vulnerability, or fear themes within explicit emotional limits. The role concerns an agreed psychological experience, not real danger or coercion.',{ psychologicalIntensity:1, challenge:.8, roleplay:.7, emotionalConnection:.6, responsibility:.8 },[],['psychological']],
  ['praise-focused-player','Praise Receiver','psychological-play','A Praise Receiver places special value on receiving affirmation, approval, or earned recognition as an emotional focus. Praise can be meaningful without requiring submission.',{ psychologicalIntensity:.65, emotionalConnection:.9, pleasureReceiving:1, beingCaredFor:.42, structure:.38 },['Praise-focused Player']],
  ['praise-giver','Praise Giver','psychological-play','A Praise Giver offers specific affirmation, approval, or recognition as a consensual emotional focus. Giving praise does not require authority or dominance.',{ psychologicalIntensity:.62, emotionalConnection:.88, pleasureGiving:1, responsibility:.72, structure:.32 },[]],
  ['control-game-player','Control Game Player','psychological-play','A Control Game Player explores bounded mental challenges involving anticipation, choices, or perceived control. The game creates a temporary psychological frame rather than unlimited real authority.',{ psychologicalIntensity:.95, givingControl:.6, receivingControl:.6, challenge:.85, roleplay:.65 },[],['psychological']],
  ['display-director','Display Director','exhibition-observation','A Display Director shapes another adult’s negotiated presentation for a specifically agreed audience. The role centers presentation and audience context rather than authority outside the display.',{ performance:.9, leadership:.8, exhibitionism:.55, givingControl:.55, responsibility:.8 },[],['visibility']],
  ['audience-switch','Audience Switch','exhibition-observation','An Audience Switch both observes and is observed under different, explicitly negotiated conditions. The preferred side can change with the setting or participants.',{ exhibitionism:.8, voyeurism:.8, switching:.85, performance:.65, exploration:.6 },[],['visibility']],
  ['observer-performer','Observer Performer','exhibition-observation','An Observer Performer participates in audience-aware experiences while valuing both presentation and the observer’s perspective. The role combines performance and observation rather than fixing one side.',{ voyeurism:.75, performance:.9, exhibitionism:.7, roleplay:.55, technicalInterest:.35 },[],['visibility']],
  ['character-player','Character Player','roleplay','A Character Player explores a distinct fictional persona, voice, or set of behaviors. The character does not require a power hierarchy and remains separate from real-world identity.',{ roleplay:1, performance:.75, exploration:.7, playfulness:.65, psychologicalIntensity:.45 },[] ,['roleplay']],
  ['authority-roleplayer','Authority Roleplayer','roleplay','An Authority Roleplayer explores fictional command, rank, or control themes while keeping real-world power distinct. The scenario role does not itself grant actual authority.',{ roleplay:1, givingControl:.65, receivingControl:.4, psychologicalIntensity:.65, structure:.6 },[],['roleplay']],
  ['uniform-enthusiast','Uniform Enthusiast','fetish-material','A Uniform Enthusiast has a focused aesthetic, symbolic, sensory, or roleplay interest in uniforms and structured presentation. The uniform does not itself establish rank or authority.',{ fetishInterest:1, performance:.7, structure:.6, roleplay:.55, ritual:.45 },[],['materials']],
  ['sensory-material-explorer','Sensory Material Explorer','fetish-material','A Sensory Material Explorer compares textures, clothing, and other materials as part of sensory play. The physical qualities of the materials are central rather than a particular power role.',{ fetishInterest:.8, sensorySeeking:1, exploration:.9, technicalInterest:.45, playfulness:.4 },[],['materials','sensation']],
  ['objectification-player','Objectification Roleplayer','fetish-material','An Objectification Roleplayer co-creates bounded themes of display or depersonalization and can change positions within them. The fictional frame does not alter anyone’s real-world worth or agency.',{ objectification:1, switching:.82, roleplay:.8, psychologicalIntensity:.72, exploration:.55 },[],['psychological','roleplay']],
  ['objectifier','Objectifier','psychological-play','An Objectifier creates a carefully negotiated objectification frame for another adult while retaining responsibility for its scope and impact. The role concerns the giving side of that frame, not real ownership or diminished personhood.',{ objectification:1, givingControl:.78, roleplay:.72, psychologicalIntensity:.8, responsibility:.85 },[],['psychological','roleplay']],
  ['objectified-roleplayer','Objectified Roleplayer','psychological-play','An Objectified Roleplayer enters a carefully bounded objectified role while retaining real-world agency and worth. The role concerns receiving that fictional frame and does not automatically imply submission.',{ objectification:1, receivingControl:.78, roleplay:.88, psychologicalIntensity:.8, emotionalConnection:.58 },[],['psychological','roleplay']],
  ['bedroom-dynamic','Scene-bounded D/s Partner','relationship-style','A Scene-bounded D/s Partner keeps negotiated power exchange inside specific scenes or settings. The boundary around when authority applies distinguishes this from an ongoing lifestyle dynamic.',{ dominance:.55, submission:.55, structure:.55, emotionalConnection:.7, lifestyleOrientation:.2 },['Bedroom-only D/s']],
  ['ongoing-protocol-partner','Ongoing Protocol Partner','relationship-style','An Ongoing Protocol Partner uses recurring rituals, expectations, or forms across time. The protocols can extend beyond individual scenes while remaining explicit and revisable.',{ lifestyleOrientation:.9, protocol:1, ritual:.9, structure:.85, responsibility:.8 },[]],
  ['dynamic-explorer','Dynamic Explorer','relationship-style','A Dynamic Explorer experiments with relationship structures without committing to one settled pattern. The role centers curiosity and revision rather than a fixed authority arrangement.',{ exploration:1, lifestyleOrientation:.55, switching:.7, emotionalConnection:.7, spontaneity:.6 },[]],
]

const additionalFacets: Partial<Record<string, RoleCategoryId[]>> = {
  'service-dominant': ['power-exchange'], 'service-submissive': ['power-exchange'],
  rigger: ['play-position'], 'rope-bottom': ['play-position'], 'bondage-switch': ['play-position'],
  disciplinarian: ['power-exchange'], 'discipline-receiver': ['power-exchange'],
  protector: ['power-exchange'], brat: ['power-exchange','roleplay'], 'brat-tamer': ['power-exchange'],
  owner: ['power-exchange','caregiving','roleplay'], pet: ['caregiving','roleplay'], trainer: ['power-exchange','caregiving','roleplay'],
  'lifestyle-dominant': ['power-exchange'], 'lifestyle-submissive': ['power-exchange'], 'relationship-switch': ['power-exchange'],
}

const roleDifferentiators: Partial<Record<string, Partial<Record<TraitId, number>>>> = {
  dominant: { dominance: 1, givingControl: .9 }, submissive: { surrender: 1, receivingControl: .85 }, switch: { switching: 1, dominance: .65, submission: .65 },
  'authority-holder': { structure: 1, givingControl: .9 },
  top: { leadership: .9, dominance: .25 }, bottom: { sensorySeeking: .9, submission: .25 },
  'service-dominant': { serviceGiving: 1, pleasureGiving: .85 }, 'service-submissive': { serviceGiving: 1, submission: .7 },
  'service-top': { serviceGiving: 1, leadership: .9, pleasureGiving: .85 }, 'service-bottom': { serviceReceiving: 1, pleasureReceiving: .9 },
  rigger: { technicalInterest: 1, ropeGiving: .9 }, 'rope-bottom': { ropeReceiving: 1, restraint: .85 }, 'bondage-switch': { switching: .9, ropeGiving: .8, ropeReceiving: .8 },
  sadist: { painGiving: 1, responsibility: .7 }, masochist: { painReceiving: 1, sensorySeeking: .7 }, 'sensation-player': { sensorySeeking: 1, exploration: .8 },
  disciplinarian: { disciplineGiving: 1, responsibility: .85 }, 'discipline-receiver': { disciplineReceiving: 1, structure: .85 }, 'protocol-enthusiast': { protocol: 1, ritual: .9 },
  caregiver: { caregiving: 1, emotionalConnection: .8 }, 'care-receiver': { beingCaredFor: 1, emotionalConnection: .8 }, protector: { responsibility: 1, leadership: .8 }, 'gentle-dominant': { dominance: 1, emotionalConnection: .8 }, 'nurturing-dominant': { caregiving: 1, emotionalConnection: .9 },
  brat: { brattiness: 1, playfulness: .9 }, 'brat-tamer': { bratHandling: 1, responsibility: .75 },
  'primal-hunter': { givingControl: .85, primality: 1 }, 'primal-prey': { receivingControl: .85, primality: 1 }, 'primal-switch': { switching: .9, primality: 1 },
  owner: { givingControl: .9, caregiving: .65 }, pet: { beingCaredFor: .85, roleplay: .9 }, trainer: { leadership: .9, structure: .85 },
  exhibitionist: { exhibitionism: 1, performance: .7 }, voyeur: { voyeurism: 1, exhibitionism: .1 }, performer: { performance: 1, exhibitionism: .7 },
  'lifestyle-dominant': { lifestyleOrientation: 1, dominance: .85 }, 'lifestyle-submissive': { lifestyleOrientation: 1, submission: .85 }, 'relationship-switch': { lifestyleOrientation: .9, switching: 1 },
  'praise-giver': { pleasureGiving: 1, emotionalConnection: .85 }, 'praise-focused-player': { pleasureReceiving: 1, emotionalConnection: .9 },
  objectifier: { objectification: 1, givingControl: .9 }, 'objectified-roleplayer': { objectification: 1, receivingControl: .9 },
  'objectification-player': { objectification: 1, switching: .9 },
}

const roleContraries: Partial<Record<string, Partial<Record<TraitId, number>>>> = {
  dominant: { receivingControl: .4 }, submissive: { givingControl: .4 }, top: { lifestyleOrientation: .2 },
  rigger: { ropeReceiving: .2 }, 'rope-bottom': { ropeGiving: .2 }, sadist: { painReceiving: .2 }, masochist: { painGiving: .2 },
  disciplinarian: { disciplineReceiving: .2 }, 'discipline-receiver': { disciplineGiving: .2 }, brat: { bratHandling: .25 }, 'brat-tamer': { brattiness: .25 },
  exhibitionist: { voyeurism: .2 }, voyeur: { exhibitionism: .2 },
}

const roleEvidenceRequirements: Partial<Record<string, RoleEvidenceRequirement[]>> = {
  dominant: ['explicit-authority'],
  'service-dominant': ['explicit-authority'],
  'gentle-dominant': ['explicit-authority'],
  'authority-holder': ['explicit-authority'],
  'pleasure-dominant': ['explicit-authority'],
  'lifestyle-dominant': ['explicit-authority'],
  'ritual-dominant': ['explicit-authority'],
  'nurturing-dominant': ['explicit-authority'],
  owner: ['explicit-authority', 'explicit-ownership'],
  'lifestyle-submissive': ['explicit-submission'],
  protector: ['explicit-protection'],
}

const defaultDifferentiators = (traits: Partial<Record<TraitId, number>>) => Object.fromEntries(
  (Object.entries(traits) as [TraitId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2),
) as Partial<Record<TraitId, number>>

const inferFacets = (traits: Partial<Record<TraitId, number>>): RoleCategoryId[] => {
  const facets: RoleCategoryId[] = []
  const has = (...ids: TraitId[]) => ids.some((id) => (traits[id] ?? 0) >= .55)
  if (has('dominance','submission','givingControl','receivingControl','surrender')) facets.push('power-exchange')
  if (has('serviceGiving','serviceReceiving')) facets.push('service')
  if (has('ropeGiving','ropeReceiving','restraint')) facets.push('rope-bondage')
  if (has('painGiving','painReceiving','sensorySeeking','physicalIntensity')) facets.push('pain-sensation')
  if (has('disciplineGiving','disciplineReceiving','protocol','ritual')) facets.push('discipline-protocol')
  if (has('caregiving','beingCaredFor')) facets.push('caregiving')
  if (has('brattiness','bratHandling')) facets.push('brat-dynamics')
  if (has('primality')) facets.push('primal')
  if (has('roleplay')) facets.push('roleplay')
  if (has('exhibitionism','voyeurism','performance')) facets.push('exhibition-observation')
  if (has('fetishInterest')) facets.push('fetish-material')
  if (has('lifestyleOrientation')) facets.push('relationship-style')
  if (has('communityConnection')) facets.push('community-identity')
  return facets
}

export const roles: Role[] = seeds.map(([id, name, primaryCategory, description, traits, aliases = [], activityTags]) => {
  const guidance = categoryGuidance[primaryCategory]
  return {
    id,
    name,
    vocabularyKind: 'scored-role',
    primaryCategory,
    facets: [...new Set([primaryCategory, ...(additionalFacets[id] ?? []), ...inferFacets(traits)])],
    description,
    traits,
    differentiatingTraits: roleDifferentiators[id] ?? defaultDifferentiators(traits),
    contraryTraits: roleContraries[id],
    evidenceRequirements: roleEvidenceRequirements[id],
    aliases,
    activityTags,
    relevantCompetencies: guidance.competencies,
    educationTopics: guidance.topics,
    reflectionQuestions: roleReflectionQuestions[id] ?? categoryReflectionQuestions[primaryCategory],
    notImplied: guidance.notImplied,
    relatedRoleIds: relatedRoleMap[id] ?? seeds.filter(([candidateId, , candidateCategory]) => candidateId !== id && candidateCategory === primaryCategory).slice(0, 4).map(([candidateId]) => candidateId),
    comparisonNotes: roleComparisonNotes[id],
  }
})

export const roleById = Object.fromEntries(roles.map((role) => [role.id, role])) as Record<string, Role>
