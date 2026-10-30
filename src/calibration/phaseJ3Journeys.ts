import { discoveryQuestions } from '../data/questions'
import { runPhaseJ2Journey, type PhaseJ2JourneyObservation, type PhaseJ2JourneySeed } from './phaseJ2Journeys'

export interface PhaseJ3JourneySeed extends PhaseJ2JourneySeed {
  intendedDistinctions: string[]
  expectedQualityConcerns?: string[]
}

const broadQuestions = discoveryQuestions.filter((question) => question.phase === 'broad')

function broad(overrides: Record<string, string>, fallback = 'no') {
  return Object.fromEntries(broadQuestions.map((question) => [question.id, overrides[question.id] ?? fallback]))
}

export const phaseJ3JourneySeeds: PhaseJ3JourneySeed[] = [
  {
    id: 'j3-dominance-without-top',
    description: 'Negotiated authority and responsibility without activity-leading or receiving interests.',
    intendedDistinctions: ['Dominant from Top', 'Dominant from Authority Holder'],
    expectedQualityConcerns: ['Owner vocabulary should require pet-specific evidence rather than authority evidence alone.'],
    broadAnswers: broad({ 'd-power-give': 'strong', 'd-lifestyle': 'some', 'd-structure': 'some', 'd-position-give': 'no' }),
    adaptiveAnswers: { 'r-authority-style': 'strong', 'r-lead': 'strong', 'r-top': 'no', 'r-lifestyle-power': 'some' },
  },
  {
    id: 'j3-top-without-dominance',
    description: 'Activity leadership and pleasure-giving while rejecting broader authority.',
    intendedDistinctions: ['Top from Dominant', 'activity leadership from authority'],
    expectedQualityConcerns: ['Opposite-direction service vocabulary should require independent service or yielding evidence.'],
    broadAnswers: broad({ 'd-position-give': 'strong', 'd-power-give': 'no', 'd-service': 'some' }),
    adaptiveAnswers: { 'r-top': 'strong', 'r-authority-style': 'some', 'r-lead': 'strong', 'r-service-direct': 'strong' },
  },
  {
    id: 'j3-submission-without-bottom',
    description: 'Chosen yielding and surrender without receiving-position or sensation interests.',
    intendedDistinctions: ['submissive from Bottom', 'submission from receiving activity'],
    broadAnswers: broad({ 'd-power-receive': 'strong', 'd-lifestyle': 'some', 'd-position-receive': 'no' }),
    adaptiveAnswers: { 'r-surrender': 'strong', 'r-yielding-motivation': 'strong', 'r-bottom': 'no' },
  },
  {
    id: 'j3-bottom-without-submission',
    description: 'Receiving sensation and pleasure while rejecting broader yielding.',
    intendedDistinctions: ['Bottom from submissive', 'receiving activity from authority yielding'],
    broadAnswers: broad({ 'd-position-receive': 'strong', 'd-intensity': 'some', 'd-power-receive': 'no' }),
    adaptiveAnswers: { 'r-bottom': 'strong', 'r-receiving-focus': 'strong', 'r-surrender': 'no' },
  },
  {
    id: 'j3-switch-both-directions',
    description: 'Meaningful authority evidence in both directions with flexibility between them.',
    intendedDistinctions: ['Switch from one-sided authority roles'],
    expectedQualityConcerns: ['One-sided role additions beside Switch should remain independently explainable.'],
    broadAnswers: broad({ 'd-power-give': 'strong', 'd-power-receive': 'strong', 'd-flexibility': 'strong' }),
    adaptiveAnswers: { 'r-both-power': 'strong', 'r-authority-style': 'curious', 'r-surrender': 'strong' },
  },
  {
    id: 'j3-one-sided-directive',
    description: 'Strong directive evidence with explicit rejection of yielding and switching.',
    intendedDistinctions: ['one-sided Dominant evidence should not imply Switch'],
    broadAnswers: broad({ 'd-power-give': 'strong', 'd-position-give': 'strong', 'd-power-receive': 'no', 'd-flexibility': 'no' }),
    adaptiveAnswers: { 'r-both-power': 'no', 'r-authority-style': 'strong', 'r-surrender': 'no' },
  },
  {
    id: 'j3-rope-giver-only',
    description: 'Technical tying and restraint-giving without receiving rope.',
    intendedDistinctions: ['Rigger and Bondage Top from Rope Bottom and Bondage Switch'],
    broadAnswers: broad({ 'd-rope': 'strong', 'd-position-give': 'strong' }),
    adaptiveAnswers: { 'r-rope-give': 'strong', 'r-rope-receive': 'no', 'r-rope-both': 'no', 'r-rope-motivation': 'strong' },
  },
  {
    id: 'j3-rope-receiver-only',
    description: 'Receiving rope and restraint sensation without tying or submission.',
    intendedDistinctions: ['Rope Bottom and Bondage Bottom from Rigger and Bondage Switch'],
    expectedQualityConcerns: ['Strong rope-receiving evidence should not disappear behind only broad receiving-position labels.'],
    broadAnswers: broad({ 'd-rope': 'strong', 'd-position-receive': 'strong' }),
    adaptiveAnswers: { 'r-rope-give': 'no', 'r-rope-receive': 'strong', 'r-rope-both': 'no', 'r-bottom': 'strong' },
  },
  {
    id: 'j3-rope-switch',
    description: 'Independent interest in both tying and being tied.',
    intendedDistinctions: ['Bondage Switch from one-direction rope roles'],
    broadAnswers: broad({ 'd-rope': 'curious', 'd-flexibility': 'strong', 'd-position-give': 'some', 'd-position-receive': 'some' }),
    adaptiveAnswers: { 'r-rope-give': 'strong', 'r-rope-receive': 'strong', 'r-rope-both': 'strong' },
  },
  {
    id: 'j3-owner-not-pet',
    description: 'Guidance, structure, and care in pet play without taking the pet position.',
    intendedDistinctions: ['Owner and Handler from Pet'],
    broadAnswers: broad({ 'd-pet': 'strong', 'd-care': 'strong', 'd-power-give': 'strong', 'd-structure': 'some' }),
    adaptiveAnswers: { 'r-owner': 'strong', 'r-pet': 'no', 'r-protector': 'strong' },
  },
  {
    id: 'j3-pet-not-owner',
    description: 'Adult pet expression and receiving care without ownership or guidance.',
    intendedDistinctions: ['Pet from Owner and Handler'],
    broadAnswers: broad({ 'd-pet': 'some', 'd-care': 'some', 'd-roleplay': 'strong', 'd-power-give': 'no' }),
    adaptiveAnswers: { 'r-pet': 'strong', 'r-owner': 'no', 'r-care-receive': 'strong' },
  },
  {
    id: 'j3-primal-directional-mix',
    description: 'Pursuit and evasion both matter, with neither direction treated as universal.',
    intendedDistinctions: ['Primal Switch from Primal Hunter and Primal Prey'],
    expectedQualityConcerns: ['Hunter versus Predator selection may expose incidental final-order behavior.'],
    broadAnswers: broad({ 'd-primal': 'strong', 'd-flexibility': 'some' }),
    adaptiveAnswers: { 'r-primal-give': 'strong', 'r-primal-receive': 'strong', 'r-positions': 'strong' },
  },
  {
    id: 'j3-brat-only',
    description: 'Playful provocation without interest in directing it.',
    intendedDistinctions: ['Brat from Brat Tamer'],
    broadAnswers: broad({ 'd-brat': 'strong', 'd-power-receive': 'no', 'd-power-give': 'no' }),
    adaptiveAnswers: { 'r-brat': 'strong', 'r-tamer': 'no' },
  },
  {
    id: 'j3-brat-tamer-only',
    description: 'Calm playful direction without provoking or yielding.',
    intendedDistinctions: ['Brat Tamer from Brat'],
    broadAnswers: broad({ 'd-brat': 'some', 'd-position-give': 'strong', 'd-power-give': 'some' }),
    adaptiveAnswers: { 'r-brat': 'no', 'r-tamer': 'strong' },
  },
  {
    id: 'j3-service-direction-conflict',
    description: 'Service giving and receiving both matter while broader authority directions conflict.',
    intendedDistinctions: ['Service Dominant from Service Submissive', 'conflicting directional evidence'],
    broadAnswers: broad({ 'd-service': 'strong', 'd-power-give': 'some', 'd-power-receive': 'some', 'd-flexibility': 'curious' }),
    adaptiveAnswers: { 'r-service-give': 'strong', 'r-service-receive': 'strong', 'r-service-position': 'curious', 'r-service-receive-position': 'curious' },
  },
  {
    id: 'j3-sadism-versus-sensation',
    description: 'Giving controlled pain is central while general sensory variety is secondary.',
    intendedDistinctions: ['Sadist from Sensation Top'],
    expectedQualityConcerns: ['A specialized Sadist subtype should require differentiating evidence, and omission of the broad Sadist label needs review.'],
    broadAnswers: broad({ 'd-intensity': 'strong', 'd-position-give': 'strong' }),
    adaptiveAnswers: { 'r-pain-give': 'strong', 'r-pain-receive': 'no', 'r-sensation': 'no' },
  },
  {
    id: 'j3-broad-curiosity',
    description: 'Broad curiosity across several themes without strong role-specific commitment.',
    intendedDistinctions: ['curiosity from sufficient recommendation evidence'],
    expectedQualityConcerns: ['A compact or empty set is valid; five role-specific suggestions from broad curiosity may overstate evidence.'],
    broadAnswers: broad({ 'd-exploration': 'strong', 'd-community': 'some', 'd-rope': 'curious', 'd-intensity': 'curious', 'd-roleplay': 'curious', 'd-material': 'curious' }, 'curious'),
    adaptiveDefault: 'curious',
  },
  {
    id: 'j3-many-independent-interests',
    description: 'Several independently strong families compete for the five available slots.',
    intendedDistinctions: ['slot-limit omissions', 'family representation', 'fifth-slot marginal value'],
    expectedQualityConcerns: ['A supported independent family may be omitted at the slot limit; the fifth slot should add more value than the omitted candidate.'],
    broadAnswers: broad({ 'd-power-give': 'strong', 'd-rope': 'strong', 'd-intensity': 'strong', 'd-care': 'strong', 'd-brat': 'strong', 'd-primal': 'strong', 'd-visibility': 'strong' }),
    adaptiveDefault: 'strong',
  },
  {
    id: 'j3-low-evidence-prefer-not',
    description: 'Most answers are unknown or prefer-not, with only general exploration evidence.',
    intendedDistinctions: ['missing evidence is not negative evidence', 'no fabricated primary'],
    broadAnswers: broad({ 'd-exploration': 'curious', 'd-community': 'prefer-not' }, 'unknown'),
    adaptiveDefault: 'prefer-not',
  },
]

export interface PhaseJ3JourneyObservation extends PhaseJ2JourneyObservation {
  intendedDistinctions: string[]
  expectedQualityConcerns: string[]
}

export function runPhaseJ3Journey(seed: PhaseJ3JourneySeed): PhaseJ3JourneyObservation {
  return { ...runPhaseJ2Journey(seed), intendedDistinctions: seed.intendedDistinctions, expectedQualityConcerns: seed.expectedQualityConcerns ?? [] }
}

export const phaseJ3SensitivityPairs = [
  { id: 'authority-to-unknown', baselineId: 'j3-dominance-without-top', variant: { 'd-power-give': 'unknown' }, dimension: 'one meaningful authority answer becomes unknown' },
  { id: 'top-add-authority', baselineId: 'j3-top-without-dominance', variant: { 'd-power-give': 'strong' }, dimension: 'one independent authority interest is added' },
  { id: 'submission-to-prefer-not', baselineId: 'j3-submission-without-bottom', variant: { 'd-power-receive': 'prefer-not' }, dimension: 'one submission answer becomes prefer-not' },
  { id: 'rope-giver-contrary', baselineId: 'j3-rope-giver-only', variant: { 'd-rope': 'no' }, dimension: 'the central rope interest becomes explicit contrary evidence' },
  { id: 'pet-owner-missing-authority', baselineId: 'j3-owner-not-pet', variant: { 'd-power-give': 'unknown' }, dimension: 'required authority evidence becomes unknown' },
  { id: 'mixed-add-observation', baselineId: 'j3-many-independent-interests', variant: { 'd-visibility': 'some' }, dimension: 'one directional visibility answer changes' },
] as const

export function sensitivityVariantSeed(pair: typeof phaseJ3SensitivityPairs[number]): PhaseJ3JourneySeed {
  const baseline = phaseJ3JourneySeeds.find((seed) => seed.id === pair.baselineId)
  if (!baseline) throw new Error(`Missing J.3 sensitivity baseline ${pair.baselineId}`)
  return { ...baseline, id: `j3-variant-${pair.id}`, description: `${baseline.description} Variant: ${pair.dimension}.`, broadAnswers: { ...baseline.broadAnswers, ...pair.variant } }
}
