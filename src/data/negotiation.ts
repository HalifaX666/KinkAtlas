import type { NegotiationQuestion } from '../types'

const preference = (id: string, domain: string, prompt: string, labels: string[]): NegotiationQuestion => ({
  id, kind: 'negotiation', domain, prompt,
  answers: [...labels.map((label, index) => ({ id: `p${index + 1}`, label })), { id: 'prefer-not', label: 'Prefer not to answer', noScore: true }],
})

export const negotiationQuestions: NegotiationQuestion[] = [
  preference('n-planning','Planning','Before an experience, I generally prefer…',['A detailed conversation and explicit plan','A few clear limits with room to improvise','A spontaneous start within established agreements','I don’t know yet']),
  preference('n-initiation','Initiation','For initiation, I would rather…',['Agree on a signal or window beforehand','Have someone ask directly in the moment','Allow surprise only inside a pre-negotiated container','I don’t know yet']),
  preference('n-signals','Stop signals','A stop-signal system feels best when…',['Plain language is primary','A dedicated safeword is primary','Words and agreed nonverbal signals are both available','I don’t know yet']),
  preference('n-checkin','Check-ins','During an experience, I tend to prefer…',['Regular direct check-ins','Subtle check-ins that preserve flow','Check-ins at agreed transition points','I don’t know yet']),
  preference('n-intensity','Intensity','When exploring intensity, I would prefer…',['A defined ceiling from the start','A gradual scale with confirmation before increases','Staying well below my known ceiling','I don’t know yet']),
  preference('n-escalation','Escalation','Adding something not discussed beforehand should usually mean…',['Stop and negotiate it explicitly','Save it for a future conversation','Consider only a very limited variation inside an agreed category','I don’t know yet']),
  preference('n-authority','Authority','When authority is part of a dynamic, I prefer its limits to be…',['Written or stated very specifically','Defined by contexts and examples','Kept narrow and renegotiated often','I don’t know yet']),
  preference('n-uncertain','Uncertainty','If either person becomes uncertain, my preferred default is…',['Pause completely and talk','Reduce intensity and check in','Move to a previously agreed neutral activity','I don’t know yet']),
  preference('n-aftercare','Aftercare','Immediately afterward, I am most likely to prefer…',['Closeness and reassurance','Practical care such as water or a blanket','Quiet or personal space','It varies / I don’t know yet']),
  preference('n-followup','Follow-up','After an intense experience, I would value…',['A same-day debrief','A check-in the next day','A check-in only if someone requests it','It varies / I don’t know yet']),
  preference('n-privacy','Privacy','Information about an experience should be…',['Kept entirely between participants','Shared only with specifically named people','Discussed without identifying details','Decided case by case / I don’t know yet']),
  preference('n-recording','Recording','Photography or recording should be handled by…',['No recording','Separate permission for capture, storage, and sharing','A specific written agreement','I don’t know yet']),
  preference('n-substances','Substances','My preferred approach to substances and kink is…',['Keep them separate','Set strict sober limits beforehand','Decide case by case with a conservative default','I don’t know yet']),
  preference('n-emotion','Emotional context','I prefer experiences to feel…',['Emotionally connected','Playful without requiring deep intimacy','Clearly contained and activity-focused','It varies / I don’t know yet']),
  preference('n-public','Public / private','Dynamics outside private space should be…',['Kept private','Limited to subtle pre-agreed signals','Expressed only in consenting community spaces','I don’t know yet']),
  preference('n-duration','Duration','Any role-based authority should…',['End with each scene','Exist only in named contexts','Continue until a stated check-in or end point','I don’t know yet']),
]

export const negotiationQuestionById = Object.fromEntries(negotiationQuestions.map((question) => [question.id, question])) as Record<string, NegotiationQuestion>
