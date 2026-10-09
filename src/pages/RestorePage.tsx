import { Copy, Download, FileKey2, LockKeyhole, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { HistoricalResultView } from '../components/HistoricalResultView'
import { useAssessment } from '../context/AssessmentContext'
import { buildPrivateRestoreState, restoreRevisionStatus, type PrivateRestoreState } from '../capsules/capsuleData'
import {
  capsuleErrorMessage,
  createPrivateRestoreArtifact,
  decryptPrivateRestore,
  downloadCapsuleFile,
  readCapsuleFile,
  type EncryptedCapsuleArtifact,
} from '../capsules/capsuleTransport'

async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
  await navigator.clipboard.writeText(value)
}

export function RestorePage() {
  const {
    answers,
    assessmentNavigation,
    currentRoleSet,
    completionRequested,
    historicalResultSnapshot,
    hasMeaningfulSession,
    hydratePrivateRestoreState,
  } = useAssessment()
  const [artifact, setArtifact] = useState<EncryptedCapsuleArtifact | null>(null)
  const [selectedEnvelope, setSelectedEnvelope] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [secret, setSecret] = useState('')
  const [pendingRestore, setPendingRestore] = useState<PrivateRestoreState | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewHeadingRef = useRef<HTMLHeadingElement>(null)

  const preview = useMemo(() => pendingRestore ? {
    answers: Object.values(pendingRestore.answers).reduce((sum, section) => sum + Object.keys(section).length, 0),
    roles: pendingRestore.currentRoleSet?.length ?? 0,
    hasSnapshot: pendingRestore.resultSnapshot !== null,
    mode: restoreRevisionStatus(pendingRestore),
  } : null, [pendingRestore])

  useEffect(() => {
    if (pendingRestore) previewHeadingRef.current?.focus()
  }, [pendingRestore])

  const createBackup = async () => {
    setBusy(true); setStatus('')
    try {
      const state = buildPrivateRestoreState({
        answers,
        navigation: assessmentNavigation,
        currentRoleSet,
        historicalResultSnapshot,
        completionRequested,
      })
      setArtifact(await createPrivateRestoreArtifact(state))
      setStatus('Encrypted restore file created locally. Save the file and secret separately.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const selectFile = async (file?: File) => {
    setPendingRestore(null); setSelectedEnvelope(''); setSelectedFileName(''); setStatus('')
    if (!file) return
    try {
      setSelectedEnvelope(await readCapsuleFile(file))
      setSelectedFileName(file.name)
      setStatus('Encrypted file validated. Enter its separately stored secret to unlock a preview.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    }
  }

  const unlockPreview = async () => {
    setBusy(true); setPendingRestore(null); setStatus('')
    try {
      const restored = await decryptPrivateRestore(selectedEnvelope, secret)
      setPendingRestore(restored)
      setStatus('Restore preview unlocked locally. Nothing has been replaced yet.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const confirmRestore = async () => {
    if (!pendingRestore) return
    setBusy(true); setStatus('')
    try {
      const mode = await hydratePrivateRestoreState(pendingRestore)
      setPendingRestore(null); setSecret('')
      setStatus(mode === 'full'
        ? 'Restore complete. The saved assessment replaced the previous in-memory session.'
        : 'Historical result restored. Its older revisions were not silently rescored or loaded into the current assessment engine.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return <div className="section page-width private-capsule-page">
    <div className="section-heading">
      <span className="eyebrow">Private Restore</span>
      <h1>Back up or restore your private session</h1>
      <p>Restore files can contain sensitive assessment answers. Encryption and restore happen locally in this browser; KinkAtlas does not upload the file, answers, result, or secret.</p>
    </div>

    <div className="capsule-panel-grid">
      <section className="capsule-panel" aria-labelledby="create-restore-heading">
        <FileKey2 aria-hidden="true" />
        <h2 id="create-restore-heading">Create a Private Restore file</h2>
        <p>This encrypted backup can preserve raw answers, assessment navigation, your edited role set, and a historical result snapshot.</p>
        <button className="button primary" type="button" disabled={!hasMeaningfulSession || busy} onClick={createBackup}>Create encrypted restore</button>
        {!hasMeaningfulSession && <small>Begin an assessment before creating a restore file.</small>}
        {artifact && <div className="capsule-artifact" aria-label="Generated restore secret">
          <strong>Save this secret separately</strong>
          <code>{artifact.secret}</code>
          <p>KinkAtlas cannot recover a lost secret. Anyone with both the file and secret can read its contents.</p>
          <div className="share-actions">
            <button className="button secondary" type="button" onClick={() => void copyText(artifact.secret).then(() => setStatus('Restore secret copied.')).catch(() => setStatus('Copy is unavailable; select the secret manually.'))}><Copy size={17} />Copy secret</button>
            <button className="button secondary" type="button" onClick={() => downloadCapsuleFile(artifact.file)}><Download size={17} />Download restore file</button>
          </div>
        </div>}
      </section>

      <section className="capsule-panel" aria-labelledby="import-restore-heading">
        <Upload aria-hidden="true" />
        <h2 id="import-restore-heading">Restore from an encrypted file</h2>
        <p>Selecting a file does not replace anything. You will unlock a preview and explicitly confirm before current in-memory work changes.</p>
        <label className="capsule-file-input"><span>Private Restore file</span><input ref={fileInputRef} type="file" accept=".kinkatlas-restore,application/vnd.kinkatlas.restore" onChange={(event) => void selectFile(event.target.files?.[0])} /></label>
        {selectedFileName && <p><strong>Selected:</strong> {selectedFileName}</p>}
        <label><span>Restore secret</span><input type="password" autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
        <button className="button primary" type="button" disabled={!selectedEnvelope || !secret || busy} onClick={unlockPreview}><LockKeyhole size={17} />Unlock preview</button>
      </section>
    </div>

    {preview && pendingRestore && <section className="capsule-preview" aria-labelledby="restore-preview-heading">
      <h2 id="restore-preview-heading" ref={previewHeadingRef} tabIndex={-1}>Restore preview</h2>
      <ul><li>{preview.answers} saved answers</li><li>{preview.roles} roles in the saved Current Role Set</li><li>{preview.hasSnapshot ? 'Historical result included' : 'No historical result included'}</li></ul>
      {preview.mode === 'historical-only' && <p className="safety-disclaimer">This file uses a different engine or role-library revision. Only its historical result can be restored; KinkAtlas will not silently reinterpret its raw answers.</p>}
      {hasMeaningfulSession && <p className="safety-disclaimer"><strong>Current work warning:</strong> confirming a compatible restore replaces the assessment currently held in this tab.</p>}
      <div className="share-actions"><button className="button primary" type="button" disabled={busy} onClick={() => void confirmRestore()}>Confirm restore</button><button className="button secondary" type="button" disabled={busy} onClick={() => { setPendingRestore(null); setSecret(''); setStatus('Restore cancelled. Current in-memory work was not changed.'); fileInputRef.current?.focus() }}>Cancel</button></div>
    </section>}

    <p className="share-status" role="status" aria-live="polite">{status}</p>
    {historicalResultSnapshot && <HistoricalResultView snapshot={historicalResultSnapshot} />}
  </div>
}
