// @vitest-environment node

import { describe, expect, it } from 'vitest'
import bip39EnglishV1Text from '../capsules/keyprint-vocabulary/bip39-en-v1.txt?raw'
import {
  deriveViewerKeyprintWordIndexes,
  deriveViewerWordKeyprint,
  VIEWER_KEYPRINT_COMPARISON_BITS,
  VIEWER_KEYPRINT_VOCABULARY_VERSION,
  VIEWER_KEYPRINT_WORD_COUNT,
  viewerKeyprintVocabulary,
} from '../capsules/keyprintVocabulary'
import { encodeBase64Url } from '../capsules/capsuleSchema'
import type { ViewerRequest } from '../capsules/capsuleTypes'
import { fingerprintViewerPublicKey, serializeViewerRequest, validateViewerRequest } from '../capsules/viewerRequest'

const RAW_PUBLIC_KEY_HEX = '046B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C2964FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5'
const EXPECTED_FINGERPRINT = '564E1828919E2B83C0CDA4F6319AF221D8E3F2C4EE6E784D74C99DC2AED25E1C'
const EXPECTED_FIRST_44_BITS = '564E1828919'
const EXPECTED_INDEXES = [690, 902, 81, 281] as const
const EXPECTED_WORDS = ['film', 'ignore', 'any', 'case'] as const

function bytesFromHex(value: string): Uint8Array {
  return Uint8Array.from({ length: value.length / 2 }, (_, index) => Number.parseInt(value.slice(index * 2, index * 2 + 2), 16))
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
}

describe('Four-Word Keyprint vocabulary', () => {
  it('locks the exact ordered upstream bytes and normalized representation', async () => {
    expect(bip39EnglishV1Text.endsWith('\n')).toBe(true)
    expect(bip39EnglishV1Text.endsWith('\n\n')).toBe(false)
    expect(await sha256(bip39EnglishV1Text)).toBe('2F5EED53A4727B4BF8880D8F3F199EFC90E58503646D9FF8EFF3A2ED3B24DBDA')
    expect(await sha256(viewerKeyprintVocabulary.join('\n'))).toBe('187DB04A869DD9BC7BE80D21A86497D692C0DB6ABD3AA8CB6BE5D618FF757FAE')
  })

  it('contains exactly 2,048 unique canonical lowercase words in stable positions', () => {
    expect(VIEWER_KEYPRINT_VOCABULARY_VERSION).toBe('bip39-en-v1')
    expect(VIEWER_KEYPRINT_WORD_COUNT).toBe(2048)
    expect(VIEWER_KEYPRINT_COMPARISON_BITS).toBe(44)
    expect(Object.isFrozen(viewerKeyprintVocabulary)).toBe(true)
    expect(viewerKeyprintVocabulary).toHaveLength(2048)
    expect(new Set(viewerKeyprintVocabulary).size).toBe(2048)
    expect(viewerKeyprintVocabulary.every((word) => /^[a-z]+$/u.test(word) && word === word.trim())).toBe(true)
    expect(viewerKeyprintVocabulary[0]).toBe('abandon')
    expect(viewerKeyprintVocabulary[511]).toBe('divide')
    expect(viewerKeyprintVocabulary[1023]).toBe('lend')
    expect(viewerKeyprintVocabulary[1024]).toBe('length')
    expect(viewerKeyprintVocabulary[2047]).toBe('zoo')
    expect(deriveViewerKeyprintWordIndexes(new Uint8Array(32))).toEqual([0, 0, 0, 0])
    expect(deriveViewerKeyprintWordIndexes(new Uint8Array(32).fill(0xff))).toEqual([2047, 2047, 2047, 2047])
  })

  it('locks the public-key fingerprint, 44-bit extraction, indexes, words, and comparison code', async () => {
    const rawPublicKey = bytesFromHex(RAW_PUBLIC_KEY_HEX)
    const fingerprint = await fingerprintViewerPublicKey(rawPublicKey)
    const fingerprintHex = [...fingerprint].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
    const wordKeyprint = deriveViewerWordKeyprint(fingerprint)
    const packedIndexes = wordKeyprint.indexes.reduce((value, index) => (value << 11n) | BigInt(index), 0n)

    expect(fingerprintHex).toBe(EXPECTED_FINGERPRINT)
    expect(fingerprintHex.slice(0, 11)).toBe(EXPECTED_FIRST_44_BITS)
    expect(packedIndexes.toString(16).toUpperCase().padStart(11, '0')).toBe(EXPECTED_FIRST_44_BITS)
    expect(wordKeyprint.indexes).toEqual(EXPECTED_INDEXES)
    expect(wordKeyprint.words).toEqual(EXPECTED_WORDS)
    expect(Object.isFrozen(wordKeyprint)).toBe(true)
    expect(Object.isFrozen(wordKeyprint.indexes)).toBe(true)
    expect(Object.isFrozen(wordKeyprint.words)).toBe(true)
    expect(wordKeyprint.phrase).toBe('film ignore any case')
    expect(`${fingerprintHex.slice(0, 4)}-${fingerprintHex.slice(4, 8)}-${fingerprintHex.slice(8, 11)}`).toBe('564E-1828-919')
  })

  it('adds words locally to a pre-I.7 Viewer Request without changing its v1 schema', async () => {
    const rawPublicKey = bytesFromHex(RAW_PUBLIC_KEY_HEX)
    const legacyRequest: ViewerRequest = {
      magic: 'kinkatlas-viewer-request',
      viewerRequestVersion: 1,
      requestId: encodeBase64Url(new Uint8Array(16)),
      suite: 'ECDH-P256+HKDF-SHA-256+A256GCM',
      recipientPublicKey: encodeBase64Url(rawPublicKey),
      keyprint: {
        version: 1,
        short: '564E-1828-919',
        checksum: '39',
        fingerprint: EXPECTED_FINGERPRINT,
      },
    }

    const validated = await validateViewerRequest(legacyRequest)
    const serialized = await serializeViewerRequest(validated)
    expect(deriveViewerWordKeyprint(await fingerprintViewerPublicKey(rawPublicKey)).phrase).toBe('film ignore any case')
    expect(serialized).not.toMatch(/word|phrase|vocabulary|label/iu)
    expect(JSON.parse(serialized)).toEqual(legacyRequest)
  })
})
