import { expect, type Locator } from '@playwright/test'
import jsQR from 'jsqr'

export async function expectQrRoundTrip(qr: Locator, expectedText: string) {
  const [viewBox, path, version, modules, bytes, ecc] = await Promise.all([
    qr.getAttribute('viewBox'),
    qr.locator('path').getAttribute('d'),
    qr.getAttribute('data-qr-version'),
    qr.getAttribute('data-qr-modules'),
    qr.getAttribute('data-qr-bytes'),
    qr.getAttribute('data-qr-ecc'),
  ])
  const size = Number(modules)
  expect(viewBox).toBe(`0 0 ${size} ${size}`)
  expect(ecc).toBe('M')
  expect(Number(version)).toBeLessThanOrEqual(19)
  expect(Number(bytes)).toBe(new TextEncoder().encode(expectedText).byteLength)

  const matrix = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  for (const match of path?.matchAll(/M(\d+) (\d+)h1v1h-1z/gu) ?? []) {
    matrix[Number(match[2])][Number(match[1])] = true
  }
  const scale = 5
  const width = size * scale
  const pixels = new Uint8ClampedArray(width * width * 4)
  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = matrix[Math.floor(y / scale)][Math.floor(x / scale)] ? 0 : 255
      const offset = ((y * width) + x) * 4
      pixels[offset] = value
      pixels[offset + 1] = value
      pixels[offset + 2] = value
      pixels[offset + 3] = 255
    }
  }
  expect(jsQR(pixels, width, width)?.data).toBe(expectedText)
  return { version: Number(version), modules: size, bytes: Number(bytes), path }
}
