import type { CalibrationExpectation } from './calibrationTypes'
import type { ActivityRecommendation, CompetencyId, ConfidenceLevel, ReadinessBand, RoleResult } from '../types'

export const expectRoleInTop = (roleId: string, top: number): CalibrationExpectation => ({ kind: 'role-in-top', roleId, top })

export const expectRoleAbove = (higherRoleId: string, lowerRoleId: string): CalibrationExpectation => ({ kind: 'role-above', higherRoleId, lowerRoleId })

export const expectBandAtLeast = (roleId: string, band: RoleResult['alignment']): CalibrationExpectation => ({ kind: 'minimum-band', roleId, band })

export const expectBandAtMost = (roleId: string, band: RoleResult['alignment']): CalibrationExpectation => ({ kind: 'maximum-band', roleId, band })

export const expectConfidence = (roleId: string, ...allowed: ConfidenceLevel[]): CalibrationExpectation => ({ kind: 'confidence', roleId, allowed })

export const expectRawAboveRanking = (roleId: string): CalibrationExpectation => ({ kind: 'raw-above-ranking', roleId })

export const expectRoleCountAtLeast = (band: RoleResult['alignment'], count: number): CalibrationExpectation => ({ kind: 'minimum-role-count', band, count })

export const expectRoleCountAtMost = (band: RoleResult['alignment'], count: number): CalibrationExpectation => ({ kind: 'maximum-role-count', band, count })

export const expectReadinessBand = (competency: CompetencyId, ...allowed: ReadinessBand[]): CalibrationExpectation => ({ kind: 'readiness-band', competency, allowed })

export const expectBlindSpot = (blindSpotId: string): CalibrationExpectation => ({ kind: 'blind-spot', blindSpotId })

export const expectCriticalFlag = (flagId: string): CalibrationExpectation => ({ kind: 'critical-flag', flagId })

export const expectActivityStatus = (itemId: string, status: ActivityRecommendation['status']): CalibrationExpectation => ({ kind: 'activity-status', itemId, status })
