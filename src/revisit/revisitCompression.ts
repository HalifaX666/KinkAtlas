const MIN_MATCH = 4
const MAX_MATCH = 259
const MAX_DISTANCE = 0x10000
const MAX_CANDIDATES = 1024
const PRIMARY_LITERAL_BYTES = new TextEncoder().encode('abcdefghijklmnopqrstuvwxyz ".,:-')
const SECONDARY_LITERAL_BYTES = new TextEncoder().encode('ABCDEFGHIKLMNOPRSTUVWY0123456789')
const primaryLiteralIndex = new Map(Array.from(PRIMARY_LITERAL_BYTES, (value, index) => [value, index]))
const secondaryLiteralIndex = new Map(Array.from(SECONDARY_LITERAL_BYTES, (value, index) => [value, index]))

export class RevisitCompressionError extends Error {
  constructor(readonly code: 'invalid' | 'oversized') {
    super('Invalid Revisit compression')
    this.name = 'RevisitCompressionError'
  }
}

function fail(code: 'invalid' | 'oversized' = 'invalid'): never {
  throw new RevisitCompressionError(code)
}

if (PRIMARY_LITERAL_BYTES.byteLength !== 32 || primaryLiteralIndex.size !== 32
  || SECONDARY_LITERAL_BYTES.byteLength !== 32 || secondaryLiteralIndex.size !== 32) {
  throw new Error('Invalid Revisit compression alphabet')
}

class BitWriter {
  private readonly bytes: number[] = []
  private current = 0
  private bits = 0

  write(value: number, bitCount: number): void {
    for (let bit = bitCount - 1; bit >= 0; bit -= 1) {
      this.current = (this.current << 1) | ((value >>> bit) & 1)
      this.bits += 1
      if (this.bits === 8) {
        this.bytes.push(this.current)
        this.current = 0
        this.bits = 0
      }
    }
  }

  finish(): number[] {
    if (this.bits > 0) this.bytes.push(this.current << (8 - this.bits))
    return this.bytes
  }
}

class BitReader {
  private bitOffset = 0

  constructor(private readonly bytes: Uint8Array, private readonly byteOffset: number) {}

  read(bitCount: number): number {
    if (this.remaining < bitCount) fail()
    let value = 0
    for (let bit = 0; bit < bitCount; bit += 1) {
      const absoluteBit = this.bitOffset + bit
      const byte = this.bytes[this.byteOffset + Math.floor(absoluteBit / 8)]
      value = (value << 1) | ((byte >>> (7 - absoluteBit % 8)) & 1)
    }
    this.bitOffset += bitCount
    return value
  }

  get remaining(): number {
    return (this.bytes.byteLength - this.byteOffset) * 8 - this.bitOffset
  }

  hasOnlyFinalPadding(): boolean {
    if (this.remaining > 7) return false
    while (this.remaining > 0) if (this.read(1) !== 0) return false
    return true
  }
}

function keyAt(input: Uint8Array, offset: number): number | undefined {
  if (offset + 2 >= input.byteLength) return undefined
  return (input[offset] << 16) | (input[offset + 1] << 8) | input[offset + 2]
}

function appendIndex(index: Map<number, number[]>, input: Uint8Array, offset: number): void {
  const key = keyAt(input, offset)
  if (key === undefined) return
  const positions = index.get(key)
  if (positions) positions.push(offset)
  else index.set(key, [offset])
}

function lengthPrefix(length: number): number[] {
  return [length >>> 24, length >>> 16, length >>> 8, length].map((value) => value & 0xff)
}

export function compressRevisitBytes(input: Uint8Array): Uint8Array {
  const writer = new BitWriter()
  const index = new Map<number, number[]>()
  let offset = 0

  while (offset < input.byteLength) {
    const key = keyAt(input, offset)
    const candidates = key === undefined ? undefined : index.get(key)
    let bestLength = 0
    let bestDistance = 0

    if (candidates) {
      const firstCandidate = Math.max(0, candidates.length - MAX_CANDIDATES)
      for (let candidateIndex = candidates.length - 1; candidateIndex >= firstCandidate; candidateIndex -= 1) {
        const candidate = candidates[candidateIndex]
        const distance = offset - candidate
        if (distance > MAX_DISTANCE) break
        let length = 0
        const limit = Math.min(MAX_MATCH, input.byteLength - offset)
        while (length < limit && input[candidate + length] === input[offset + length]) length += 1
        if (length > bestLength) {
          bestLength = length
          bestDistance = distance
          if (length === limit) break
        }
      }
    }

    if (bestLength >= MIN_MATCH) {
      if (bestLength <= 67 && bestDistance <= 256) {
        writer.write(0b1110, 4)
        writer.write(bestLength - MIN_MATCH, 6)
        writer.write(bestDistance - 1, 8)
      } else if (bestLength <= 67 && bestDistance <= 4096) {
        writer.write(0b11110, 5)
        writer.write(bestLength - MIN_MATCH, 6)
        writer.write(bestDistance - 1, 12)
      } else {
        writer.write(0b11111, 5)
        writer.write(bestLength - MIN_MATCH, 8)
        writer.write(bestDistance - 1, 16)
      }
      for (let indexOffset = 0; indexOffset < bestLength; indexOffset += 1) appendIndex(index, input, offset + indexOffset)
      offset += bestLength
    } else {
      const value = input[offset]
      const primaryIndex = primaryLiteralIndex.get(value)
      const secondaryIndex = secondaryLiteralIndex.get(value)
      if (primaryIndex !== undefined) {
        writer.write(primaryIndex, 6)
      } else if (secondaryIndex !== undefined) {
        writer.write(0b10, 2)
        writer.write(secondaryIndex, 5)
      } else {
        writer.write(0b110, 3)
        writer.write(value, 8)
      }
      appendIndex(index, input, offset)
      offset += 1
    }
  }

  return Uint8Array.from([...lengthPrefix(input.byteLength), ...writer.finish()])
}

export function decompressRevisitBytes(input: Uint8Array, outputLimit: number): Uint8Array {
  if (input.byteLength < 5) fail()
  const outputLength = (((input[0] * 0x1000000) + (input[1] << 16) + (input[2] << 8) + input[3]) >>> 0)
  if (outputLength === 0) fail()
  if (outputLength > outputLimit) fail('oversized')
  const reader = new BitReader(input, 4)
  const output: number[] = []

  while (output.length < outputLength) {
    const first = reader.read(1)
    if (first === 0) {
      output.push(PRIMARY_LITERAL_BYTES[reader.read(5)])
      continue
    }

    const second = reader.read(1)
    if (second === 0) {
      output.push(SECONDARY_LITERAL_BYTES[reader.read(5)])
      continue
    }

    const third = reader.read(1)
    if (third === 0) {
      output.push(reader.read(8))
      continue
    }

    const fourth = reader.read(1)
    const medium = fourth === 1 && reader.read(1) === 0
    const short = fourth === 0
    const length = reader.read(short || medium ? 6 : 8) + MIN_MATCH
    const distance = reader.read(short ? 8 : medium ? 12 : 16) + 1
    if (distance > output.length || output.length + length > outputLength) fail()
    for (let index = 0; index < length; index += 1) output.push(output[output.length - distance])
  }

  if (!reader.hasOnlyFinalPadding()) fail()
  return Uint8Array.from(output)
}
