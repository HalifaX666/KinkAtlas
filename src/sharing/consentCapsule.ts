import { compressCapsuleBytes, decompressCapsuleBytes } from '../capsules/capsuleCompression'
import { randomCapsuleBytes } from '../capsules/capsuleCrypto'
import { CAPSULE_LIMITS, canonicalJson, decodeBase64Url, encodeBase64Url } from '../capsules/capsuleSchema'
import type { CapsuleJsonValue, ViewerRequest } from '../capsules/capsuleTypes'
import { getStoredViewerRequest } from '../capsules/viewerKeyStore'
import { deriveViewerContentKey } from '../capsules/viewerLockedCodec'
import { importViewerPublicKey, validateViewerRequest } from '../capsules/viewerRequest'
import {
  CONSENT_CAPSULE_MAGIC,
  CONSENT_CAPSULE_VERSION,
  type ConsentCapsuleEnvelope,
  validateConsentCapsuleEnvelope,
} from './hostedContracts'
import { parseSharePackage, serializeSharePackage, SHARE_PACKAGE_MAX_BYTES, type SharePackage } from './sharePackage'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const hkdfInfo = encoder.encode('KinkAtlas ConsentCapsule v1')
type Metadata = Omit<ConsentCapsuleEnvelope, 'ciphertext'>

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error('ConsentCapsule is unavailable')
  return globalThis.crypto.subtle
}

function metadata(envelope: ConsentCapsuleEnvelope): Metadata {
  return {
    magic: envelope.magic,
    consentCapsuleVersion: envelope.consentCapsuleVersion,
    suite: envelope.suite,
    compression: envelope.compression,
    recipientKeyId: envelope.recipientKeyId,
    ephemeralPublicKey: envelope.ephemeralPublicKey,
    kdf: { algorithm: envelope.kdf.algorithm },
    salt: envelope.salt,
    iv: envelope.iv,
  }
}

function aad(value: Metadata): Uint8Array {
  return encoder.encode(canonicalJson(value as unknown as CapsuleJsonValue))
}

export async function createConsentCapsule(pkg: SharePackage, requestValue: ViewerRequest): Promise<ConsentCapsuleEnvelope> {
  const request = await validateViewerRequest(requestValue)
  const recipientPublicKey = await importViewerPublicKey(request.recipientPublicKey)
  const pair = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
  if (!('privateKey' in pair) || pair.privateKey.extractable) throw new Error('ConsentCapsule is unavailable')
  const ephemeralPublicKey = new Uint8Array(await subtle().exportKey('raw', pair.publicKey))
  const salt = randomCapsuleBytes(CAPSULE_LIMITS.saltBytes)
  const iv = randomCapsuleBytes(CAPSULE_LIMITS.ivBytes)
  const meta: Metadata = {
    magic: CONSENT_CAPSULE_MAGIC,
    consentCapsuleVersion: CONSENT_CAPSULE_VERSION,
    suite: 'ECDH-P256+HKDF-SHA-256+A256GCM',
    compression: 'gzip',
    recipientKeyId: request.requestId,
    ephemeralPublicKey: encodeBase64Url(ephemeralPublicKey),
    kdf: { algorithm: 'HKDF-SHA-256' },
    salt: encodeBase64Url(salt),
    iv: encodeBase64Url(iv),
  }
  const compressed = await compressCapsuleBytes(encoder.encode(serializeSharePackage(pkg)), 'gzip')
  const key = await deriveViewerContentKey(pair.privateKey, recipientPublicKey, salt, ['encrypt'], hkdfInfo)
  const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer, additionalData: Uint8Array.from(aad(meta)).buffer, tagLength: 128 }, key, Uint8Array.from(compressed).buffer)
  const envelope: ConsentCapsuleEnvelope = { ...meta, ciphertext: encodeBase64Url(new Uint8Array(ciphertext)) }
  validateConsentCapsuleEnvelope(envelope)
  return envelope
}

export async function openConsentCapsule(value: ConsentCapsuleEnvelope): Promise<SharePackage> {
  validateConsentCapsuleEnvelope(value)
  const stored = await getStoredViewerRequest(value.recipientKeyId)
  if (!stored) throw new Error('This ConsentCapsule needs its matching recipient key in this browser.')
  const ephemeral = await importViewerPublicKey(value.ephemeralPublicKey)
  const salt = decodeBase64Url(value.salt)
  const key = await deriveViewerContentKey(stored.privateKey, ephemeral, salt, ['decrypt'], hkdfInfo)
  let decrypted: ArrayBuffer
  try {
    decrypted = await subtle().decrypt({ name: 'AES-GCM', iv: Uint8Array.from(decodeBase64Url(value.iv)).buffer, additionalData: Uint8Array.from(aad(metadata(value))).buffer, tagLength: 128 }, key, Uint8Array.from(decodeBase64Url(value.ciphertext)).buffer)
  } catch {
    throw new Error('This ConsentCapsule could not be opened with the key in this browser.')
  }
  const plaintext = await decompressCapsuleBytes(new Uint8Array(decrypted), 'gzip', SHARE_PACKAGE_MAX_BYTES)
  return parseSharePackage(decoder.decode(plaintext))
}
