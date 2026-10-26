import { compressCapsuleBytes, decompressCapsuleBytes } from '../capsules/capsuleCompression'
import { randomCapsuleBytes } from '../capsules/capsuleCrypto'
import { decodeBase64Url, encodeBase64Url } from '../capsules/capsuleSchema'
import { validatePrivateRestoreState } from '../capsules/capsuleData'
import {
  HOSTED_BODY_MAX_BYTES,
  SAVED_ASSESSMENT_BUNDLE_MAGIC,
  SAVED_ASSESSMENT_BUNDLE_VERSION,
  SAVED_ASSESSMENT_MAGIC,
  SAVED_ASSESSMENT_VERSION,
  type SavedAssessmentBundle,
  type SavedAssessmentEnvelope,
  validateSavedAssessmentEnvelope,
} from './hostedContracts'
import { parseSharePackage, serializeSharePackage, validateSharePackage } from './sharePackage'

const DATABASE_NAME = 'kinkatlas-vault'
const DATABASE_VERSION = 1
const KEY_STORE = 'vault-key'
const SAVE_STORE = 'saved-assessments'
const SHARE_STORE = 'hosted-shares'
const PRIMARY_KEY_ID = 'primary'
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export interface SavedAssessmentRecord { id: string; createdAt: string; name?: string; deleteToken: string }
export interface HostedShareRecord { id: string; kind: 'quick-share' | 'consent-capsule'; createdAt: string; deleteToken: string; url: string }

function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Saved assessments are unavailable in this browser.'))
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(KEY_STORE)) request.result.createObjectStore(KEY_STORE, { keyPath: 'id' })
      if (!request.result.objectStoreNames.contains(SAVE_STORE)) request.result.createObjectStore(SAVE_STORE, { keyPath: 'id' })
      if (!request.result.objectStoreNames.contains(SHARE_STORE)) request.result.createObjectStore(SHARE_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Saved assessments are unavailable in this browser.'))
    request.onblocked = () => reject(new Error('Saved assessments are unavailable in this browser.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Local vault operation failed.'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Local vault operation failed.'))
    transaction.onabort = () => reject(new Error('Local vault operation failed.'))
  })
}

function validVaultKey(value: unknown): value is CryptoKey {
  if (typeof value !== 'object' || value === null) return false
  const key = value as CryptoKey
  const algorithm = key.algorithm as AesKeyAlgorithm
  return key.type === 'secret' && key.extractable === false && algorithm?.name === 'AES-GCM' && key.usages.includes('encrypt') && key.usages.includes('decrypt')
}

export async function getOrCreateVaultKey(): Promise<CryptoKey> {
  const database = await openDatabase()
  try {
    const existing = await requestResult(database.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get(PRIMARY_KEY_ID)) as { id: string; key: CryptoKey } | undefined
    if (existing) {
      if (existing.id !== PRIMARY_KEY_ID || !validVaultKey(existing.key)) throw new Error('Local vault key is invalid.')
      return existing.key
    }
    if (!globalThis.crypto?.subtle) throw new Error('Saved assessments are unavailable in this browser.')
    const key = await globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    const transaction = database.transaction(KEY_STORE, 'readwrite')
    transaction.objectStore(KEY_STORE).add({ id: PRIMARY_KEY_ID, key })
    await transactionComplete(transaction)
    return key
  } finally { database.close() }
}

function bundleJson(bundle: SavedAssessmentBundle): string {
  if (typeof bundle !== 'object' || bundle === null || Array.isArray(bundle)
    || Object.keys(bundle).length !== 4
    || !['magic', 'savedAssessmentBundleVersion', 'restore', 'sharePackage'].every((field) => Object.hasOwn(bundle, field))
    || Object.keys(bundle).some((field) => field === '__proto__' || field === 'constructor' || field === 'prototype')
    || bundle.magic !== SAVED_ASSESSMENT_BUNDLE_MAGIC
    || bundle.savedAssessmentBundleVersion !== SAVED_ASSESSMENT_BUNDLE_VERSION) throw new Error('Invalid saved assessment')
  validatePrivateRestoreState(bundle.restore)
  validateSharePackage(bundle.sharePackage)
  const serialized = JSON.stringify(bundle)
  if (encoder.encode(serialized).byteLength > HOSTED_BODY_MAX_BYTES) throw new Error('Saved assessment is too large')
  return serialized
}

export async function encryptSavedAssessment(bundle: SavedAssessmentBundle, key: CryptoKey): Promise<SavedAssessmentEnvelope> {
  if (!validVaultKey(key)) throw new Error('Local vault key is invalid.')
  const iv = randomCapsuleBytes(12)
  const metadata = { magic: SAVED_ASSESSMENT_MAGIC, savedAssessmentVersion: SAVED_ASSESSMENT_VERSION, suite: 'A256GCM' as const, compression: 'gzip' as const, iv: encodeBase64Url(iv) }
  const compressed = await compressCapsuleBytes(encoder.encode(bundleJson(bundle)), 'gzip')
  const ciphertext = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer, additionalData: encoder.encode(JSON.stringify(metadata)), tagLength: 128 }, key, Uint8Array.from(compressed).buffer)
  const envelope: SavedAssessmentEnvelope = { ...metadata, ciphertext: encodeBase64Url(new Uint8Array(ciphertext)) }
  validateSavedAssessmentEnvelope(envelope)
  return envelope
}

export async function decryptSavedAssessment(envelope: SavedAssessmentEnvelope, key: CryptoKey): Promise<SavedAssessmentBundle> {
  validateSavedAssessmentEnvelope(envelope)
  if (!validVaultKey(key)) throw new Error('Local vault key is invalid.')
  const { ciphertext, ...metadata } = envelope
  let compressed: ArrayBuffer
  try {
    compressed = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(decodeBase64Url(envelope.iv)).buffer, additionalData: encoder.encode(JSON.stringify(metadata)), tagLength: 128 }, key, Uint8Array.from(decodeBase64Url(ciphertext)).buffer)
  } catch { throw new Error('Saved assessment could not be decrypted in this browser.') }
  const plaintext = await decompressCapsuleBytes(new Uint8Array(compressed), 'gzip', HOSTED_BODY_MAX_BYTES)
  let value: unknown
  try { value = JSON.parse(decoder.decode(plaintext)) } catch { throw new Error('Saved assessment is damaged.') }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Saved assessment is damaged.')
  const bundle = value as SavedAssessmentBundle
  bundleJson(bundle)
  bundle.sharePackage = parseSharePackage(serializeSharePackage(bundle.sharePackage))
  return bundle
}

async function putRecord(storeName: string, value: object): Promise<void> {
  const database = await openDatabase()
  try { const transaction = database.transaction(storeName, 'readwrite'); transaction.objectStore(storeName).put(value); await transactionComplete(transaction) }
  finally { database.close() }
}
async function deleteRecord(storeName: string, id: string): Promise<void> {
  const database = await openDatabase()
  try { const transaction = database.transaction(storeName, 'readwrite'); transaction.objectStore(storeName).delete(id); await transactionComplete(transaction) }
  finally { database.close() }
}
async function allRecords<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase()
  try { return await requestResult(database.transaction(storeName, 'readonly').objectStore(storeName).getAll()) as T[] }
  finally { database.close() }
}

export const saveAssessmentRecord = (record: SavedAssessmentRecord) => putRecord(SAVE_STORE, record)
export const listSavedAssessmentRecords = async () => (await allRecords<SavedAssessmentRecord>(SAVE_STORE)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
export const removeSavedAssessmentRecord = (id: string) => deleteRecord(SAVE_STORE, id)
export const saveHostedShareRecord = (record: HostedShareRecord) => putRecord(SHARE_STORE, record)
export const listHostedShareRecords = async () => (await allRecords<HostedShareRecord>(SHARE_STORE)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
export const removeHostedShareRecord = (id: string) => deleteRecord(SHARE_STORE, id)
