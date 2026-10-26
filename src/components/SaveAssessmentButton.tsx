import { Save } from 'lucide-react'
import { useState } from 'react'
import { createHostedContent } from '../sharing/hostedStorage'
import { encryptSavedAssessment, getOrCreateVaultKey, saveAssessmentRecord } from '../sharing/localVault'
import type { SavedAssessmentBundle } from '../sharing/hostedContracts'
import { Link } from 'react-router-dom'

export function SaveAssessmentButton({ createBundle, disabled = false }: { createBundle: () => SavedAssessmentBundle; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('')

  const save = async () => {
    setBusy(true); setStatus('')
    try {
      const key = await getOrCreateVaultKey()
      const envelope = await encryptSavedAssessment(createBundle(), key)
      const created = await createHostedContent('saved-assessment', envelope)
      await saveAssessmentRecord({ id: created.id, createdAt: created.createdAt, deleteToken: created.deleteToken })
      setSaved(true); setStatus('Assessment saved. It is encrypted and available from My KinkAtlas on this browser.')
    } catch { setStatus('The assessment could not be saved. Your current in-memory assessment was not changed.') }
    finally { setBusy(false) }
  }

  return <div className="save-assessment-action">
    <button className="button primary" type="button" disabled={disabled || busy || saved} onClick={() => void save()}><Save size={18} />{busy ? 'Saving…' : saved ? 'Assessment saved' : 'Save my assessment'}</button>
    {saved && <Link className="quiet-button" to="/my-kinkatlas">Open My KinkAtlas</Link>}
    {status && <p className="share-status" role="status" aria-live="polite">{status}</p>}
  </div>
}
