import { describe, expect, it } from 'vitest'
import { buildCalibrationReport, renderCalibrationReport } from './calibrationReport'

describe('development calibration report', () => {
  it('prints a readable summary and has no critical framework failures', () => {
    const report = buildCalibrationReport()
    console.log(`\n${renderCalibrationReport(report)}\n`)
    expect(report.personaCount).toBeGreaterThanOrEqual(20)
    expect(report.roleCount).toBe(101)
    expect(report.criticalFailureCount).toBe(0)
    expect(report.adaptivePassed).toBe(report.adaptiveTotal)
    expect(report.readinessCriticalPersistence).toBe(true)
    expect(report.boundaryIndependence).toBe(true)
  })
})
