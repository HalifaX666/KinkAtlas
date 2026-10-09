import { CapsuleError } from './capsuleError'
import { CAPSULE_LIMITS } from './capsuleSchema'

const textEncoder = new TextEncoder()

function subtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new CapsuleError('unsupported-algorithm')
  return globalThis.crypto.subtle
}

function validateSecret(secret: string): Uint8Array {
  if (typeof secret !== 'string') throw new CapsuleError('invalid-secret')
  const encoded = textEncoder.encode(secret)
  if (encoded.byteLength < CAPSULE_LIMITS.secretBytesMin || encoded.byteLength > CAPSULE_LIMITS.secretBytesMax) {
    encoded.fill(0)
    throw new CapsuleError('invalid-secret')
  }
  return encoded
}

function validateIterations(iterations: number): void {
  if (!Number.isSafeInteger(iterations)
    || iterations < CAPSULE_LIMITS.pbkdf2IterationsMin
    || iterations > CAPSULE_LIMITS.pbkdf2IterationsMax) {
    throw new CapsuleError('malformed-envelope')
  }
}

async function deriveSecretKey(secret: string, salt: Uint8Array, iterations: number, usages: KeyUsage[]): Promise<CryptoKey> {
  validateIterations(iterations)
  const secretBytes = validateSecret(secret)
  try {
    const subtle = subtleCrypto()
    const keyMaterial = await subtle.importKey('raw', Uint8Array.from(secretBytes).buffer, 'PBKDF2', false, ['deriveKey'])
    return await subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(salt).buffer, iterations },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      usages,
    )
  } finally {
    secretBytes.fill(0)
  }
}

export function randomCapsuleBytes(length: number): Uint8Array {
  if (!globalThis.crypto?.getRandomValues) throw new CapsuleError('unsupported-algorithm')
  return globalThis.crypto.getRandomValues(new Uint8Array(length))
}

export async function encryptSecretBytes(
  plaintext: Uint8Array,
  secret: string,
  salt: Uint8Array,
  iv: Uint8Array,
  iterations: number,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  const key = await deriveSecretKey(secret, salt, iterations, ['encrypt'])
  const encrypted = await subtleCrypto().encrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer, additionalData: Uint8Array.from(additionalData).buffer, tagLength: 128 },
    key,
    Uint8Array.from(plaintext).buffer,
  )
  return new Uint8Array(encrypted)
}

export async function decryptSecretBytes(
  ciphertext: Uint8Array,
  secret: string,
  salt: Uint8Array,
  iv: Uint8Array,
  iterations: number,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  try {
    const key = await deriveSecretKey(secret, salt, iterations, ['decrypt'])
    const decrypted = await subtleCrypto().decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer, additionalData: Uint8Array.from(additionalData).buffer, tagLength: 128 },
      key,
      Uint8Array.from(ciphertext).buffer,
    )
    return new Uint8Array(decrypted)
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw new CapsuleError('authentication-failed')
  }
}
