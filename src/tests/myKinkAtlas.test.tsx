import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentProvider } from '../context/AssessmentContext'
import { MyKinkAtlasPage } from '../pages/MyKinkAtlasPage'

vi.mock('../sharing/localVault', async () => {
  const actual = await vi.importActual<typeof import('../sharing/localVault')>('../sharing/localVault')
  return {
    ...actual,
    listSavedAssessmentRecords: vi.fn(async () => [{
      id: 'AAAAAAAAAAAAAAAAAAAAAA',
      createdAt: '2026-10-28T12:00:00.000Z',
      deleteToken: 'local-delete-capability',
      name: 'My saved map',
    }]),
  }
})

describe('My KinkAtlas presentation', () => {
  it('gives saved assessments a clear action hierarchy without loading private content automatically', async () => {
    render(<MemoryRouter><AssessmentProvider><MyKinkAtlasPage /></AssessmentProvider></MemoryRouter>)

    expect(await screen.findByText('My saved map')).toBeVisible()
    expect(screen.getByText(/Encrypted assessment/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveClass('button', 'primary')
    expect(screen.getByRole('button', { name: 'Rename' })).toHaveClass('quiet-button')
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('quiet-button', 'danger-text')
    expect(screen.queryByText('Saved assessment preview')).not.toBeInTheDocument()
  })
})
