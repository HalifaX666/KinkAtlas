import encodeQR from 'qr'
import {
  QR_ENCODING,
  QR_ERROR_CORRECTION,
  QR_ERROR_CORRECTION_LABEL,
  QR_MAX_VERSION,
  QR_QUIET_ZONE_MODULES,
  QR_RENDER_MODULE_PIXELS,
  qrAvailability,
  type QrArtifactType,
} from './qrPolicy'

export class QrTransportError extends Error {
  readonly code: 'empty' | 'oversized' | 'revisit-deferred' | 'encoding-failed'

  constructor(code: QrTransportError['code']) {
    super(code)
    this.name = 'QrTransportError'
    this.code = code
  }
}

export interface QrTransportResult {
  artifactType: QrArtifactType
  text: string
  byteCount: number
  errorCorrection: typeof QR_ERROR_CORRECTION_LABEL
  quietZoneModules: number
  version: number
  coreModules: number
  matrixModules: number
  renderedPixels: number
  pixelsPerModule: number
  matrix: boolean[][]
  svgPath: string
}

function pathForMatrix(matrix: readonly (readonly boolean[])[]): string {
  const commands: string[] = []
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) commands.push(`M${x} ${y}h1v1h-1z`)
  }))
  return commands.join('')
}

export function createQrTransport(text: string, artifactType: QrArtifactType): QrTransportResult {
  const availability = qrAvailability(text, artifactType)
  if (!availability.available) throw new QrTransportError(availability.reason)

  try {
    const matrix = encodeQR(text, 'raw', {
      border: QR_QUIET_ZONE_MODULES,
      ecc: QR_ERROR_CORRECTION,
      encoding: QR_ENCODING,
    })
    const coreModules = matrix.length - (QR_QUIET_ZONE_MODULES * 2)
    const version = (coreModules - 17) / 4
    if (!Number.isInteger(version) || version < 1 || version > QR_MAX_VERSION) {
      throw new QrTransportError('oversized')
    }
    const renderedPixels = matrix.length * QR_RENDER_MODULE_PIXELS
    return {
      artifactType,
      text,
      byteCount: availability.byteCount,
      errorCorrection: QR_ERROR_CORRECTION_LABEL,
      quietZoneModules: QR_QUIET_ZONE_MODULES,
      version,
      coreModules,
      matrixModules: matrix.length,
      renderedPixels,
      pixelsPerModule: QR_RENDER_MODULE_PIXELS,
      matrix,
      svgPath: pathForMatrix(matrix),
    }
  } catch (error) {
    if (error instanceof QrTransportError) throw error
    throw new QrTransportError('encoding-failed')
  }
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

export function qrSvgText(qr: QrTransportResult, accessibleLabel: string): string {
  const size = qr.matrixModules
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(accessibleLabel)}" viewBox="0 0 ${size} ${size}" width="${qr.renderedPixels}" height="${qr.renderedPixels}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${qr.svgPath}" fill="#000"/></svg>`
}
