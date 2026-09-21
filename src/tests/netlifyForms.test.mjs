import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const formPath = resolve(process.cwd(), 'public/__forms.html')

describe('Netlify Contact form definition', () => {
  it('keeps the build-time Contact form aligned with the React field contract', () => {
    expect(existsSync(formPath)).toBe(true)
    const markup = readFileSync(formPath, 'utf8')

    expect(markup).toMatch(/<form[^>]*name="contact"[^>]*method="POST"[^>]*data-netlify="true"[^>]*netlify-honeypot="website"[^>]*hidden/)
    for (const field of ['form-name', 'name', 'email', 'topic', 'message', 'website']) expect(markup).toMatch(new RegExp(`name="${field}"`))
    for (const topic of ['General question or feedback', 'Bug report', 'Accessibility', 'Privacy', 'Press / collaboration']) expect(markup).toContain(`>${topic}</option>`)
    expect(markup).not.toMatch(/assessment|readiness|boundary|recommendation|blind spot/i)
  })
})
