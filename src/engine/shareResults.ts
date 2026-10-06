import { boundaryItems, boundaryOptions } from '../data/boundaries'
import { negotiationQuestions } from '../data/negotiation'
import { competencyDefinitions } from '../data/readiness'
import { drawRoleEmblemOnCanvas } from '../data/roleEmblems'
import { buildRoleSetCardPresentations, roleLibraryRoleForIdentity, type RoleSetCardPresentation } from '../data/roleIdentity'
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

export interface ShareableRoleResult extends RoleSetCardPresentation {
  id: string
  name: string
  family: string
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
  const libraryRole = roleLibraryRoleForIdentity(result.role.id, result.role.id)
  if (!libraryRole) throw new Error(`No role-library identity exists for ${result.role.id}.`)
  const explanation = explainRoleResult(result)
  const signals = [...explanation.supportingSignals, ...explanation.differentiatingSignals]
    .filter((signal, index, all) => all.findIndex((candidate) => candidate.traitId === signal.traitId) === index)
    .slice(0, 4)
    .map((signal) => signal.label)

  const [presentation] = buildRoleSetCardPresentations([{
    roleId: libraryRole.id,
    label: libraryRole.label,
    source: 'recommended',
    definition: result.role.description,
    assessmentRoleId: result.role.id,
  }], [result])
  return {
    ...presentation,
    id: presentation.roleId,
    name: presentation.label,
    family: presentation.familyLabel,
    summary: presentation.summary ?? result.role.description,
    supportingSignals: signals,
  }
}

export function getShareableRoleSet(roleSet: EditableRoleProfileEntry[], roleResults: RoleResult[]): ShareableRoleResult[] {
  const resultById = new Map(roleResults.map((result) => [result.role.id, result]))
  return buildRoleSetCardPresentations(roleSet, roleResults).map((presentation, index) => {
    const entry = roleSet[index]
    const result = entry.source === 'recommended' && entry.assessmentRoleId
      ? resultById.get(entry.assessmentRoleId)
      : undefined
    const signals = result ? toShareableRoleResult(result).supportingSignals : []
    return {
      ...presentation,
      id: entry.roleId,
      name: entry.label,
      family: presentation.familyLabel,
      summary: presentation.summary ?? unavailableRoleDefinition,
      supportingSignals: signals,
    }
  })
}

const roleSummaryLine = (role: ShareableRoleResult, includeAlignment = true, includeConfidence = true) => {
  if (role.source === 'user-selected') return `• ${role.name} — Added by you; no assessment score or confidence.`
  if (role.alignment === undefined && role.confidence === undefined && role.evidenceBreadth === undefined) return `• ${role.name} — Assessment suggestion; no alignment score or confidence.`
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

const truncateText = (text: string, maxLength: number) => text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text

const drawRoleCardBackground = (context: CanvasRenderingContext2D) => {
  context.fillStyle = '#1b181a'
  context.fillRect(0, 0, ROLE_CARD_SIZE.width, ROLE_CARD_SIZE.height)
  const gradient = context.createRadialGradient(540, 215, 20, 540, 215, 570)
  gradient.addColorStop(0, 'rgba(143,82,112,.28)')
  gradient.addColorStop(1, 'rgba(27,24,26,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, ROLE_CARD_SIZE.width, ROLE_CARD_SIZE.height)

  context.strokeStyle = 'rgba(215,168,95,.38)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(36, 36)
  context.lineTo(1044, 36)
  context.lineTo(1044, 1314)
  context.lineTo(36, 1314)
  context.closePath()
  context.stroke()
  context.strokeStyle = 'rgba(255,255,255,.07)'
  context.beginPath()
  context.moveTo(50, 50)
  context.lineTo(1030, 50)
  context.lineTo(1030, 1300)
  context.lineTo(50, 1300)
  context.closePath()
  context.stroke()
}

const drawRoleCardDivider = (context: CanvasRenderingContext2D, y: number) => {
  context.strokeStyle = 'rgba(255,255,255,.14)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(72, y)
  context.lineTo(1008, y)
  context.stroke()
}

export async function createRoleCardImage(role: ShareableRoleResult): Promise<Blob> {
  const { canvas, context } = createCanvas(ROLE_CARD_SIZE)
  drawRoleCardBackground(context)

  context.fillStyle = '#aea3a4'
  context.font = '800 18px system-ui, sans-serif'
  context.fillText('KINKATLAS', 72, 88)

  drawRoleEmblemOnCanvas(context, role.emblem, { x: 390, y: 112, width: 300, height: 330 }, '#e9cb93')

  context.fillStyle = '#d7a85f'
  context.font = '800 19px system-ui, sans-serif'
  context.fillText(truncateText(role.familyLabel.toUpperCase(), 76), 72, 478)
  context.fillStyle = '#f4efeb'
  context.font = '64px Georgia, serif'
  drawLines(context, wrapText(role.label, 25), 72, 548, 70, 2)

  context.fillStyle = '#d8d0ce'
  context.font = '25px system-ui, sans-serif'
  drawLines(context, wrapText(role.summary, 72), 72, 690, 36, 3)

  role.attributes.slice(0, 4).forEach((attribute, index) => {
    const y = 820 + index * 48
    drawRoleCardDivider(context, y)
    context.fillStyle = '#93898b'
    context.font = '18px system-ui, sans-serif'
    context.textAlign = 'left'
    context.fillText(truncateText(attribute.label, 28), 72, y + 31)
    context.fillStyle = '#f4efeb'
    context.font = '700 18px system-ui, sans-serif'
    context.textAlign = 'right'
    context.fillText(truncateText(attribute.value, 46), 1008, y + 31)
  })
  context.textAlign = 'left'

  drawRoleCardDivider(context, 1024)
  context.fillStyle = '#e9cb93'
  context.font = '800 20px system-ui, sans-serif'
  context.fillText(role.sourceLabel.toUpperCase(), 72, 1068)
  context.fillStyle = '#aea3a4'
  context.font = '20px system-ui, sans-serif'
  role.assessmentDetails.slice(0, 3).forEach((detail, index) => context.fillText(truncateText(detail, 72), 72, 1112 + index * 36))

  drawRoleCardDivider(context, 1238)
  context.fillStyle = '#d8d0ce'
  context.font = '700 19px system-ui, sans-serif'
  context.fillText(truncateText(`kinkatlas.ca${role.publicPath}`, 78), 72, 1282)

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

  context.fillStyle = '#93898b'
  context.font = '15px system-ui, sans-serif'
  context.fillText('Alignment is theme similarity; confidence is information amount, not ranking.', 66, 548)
  context.fillText('Evidence breadth is answer-backed theme coverage, not match strength.', 66, 570)
  context.fillText('Reflection and boundaries are separate. Results do not certify readiness or safety.', 66, 592)
  context.fillStyle = '#93898b'
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
