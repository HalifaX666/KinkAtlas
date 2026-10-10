import { CapsuleError } from './capsuleError'
import type { ViewerRequest } from './capsuleTypes'
import { generateViewerRequestKeyPair, validateViewerRequest } from './viewerRequest'

const DATABASE_NAME = 'kinkatlas-viewer-requests'
const STORE_NAME = 'viewer-requests'
const DATABASE_VERSION = 1
const LABEL_LIMIT = 120

export interface StoredViewerRequest {
  requestId: string
  createdAt: string
  label?: string
  request: ViewerRequest
  privateKey: CryptoKey
}

export const viewerRequestStorageRecordFields = Object.freeze([
  'requestId',
  'createdAt',
  'label',
  'request',
  'privateKey',
] as const)

function storageError(): CapsuleError {
  return new CapsuleError('key-storage-unavailable')
}

function requireIndexedDb(): IDBFactory {
  if (!globalThis.indexedDB) throw storageError()
  return globalThis.indexedDB
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest
    try {
      request = requireIndexedDb().open(DATABASE_NAME, DATABASE_VERSION)
    } catch {
      reject(storageError())
      return
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'requestId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(storageError())
    request.onblocked = () => reject(storageError())
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(storageError())
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(storageError())
    transaction.onabort = () => reject(storageError())
  })
}

function validPrivateKey(value: unknown): value is CryptoKey {
  if (typeof value !== 'object' || value === null) return false
  const key = value as CryptoKey
  const algorithm = key.algorithm as EcKeyAlgorithm | undefined
  return key.type === 'private'
    && key.extractable === false
    && algorithm?.name === 'ECDH'
    && algorithm.namedCurve === 'P-256'
    && key.usages.includes('deriveBits')
}

async function validateStoredRecord(value: unknown): Promise<StoredViewerRequest> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw storageError()
  const record = value as Partial<StoredViewerRequest>
  if (typeof record.requestId !== 'string'
    || typeof record.createdAt !== 'string'
    || (record.label !== undefined && (typeof record.label !== 'string' || record.label.length > LABEL_LIMIT))
    || !record.request
    || !validPrivateKey(record.privateKey)) {
    throw storageError()
  }
  const request = await validateViewerRequest(record.request)
  if (record.requestId !== request.requestId) throw storageError()
  return { ...record, request } as StoredViewerRequest
}

function cleanLabel(label?: string): string | undefined {
  const cleaned = label?.trim()
  if (!cleaned) return undefined
  if (cleaned.length > LABEL_LIMIT) throw new CapsuleError('viewer-request-invalid')
  return cleaned
}

export async function createStoredViewerRequest(label?: string): Promise<StoredViewerRequest> {
  const generated = await generateViewerRequestKeyPair()
  const cleanedLabel = cleanLabel(label)
  const record: StoredViewerRequest = {
    requestId: generated.request.requestId,
    createdAt: new Date().toISOString(),
    ...(cleanedLabel ? { label: cleanedLabel } : {}),
    request: generated.request,
    privateKey: generated.privateKey,
  }
  if (record.privateKey.extractable) throw new CapsuleError('unsupported-algorithm')
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).add(record)
    await transactionComplete(transaction)
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw storageError()
  } finally {
    database.close()
  }
  return record
}

export async function getStoredViewerRequest(requestId: string): Promise<StoredViewerRequest | null> {
  const database = await openDatabase()
  try {
    const value = await requestResult(database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(requestId))
    return value === undefined ? null : validateStoredRecord(value)
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw storageError()
  } finally {
    database.close()
  }
}

export async function listStoredViewerRequests(): Promise<StoredViewerRequest[]> {
  const database = await openDatabase()
  try {
    const values = await requestResult(database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll())
    const records = await Promise.all(values.map(validateStoredRecord))
    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw storageError()
  } finally {
    database.close()
  }
}

export async function deleteStoredViewerRequest(requestId: string): Promise<void> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(requestId)
    await transactionComplete(transaction)
  } catch (error) {
    if (error instanceof CapsuleError) throw error
    throw storageError()
  } finally {
    database.close()
  }
}
