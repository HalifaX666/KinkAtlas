import { discoveryQuestionById } from '../data/questions'
import { roleById } from '../data/roles'
import { questionInformationValue } from '../engine/adaptiveQuestioning'

export interface AdaptiveValidationScenario {
  id: string
  description: string
  focusedQuestionIds: string[]
  redundantQuestionId: string
  plausibleRoleIds: string[]
}

export const adaptiveValidationScenarios: AdaptiveValidationScenario[] = [
  {
    id: 'authority-neighbors',
    description: 'Service, pleasure, and playful-response questions distinguish nearby authority roles.',
    focusedQuestionIds: ['r-service-direct', 'r-service-give', 'r-tamer', 'r-discipline-give'],
    redundantQuestionId: 'r-lead',
    plausibleRoleIds: ['dominant', 'service-dominant', 'pleasure-dominant', 'brat-tamer'],
  },
  {
    id: 'rope-neighbors',
    description: 'Directional and technical rope questions distinguish giver and receiver roles.',
    focusedQuestionIds: ['r-rope-give', 'r-rope-receive', 'r-rope-both'],
    redundantQuestionId: 'r-top',
    plausibleRoleIds: ['rigger', 'bondage-top', 'rope-bottom', 'rope-model'],
  },
  {
    id: 'service-position-neighbors',
    description: 'Service position questions distinguish active and receptive positions from authority and submission meanings.',
    focusedQuestionIds: ['r-service-position', 'r-service-receive-position', 'r-service-direct'],
    redundantQuestionId: 'd-service',
    plausibleRoleIds: ['service-top', 'service-bottom', 'service-dominant', 'service-submissive'],
  },
  {
    id: 'praise-direction-neighbors',
    description: 'Praise direction separates giving and receiving vocabulary without relying on authority labels.',
    focusedQuestionIds: ['r-praise-direction', 'r-praise-context'],
    redundantQuestionId: 'd-psych',
    plausibleRoleIds: ['praise-giver', 'praise-focused-player', 'pleasure-top', 'care-receiver'],
  },
  {
    id: 'objectification-direction-neighbors',
    description: 'Objectification direction separates creating, entering, and switching a bounded roleplay frame.',
    focusedQuestionIds: ['r-objectification-direction'],
    redundantQuestionId: 'r-objectification-frame',
    plausibleRoleIds: ['objectifier', 'objectified-roleplayer', 'objectification-player'],
  },
  {
    id: 'primal-direction-neighbors',
    description: 'Pursuit and evasion questions distinguish nearby primal directions.',
    focusedQuestionIds: ['r-primal-give', 'r-primal-receive'],
    redundantQuestionId: 'd-primal',
    plausibleRoleIds: ['primal-hunter', 'primal-prey', 'primal-switch', 'primal-companion'],
  },
  {
    id: 'authority-versus-activity-position',
    description: 'Authority-style and activity-position questions distinguish Dominant from Top.',
    focusedQuestionIds: ['r-authority-style', 'r-top'],
    redundantQuestionId: 'r-lead',
    plausibleRoleIds: ['dominant', 'top', 'service-dominant', 'service-top'],
  },
]

export function evaluateAdaptiveScenario(scenario: AdaptiveValidationScenario): { passed: boolean; focusedScore: number; redundantScore: number } {
  const plausibleRoles = scenario.plausibleRoleIds.map((id) => roleById[id])
  const focusedScore = Math.max(...scenario.focusedQuestionIds.map((id) => questionInformationValue(discoveryQuestionById[id], plausibleRoles, {}).total))
  const redundantScore = questionInformationValue(discoveryQuestionById[scenario.redundantQuestionId], plausibleRoles, {}).total
  return { passed: focusedScore > redundantScore, focusedScore, redundantScore }
}
