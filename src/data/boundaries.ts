import type { BoundaryItem, BoundaryValue } from '../types'

export const boundaryItems: BoundaryItem[] = [
  { id: 'power', label: 'Power exchange', description: 'Giving or receiving clearly agreed authority.', tags: ['power'] },
  { id: 'service', label: 'Service', description: 'Giving or receiving practical care, attentive acts, or rituals.', tags: ['service'] },
  { id: 'rope', label: 'Rope & bondage', description: 'Rope, restraint, or restricted movement.', tags: ['rope'] },
  { id: 'impact', label: 'Impact & pain', description: 'Impact or painful intensity within agreed limits.', tags: ['impact','pain'] },
  { id: 'sensation', label: 'Sensation play', description: 'Temperature, texture, pressure, or sensory contrast.', tags: ['sensation'] },
  { id: 'protocol', label: 'Rules & protocol', description: 'Formal expectations, rituals, or negotiated correction.', tags: ['protocol'] },
  { id: 'care', label: 'Care dynamics', description: 'Nurturing, protection, reassurance, or receiving care.', tags: ['care'] },
  { id: 'brat', label: 'Playful resistance', description: 'Negotiated provocation or challenge with clear stop signals.', tags: ['brat'] },
  { id: 'primal', label: 'Primal play', description: 'Pursuit, capture themes, or instinctive physical expression.', tags: ['primal'] },
  { id: 'pet-play', label: 'Adult pet play', description: 'Animal-inspired expression, care, play, or training between adults.', tags: ['pet-play'] },
  { id: 'psychological', label: 'Psychological intensity', description: 'Fear, suspense, humiliation, or mental challenge.', tags: ['psychological'] },
  { id: 'visibility', label: 'Being seen / observing', description: 'Being seen, observing, or performing for an agreed audience.', tags: ['visibility'] },
  { id: 'roleplay', label: 'Roleplay', description: 'Fictional characters, settings, or agreed scenarios.', tags: ['roleplay'] },
  { id: 'materials', label: 'Materials & gear', description: 'Focused interest in clothing, materials, or specialized objects.', tags: ['materials'] },
]

export const boundaryOptions: { value: BoundaryValue; label: string }[] = [
  ['love','Love'], ['want','Want'], ['curious','Curious'], ['consider','Might consider'],
  ['neutral','Neutral'], ['dont-want','Don’t want'], ['hard-limit','Hard limit'],
  ['unknown','Don’t know enough yet'], ['prefer-not','Prefer not to answer'],
].map(([value, label]) => ({ value: value as BoundaryValue, label }))
