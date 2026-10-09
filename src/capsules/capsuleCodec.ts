import { CapsuleError } from './capsuleError'
import { compressCapsuleBytes, decompressCapsuleBytes } from './capsuleCompression'
import { decryptSecretBytes, encryptSecretBytes, randomCapsuleBytes } from './capsuleCrypto'
import {
  CAPSULE_LIMITS,
  canonicalJson,
  canonicalJsonFromValidatedValue,
  decodeBase64Url,
  encodeBase64Url,
  isSharedDisclosurePayload,
  transportByteLimit,
  validateCapsulePayload,
  validateSecretEnvelope,
} from './capsuleSchema'
import {
  CAPSULE_ENVELOPE_VERSION,
  CAPSULE_MAGIC,
  SECRET_CAPSULE_KDF,
  SECRET_CAPSULE_SUITE,
  type CapsuleEnvelopeTransport,
  type CapsuleJsonValue,
  type CapsulePayload,
  type SecretCapsuleEnvelope,
} from './capsuleTypes'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', { fatal: true })

interface SecretCapsuleOptions {
  compression?: 'gzip' | 'none'
  iterations?: number
}

type SecretEnvelopeMetadata = Omit<SecretCapsuleEnvelope, 'ciphertext'>

function payloadBytes(payload: CapsulePayload): Uint8Array {
  validateCapsulePayload(payload)
  const serialized = textEncoder.encode(canonicalJson(payload as unknown as CapsuleJsonValue))
  const limit = isSharedDisclosurePayload(payload)
    ? CAPSULE_LIMITS.sharedDecompressedBytes
    : CAPSULE_LIMITS.restoreDecompressedBytes
  if (serialized.byteLength > limit) throw new CapsuleError('oversized-input')
  return serialized
}

function envelopeMetadata(envelope: SecretCapsuleEnvelope): SecretEnvelopeMetadata {
  return {
    magic: envelope.magic,
    envelopeVersion: envelope.envelopeVersion,
    mode: envelope.mode,
    suite: envelope.suite,
    compression: envelope.compression,
    kdf: { algorithm: envelope.kdf.algorithm, iterations: envelope.kdf.iterations },
    salt: envelope.salt,
    iv: envelope.iv,
  }
}

function aadBytes(metadata: SecretEnvelopeMetadata): Uint8Array {
  return textEncoder.encode(canonicalJson(metadata as unknown as CapsuleJsonValue))
}

export function serializeCapsulePayload(payload: CapsulePayload): string {
  return textDecoder.decode(payloadBytes(payload))
}

export function parseCapsulePayload(bytes: Uint8Array): CapsulePayload {
  let value: unknown
  try {
    value = JSON.parse(textDecoder.decode(bytes))
  } catch {
    throw new CapsuleError('payload-validation-failed')
  }
  validateCapsulePayload(value)
  return value
}

export function serializeCapsuleEnvelope(
  envelopeValue: SecretCapsuleEnvelope,
  transport: CapsuleEnvelopeTransport = 'fragment',
): string {
  const envelope = validateSecretEnvelope(envelopeValue)
  const serialized = canonicalJsonFromValidatedValue(envelope as unknown as CapsuleJsonValue)
  if (textEncoder.encode(serialized).byteLength > transportByteLimit(transport)) {
    throw new CapsuleError('oversized-input')
  }
  return serialized
}

export function parseCapsuleEnvelope(
  serialized: string,
  transport: CapsuleEnvelopeTransport = 'fragment',
): SecretCapsuleEnvelope {
  if (typeof serialized !== 'string' || textEncoder.encode(serialized).byteLength > transportByteLimit(transport)) {
    throw new CapsuleError('oversized-input')
  }
  let value: unknown
  try {
    value = JSON.parse(serialized)
  } catch {
    throw new CapsuleError('malformed-envelope')
  }
  return validateSecretEnvelope(value)
}

export async function createSecretCapsule(
  payload: CapsulePayload,
  secret: string,
  options: SecretCapsuleOptions = {},
): Promise<SecretCapsuleEnvelope> {
  const plaintext = payloadBytes(payload)
  const compression = options.compression ?? 'gzip'
  const iterations = options.iterations ?? CAPSULE_LIMITS.pbkdf2IterationsDefault
  const compressed = await compressCapsuleBytes(plaintext, compression)
  if (compressed.byteLength + CAPSULE_LIMITS.authenticationTagBytes > CAPSULE_LIMITS.ciphertextBytes) {
    throw new CapsuleError('oversized-input')
  }
  const salt = randomCapsuleBytes(CAPSULE_LIMITS.saltBytes)
  const iv = randomCapsuleBytes(CAPSULE_LIMITS.ivBytes)
  const metadata: SecretEnvelopeMetadata = {
    magic: CAPSULE_MAGIC,
    envelopeVersion: CAPSULE_ENVELOPE_VERSION,
    mode: 'secret',
    suite: SECRET_CAPSULE_SUITE,
    compression,
    kdf: { algorithm: SECRET_CAPSULE_KDF, iterations },
    salt: encodeBase64Url(salt),
    iv: encodeBase64Url(iv),
  }
  const ciphertext = await encryptSecretBytes(compressed, secret, salt, iv, iterations, aadBytes(metadata))
  const envelope: SecretCapsuleEnvelope = { ...metadata, ciphertext: encodeBase64Url(ciphertext) }
  validateSecretEnvelope(envelope)
  return envelope
}

export async function openSecretCapsule(envelopeValue: SecretCapsuleEnvelope, secret: string): Promise<CapsulePayload> {
  const envelope = validateSecretEnvelope(envelopeValue)
  const metadata = envelopeMetadata(envelope)
  const plaintext = await decryptSecretBytes(
    decodeBase64Url(envelope.ciphertext),
    secret,
    decodeBase64Url(envelope.salt),
    decodeBase64Url(envelope.iv),
    envelope.kdf.iterations,
    aadBytes(metadata),
  )
  const decompressed = await decompressCapsuleBytes(
    plaintext,
    envelope.compression,
    CAPSULE_LIMITS.restoreDecompressedBytes,
  )
  const payload = parseCapsulePayload(decompressed)
  if (isSharedDisclosurePayload(payload) && decompressed.byteLength > CAPSULE_LIMITS.sharedDecompressedBytes) {
    throw new CapsuleError('oversized-input')
  }
  return payload
}

export async function decodeSecretCapsule(
  serialized: string,
  secret: string,
  transport: CapsuleEnvelopeTransport = 'fragment',
): Promise<CapsulePayload> {
  return openSecretCapsule(parseCapsuleEnvelope(serialized, transport), secret)
}
