const conversationStarterStatements = {
  'n-planning': {
    p1: 'Before we play, I prefer to talk through what we’re planning, including limits, expectations, and anything we’re unsure about.',
    p2: 'I like to agree on a few clear limits first, then leave room for us to improvise within them.',
    p3: 'I’m comfortable with a spontaneous start when we already have clear agreements about what is in bounds.',
    p4: 'I haven’t settled on how much planning feels right for me yet, so I’d want us to decide together before we start.',
  },
  'n-initiation': {
    p1: 'I’m most comfortable when we agree ahead of time on a signal or window for how a scene or dynamic will begin.',
    p2: 'I prefer being asked directly in the moment before we begin.',
    p3: 'I’m open to surprise only within boundaries we’ve clearly agreed on ahead of time.',
    p4: 'I haven’t settled on how I prefer initiation to happen yet, so I’d want to talk it through before we begin.',
  },
  'n-signals': {
    p1: 'I prefer plain language to be our main way of stopping or pausing.',
    p2: 'I prefer us to choose a dedicated safeword as our main stop signal.',
    p3: 'I want both spoken and agreed nonverbal stop signals available.',
    p4: 'I haven’t settled on the stop signals that work best for me yet, so I’d want us to choose them together before we start.',
  },
  'n-checkin': {
    p1: 'I prefer regular, direct check-ins during play rather than expecting either person to guess how the other is doing.',
    p2: 'I prefer subtle check-ins that let us stay connected without breaking the flow.',
    p3: 'I prefer us to check in at transition points we agree on ahead of time.',
    p4: 'I don’t know what kind of check-ins work best for me yet, so I’d want us to choose an approach together.',
  },
  'n-intensity': {
    p1: 'I’m more comfortable agreeing on an upper limit for intensity before we begin.',
    p2: 'I prefer to build intensity gradually and check in before each increase.',
    p3: 'I prefer to stay well below the highest intensity I know I can handle.',
    p4: 'I haven’t settled on how I want to approach intensity yet, so I’d want to start conservatively and talk about it together.',
  },
  'n-escalation': {
    p1: 'If we want to go beyond what we originally agreed to, I’d rather stop and talk about it first.',
    p2: 'If something wasn’t part of our plan, I’d rather save it for a future conversation than add it in the moment.',
    p3: 'I’m open to a small variation only when it stays within a category we’ve already agreed to.',
    p4: 'I haven’t settled on how I feel about unplanned changes yet, so I’d want us to pause and decide together if one comes up.',
  },
  'n-authority': {
    p1: 'I prefer any authority we negotiate to be stated very specifically, including where it starts and stops.',
    p2: 'I prefer authority to be defined through clear contexts and examples, so we both know when it applies.',
    p3: 'I prefer authority to stay narrow and to be renegotiated often rather than assumed to continue.',
    p4: 'I haven’t settled on what limits around authority feel right for me yet, so I’d want to define them together before it becomes part of a dynamic.',
  },
  'n-uncertain': {
    p1: 'If either of us becomes uncertain, I prefer to pause completely and talk before deciding what happens next.',
    p2: 'If I’m unsure how I feel about something, I’d rather reduce the intensity and check in than push through it.',
    p3: 'If either of us becomes uncertain, I prefer to shift to a neutral activity we’ve already agreed on.',
    p4: 'I haven’t settled on what response to uncertainty works best for me, so I’d want us to agree on a default beforehand.',
  },
  'n-aftercare': {
    p1: 'Afterward, I usually prefer closeness and reassurance.',
    p2: 'Afterward, I usually prefer practical care, such as water or a blanket.',
    p3: 'Afterward, I usually prefer quiet or some personal space.',
    p4: 'What I want afterward can vary, so I’d rather check in about aftercare each time.',
  },
  'n-followup': {
    p1: 'After an intense experience, I’d value a chance to debrief together the same day.',
    p2: 'After an intense experience, I’d value a check-in the next day.',
    p3: 'I prefer follow-up after an intense experience when one of us asks for it.',
    p4: 'What I want from follow-up can vary, so I’d rather decide together after each experience.',
  },
  'n-privacy': {
    p1: 'I prefer details about our experience to stay entirely between the people involved.',
    p2: 'I’m comfortable with information being shared only with people we specifically name together.',
    p3: 'I’m comfortable discussing the experience only when identifying details are left out.',
    p4: 'My privacy preference depends on the situation, so I’d want us to decide together case by case.',
  },
  'n-recording': {
    p1: 'I don’t want photography or recording to be part of the experience.',
    p2: 'If recording comes up, I want separate permission for capturing it, storing it, and sharing it.',
    p3: 'I want any recording arrangements documented in a specific written agreement before anything is captured.',
    p4: 'I haven’t settled on how I feel about recording yet, so I’d want to discuss it before any photo or recording is made.',
  },
  'n-substances': {
    p1: 'I prefer to keep substances and kink separate.',
    p2: 'If substances could be involved, I want us to set strict limits while we’re sober and stick to them.',
    p3: 'I prefer to decide case by case and take the more conservative option when there’s uncertainty.',
    p4: 'I haven’t settled on how I feel about mixing substances and kink, so I’d want to talk about it while we’re sober before making plans.',
  },
  'n-emotion': {
    p1: 'I prefer experiences to include a sense of emotional connection.',
    p2: 'I enjoy a playful tone without needing the experience to involve deep intimacy.',
    p3: 'I prefer experiences to stay clearly contained and focused on the activity.',
    p4: 'The emotional tone I want can vary, so I’d rather talk about what feels right for each experience.',
  },
  'n-public': {
    p1: 'I prefer to keep our dynamic private.',
    p2: 'Outside private space, I’m comfortable only with subtle signals we’ve agreed on beforehand.',
    p3: 'I’m comfortable expressing a dynamic outside private space only in consenting community spaces.',
    p4: 'I haven’t settled on what feels comfortable outside private space, so I’d want us to talk about it before expressing a dynamic publicly.',
  },
  'n-duration': {
    p1: 'I prefer role-based authority to end when each scene ends.',
    p2: 'I prefer role-based authority to apply only in the specific contexts we name together.',
    p3: 'I prefer role-based authority to continue only until a check-in or end point we’ve stated ahead of time.',
    p4: 'I haven’t settled on how long role-based authority should last, so I’d want us to define a clear end point together.',
  },
} as const

const withheldStatementByQuestionId: Record<keyof typeof conversationStarterStatements, string> = {
  'n-planning': 'I chose not to describe my planning preference in the assessment.',
  'n-initiation': 'I chose not to describe my initiation preference in the assessment.',
  'n-signals': 'I chose not to describe my stop-signal preference in the assessment.',
  'n-checkin': 'I chose not to describe my check-in preference in the assessment.',
  'n-intensity': 'I chose not to describe my intensity preference in the assessment.',
  'n-escalation': 'I chose not to describe my escalation preference in the assessment.',
  'n-authority': 'I chose not to describe my authority preference in the assessment.',
  'n-uncertain': 'I chose not to describe my response to uncertainty in the assessment.',
  'n-aftercare': 'I chose not to describe my aftercare preference in the assessment.',
  'n-followup': 'I chose not to describe my follow-up preference in the assessment.',
  'n-privacy': 'I chose not to describe my privacy preference in the assessment.',
  'n-recording': 'I chose not to describe my recording preference in the assessment.',
  'n-substances': 'I chose not to describe my substance-use preference in the assessment.',
  'n-emotion': 'I chose not to describe my emotional-context preference in the assessment.',
  'n-public': 'I chose not to describe my public-space preference in the assessment.',
  'n-duration': 'I chose not to describe my authority-duration preference in the assessment.',
}

export function getConversationStarter(questionId: string, answerId: string): string | undefined {
  const statements = conversationStarterStatements[questionId as keyof typeof conversationStarterStatements]
  if (!statements) return undefined
  if (answerId === 'prefer-not') return withheldStatementByQuestionId[questionId as keyof typeof conversationStarterStatements]
  return statements[answerId as keyof typeof statements]
}
