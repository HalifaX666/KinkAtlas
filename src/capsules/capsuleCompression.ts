import { CapsuleError, isCapsuleError } from './capsuleError'
import type { CapsuleCompression } from './capsuleTypes'

function exactBuffer(value: Uint8Array): ArrayBuffer {
  return Uint8Array.from(value).buffer
}

function compressionConstructor(mode: 'compress' | 'decompress'):
  | typeof CompressionStream
  | typeof DecompressionStream {
  const constructor = mode === 'compress' ? globalThis.CompressionStream : globalThis.DecompressionStream
  if (!constructor) throw new CapsuleError('unsupported-algorithm')
  return constructor
}

export async function compressCapsuleBytes(input: Uint8Array, compression: CapsuleCompression): Promise<Uint8Array> {
  if (compression === 'none') return Uint8Array.from(input)
  try {
    const Compressor = compressionConstructor('compress') as typeof CompressionStream
    const stream = new Blob([exactBuffer(input)]).stream().pipeThrough(new Compressor('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch (error) {
    if (isCapsuleError(error)) throw error
    throw new CapsuleError('compression-failed')
  }
}

export async function decompressCapsuleBytes(
  input: Uint8Array,
  compression: CapsuleCompression,
  outputLimit: number,
): Promise<Uint8Array> {
  if (compression === 'none') {
    if (input.byteLength > outputLimit) throw new CapsuleError('oversized-input')
    return Uint8Array.from(input)
  }
  try {
    const Decompressor = compressionConstructor('decompress') as typeof DecompressionStream
    const stream = new Blob([exactBuffer(input)]).stream().pipeThrough(new Decompressor('gzip'))
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const result = await reader.read()
      if (result.done) break
      const chunk = result.value
      size += chunk.byteLength
      if (size > outputLimit) {
        await reader.cancel()
        throw new CapsuleError('oversized-input')
      }
      chunks.push(chunk)
    }
    const output = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      output.set(chunk, offset)
      offset += chunk.byteLength
    }
    return output
  } catch (error) {
    if (isCapsuleError(error)) throw error
    throw new CapsuleError('compression-failed')
  }
}
