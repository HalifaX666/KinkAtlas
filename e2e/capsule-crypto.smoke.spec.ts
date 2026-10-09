import { expect, test } from '@playwright/test'
import { installBrowserGuards } from './support/browserGuards'

test('Secret Capsule primitives round trip in the browser', async ({ page }) => {
  const guards = await installBrowserGuards(page)
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const codecPath = '/src/capsules/capsuleCodec.ts'
    const schemaPath = '/src/capsules/capsuleSchema.ts'
    const typesPath = '/src/capsules/capsuleTypes.ts'
    const codec = await import(codecPath)
    const schema = await import(schemaPath)
    const types = await import(typesPath)
    const payload = {
      payloadType: 'shared-disclosure',
      ...schema.createCurrentPayloadContext(),
      disclosureManifest: { ...types.SHARED_DISCLOSURE_DEFAULTS },
      sections: {
        currentRoleSet: [{ roleId: 'role:browser-fixture', label: 'Browser Fixture', primary: true }],
        roleDefinitions: [{ roleId: 'role:browser-fixture', definition: 'Synthetic browser compatibility data.' }],
      },
    }
    const envelopes = []
    const openedPayloadTypes = []
    for (const compression of ['gzip', 'none']) {
      const envelope = await codec.createSecretCapsule(payload, 'synthetic-browser-capsule-secret', {
        compression,
        iterations: schema.CAPSULE_LIMITS.pbkdf2IterationsMin,
      })
      envelopes.push(envelope)
      openedPayloadTypes.push((await codec.openSecretCapsule(envelope, 'synthetic-browser-capsule-secret')).payloadType)
    }
    let wrongSecretError
    try {
      await codec.openSecretCapsule(envelopes[0], 'different-browser-capsule-secret')
    } catch (error) {
      wrongSecretError = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
    }
    return {
      cryptoAvailable: Boolean(globalThis.crypto?.subtle),
      compressionAvailable: typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined',
      openedPayloadTypes,
      compressionModes: envelopes.map((envelope) => envelope.compression),
      saltBytes: schema.decodeBase64Url(envelopes[0].salt).byteLength,
      ivBytes: schema.decodeBase64Url(envelopes[0].iv).byteLength,
      suite: envelopes[0].suite,
      kdf: envelopes[0].kdf.algorithm,
      wrongSecretError,
    }
  })

  expect(result.cryptoAvailable).toBe(true)
  expect(result.compressionAvailable).toBe(true)
  expect(result.saltBytes).toBe(16)
  expect(result.ivBytes).toBe(12)
  expect(result.openedPayloadTypes).toEqual(['shared-disclosure', 'shared-disclosure'])
  expect(result.compressionModes).toEqual(['gzip', 'none'])
  expect(result.suite).toBe('PBKDF2-HMAC-SHA-256+A256GCM')
  expect(result.kdf).toBe('PBKDF2-HMAC-SHA-256')
  expect(result.wrongSecretError).toBe('authentication-failed')
  await guards.assertClean()
})
