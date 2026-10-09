export type CapsuleErrorCode =
  | 'authentication-failed'
  | 'compression-failed'
  | 'invalid-secret'
  | 'malformed-envelope'
  | 'oversized-input'
  | 'payload-validation-failed'
  | 'unsupported-algorithm'
  | 'unsupported-version'

const safeMessages: Record<CapsuleErrorCode, string> = {
  'authentication-failed': 'The Capsule could not be authenticated.',
  'compression-failed': 'The Capsule content could not be decompressed.',
  'invalid-secret': 'The Capsule secret is invalid.',
  'malformed-envelope': 'The Capsule envelope is malformed.',
  'oversized-input': 'The Capsule exceeds a supported size limit.',
  'payload-validation-failed': 'The Capsule content is invalid.',
  'unsupported-algorithm': 'The Capsule uses an unsupported algorithm.',
  'unsupported-version': 'The Capsule version is not supported.',
}

export class CapsuleError extends Error {
  readonly code: CapsuleErrorCode

  constructor(code: CapsuleErrorCode) {
    super(safeMessages[code])
    this.name = 'CapsuleError'
    this.code = code
  }
}

export function isCapsuleError(error: unknown, code?: CapsuleErrorCode): error is CapsuleError {
  return error instanceof CapsuleError && (code === undefined || error.code === code)
}
