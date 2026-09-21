import type { ReadinessResult, RoleResult } from '../types'

export interface LearningRecommendation { title: string; description: string }

export function generateRecommendations(roleResults: RoleResult[], readiness: ReadinessResult[]): LearningRecommendation[] {
  const suggestions: LearningRecommendation[] = []
  const top = roleResults.filter((result) => result.alignment === 'strong' || result.alignment === 'explore').slice(0, 6)
  const categories = new Set(top.flatMap((result) => [result.role.primaryCategory, ...result.role.facets]))
  if (categories.has('power-exchange') || categories.has('relationship-style')) suggestions.push({ title: 'Define the edges of authority', description: 'Before exploring structured power exchange, discuss what authority covers, when it begins and ends, and how either person can revise it.' })
  if (categories.has('rope-bondage')) suggestions.push({ title: 'Seek hands-on rope education', description: 'Rope involves technical risks that communication alone cannot manage. Learn from a qualified source before practice; this app does not provide technique instruction.' })
  if (categories.has('brat-dynamics')) suggestions.push({ title: 'Keep resistance and refusal distinct', description: 'Create an unmistakable way to separate negotiated playful resistance from a genuine pause, no, or withdrawal.' })
  if (categories.has('primal')) suggestions.push({ title: 'Put a clear container around instinctive play', description: 'Explicitly negotiate behaviors, location, intensity, stop signals, and what happens when improvised energy changes.' })
  if (categories.has('psychological-play')) suggestions.push({ title: 'Plan for emotional impact', description: 'Discuss vulnerable topics, out-of-bounds language, signs of distress, debriefing, and repair before psychologically intense play.' })
  readiness.filter((item) => item.band === 'important' || item.band === 'explore').slice(0, 3).forEach((item) => suggestions.push({ title: `Strengthen ${String(item.competency).replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}`, description: 'Review this concept with trusted educational resources and practice discussing it in specific, low-pressure terms before relying on it in an intense context.' }))
  if (!suggestions.length) suggestions.push({ title: 'Keep the map provisional', description: 'Revisit preferences with experience, education, and changing context. A clear answer today never becomes permanent consent.' })
  return suggestions.slice(0, 6)
}
