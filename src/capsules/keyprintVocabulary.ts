import bip39EnglishV1Text from './keyprint-vocabulary/bip39-en-v1.txt?raw'

export const VIEWER_KEYPRINT_VOCABULARY_VERSION = 'bip39-en-v1' as const
export const VIEWER_KEYPRINT_WORD_COUNT = 2048 as const
export const VIEWER_KEYPRINT_COMPARISON_BITS = 44 as const

const lines = bip39EnglishV1Text.split('\n')
if (lines.at(-1) !== '') throw new Error('Keyprint vocabulary must retain its canonical trailing newline.')
lines.pop()

if (lines.length !== VIEWER_KEYPRINT_WORD_COUNT
  || new Set(lines).size !== VIEWER_KEYPRINT_WORD_COUNT
  || lines.some((word) => !/^[a-z]+$/u.test(word))) {
  throw new Error('Keyprint vocabulary integrity check failed.')
}

export const viewerKeyprintVocabulary: readonly string[] = Object.freeze(lines)

export type ViewerWordKeyprint = Readonly<{
  vocabularyVersion: typeof VIEWER_KEYPRINT_VOCABULARY_VERSION
  indexes: readonly [number, number, number, number]
  words: readonly [string, string, string, string]
  phrase: string
}>

export function deriveViewerKeyprintWordIndexes(fingerprint: Uint8Array): readonly [number, number, number, number] {
  if (fingerprint.byteLength !== 32) throw new TypeError('Viewer Keyprint fingerprint must contain 32 bytes.')

  // Network order (MSB first): digest bits 0-10, 11-21, 22-32, and 33-43.
  return Object.freeze([
    (fingerprint[0] << 3) | (fingerprint[1] >>> 5),
    ((fingerprint[1] & 0x1f) << 6) | (fingerprint[2] >>> 2),
    ((fingerprint[2] & 0x03) << 9) | (fingerprint[3] << 1) | (fingerprint[4] >>> 7),
    ((fingerprint[4] & 0x7f) << 4) | (fingerprint[5] >>> 4),
  ] as const)
}

export function deriveViewerWordKeyprint(fingerprint: Uint8Array): ViewerWordKeyprint {
  const indexes = deriveViewerKeyprintWordIndexes(fingerprint)
  const words = Object.freeze(indexes.map((index) => viewerKeyprintVocabulary[index])) as unknown as readonly [string, string, string, string]
  return Object.freeze({
    vocabularyVersion: VIEWER_KEYPRINT_VOCABULARY_VERSION,
    indexes,
    words,
    phrase: words.join(' '),
  })
}

export function deriveViewerWordKeyprintFromHex(fingerprint: string): ViewerWordKeyprint {
  if (!/^[0-9A-F]{64}$/u.test(fingerprint)) throw new TypeError('Viewer Keyprint fingerprint must be canonical uppercase hexadecimal.')
  const bytes = Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(fingerprint.slice(index * 2, index * 2 + 2), 16))
  return deriveViewerWordKeyprint(bytes)
}
