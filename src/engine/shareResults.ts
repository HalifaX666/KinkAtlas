import { boundaryItems, boundaryOptions } from '../data/boundaries'
import { negotiationQuestions } from '../data/negotiation'
import { competencyDefinitions } from '../data/readiness'
import { explainRoleResult } from './roleExplanation'
import type { EditableRoleProfileEntry } from './roleProfileOptimizer'
import type { AssessmentAnswers, ReadinessAssessment, RoleResult } from '../types'

export interface ShareOptions {
  roles: boolean
  alignment: boolean
  confidence: boolean
  readiness: boolean
  blindSpots: boolean
  boundaries: boolean
  negotiation: boolean
}

export interface ShareResultsData {
  roleResults: RoleResult[]
  roleSet: EditableRoleProfileEntry[]
  readiness: ReadinessAssessment
  boundaries: AssessmentAnswers['boundaries']
  negotiation: AssessmentAnswers['negotiation']
}

export interface ShareableRoleResult {
  id: string
  name: string
  source: EditableRoleProfileEntry['source']
  alignment?: string
  confidence?: string
  evidenceBreadth?: number
  summary: string
  supportingSignals: string[]
}

export interface GeneratedRoleCard {
  role: ShareableRoleResult
  blob: Blob
  fileName: string
}

export const ROLE_CARD_SIZE = { width: 1080, height: 1350 } as const
export const OVERVIEW_CARD_SIZE = { width: 1200, height: 630 } as const

export const defaultShareOptions: ShareOptions = {
  roles: true,
  alignment: true,
  confidence: true,
  readiness: false,
  blindSpots: false,
  boundaries: false,
  negotiation: false,
}

const alignmentLabels: Record<RoleResult['alignment'], string> = {
  strong: 'Strong Alignment',
  explore: 'Worth Exploring',
  some: 'Some Alignment',
  insufficient: 'Limited Evidence',
}

const confidenceLabel = (confidence: RoleResult['confidence']) => confidence === 'moderate' ? 'Medium confidence' : `${confidence[0].toUpperCase()}${confidence.slice(1)} confidence`
const blindSpotLabels = { notice: 'Reflection cue', concern: 'Worth reviewing', critical: 'Important concept' } as const
const productExplanation = 'KinkAtlas is a private self-reflection tool that suggests role vocabulary from your answers, not an identity assignment.'
const separateLensesExplanation = 'Reflection considers knowledge and attitudes, not real-world readiness. Boundaries remain independent of role alignment.'
const safetyDisclaimer = 'Results do not certify safety or replace education, communication, or consent negotiation.'
const roleMetricsExplanation = (includeAlignment = true, includeConfidence = true) => [
  ...(includeAlignment ? ['Alignment describes how closely your answers resemble a role’s themes.'] : []),
  ...(includeConfidence ? ['Confidence describes how much relevant information was available; it does not determine ranking.'] : []),
  'Evidence breadth is the share of a role’s themes with usable answer evidence, not match strength.',
]

const unavailableRoleDefinition = 'KinkAtlas does not currently have a reviewed description for this term. Explore how different people and communities use it, then decide what it means to you.'

export function toShareableRoleResult(result: RoleResult): ShareableRoleResult {
  const explanation = explainRoleResult(result)
  const signals = [...explanation.supportingSignals, ...explanation.differentiatingSignals]
    .filter((signal, index, all) => all.findIndex((candidate) => candidate.traitId === signal.traitId) === index)
    .slice(0, 4)
    .map((signal) => signal.label)

  return {
    id: result.role.id,
    name: result.role.name,
    source: 'recommended',
    alignment: alignmentLabels[result.alignment],
    confidence: confidenceLabel(result.confidence),
    evidenceBreadth: Math.round(result.coverage * 100),
    summary: result.role.description,
    supportingSignals: signals,
  }
}

export function getShareableRoleSet(roleSet: EditableRoleProfileEntry[], roleResults: RoleResult[]): ShareableRoleResult[] {
  const resultById = new Map(roleResults.map((result) => [result.role.id, result]))
  return roleSet.map((entry) => {
    const result = entry.source === 'recommended' && entry.assessmentRoleId
      ? resultById.get(entry.assessmentRoleId)
      : undefined
    if (result) return {
      ...toShareableRoleResult(result),
      id: entry.roleId,
      name: entry.label,
      source: entry.source,
      summary: entry.definition?.trim() || result.role.description,
    }
    return {
      id: entry.roleId,
      name: entry.label,
      source: entry.source,
      summary: entry.definition?.trim() || unavailableRoleDefinition,
      supportingSignals: [],
    }
  })
}

const roleSummaryLine = (role: ShareableRoleResult, includeAlignment = true, includeConfidence = true) => {
  if (role.source === 'user-selected') return `• ${role.name} — Added by you; no assessment score or confidence.`
  if (role.alignment === undefined && role.confidence === undefined && role.evidenceBreadth === undefined) return `• ${role.name} — Suggested; no alignment score or confidence.`
  const details = [
    includeAlignment ? role.alignment : '',
    includeConfidence ? role.confidence : '',
    role.evidenceBreadth === undefined ? '' : `${role.evidenceBreadth}% evidence breadth`,
  ].filter(Boolean).join(' · ')
  return `• ${role.name}${details ? ` — ${details}` : ''}`
}

export function buildQuickSummary(data: ShareResultsData): string {
  const roles = getShareableRoleSet(data.roleSet, data.roleResults)
  const lines = ['Kink Atlas — My Results', productExplanation, ...roleMetricsExplanation(), '']
  if (!roles.length) lines.push('Your role set is empty. An empty set is valid.', '')
  else lines.push('Your Role Set', ...roles.map((role) => roleSummaryLine(role)), '')
  lines.push('Generated privately with KinkAtlas.', 'Vocabulary worth exploring — not identity or consent.', separateLensesExplanation, safetyDisclaimer)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

export function buildFullReflection(data: ShareResultsData, options: ShareOptions = defaultShareOptions): string {
  const lines = ['Kink Atlas — My Full Reflection', productExplanation, '']

  if (options.roles) {
    lines.push(...roleMetricsExplanation(options.alignment, options.confidence), '')
    const roles = getShareableRoleSet(data.roleSet, data.roleResults)
    if (!roles.length) lines.push('Your role set is empty. An empty set is valid.', '')
    else lines.push('Your Role Set', ...roles.map((role) => roleSummaryLine(role, options.alignment, options.confidence)), '')
  }

  if (options.readiness && data.readiness.competencies.length) {
    const established = data.readiness.competencies.filter((item) => item.band === 'strong')
    const toExplore = data.readiness.competencies.filter((item) => item.band !== 'strong')
    const readinessLabels = { strong: 'Established', developing: 'Building', explore: 'Further reflection', important: 'Needs more reflection' } as const
    lines.push('Reflection')
    if (established.length) {
      lines.push('Established foundations')
      established.forEach((item) => lines.push(`• ${competencyDefinitions[item.competency].label} — ${readinessLabels[item.band]}`))
    }
    if (toExplore.length) {
      lines.push('Areas to explore')
      toExplore.forEach((item) => lines.push(`• ${competencyDefinitions[item.competency].label} — ${readinessLabels[item.band]}`))
    }
    lines.push('This is not a safety score. It reflects knowledge and attitudes expressed through your answers. It cannot evaluate real-world behavior or certify anyone as a safe partner.', '')
  }

  if (options.blindSpots && data.readiness.blindSpots.length) {
    lines.push('Potential blind spots', 'Reflection cue: a theme to consider. Worth reviewing: a stronger concern. Important concept: a critical concept to revisit. These labels describe answer signals, not a judgment of you or your real-world behavior.')
    data.readiness.blindSpots.forEach((spot) => lines.push(`• ${spot.title} — ${blindSpotLabels[spot.severity]}. Why it appeared: ${spot.description}`))
    lines.push('')
  }

  if (options.boundaries) {
    const selected = boundaryItems.flatMap((item) => {
      const value = data.boundaries[item.id]
      if (!value || value === 'neutral' || value === 'prefer-not') return []
      return [`• ${item.label} — ${boundaryOptions.find((option) => option.value === value)?.label ?? value}`]
    })
    if (selected.length) lines.push('Wants & boundaries', ...selected, '', 'Boundaries shown here reflect the selections made when this result was generated and should never replace direct communication.', '')
  }

  if (options.negotiation) {
    const selected = negotiationQuestions.flatMap((question) => {
      const answerId = data.negotiation[question.id]
      const answer = question.answers.find((candidate) => candidate.id === answerId)
      return answer ? [`• ${question.domain}: ${answer.label}`] : []
    })
    if (selected.length) lines.push('Negotiation preferences', ...selected, '')
  }

  lines.push('Generated privately with KinkAtlas.', 'Role results describe vocabulary worth exploring, not identity or consent.', separateLensesExplanation, safetyDisclaimer, 'Sharing a result does not communicate consent, availability, boundaries, or agreement to any activity.')
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

export const buildShareSummary = buildFullReflection

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy was not available in this browser.')
}

export const copyShareSummary = copyText

export function sanitizeFileName(value: string): string {
  const sanitized = value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return sanitized || 'role'
}

export const roleCardFileName = (role: Pick<ShareableRoleResult, 'name'>) => `kink-atlas-${sanitizeFileName(role.name)}.png`
export const overviewCardFileName = 'kink-atlas-overview.png'

const createCanvas = ({ width, height }: { width: number; height: number }) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image generation is not supported in this browser.')
  return { canvas, context }
}

const canvasToBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The image could not be generated.')), 'image/png'))

const drawBackground = (context: CanvasRenderingContext2D, width: number, height: number) => {
  context.fillStyle = '#121011'
  context.fillRect(0, 0, width, height)
  const gradient = context.createRadialGradient(width * .82, 30, 20, width * .82, 30, height * .75)
  gradient.addColorStop(0, 'rgba(111,52,71,.58)')
  gradient.addColorStop(1, 'rgba(18,16,17,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
}

const drawBrand = (context: CanvasRenderingContext2D, x: number, y: number, scale = 1) => {
  context.strokeStyle = '#d7a85f'
  context.lineWidth = 4 * scale
  context.beginPath()
  context.arc(x + 25 * scale, y + 25 * scale, 25 * scale, 0, Math.PI * 2)
  context.moveTo(x + 25 * scale, y - 8 * scale)
  context.lineTo(x + 25 * scale, y + 58 * scale)
  context.moveTo(x - 8 * scale, y + 25 * scale)
  context.lineTo(x + 58 * scale, y + 25 * scale)
  context.stroke()
  context.fillStyle = '#f4efeb'
  context.font = `700 ${30 * scale}px system-ui, sans-serif`
  context.fillText('Kink', x + 71 * scale, y + 36 * scale)
  context.fillStyle = '#e9cb93'
  context.font = `italic ${34 * scale}px Georgia, serif`
  context.fillText('Atlas', x + 145 * scale, y + 36 * scale)
}

const wrapText = (text: string, charactersPerLine: number) => {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length > charactersPerLine && current) {
      lines.push(current)
      current = word
    } else current = next
  })
  if (current) lines.push(current)
  return lines
}

const drawLines = (context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number, maxLines = lines.length) => {
  lines.slice(0, maxLines).forEach((line, index) => context.fillText(line, x, y + index * lineHeight))
  return y + Math.min(lines.length, maxLines) * lineHeight
}

export async function createRoleCardImage(role: ShareableRoleResult): Promise<Blob> {
  const { canvas, context } = createCanvas(ROLE_CARD_SIZE)
  drawBackground(context, canvas.width, canvas.height)
  drawBrand(context, 72, 64, 1.05)
  context.fillStyle = '#aea3a4'
  context.font = '20px system-ui, sans-serif'
  context.fillText('KinkAtlas helps you explore role vocabulary through self-reflection.', 74, 160)

  context.fillStyle = '#d7a85f'
  context.font = '700 20px system-ui, sans-serif'
  context.fillText('YOUR KINK ATLAS', 74, 220)
  context.fillStyle = '#f4efeb'
  context.font = '64px Georgia, serif'
  const titleEnd = drawLines(context, wrapText(role.name.toUpperCase(), 24), 72, 310, 76, 2)

  context.fillStyle = '#e9cb93'
  context.font = '700 25px system-ui, sans-serif'
  const hasAssessmentMetrics = role.alignment !== undefined || role.confidence !== undefined || role.evidenceBreadth !== undefined
  context.fillText(role.source === 'user-selected' ? 'Selected by you' : hasAssessmentMetrics ? role.alignment ?? '' : 'Suggested', 74, titleEnd + 24)
  context.fillStyle = '#bdb2b3'
  context.font = '23px system-ui, sans-serif'
  if (role.source === 'user-selected' || !hasAssessmentMetrics) {
    context.fillText(role.source === 'user-selected' ? 'No assessment alignment or confidence' : 'No alignment score or confidence', 74, titleEnd + 64)
  } else {
    context.fillText(role.confidence ?? '', 74, titleEnd + 64)
    if (role.evidenceBreadth !== undefined) context.fillText(`${role.evidenceBreadth}% evidence breadth`, 74, titleEnd + 100)
  }

  context.fillStyle = '#d7a85f'
  context.font = '700 20px system-ui, sans-serif'
  context.fillText('ROLE MEANING', 74, titleEnd + 160)
  context.fillStyle = '#d8d0ce'
  context.font = '29px system-ui, sans-serif'
  const summaryEnd = drawLines(context, wrapText(role.summary, 54), 74, titleEnd + 198, 43, 6)

  context.fillStyle = '#d7a85f'
  context.font = '700 20px system-ui, sans-serif'
  context.fillText(role.source === 'user-selected' ? "WHY IT'S IN YOUR SET" : 'WHY IT MATCHED', 74, summaryEnd + 58)
  context.fillStyle = '#f4efeb'
  context.font = '27px system-ui, sans-serif'
  if (role.source === 'user-selected') context.fillText('• Added by you; KinkAtlas did not score this selection.', 82, summaryEnd + 110)
  else if (!hasAssessmentMetrics) context.fillText('• Suggested without a psychometric alignment score.', 82, summaryEnd + 110)
  else role.supportingSignals.forEach((signal, index) => context.fillText(`• ${signal}`, 82, summaryEnd + 110 + index * 54))

  context.strokeStyle = 'rgba(255,255,255,.14)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(72, 1230)
  context.lineTo(1008, 1230)
  context.stroke()
  context.fillStyle = '#aea3a4'
  context.font = '16px system-ui, sans-serif'
  context.fillText('Alignment reflects theme similarity; confidence reflects information amount, not ranking.', 74, 1252)
  context.fillText('Evidence breadth is answer-backed theme coverage, not match strength.', 74, 1274)
  context.fillStyle = '#d8d0ce'
  context.font = '18px system-ui, sans-serif'
  context.fillText('Vocabulary suggestions—not identity or consent.', 74, 1297)
  context.fillStyle = '#786e70'
  context.font = '16px system-ui, sans-serif'
  context.fillText('Reflection and boundaries are separate. Results do not certify readiness or safety.', 74, 1322)

  return canvasToBlob(canvas)
}

export async function createRoleCardImages(roles: ShareableRoleResult[]): Promise<GeneratedRoleCard[]> {
  return Promise.all(roles.map(async (role) => ({ role, blob: await createRoleCardImage(role), fileName: roleCardFileName(role) })))
}

const generatedCardFiles = (cards: GeneratedRoleCard[]) => cards.map((card) => new File([card.blob], card.fileName, { type: 'image/png' }))

export function downloadFiles(files: File[]): void {
  files.forEach((file) => {
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  })
}

export async function exportRoleCards(roles: ShareableRoleResult[]): Promise<number> {
  const cards = await createRoleCardImages(roles)
  downloadFiles(generatedCardFiles(cards))
  return cards.length
}

export function canShareFiles(files: File[]): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files })
  } catch {
    return false
  }
}

export async function shareRoleCards(roles: ShareableRoleResult[]): Promise<'shared' | 'exported'> {
  const cards = await createRoleCardImages(roles)
  const files = generatedCardFiles(cards)
  if (canShareFiles(files)) {
    await navigator.share({ files, title: 'My Kink Atlas role cards', text: 'Vocabulary worth exploring — not identity or consent.' })
    return 'shared'
  }
  downloadFiles(files)
  return 'exported'
}

export async function createOverviewImage(data: ShareResultsData, options: Pick<ShareOptions, 'alignment' | 'confidence'> = defaultShareOptions): Promise<Blob> {
  const { canvas, context } = createCanvas(OVERVIEW_CARD_SIZE)
  drawBackground(context, canvas.width, canvas.height)
  drawBrand(context, 57, 51)

  context.fillStyle = '#f4efeb'
  context.font = '54px Georgia, serif'
  context.fillText('My Kink Atlas', 64, 172)
  context.fillStyle = '#aea3a4'
  context.font = '24px system-ui, sans-serif'
  context.fillText('KinkAtlas explores role vocabulary—not identity or consent.', 66, 213)

  getShareableRoleSet(data.roleSet, data.roleResults).forEach((role, index) => {
    const y = 280 + index * 55
    context.fillStyle = '#f4efeb'
    context.font = '600 27px system-ui, sans-serif'
    context.fillText(role.name, 70, y)
    const details = role.source === 'user-selected'
      ? 'Added by you · no assessment score or confidence'
      : role.alignment === undefined && role.confidence === undefined && role.evidenceBreadth === undefined
        ? 'Suggested · no alignment score or confidence'
        : [options.alignment ? role.alignment : '', options.confidence ? role.confidence : '', role.evidenceBreadth === undefined ? '' : `${role.evidenceBreadth}% evidence breadth`].filter(Boolean).join(' · ')
    context.fillStyle = '#d7a85f'
    context.font = '19px system-ui, sans-serif'
    context.fillText(details, 520, y)
  })

  context.fillStyle = '#786e70'
  context.font = '15px system-ui, sans-serif'
  context.fillText('Alignment is theme similarity; confidence is information amount, not ranking.', 66, 548)
  context.fillText('Evidence breadth is answer-backed theme coverage, not match strength.', 66, 570)
  context.fillText('Reflection and boundaries are separate. Results do not certify readiness or safety.', 66, 592)
  context.fillStyle = '#786e70'
  context.font = '14px system-ui, sans-serif'
  context.fillText('Generated locally. Nothing was uploaded by KinkAtlas.', 66, 614)
  return canvasToBlob(canvas)
}

export async function exportOverviewCard(data: ShareResultsData, options: Pick<ShareOptions, 'alignment' | 'confidence'> = defaultShareOptions): Promise<void> {
  const blob = await createOverviewImage(data, options)
  downloadFiles([new File([blob], overviewCardFileName, { type: 'image/png' })])
}

export const createShareImage = createOverviewImage
export async function downloadShareImage(data: ShareResultsData, options: ShareOptions = defaultShareOptions): Promise<void> {
  return exportOverviewCard(data, options)
}
