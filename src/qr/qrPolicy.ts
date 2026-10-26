export const QR_ERROR_CORRECTION = 'medium' as const
export const QR_ERROR_CORRECTION_LABEL = 'M' as const
export const QR_ENCODING = 'byte' as const
export const QR_QUIET_ZONE_MODULES = 4
export const QR_MAX_VERSION = 19
export const QR_MAX_INPUT_BYTES = 624
export const QR_RENDER_MODULE_PIXELS = 4

export type QrArtifactType = 'viewer-request' | 'reveal-request' | 'secret-capsule' | 'viewer-locked-capsule' | 'revisit' | 'quick-share'

export type QrAvailability =
  | { available: true; byteCount: number }
  | { available: false; byteCount: number; reason: 'empty' | 'oversized' | 'revisit-deferred' }

const encoder = new TextEncoder()

export function qrInputByteCount(text: string): number {
  return encoder.encode(text).byteLength
}

export function qrAvailability(text: string, artifactType: QrArtifactType): QrAvailability {
  const byteCount = qrInputByteCount(text)
  if (!byteCount) return { available: false, byteCount, reason: 'empty' }
  if (artifactType === 'revisit') return { available: false, byteCount, reason: 'revisit-deferred' }
  if (byteCount > QR_MAX_INPUT_BYTES) return { available: false, byteCount, reason: 'oversized' }
  return { available: true, byteCount }
}
