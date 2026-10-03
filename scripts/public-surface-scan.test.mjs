import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const scan = (userName) => spawnSync(process.execPath, ['scripts/public-surface-scan.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, USER: userName, USERNAME: userName },
})

describe('public-surface local username filtering', () => {
  it('ignores the generic GitHub Actions runner identity', () => {
    const result = scan('runner')

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('local usernames: 0')
  })

  it('continues to detect a genuine custom local username', () => {
    const result = scan('someuniquedevname')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('local usernames')
  })
})
