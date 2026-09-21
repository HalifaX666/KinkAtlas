import type { RoleCategory } from '../types'

export const categories: RoleCategory[] = [
  ['power-exchange','Power exchange','How authority is offered, held, and bounded.'],
  ['play-position','Play position','The position someone prefers in a particular activity.'],
  ['service','Service','Meaning expressed through giving or receiving useful attention.'],
  ['rope-bondage','Rope & bondage','Restraint, craft, movement, and negotiated vulnerability.'],
  ['pain-sensation','Pain & sensation','Giving, receiving, or exploring physical sensation.'],
  ['discipline-protocol','Discipline & protocol','Rules, accountability, ritual, and formal structure.'],
  ['caregiving','Caregiving','Nurturing, protection, reassurance, and receiving care.'],
  ['brat-dynamics','Brat dynamics','Negotiated playful challenge and responses to it.'],
  ['primal','Primal','Instinctive, embodied, often less scripted forms of play.'],
  ['pet-owner','Pet & owner','Consensual adult roleplay using care, training, and animal-inspired expression.'],
  ['psychological-play','Psychological play','Mentally immersive or identity-framed experiences.'],
  ['exhibition-observation','Exhibition & observation','Consensual seeing, being seen, and performance.'],
  ['roleplay','Roleplay','Agreed fictional roles, scenes, and narratives.'],
  ['fetish-material','Fetish & material','Focused interest in materials, objects, clothing, or cues.'],
  ['relationship-style','Dynamic style','How a negotiated dynamic fits into daily life or relationships.'],
  ['community-identity','Community & identity','Broad community terms and ways of relating to vocabulary.'],
].map(([id,label,description]) => ({ id, label, description } as RoleCategory))

export const categoryById = Object.fromEntries(categories.map((category) => [category.id, category])) as Record<RoleCategory['id'], RoleCategory>
