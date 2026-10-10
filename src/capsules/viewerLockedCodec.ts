import { CapsuleError } from './capsuleError'
import { compressCapsuleBytes, decompressCapsuleBytes } from './capsuleCompression'
import { parseCapsulePayload, serializeCapsulePayload } from './capsuleCodec'
import { randomCapsuleBytes } from './capsuleCrypto'
import {
  CAPSULE_LIMITS,
  canonicalJson,
  decodeBase64Url,
  encodeBase64Url,
  isSharedDisclosurePayload,
  validateViewerLockedEnvelope,
} from './capsuleSchema'
import {
  CAPSULE_ENVELOPE_VERSION,
  CAPSULE_MAGIC,
  VIEWER_LOCKED_KDF,
  VIEWER_LOCKED_SUITE,
  type CapsuleJsonValue,
  type SharedDisclosurePayload,
  type ViewerLockedCapsuleEnvelope,
  type ViewerRequest,
} from './capsuleTypes'
import { importViewerPublicKey, validateViewerRequest } from './viewerRequest'

const encoder = new TextEncoder()
export const VIEWER_LOCKED_HKDF_INFO = 'KinkAtlas Viewer-Locked Capsule v1'
const HKDF_INFO = encoder.encode(VIEWER_LOCKED_HKDF_INFO)
type ViewerEnvelopeMetadata = Omit<ViewerLockedCapsuleEnvelope, 'ciphertext'>

function subtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new CapsuleError('unsupported-algorithm')
  return globalThis.crypto.subtle
}

function metadataForEnvelope(envelope: ViewerLockedCapsuleEnvelope): ViewerEnvelopeMetadata {
  return {
    magic: envelope.magic,
    envelopeVersion: envelope.envelopeVersion,
    mode: envelope.mode,
    suite: envelope.suite,
    compression: envelope.compression,
    recipientKeyId: envelope.recipientKeyId,
    ephemeralPublicKey: envelope.ephemeralPublicKey,
    kdf: { algorithm: envelope.kdf.algorithm },
    salt: envelope.salt,
    iv: envelope.iv,
  }
}

function aadBytes(metadata: ViewerEnvelopeMetadata): Uint8Array {
  return encoder.encode(canonicalJson(metadata as unknown as CapsuleJsonValue))
}

function requireRecipientPrivateKey(privateKey: CryptoKey): void {
  const algorithm = privateKey.algorithm as EcKeyAlgorithm
  if (privateKey.type !== 'private'
    || privateKey.extractable
    || algorithm.name !== 'ECDH'
    || algorithm.namedCurve !== 'P-256'
    || !privateKey.usages.includes('deriveBits')) {
    throw new CapsuleError('unsupported-algorithm')
  }
}

export async function deriveViewerContentKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: Uint8Array,
  usages: KeyUsage[],
  info: Uint8Array = HKDF_INFO,
): Promise<CryptoKey> {
  requireRecipientPrivateKey(privateKey)
  const sharedSecret = new Uint8Array(await subtleCrypto().deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256))
  try {
    const keyMaterial = await subtleCrypto().importKey('raw', sharedSecret, 'HKDF', false, ['deriveKey'])
    return await subtleCrypto().deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: Uint8Array.from(salt).buffer, info: Uint8Array.from(info).buffer },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      usages,
    )
  } finally {
    sharedSecret.fill(0)
  }
}

export async function validateViewerLockedEnvelopePublicKey(envelopeValue: ViewerLockedCapsuleEnvelope): Promise<ViewerLockedCapsuleEnvelope> {
  const envelope = validateViewerLockedEnvelope(envelopeValue)
  try {
    await importViewerPublicKey(envelope.ephemeralPublicKey)
  } catch {
    throw new CapsuleError('malformed-envelope')
  }
  return envelope
}

export async function createViewerLockedCapsule(
  payload: SharedDisclosurePayload,
  viewerRequestValue: ViewerRequest,
): Promise<ViewerLockedCapsuleEnvelope> {
  const viewerRequest = await validateViewerRequest(viewerRequestValue)
  const recipientPublicKey = await importViewerPublicKey(viewerRequest.recipientPublicKey)
  const ephemeralPair = await subtleCrypto().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
  if (!('privateKey' in ephemeralPair) || ephemeralPair.privateKey.extractable) throw new CapsuleError('unsupported-algorithm')
  const ephemeralPublicKey = new Uint8Array(await subtleCrypto().exportKey('raw', ephemeralPair.publicKey))
  const salt = randomCapsuleBytes(CAPSULE_LIMITS.saltBytes)
  const iv = randomCapsuleBytes(CAPSULE_LIMITS.ivBytes)
  const compression = 'gzip' as const
  const metadata: ViewerEnvelopeMetadata = {
    magic: CAPSULE_MAGIC,
    envelopeVersion: CAPSULE_ENVELOPE_VERSION,
    mode: 'viewer-locked',
    suite: VIEWER_LOCKED_SUITE,
    compression,
    recipientKeyId: viewerRequest.requestId,
    ephemeralPublicKey: encodeBase64Url(ephemeralPublicKey),
    kdf: { algorithm: VIEWER_LOCKED_KDF },
    salt: encodeBase64Url(salt),
    iv: encodeBase64Url(iv),
  }
  const compressed = await compressCapsuleBytes(encoder.encode(serializeCapsulePayload(payload)), compression)
  if (compressed.byteLength + CAPSULE_LIMITS.authenticationTagBytes > CAPSULE_LIMITS.ciphertextBytes) {
    throw new CapsuleError('oversized-input')
  }
  const contentKey = await deriveViewerContentKey(ephemeralPair.privateKey, recipientPublicKey, salt, ['encrypt'])
  const encrypted = await subtleCrypto().encrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer, additionalData: Uint8Array.from(aadBytes(metadata)).buffer, tagLength: 128 },
    contentKey,
    Uint8Array.from(compressed).buffer,
  )
  const envelope: ViewerLockedCapsuleEnvelope = { ...metadata, ciphertext: encodeBase64Url(new Uint8Array(encrypted)) }
  await validateViewerLockedEnvelopePublicKey(envelope)
  return envelope
}

export async function openViewerLockedCapsule(
  envelopeValue: ViewerLockedCapsuleEnvelope,
  recipientPrivateKey: CryptoKey,
): Promise<SharedDisclosurePayload> {
  const envelope = await validateViewerLockedEnvelopePublicKey(envelopeValue)
  const ephemeralPublicKey = await importViewerPublicKey(envelope.ephemeralPublicKey)
  const salt = decodeBase64Url(envelope.salt)
  const contentKey = await deriveViewerContentKey(recipientPrivateKey, ephemeralPublicKey, salt, ['decrypt'])
  let decrypted: ArrayBuffer
  try {
    decrypted = await subtleCrypto().decrypt(
      {
        name: 'AES-GCM',
        iv: Uint8Array.from(decodeBase64Url(envelope.iv)).buffer,
        additionalData: Uint8Array.from(aadBytes(metadataForEnvelope(envelope))).buffer,
        tagLength: 128,
      },
      contentKey,
      Uint8Array.from(decodeBase64Url(envelope.ciphertext)).buffer,
    )
  } catch {
    throw new CapsuleError('authentication-failed')
  }
  const plaintext = await decompressCapsuleBytes(
    new Uint8Array(decrypted),
    envelope.compression,
    CAPSULE_LIMITS.sharedDecompressedBytes,
  )
  const payload = parseCapsulePayload(plaintext)
  if (!isSharedDisclosurePayload(payload)) throw new CapsuleError('payload-validation-failed')
  return payload
}
