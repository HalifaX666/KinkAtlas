import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SharedResultView } from '../components/SharedResultView'
import { useAssessment } from '../context/AssessmentContext'
import { createHostedContent, deleteHostedContent, getHostedContent, hostedShareUrl } from '../sharing/hostedStorage'
import type { SavedAssessmentBundle, SavedAssessmentEnvelope } from '../sharing/hostedContracts'
import {
  decryptSavedAssessment,
  getOrCreateVaultKey,
  saveHostedShareRecord,
  listSavedAssessmentRecords,
  removeSavedAssessmentRecord,
  saveAssessmentRecord,
  type SavedAssessmentRecord,
} from '../sharing/localVault'

export function MyKinkAtlasPage() {
  const [records, setRecords] = useState<SavedAssessmentRecord[]>([])
  const [selected, setSelected] = useState<{ record: SavedAssessmentRecord; bundle: SavedAssessmentBundle } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const previewHeading = useRef<HTMLHeadingElement>(null)
  const { hasMeaningfulSession, hydratePrivateRestoreState } = useAssessment()
  const navigate = useNavigate()

  const reload = async () => setRecords(await listSavedAssessmentRecords())
  useEffect(() => { void reload().catch(() => setStatus('Saved assessments are unavailable in this browser.')) }, [])
  useEffect(() => { if (selected) previewHeading.current?.focus() }, [selected])

  const open = async (record: SavedAssessmentRecord) => {
    setBusy(true); setStatus('')
    try {
      const envelope = await getHostedContent<SavedAssessmentEnvelope>('saved-assessment', record.id)
      const bundle = await decryptSavedAssessment(envelope, await getOrCreateVaultKey())
      setSelected({ record, bundle }); setStatus('Saved assessment opened as a preview. Current work has not been replaced.')
    } catch { setStatus('This saved assessment could not be opened in this browser.') }
    finally { setBusy(false) }
  }

  const restore = async () => {
    if (!selected) return
    setBusy(true); setStatus('')
    try {
      const mode = await hydratePrivateRestoreState(selected.bundle.restore)
      setStatus(mode === 'full' ? 'Saved assessment restored.' : 'Historical result opened without rescoring incompatible answers.')
      if (mode === 'full') navigate('/results')
    } catch { setStatus('The saved assessment could not replace the current session.') }
    finally { setBusy(false) }
  }

  const share = async () => {
    if (!selected) return
    setBusy(true); setStatus(''); setShareUrl('')
    try {
      const created = await createHostedContent('quick-share', selected.bundle.sharePackage)
      const url = hostedShareUrl('quick-share', created.id)
      await saveHostedShareRecord({ ...created, kind: 'quick-share', url })
      setShareUrl(url); setStatus('Quick Share Link created. Anyone with this link can view the shared result.')
    } catch { setStatus('The share could not be created. The saved assessment was not changed.') }
    finally { setBusy(false) }
  }

  const remove = async (record: SavedAssessmentRecord) => {
    setBusy(true); setStatus('')
    try {
      await deleteHostedContent('saved-assessment', record.id, record.deleteToken)
      await removeSavedAssessmentRecord(record.id)
      setSelected((current) => current?.record.id === record.id ? null : current)
      setConfirmDelete(null); await reload(); setStatus('Saved assessment deleted. Copies previously downloaded or shared cannot be recalled.')
    } catch { setStatus('The saved assessment could not be deleted.') }
    finally { setBusy(false) }
  }

  const rename = async (record: SavedAssessmentRecord) => {
    const cleaned = name.trim().slice(0, 120)
    const updated = { ...record }
    if (cleaned) updated.name = cleaned
    else delete updated.name
    await saveAssessmentRecord(updated)
    setRenaming(null); setName(''); await reload(); setStatus('Saved assessment renamed on this browser.')
  }

  return <div className="section page-width my-kinkatlas">
    <div className="section-heading"><span className="eyebrow">My KinkAtlas</span><h1>Saved assessments</h1><p>Saved assessments are encrypted before upload and available only with this browser’s local vault key. KinkAtlas does not save assessments automatically.</p></div>
    {!records.length ? <div className="empty-panel"><p>No assessments have been explicitly saved on this browser.</p><Link className="button primary" to="/assessment">Start exploring</Link></div> : <ul className="saved-assessment-list">{records.map((record) => <li key={record.id}>
      <div><strong>{record.name ?? 'Saved KinkAtlas assessment'}</strong><span>{new Date(record.createdAt).toLocaleString()}</span></div>
      <div className="share-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => void open(record)}>Open</button><button className="quiet-button" type="button" onClick={() => { setRenaming(record.id); setName(record.name ?? '') }}>Rename</button><button className="quiet-button" type="button" onClick={() => setConfirmDelete(record.id)}>Delete</button></div>
      {renaming === record.id && <div className="saved-inline-action"><label><span>Saved name</span><input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label><button className="button secondary" type="button" onClick={() => void rename(record)}>Save name</button><button className="quiet-button" type="button" onClick={() => setRenaming(null)}>Cancel</button></div>}
      {confirmDelete === record.id && <div className="saved-inline-action" role="alert"><p>Delete this hosted encrypted assessment? This cannot recall copies already made.</p><button className="button primary" type="button" disabled={busy} onClick={() => void remove(record)}>Confirm delete</button><button className="quiet-button" type="button" onClick={() => setConfirmDelete(null)}>Cancel</button></div>}
    </li>)}</ul>}
    <p className="share-status" role="status" aria-live="polite">{status}</p>
    {selected && <section className="saved-assessment-preview" aria-labelledby="saved-preview-heading"><h2 id="saved-preview-heading" ref={previewHeading} tabIndex={-1}>Saved assessment preview</h2><p>Review the historical cards and result before replacing current in-memory work.</p>{hasMeaningfulSession && <p className="safety-disclaimer"><strong>Current work warning:</strong> confirmation can replace the assessment currently held in this tab.</p>}<div className="share-actions"><button className="button primary" type="button" disabled={busy} onClick={() => void restore()}>Confirm and open assessment</button><button className="button secondary" type="button" disabled={busy} onClick={() => void share()}>Share</button></div>{shareUrl && <label className="saved-share-link"><span>Quick Share Link</span><input readOnly value={shareUrl} /></label>}<SharedResultView sharePackage={selected.bundle.sharePackage} /></section>}
  </div>
}
