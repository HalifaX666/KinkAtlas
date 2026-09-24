import type { NegotiationQuestion } from '../types'

const preference = (id: string, domain: string, prompt: string, labels: string[]): NegotiationQuestion => ({
  id, kind: 'negotiation', domain, prompt,
  answers: [...labels.map((label, index) => ({ id: `p${index + 1}`, label })), { id: 'prefer-not', label: 'Prefer not to answer', noScore: true }],
})

export const negotiationQuestions: NegotiationQuestion[] = [
  preference('n-planning','Planning','What kind of planning do you prefer before an experience?',['A detailed conversation and explicit plan','A few clear limits with room to improvise','A spontaneous start within established agreements','I don’t know yet']),
  preference('n-initiation','Initiation','How do you prefer initiation to happen?',['Agree on a signal or time window beforehand','Have someone ask directly in the moment','Allow surprise only within boundaries agreed in advance','I don’t know yet']),
  preference('n-signals','Stop signals','What kind of stop-signal system feels best to you?',['Plain language is primary','A dedicated safeword is primary','Words and agreed nonverbal signals are both available','I don’t know yet']),
  preference('n-checkin','Check-ins','How do you prefer check-ins during an experience?',['Regular direct check-ins','Subtle check-ins that preserve flow','Check-ins at agreed transition points','I don’t know yet']),
  preference('n-intensity','Intensity','How would you prefer to explore intensity?',['A defined ceiling from the start','A gradual scale with confirmation before increases','Staying well below my known ceiling','I don’t know yet']),
  preference('n-escalation','Escalation','What should happen if someone wants to add something that was not discussed?',['Stop and discuss it clearly','Save it for a future conversation','Consider only a small variation within an agreed category','I don’t know yet']),
  preference('n-authority','Authority','When authority is part of a dynamic, how should its limits be defined?',['Written or stated very specifically','Defined by contexts and examples','Kept narrow and reviewed often','I don’t know yet']),
  preference('n-uncertain','Uncertainty','What should happen if either person becomes uncertain?',['Pause completely and talk','Reduce intensity and check in','Move to a previously agreed neutral activity','I don’t know yet']),
  preference('n-aftercare','Aftercare','What are you most likely to prefer immediately afterward?',['Closeness and reassurance','Practical care such as water or a blanket','Quiet or personal space','It varies / I don’t know yet']),
  preference('n-followup','Follow-up','What kind of follow-up would you value after an intense experience?',['A same-day debrief','A check-in the next day','A check-in only if someone requests it','It varies / I don’t know yet']),
  preference('n-privacy','Privacy','How should information about an experience be handled?',['Kept entirely between participants','Shared only with specifically named people','Discussed without identifying details','Decided case by case / I don’t know yet']),
  preference('n-recording','Recording','How should photography or recording be handled?',['No recording','Separate permission for capture, storage, and sharing','A specific written agreement','I don’t know yet']),
  preference('n-substances','Substances','What is your preferred approach to substances and kink?',['Keep them separate','Set strict sober limits beforehand','Decide case by case with a conservative default','I don’t know yet']),
  preference('n-emotion','Emotional context','How do you prefer an experience to feel?',['Emotionally connected','Playful without requiring deep intimacy','Clearly contained and activity-focused','It varies / I don’t know yet']),
  preference('n-public','Public / private','How should dynamics be handled outside private spaces?',['Kept private','Limited to subtle signals agreed in advance','Expressed only in consenting community spaces','I don’t know yet']),
  preference('n-duration','Duration','How long should role-based authority continue?',['End with each scene','Exist only in named contexts','Continue until a stated check-in or end point','I don’t know yet']),
]

export const negotiationQuestionById = Object.fromEntries(negotiationQuestions.map((question) => [question.id, question])) as Record<string, NegotiationQuestion>
