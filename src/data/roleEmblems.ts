import { rolePresentationById, type RoleEmblemId } from './rolePresentation'
import { roleLibrary, roleLibraryRoleById, type RoleLibraryRole } from '../taxonomy/roleLibrary'

export const ROLE_EMBLEM_VIEWBOX = { width: 100, height: 120 } as const

type Point = readonly [number, number]

export type RoleEmblemCommand =
  | { kind: 'line'; from: Point; to: Point }
  | { kind: 'polyline'; points: readonly Point[]; closed?: boolean }
  | { kind: 'circle'; center: Point; radius: number }
  | { kind: 'bezier'; start: Point; control1: Point; control2: Point; end: Point }

export type RoleEmblemMotif =
  | 'authority' | 'position' | 'rope' | 'primal' | 'brat' | 'companion'
  | 'care' | 'sensation' | 'protocol' | 'sadomasochism' | 'persona'
  | 'material' | 'objectification' | 'control' | 'mentorship' | 'praise'
  | 'service' | 'community' | 'observation' | 'exploration' | 'sexual'

export type RoleEmblemDirection = 'giving' | 'receiving' | 'switching' | 'neutral'

export type RoleEmblemEnclosure = 'open-corners' | 'circle' | 'diamond' | 'arch' | 'shield' | 'hexagon' | 'split-frame' | 'eye' | 'twin-arcs' | 'offset-frame'
export type RoleEmblemComposition = 'vertical' | 'horizontal' | 'rising' | 'falling' | 'branch-up' | 'branch-down' | 'crossed' | 'orbit' | 'mirrored-hooks' | 'split-axis'
export type RoleEmblemCore = 'ring' | 'diamond' | 'triangle-up' | 'triangle-down' | 'square' | 'twin-rings' | 'bowtie' | 'spark' | 'loop' | 'twin-diamonds'
export type RoleEmblemSemanticModifier = 'none' | 'celestial' | 'otherworldly' | 'serpentine' | 'opposition' | 'observation' | 'learning' | 'craft' | 'vessel' | 'attention' | 'royalty' | 'authority' | 'yielding' | 'persona' | 'companion' | 'pursuit' | 'evasion' | 'care' | 'service' | 'restraint'

export interface RoleEmblemRecipe {
  identityKey: string
  roleId: string
  familyKey: string
  motif: RoleEmblemMotif
  direction: RoleEmblemDirection
  enclosure: RoleEmblemEnclosure | 'curated'
  composition: RoleEmblemComposition | 'curated'
  core: RoleEmblemCore | 'curated'
  semanticModifier: RoleEmblemSemanticModifier
  catalogOrdinal: number
  commands: readonly RoleEmblemCommand[]
}

const line = (x1: number, y1: number, x2: number, y2: number): RoleEmblemCommand => ({ kind: 'line', from: [x1, y1], to: [x2, y2] })
const polyline = (points: readonly Point[], closed = false): RoleEmblemCommand => ({ kind: 'polyline', points, closed })
const circle = (x: number, y: number, radius: number): RoleEmblemCommand => ({ kind: 'circle', center: [x, y], radius })
const bezier = (start: Point, control1: Point, control2: Point, end: Point): RoleEmblemCommand => ({ kind: 'bezier', start, control1, control2, end })

const familyMotifPriority: ReadonlyArray<readonly [readonly string[], RoleEmblemMotif]> = [
  [['rope-bondage'], 'rope'],
  [['primal'], 'primal'],
  [['brat-dynamics'], 'brat'],
  [['pet-animal-roleplay'], 'companion'],
  [['power-exchange', 'dominance', 'submission', 'switching'], 'authority'],
  [['play-position'], 'position'],
  [['caregiver-little'], 'care'],
  [['sensation-impact'], 'sensation'],
  [['discipline-protocol'], 'protocol'],
  [['sadomasochism'], 'sadomasochism'],
  [['persona-fantasy', 'roleplay'], 'persona'],
  [['material-fetish'], 'material'],
  [['degradation-objectification'], 'objectification'],
  [['denial-control'], 'control'],
  [['education-mentorship'], 'mentorship'],
  [['praise-affection'], 'praise'],
  [['service'], 'service'],
  [['community-identity', 'community-participation'], 'community'],
  [['exhibition-voyeurism'], 'observation'],
  [['sexual-role-vocabulary'], 'sexual'],
  [['exploration-general'], 'exploration'],
]

const motifCommands: Record<RoleEmblemMotif, readonly RoleEmblemCommand[]> = {
  authority: [polyline([[22, 94], [22, 30], [50, 14], [78, 30], [78, 94]]), line(34, 50, 66, 50), circle(50, 76, 13)],
  position: [line(18, 32, 82, 32), line(18, 88, 82, 88), line(50, 22, 50, 98), circle(50, 60, 12)],
  rope: [bezier([22, 86], [18, 35], [70, 28], [76, 68]), bezier([76, 68], [82, 102], [36, 104], [38, 62]), bezier([38, 62], [40, 35], [72, 42], [66, 88]), line(24, 102, 76, 102)],
  primal: [bezier([18, 88], [34, 88], [38, 34], [82, 28]), polyline([[70, 20], [82, 28], [74, 40]]), line(24, 76, 36, 82), line(33, 58, 45, 64)],
  brat: [polyline([[16, 68], [34, 58], [25, 42], [48, 48], [58, 25], [65, 50], [86, 45], [70, 64], [82, 82], [56, 75], [43, 98], [38, 73]])],
  companion: [polyline([[24, 44], [18, 24], [40, 34], [50, 25], [60, 34], [82, 24], [76, 44], [78, 78], [50, 98], [22, 78]], true), circle(38, 59, 3), circle(62, 59, 3)],
  care: [polyline([[50, 101], [20, 72], [22, 42], [38, 30], [50, 43], [62, 30], [78, 42], [80, 72]], true), circle(50, 63, 10)],
  sensation: [polyline([[18, 78], [30, 38], [43, 82], [56, 30], [70, 84], [82, 46]]), line(18, 96, 82, 96)],
  protocol: [polyline([[22, 22], [78, 22], [78, 98], [22, 98]], true), line(34, 42, 66, 42), line(34, 60, 66, 60), line(34, 78, 56, 78)],
  sadomasochism: [polyline([[18, 54], [36, 34], [50, 58], [64, 34], [82, 54], [64, 86], [50, 62], [36, 86]], true), circle(50, 60, 7)],
  persona: [polyline([[20, 36], [50, 18], [80, 36], [72, 88], [50, 102], [28, 88]], true), line(32, 50, 45, 56), line(68, 50, 55, 56), bezier([38, 77], [46, 84], [54, 84], [62, 77])],
  material: [polyline([[18, 86], [30, 26], [50, 18], [70, 26], [82, 86], [60, 102], [40, 102]], true), line(30, 48, 70, 48), line(26, 70, 74, 70)],
  objectification: [circle(50, 60, 34), polyline([[50, 24], [64, 58], [50, 96], [36, 58]], true), line(18, 60, 82, 60)],
  control: [polyline([[18, 32], [82, 32], [70, 62], [82, 92], [18, 92], [30, 62]], true), circle(50, 62, 10)],
  mentorship: [polyline([[18, 86], [18, 28], [50, 42], [82, 28], [82, 86], [50, 100]], true), line(50, 42, 50, 100), line(30, 58, 44, 63), line(70, 58, 56, 63)],
  praise: [polyline([[50, 16], [60, 43], [88, 44], [66, 62], [74, 91], [50, 74], [26, 91], [34, 62], [12, 44], [40, 43]], true), circle(50, 57, 8)],
  service: [polyline([[20, 76], [38, 92], [82, 38]]), line(18, 36, 70, 88), circle(50, 62, 30)],
  community: [circle(50, 60, 16), circle(23, 42, 9), circle(77, 42, 9), circle(27, 88, 9), circle(73, 88, 9), line(31, 47, 40, 53), line(69, 47, 60, 53), line(35, 83, 41, 72), line(65, 83, 59, 72)],
  observation: [bezier([12, 60], [28, 32], [72, 32], [88, 60]), bezier([88, 60], [72, 88], [28, 88], [12, 60]), circle(50, 60, 14), circle(50, 60, 4)],
  exploration: [circle(50, 58, 34), line(50, 12, 50, 30), line(50, 86, 50, 104), line(4, 58, 22, 58), line(78, 58, 96, 58), polyline([[50, 38], [62, 58], [50, 78], [38, 58]], true)],
  sexual: [circle(39, 53, 22), circle(61, 67, 22), line(20, 95, 80, 25)],
}

const curatedCommands: Record<RoleEmblemId, readonly RoleEmblemCommand[]> = {
  'dominant-axis': [polyline([[22, 92], [22, 38], [36, 24], [50, 13], [64, 24], [78, 38], [78, 92]]), polyline([[31, 51], [50, 36], [69, 51]]), line(34, 69, 66, 69), circle(50, 83, 8)],
  'submissive-open': [polyline([[22, 26], [22, 78], [36, 92], [50, 103], [64, 92], [78, 78], [78, 26]]), polyline([[31, 65], [50, 82], [69, 65]]), line(34, 48, 66, 48), circle(50, 35, 8)],
  'switch-weave': [bezier([15, 39], [30, 12], [48, 24], [50, 54]), bezier([50, 54], [52, 86], [72, 105], [86, 76]), bezier([15, 81], [30, 108], [48, 96], [50, 66]), bezier([50, 66], [52, 34], [72, 15], [86, 44]), polyline([[77, 35], [86, 44], [76, 49]]), polyline([[24, 71], [15, 81], [25, 86]])],
  'top-outward': [line(50, 98, 50, 38), polyline([[24, 52], [50, 25], [76, 52]]), line(28, 82, 72, 82), circle(50, 66, 9)],
  'bottom-inward': [line(50, 22, 50, 82), polyline([[24, 68], [50, 95], [76, 68]]), line(28, 38, 72, 38), circle(50, 54, 9)],
  'vers-balance': [line(18, 35, 82, 35), polyline([[70, 23], [82, 35], [70, 47]]), line(82, 85, 18, 85), polyline([[30, 73], [18, 85], [30, 97]]), circle(50, 60, 13)],
  'rigger-knot': motifCommands.rope,
  'rope-bottom-loop': [bezier([50, 16], [18, 45], [22, 84], [42, 90]), bezier([42, 90], [64, 101], [86, 62], [50, 16]), bezier([25, 102], [38, 84], [62, 84], [75, 102]), line(20, 108, 80, 108)],
  'brat-spark': [polyline([[18, 79], [36, 68], [26, 52], [48, 58], [58, 29], [64, 57], [84, 50], [70, 69], [82, 86], [58, 78], [44, 100], [39, 77]]), circle(20, 38, 4), polyline([[73, 24], [82, 30], [73, 36]])],
  'brat-tamer-frame': [polyline([[22, 18], [78, 18], [78, 102], [22, 102]], true), line(22, 43, 78, 43), line(22, 80, 78, 80), polyline([[36, 67], [47, 54], [57, 68], [69, 52]])],
  'primal-predator-track': [bezier([14, 96], [36, 94], [42, 38], [84, 26]), polyline([[70, 18], [84, 26], [76, 41]]), line(25, 76, 40, 83), line(34, 56, 49, 63), circle(17, 99, 4)],
  'primal-prey-motion': [bezier([86, 25], [58, 32], [66, 85], [24, 91]), polyline([[38, 79], [24, 91], [40, 99]]), bezier([77, 45], [60, 51], [45, 45], [32, 34]), line(65, 74, 79, 67), circle(85, 23, 4)],
  'primal-switch-orbit': [bezier([16, 71], [25, 105], [77, 101], [84, 61]), bezier([84, 61], [89, 25], [40, 17], [21, 44]), bezier([21, 44], [6, 66], [35, 86], [59, 67]), polyline([[48, 60], [59, 67], [51, 77]]), polyline([[28, 34], [21, 44], [13, 35]])],
  'pet-companion': motifCommands.companion,
  'owner-steward': [polyline([[50, 12], [18, 30], [22, 76], [50, 105], [78, 76], [82, 30]], true), polyline([[34, 58], [34, 87], [66, 87], [66, 58]]), bezier([34, 58], [34, 38], [66, 38], [66, 58]), circle(50, 58, 3)],
}

const enclosureOrder: readonly RoleEmblemEnclosure[] = ['open-corners', 'circle', 'diamond', 'arch', 'shield', 'hexagon', 'split-frame', 'eye', 'twin-arcs', 'offset-frame']
const compositionOrder: readonly RoleEmblemComposition[] = ['vertical', 'horizontal', 'rising', 'falling', 'branch-up', 'branch-down', 'crossed', 'orbit', 'mirrored-hooks', 'split-axis']
const coreOrder: readonly RoleEmblemCore[] = ['ring', 'diamond', 'triangle-up', 'triangle-down', 'square', 'twin-rings', 'bowtie', 'spark', 'loop', 'twin-diamonds']

const enclosureCommands: Record<RoleEmblemEnclosure, readonly RoleEmblemCommand[]> = {
  'open-corners': [line(12, 35, 12, 14), line(12, 14, 34, 14), line(66, 14, 88, 14), line(88, 14, 88, 35), line(12, 85, 12, 106), line(12, 106, 34, 106), line(66, 106, 88, 106), line(88, 85, 88, 106)],
  circle: [circle(50, 60, 45)],
  diamond: [polyline([[50, 8], [92, 60], [50, 112], [8, 60]], true)],
  arch: [bezier([11, 103], [11, 38], [28, 10], [50, 10]), bezier([50, 10], [72, 10], [89, 38], [89, 103]), line(11, 103, 35, 103), line(65, 103, 89, 103)],
  shield: [polyline([[50, 8], [88, 27], [83, 84], [50, 111], [17, 84], [12, 27]], true)],
  hexagon: [polyline([[28, 9], [72, 9], [92, 60], [72, 111], [28, 111], [8, 60]], true)],
  'split-frame': [polyline([[8, 48], [8, 16], [40, 16]]), polyline([[60, 16], [92, 16], [92, 48]]), polyline([[92, 72], [92, 104], [60, 104]]), polyline([[40, 104], [8, 104], [8, 72]])],
  eye: [bezier([6, 60], [25, 16], [75, 16], [94, 60]), bezier([94, 60], [75, 104], [25, 104], [6, 60])],
  'twin-arcs': [bezier([12, 96], [2, 57], [14, 24], [42, 10]), bezier([58, 10], [86, 24], [98, 57], [88, 96]), line(12, 96, 33, 108), line(67, 108, 88, 96)],
  'offset-frame': [polyline([[10, 45], [10, 12], [75, 12], [90, 27], [90, 55]]), polyline([[90, 75], [90, 108], [25, 108], [10, 93], [10, 65]])],
}

const compositionCommands: Record<RoleEmblemComposition, readonly RoleEmblemCommand[]> = {
  vertical: [line(50, 67, 50, 105), polyline([[39, 79], [50, 67], [61, 79]])],
  horizontal: [line(20, 86, 80, 86), polyline([[69, 75], [80, 86], [69, 97]])],
  rising: [line(24, 103, 76, 69), line(34, 103, 82, 72), polyline([[67, 68], [82, 72], [77, 86]])],
  falling: [line(24, 69, 76, 103), line(18, 72, 66, 103), polyline([[23, 86], [18, 72], [33, 68]])],
  'branch-up': [line(50, 106, 50, 76), line(50, 86, 28, 68), line(50, 86, 72, 68), circle(28, 68, 3), circle(72, 68, 3)],
  'branch-down': [line(50, 68, 50, 98), line(50, 88, 28, 106), line(50, 88, 72, 106), circle(28, 106, 3), circle(72, 106, 3)],
  crossed: [line(25, 69, 75, 103), line(75, 69, 25, 103), circle(50, 86, 4)],
  orbit: [bezier([19, 87], [28, 62], [72, 62], [81, 87]), bezier([81, 87], [72, 111], [28, 111], [19, 87])],
  'mirrored-hooks': [bezier([20, 70], [20, 102], [48, 108], [48, 85]), bezier([80, 70], [80, 102], [52, 108], [52, 85])],
  'split-axis': [line(50, 66, 50, 81), line(50, 93, 50, 108), line(25, 87, 43, 87), line(57, 87, 75, 87)],
}

const coreCommands: Record<RoleEmblemCore, readonly RoleEmblemCommand[]> = {
  ring: [circle(50, 87, 9)],
  diamond: [polyline([[50, 75], [62, 87], [50, 99], [38, 87]], true)],
  'triangle-up': [polyline([[50, 74], [64, 98], [36, 98]], true)],
  'triangle-down': [polyline([[36, 76], [64, 76], [50, 100]], true)],
  square: [polyline([[39, 76], [61, 76], [61, 98], [39, 98]], true)],
  'twin-rings': [circle(42, 87, 8), circle(58, 87, 8)],
  bowtie: [polyline([[34, 76], [50, 87], [34, 98]], true), polyline([[66, 76], [50, 87], [66, 98]], true)],
  spark: [polyline([[50, 72], [55, 82], [67, 80], [59, 89], [65, 101], [51, 95], [40, 103], [42, 91], [31, 84], [44, 82]], true)],
  loop: [bezier([37, 100], [25, 74], [60, 68], [63, 87]), bezier([63, 87], [66, 104], [42, 105], [37, 100])],
  'twin-diamonds': [polyline([[40, 76], [50, 87], [40, 98], [30, 87]], true), polyline([[60, 76], [70, 87], [60, 98], [50, 87]], true)],
}

const semanticModifierCommands: Record<RoleEmblemSemanticModifier, readonly RoleEmblemCommand[]> = {
  none: [],
  celestial: [bezier([48, 52], [32, 28], [18, 31], [16, 49]), bezier([52, 52], [68, 28], [82, 31], [84, 49]), circle(50, 22, 7), line(34, 56, 50, 46), line(66, 56, 50, 46)],
  otherworldly: [circle(50, 38, 16), bezier([19, 45], [29, 23], [73, 21], [84, 37]), bezier([84, 37], [73, 56], [30, 58], [19, 45]), circle(44, 37, 2), circle(56, 37, 2)],
  serpentine: [bezier([68, 16], [25, 13], [75, 44], [35, 49]), bezier([35, 49], [13, 53], [37, 70], [65, 59]), polyline([[62, 53], [72, 58], [64, 66]])],
  opposition: [polyline([[14, 45], [31, 29], [45, 44]]), polyline([[86, 45], [69, 29], [55, 44]]), line(25, 58, 42, 48), line(75, 58, 58, 48)],
  observation: [bezier([14, 42], [31, 19], [69, 19], [86, 42]), bezier([86, 42], [69, 65], [31, 65], [14, 42]), circle(50, 42, 10), circle(50, 42, 3)],
  learning: [polyline([[17, 55], [17, 25], [50, 35], [83, 25], [83, 55], [50, 65]], true), line(50, 35, 50, 65), line(25, 40, 42, 45), line(75, 40, 58, 45)],
  craft: [line(23, 57, 70, 17), line(30, 17, 77, 57), circle(50, 38, 8), polyline([[19, 61], [29, 56], [24, 49]])],
  vessel: [bezier([20, 24], [21, 60], [35, 68], [50, 68]), bezier([50, 68], [65, 68], [79, 60], [80, 24]), line(20, 24, 80, 24), line(33, 16, 67, 16)],
  attention: [circle(50, 40, 11), line(50, 10, 50, 21), line(20, 40, 31, 40), line(69, 40, 80, 40), line(29, 19, 37, 27), line(71, 19, 63, 27), line(29, 61, 37, 53), line(71, 61, 63, 53)],
  royalty: [polyline([[20, 55], [20, 25], [37, 43], [50, 16], [63, 43], [80, 25], [80, 55]], true), line(27, 63, 73, 63)],
  authority: [polyline([[18, 57], [18, 24], [50, 10], [82, 24], [82, 57]]), line(31, 39, 69, 39), circle(50, 53, 7)],
  yielding: [polyline([[19, 19], [19, 52], [50, 68], [81, 52], [81, 19]]), polyline([[36, 43], [50, 55], [64, 43]])],
  persona: [polyline([[18, 25], [50, 12], [82, 25], [74, 61], [50, 70], [26, 61]], true), line(31, 39, 43, 44), line(69, 39, 57, 44), bezier([38, 57], [46, 62], [54, 62], [62, 57])],
  companion: [polyline([[20, 50], [16, 16], [39, 31], [50, 18], [61, 31], [84, 16], [80, 50], [50, 68]], true), circle(39, 45, 3), circle(61, 45, 3)],
  pursuit: [bezier([13, 62], [35, 62], [41, 20], [84, 18]), polyline([[70, 10], [84, 18], [76, 32]]), line(24, 48, 37, 54), line(33, 31, 46, 37)],
  evasion: [bezier([85, 16], [59, 24], [68, 58], [22, 65]), polyline([[36, 53], [22, 65], [38, 72]]), bezier([74, 32], [58, 38], [43, 31], [31, 22])],
  care: [bezier([50, 67], [12, 45], [22, 16], [43, 29]), bezier([50, 67], [88, 45], [78, 16], [57, 29]), circle(50, 42, 8)],
  service: [polyline([[16, 51], [36, 68], [83, 19]]), line(18, 20, 72, 66), circle(50, 44, 23)],
  restraint: [bezier([20, 64], [12, 29], [64, 20], [74, 48]), bezier([74, 48], [87, 75], [36, 75], [37, 45]), bezier([37, 45], [38, 23], [74, 27], [65, 66])],
}

const roleSignals = (role: RoleLibraryRole) => `${role.label} ${role.aliases.join(' ')} ${role.familyIds.join(' ')} ${role.category ?? ''} ${role.facets.join(' ')} ${role.canonicalRoleId ?? ''} ${role.nearestRoleIds.join(' ')}`.toLowerCase()

function motifForRole(role: RoleLibraryRole): RoleEmblemMotif {
  const families = new Set([role.category, ...role.facets, ...role.familyIds].filter(Boolean))
  return familyMotifPriority.find(([keys]) => keys.some((key) => families.has(key)))?.[1] ?? 'exploration'
}

function directionForRole(role: RoleLibraryRole): RoleEmblemDirection {
  const signal = roleSignals(role)
  if (/\b(switch|vers|versatile|both|fluid|flip)\b/.test(signal)) return 'switching'
  if (/\b(bottom|submissive|sub|slave|prey|receiver|receiving|masochist|little|owned)\b/.test(signal)) return 'receiving'
  if (/\b(top|dominant|dom|domme|domina|master|mistress|owner|predator|giver|giving|sadist|handler|tamer|rigger)\b/.test(signal)) return 'giving'
  return 'neutral'
}

function directionCommands(direction: RoleEmblemDirection): readonly RoleEmblemCommand[] {
  if (direction === 'giving') return [polyline([[42, 20], [50, 12], [58, 20]]), line(50, 12, 50, 28)]
  if (direction === 'receiving') return [polyline([[42, 100], [50, 108], [58, 100]]), line(50, 92, 50, 108)]
  if (direction === 'switching') return [polyline([[10, 54], [16, 46], [22, 54]]), polyline([[78, 66], [84, 74], [90, 66]])]
  return [circle(50, 60, 3)]
}

function semanticModifierForRole(role: RoleLibraryRole): RoleEmblemSemanticModifier {
  const signal = roleSignals(role)
  if (/\b(angel|archangel|celestial)\b/.test(signal)) return 'celestial'
  if (/\b(alien|extraterrestrial|otherworld)\b/.test(signal)) return 'otherworldly'
  if (/\b(anaconda|snake|serpent)\b/.test(signal)) return 'serpentine'
  if (/\b(attention|exhibition|performer|show-off)\b/.test(signal)) return 'attention'
  if (/\b(antagon|brat|tease|provoc)\w*/.test(signal)) return 'opposition'
  if (/\b(anthropolog|voyeur|watch|observer|spectator)\w*/.test(signal)) return 'observation'
  if (/\b(apprentice|student|mentor|teacher|educat|trainer)\w*/.test(signal)) return 'learning'
  if (/\b(artist|maker|craft|designer)\w*/.test(signal)) return 'craft'
  if (/\b(ashtray|furniture|object|toy|toilet)\b/.test(signal)) return 'vessel'
  if (/\b(princess|prince|queen|king|royal)\w*/.test(signal)) return 'royalty'
  if (/\b(master|mistress|owner|dominant|domme|domina|handler|tamer)\b/.test(signal)) return 'authority'
  if (/\b(slave|submissive|sub|bottom|owned)\b/.test(signal)) return 'yielding'
  if (/\b(whore|slut|sissy|doll|persona)\b/.test(signal)) return 'persona'
  if (/\b(pet|puppy|dog|cat|pony|animal)\b/.test(signal)) return 'companion'
  if (/\b(predator|hunter|chaser|pursuer)\b/.test(signal)) return 'pursuit'
  if (/\b(prey|runner|escape|evasive)\b/.test(signal)) return 'evasion'
  if (/\b(caregiver|caretaker|mommy|daddy|nurtur)\w*/.test(signal)) return 'care'
  if (/\b(service|butler|maid|helper|server)\b/.test(signal)) return 'service'
  if (/\b(rope|bondage|tie|rigger|restraint)\w*/.test(signal)) return 'restraint'
  return 'none'
}

function transformCommands(commands: readonly RoleEmblemCommand[], scale: number, offsetX: number, offsetY: number): readonly RoleEmblemCommand[] {
  const point = ([x, y]: Point): Point => [offsetX + x * scale, offsetY + y * scale]
  return commands.map((command): RoleEmblemCommand => {
    if (command.kind === 'line') return { kind: 'line', from: point(command.from), to: point(command.to) }
    if (command.kind === 'polyline') return { kind: 'polyline', points: command.points.map(point), closed: command.closed }
    if (command.kind === 'circle') return { kind: 'circle', center: point(command.center), radius: command.radius * scale }
    return { kind: 'bezier', start: point(command.start), control1: point(command.control1), control2: point(command.control2), end: point(command.end) }
  })
}

function familyKeyForRole(role: RoleLibraryRole, motif: RoleEmblemMotif): string {
  return role.familyIds[0] ?? role.category ?? role.facets[0] ?? motif
}

const stableCatalogOrdinalByRoleId = new Map(
  [...roleLibrary.roles].sort((left, right) => left.id.localeCompare(right.id)).map((role, index) => [role.id, index + 1]),
)

function createRecipe(role: RoleLibraryRole): RoleEmblemRecipe {
  const presentation = rolePresentationById.get(role.id)
  const motif = motifForRole(role)
  const direction = directionForRole(role)
  const semanticModifier = semanticModifierForRole(role)
  const ordinal = stableCatalogOrdinalByRoleId.get(role.id)!
  const compositionIndex = ordinal - 1
  const enclosureDigit = compositionIndex % enclosureOrder.length
  const compositionDigit = Math.floor(compositionIndex / enclosureOrder.length) % compositionOrder.length
  const coreDigit = Math.floor(compositionIndex / (enclosureOrder.length * compositionOrder.length)) % coreOrder.length
  // This reversible mixing keeps all 1,000 combinations unique while ensuring adjacent catalog
  // entries change their whole silhouette rather than merely cycling one small detail.
  const generatedEnclosure = enclosureOrder[enclosureDigit]
  const generatedComposition = compositionOrder[(compositionDigit + enclosureDigit * 3) % compositionOrder.length]
  const generatedCore = coreOrder[(coreDigit + enclosureDigit * 7 + compositionDigit * 3) % coreOrder.length]
  const enclosure = presentation ? 'curated' : generatedEnclosure
  const composition = presentation ? 'curated' : generatedComposition
  const core = presentation ? 'curated' : generatedCore
  const semanticCommands = semanticModifier === 'none'
    ? transformCommands(motifCommands[motif], 0.46, 27, 8)
    : semanticModifierCommands[semanticModifier]
  const commands = presentation
    ? [...curatedCommands[presentation.emblem], ...directionCommands(direction)]
    : [...enclosureCommands[generatedEnclosure], ...semanticCommands, ...compositionCommands[generatedComposition], ...coreCommands[generatedCore], ...directionCommands(direction)]
  return {
    identityKey: `kinkatlas-emblem:${role.id}`,
    roleId: role.id,
    familyKey: familyKeyForRole(role, motif),
    motif,
    direction,
    enclosure,
    composition,
    core,
    semanticModifier,
    catalogOrdinal: ordinal,
    commands,
  }
}

export const roleEmblemRecipes: readonly RoleEmblemRecipe[] = roleLibrary.roles.map(createRecipe)
export const roleEmblemRecipeByRoleId = new Map(roleEmblemRecipes.map((recipe) => [recipe.roleId, recipe]))

export function roleEmblemRecipe(roleOrId: RoleLibraryRole | string): RoleEmblemRecipe {
  const role = typeof roleOrId === 'string' ? roleLibraryRoleById.get(roleOrId) : roleOrId
  const recipe = role && roleEmblemRecipeByRoleId.get(role.id)
  if (!recipe) throw new Error(`No KinkAtlas emblem recipe exists for ${typeof roleOrId === 'string' ? roleOrId : roleOrId.id}.`)
  return recipe
}

const pointGeometryKey = ([x, y]: Point) => `${x.toFixed(3)},${y.toFixed(3)}`

function normalizedPolylineKey(command: Extract<RoleEmblemCommand, { kind: 'polyline' }>): string {
  const points = command.points.map(pointGeometryKey)
  const candidates = command.closed
    ? points.flatMap((_, index) => {
        const rotated = [...points.slice(index), ...points.slice(0, index)]
        return [rotated.join(';'), [...rotated].reverse().join(';')]
      })
    : [points.join(';'), [...points].reverse().join(';')]
  return `polyline:${command.closed ? 'closed' : 'open'}:${candidates.sort()[0]}`
}

function commandGeometryKey(command: RoleEmblemCommand): string {
  if (command.kind === 'line') {
    const points = [pointGeometryKey(command.from), pointGeometryKey(command.to)].sort()
    return `line:${points.join(';')}`
  }
  if (command.kind === 'polyline') return normalizedPolylineKey(command)
  if (command.kind === 'circle') return `circle:${pointGeometryKey(command.center)}:${command.radius.toFixed(3)}`
  const forward = [command.start, command.control1, command.control2, command.end].map(pointGeometryKey).join(';')
  const reverse = [command.end, command.control2, command.control1, command.start].map(pointGeometryKey).join(';')
  return `bezier:${[forward, reverse].sort()[0]}`
}

export function roleEmblemPrimaryGeometryFingerprint(recipe: RoleEmblemRecipe): string {
  return [...new Set(recipe.commands.map(commandGeometryKey))].sort().join('|')
}

export function roleEmblemCommandSignature(recipe: RoleEmblemRecipe): string {
  return roleEmblemPrimaryGeometryFingerprint(recipe)
}

export function drawRoleEmblemOnCanvas(
  context: CanvasRenderingContext2D,
  recipe: RoleEmblemRecipe,
  bounds: { x: number; y: number; width: number; height: number },
  color = '#d7a85f',
): void {
  const scaleX = bounds.width / ROLE_EMBLEM_VIEWBOX.width
  const scaleY = bounds.height / ROLE_EMBLEM_VIEWBOX.height
  const x = (value: number) => bounds.x + value * scaleX
  const y = (value: number) => bounds.y + value * scaleY
  context.strokeStyle = color
  context.lineWidth = Math.max(2, Math.min(scaleX, scaleY) * 2.35)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  recipe.commands.forEach((command) => {
    context.beginPath()
    if (command.kind === 'line') {
      context.moveTo(x(command.from[0]), y(command.from[1]))
      context.lineTo(x(command.to[0]), y(command.to[1]))
    } else if (command.kind === 'polyline') {
      command.points.forEach((point, index) => index === 0 ? context.moveTo(x(point[0]), y(point[1])) : context.lineTo(x(point[0]), y(point[1])))
      if (command.closed) context.closePath()
    } else if (command.kind === 'circle') {
      context.arc(x(command.center[0]), y(command.center[1]), command.radius * Math.min(scaleX, scaleY), 0, Math.PI * 2)
    } else {
      context.moveTo(x(command.start[0]), y(command.start[1]))
      context.bezierCurveTo(x(command.control1[0]), y(command.control1[1]), x(command.control2[0]), y(command.control2[1]), x(command.end[0]), y(command.end[1]))
    }
    context.stroke()
  })
}
