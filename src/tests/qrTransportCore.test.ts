// @vitest-environment node

import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { buildResultSnapshot, buildSharedDisclosurePayload } from '../capsules/capsuleData'
import { createSharedDisclosureArtifact } from '../capsules/capsuleTransport'
import { generateViewerRequestKeyPair } from '../capsules/viewerRequest'
import { createViewerLockedDisclosureArtifact, createViewerRequestArtifact } from '../capsules/viewerLockedTransport'
import { createRevisitArtifact } from '../revisit/revisitCodec'
import { QR_MAX_INPUT_BYTES, QR_MAX_VERSION, QR_QUIET_ZONE_MODULES, qrAvailability } from '../qr/qrPolicy'
import { createQrTransport, qrSvgText, QrTransportError, type QrTransportResult } from '../qr/qrTransport'
import { assessmentPersonas } from './fixtures/assessmentPersonas'
import { evaluateAssessmentPersona } from './helpers/assessmentPersonaRunner'

function decodeMatrix(qr: QrTransportResult): string {
  const scale = 5
  const width = qr.matrixModules * scale
  const pixels = new Uint8ClampedArray(width * width * 4)
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = qr.matrix[Math.floor(y / scale)][Math.floor(x / scale)] ? 0 : 255
      const offset = ((y * width) + x) * 4
      pixels[offset] = value
      pixels[offset + 1] = value
      pixels[offset + 2] = value
      pixels[offset + 3] = 255
    }
  }
  const decoded = jsQR(pixels, width, width)
  if (!decoded) throw new Error('QR test decoder could not read the generated matrix.')
  return decoded.data
}

const persona = assessmentPersonas.find(({ id }) => id === 'balanced-authority-pattern')!
const evaluation = evaluateAssessmentPersona(persona)
const smallDisclosure = buildSharedDisclosurePayload(evaluation.yourRoleSet.slice(0, 1), {
  currentRoleSet: true,
  roleDefinitions: false,
})
const encoder = new TextEncoder()

describe('local QR transport core', () => {
  it('round trips exact UTF-8 byte-mode text with deterministic ECC M matrices and a four-module quiet zone', () => {
    const text = 'https://example.test/capsule#capsule=exact_%E2%80%99_transport'
    const first = createQrTransport(text, 'secret-capsule')
    const second = createQrTransport(text, 'secret-capsule')

    expect(decodeMatrix(first)).toBe(text)
    expect(second.matrix).toEqual(first.matrix)
    expect(first.errorCorrection).toBe('M')
    expect(first.quietZoneModules).toBe(QR_QUIET_ZONE_MODULES)
    expect(first.version).toBeLessThanOrEqual(QR_MAX_VERSION)
    expect(first.matrix.slice(0, QR_QUIET_ZONE_MODULES).flat().every((module) => !module)).toBe(true)
    expect(first.matrix.every((row) => row.slice(0, QR_QUIET_ZONE_MODULES).every((module) => !module))).toBe(true)
    const svg = qrSvgText(first, 'QR code & <script>alert(1)</script>')
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('<foreignObject')
    expect(svg).not.toContain(text)
    expect(svg).toContain('QR code &amp; &lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('encodes a Viewer Request link exactly without the local label or private key', async () => {
    const { request, privateKey } = await generateViewerRequestKeyPair()
    const artifact = await createViewerRequestArtifact(request, 'https://kinkatlas.ca')
    const qr = createQrTransport(artifact.link, 'viewer-request')

    expect(decodeMatrix(qr)).toBe(artifact.link)
    expect(qr.version).toBe(19)
    expect(qr.byteCount).toBeLessThanOrEqual(QR_MAX_INPUT_BYTES)
    expect(artifact.link).not.toContain('privateKey')
    expect(artifact.link).not.toContain('Local recipient label')
    await expect(crypto.subtle.exportKey('pkcs8', privateKey)).rejects.toBeDefined()
  })

  it('encodes only a supported Secret Capsule encrypted link and keeps its secret separate', async () => {
    const artifact = await createSharedDisclosureArtifact(smallDisclosure, 'https://example.test')
    const availability = qrAvailability(artifact.link, 'secret-capsule')

    if (availability.available) {
      const qr = createQrTransport(artifact.link, 'secret-capsule')
      expect(decodeMatrix(qr)).toBe(artifact.link)
      expect(qr.text).not.toContain(artifact.secret)
      expect(qrSvgText(qr, 'QR code for encrypted Secret Capsule')).not.toContain(artifact.secret)
    } else {
      expect(availability.reason).toBe('oversized')
      expect(artifact.link).not.toContain(artifact.secret)
    }
  })

  it('measures current artifact classes against the conservative single-QR gate', async () => {
    const emptyDisclosure = buildSharedDisclosurePayload([], { currentRoleSet: true, roleDefinitions: false })
    const typicalDisclosure = buildSharedDisclosurePayload(evaluation.yourRoleSet, { currentRoleSet: true, roleDefinitions: true })
    const { request } = await generateViewerRequestKeyPair()
    const viewerRequest = await createViewerRequestArtifact(request, 'https://kinkatlas.ca')
    const [secretEmpty, secretSmall, secretTypical, lockedEmpty, lockedSmall, lockedTypical] = await Promise.all([
      createSharedDisclosureArtifact(emptyDisclosure, 'https://kinkatlas.ca'),
      createSharedDisclosureArtifact(smallDisclosure, 'https://kinkatlas.ca'),
      createSharedDisclosureArtifact(typicalDisclosure, 'https://kinkatlas.ca'),
      createViewerLockedDisclosureArtifact(emptyDisclosure, request, 'https://kinkatlas.ca'),
      createViewerLockedDisclosureArtifact(smallDisclosure, request, 'https://kinkatlas.ca'),
      createViewerLockedDisclosureArtifact(typicalDisclosure, request, 'https://kinkatlas.ca'),
    ])
    const revisitMeasurements = await Promise.all(assessmentPersonas.map(async (candidate) => {
      const result = evaluateAssessmentPersona(candidate)
      const artifact = await createRevisitArtifact(buildResultSnapshot(candidate.answers, result.yourRoleSet), 'https://kinkatlas.ca')
      return encoder.encode(artifact.link).byteLength
    }))
    const measurements = {
      viewerRequest: encoder.encode(viewerRequest.link).byteLength,
      secretEmpty: encoder.encode(secretEmpty.link).byteLength,
      secretSmall: encoder.encode(secretSmall.link).byteLength,
      secretTypical: encoder.encode(secretTypical.link).byteLength,
      lockedEmpty: encoder.encode(lockedEmpty.link).byteLength,
      lockedSmall: encoder.encode(lockedSmall.link).byteLength,
      lockedTypical: encoder.encode(lockedTypical.link).byteLength,
      revisitMin: Math.min(...revisitMeasurements),
      revisitMedian: [...revisitMeasurements].sort((left, right) => left - right)[Math.floor(revisitMeasurements.length / 2)],
      revisitMax: Math.max(...revisitMeasurements),
    }
    expect(measurements).toEqual({
      viewerRequest: 572,
      secretEmpty: 1040,
      secretSmall: 1107,
      secretTypical: 1825,
      lockedEmpty: 1221,
      lockedSmall: 1288,
      lockedTypical: 2007,
      revisitMin: 5119,
      revisitMedian: 7559,
      revisitMax: 12041,
    })
  })

  it('round trips Viewer-Locked links only when they pass the same reliable single-QR gate', async () => {
    const { request } = await generateViewerRequestKeyPair()
    const artifact = await createViewerLockedDisclosureArtifact(smallDisclosure, request, 'https://example.test')
    const availability = qrAvailability(artifact.link, 'viewer-locked-capsule')

    if (availability.available) {
      expect(decodeMatrix(createQrTransport(artifact.link, 'viewer-locked-capsule'))).toBe(artifact.link)
    } else {
      expect(availability.reason).toBe('oversized')
      expect(() => createQrTransport(artifact.link, 'viewer-locked-capsule')).toThrowError(QrTransportError)
    }
  })

  it('rejects oversized input before encoding and deliberately defers Revisit QR', async () => {
    const boundary = createQrTransport('x'.repeat(QR_MAX_INPUT_BYTES), 'secret-capsule')
    expect(boundary.version).toBe(QR_MAX_VERSION)
    expect(decodeMatrix(boundary)).toBe('x'.repeat(QR_MAX_INPUT_BYTES))
    expect(qrAvailability('x'.repeat(QR_MAX_INPUT_BYTES + 1), 'secret-capsule')).toEqual({
      available: false,
      byteCount: QR_MAX_INPUT_BYTES + 1,
      reason: 'oversized',
    })
    expect(() => createQrTransport('x'.repeat(QR_MAX_INPUT_BYTES + 1), 'secret-capsule')).toThrowError(QrTransportError)

    const revisit = await createRevisitArtifact(buildResultSnapshot(persona.answers, evaluation.yourRoleSet), 'https://example.test')
    expect(revisit.link.length).toBeGreaterThan(QR_MAX_INPUT_BYTES)
    expect(qrAvailability(revisit.link, 'revisit')).toEqual(expect.objectContaining({ available: false, reason: 'revisit-deferred' }))
  })
})
