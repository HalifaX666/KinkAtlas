import { Copy, Download, KeyRound, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { capsuleErrorMessage, downloadCapsuleFile } from '../capsules/capsuleTransport'
import type { ViewerRequest } from '../capsules/capsuleTypes'
import { createStoredViewerRequest, deleteStoredViewerRequest, listStoredViewerRequests, type StoredViewerRequest } from '../capsules/viewerKeyStore'
import { createViewerRequestArtifact, parseViewerRequestInput, type ViewerRequestArtifact } from '../capsules/viewerLockedTransport'

export function ViewerRequestPage() {
  const location = useLocation()
  const [label, setLabel] = useState('')
  const [requests, setRequests] = useState<StoredViewerRequest[]>([])
  const [artifact, setArtifact] = useState<ViewerRequestArtifact | null>(null)
  const [receivedRequest, setReceivedRequest] = useState<ViewerRequest | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setRequests(await listStoredViewerRequests())
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!location.hash) return
    void parseViewerRequestInput(location.hash).then((request) => {
      setReceivedRequest(request)
      setStatus('Public Viewer Request captured locally. It contains no private key.')
      window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`)
    }).catch((error) => setStatus(capsuleErrorMessage(error)))
  }, [location.hash, location.pathname, location.search])

  const createRequest = async () => {
    setBusy(true); setStatus(''); setArtifact(null)
    try {
      const stored = await createStoredViewerRequest(label)
      setArtifact(await createViewerRequestArtifact(stored.request))
      setLabel('')
      await refresh()
      setStatus('Viewer Request created. Its non-exportable private key stays in this browser profile.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(success)
    } catch {
      setStatus('Copy is unavailable. Select the text manually instead.')
    }
  }

  const deleteRequest = async (requestId: string) => {
    setBusy(true)
    try {
      await deleteStoredViewerRequest(requestId)
      setPendingDelete(null)
      if (artifact && requests.find((request) => request.requestId === requestId)?.request.requestId === requestId) setArtifact(null)
      await refresh()
      setStatus('Viewer Request and its private key were permanently deleted from this browser profile.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return <div className="section page-width private-capsule-page">
    <div className="section-heading">
      <span className="eyebrow">Viewer-Locked sharing</span>
      <h1>Create a Viewer Request</h1>
      <p>A Viewer Request lets someone encrypt a read-only Capsule specifically for a key stored in this browser profile. The Capsule link alone is not enough to open it.</p>
    </div>

    <section className="capsule-panel" aria-labelledby="create-viewer-request-heading">
      <KeyRound aria-hidden="true" />
      <h2 id="create-viewer-request-heading">New request-specific key</h2>
      <p>KinkAtlas does not receive the request or private key. Clearing browser storage, changing browser profiles, or deleting the request permanently removes the ability to open Capsules locked to it.</p>
      <label><span>Optional local label</span><input maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="For example: Alex — October" /></label>
      <button className="button primary" type="button" disabled={busy} onClick={createRequest}><KeyRound size={17} />Create Viewer Request</button>
    </section>

    {artifact && <section className="capsule-preview" aria-labelledby="viewer-request-output-heading">
      <span className="eyebrow">Public request</span>
      <h2 id="viewer-request-output-heading">Send this Viewer Request</h2>
      <p>The request contains only a request ID and public key. Verify its Keyprint through another trusted channel when recipient substitution matters.</p>
      <label><span>Viewer Request link</span><textarea readOnly rows={4} value={artifact.link} /></label>
      <label><span>Viewer Request text</span><textarea readOnly rows={5} value={artifact.serializedRequest} /></label>
      <div className="share-actions">
        <button className="button secondary" type="button" onClick={() => copy(artifact.link, 'Viewer Request link copied.')}><Copy size={17} />Copy request link</button>
        <button className="button secondary" type="button" onClick={() => copy(artifact.serializedRequest, 'Viewer Request text copied.')}><Copy size={17} />Copy request text</button>
        <button className="button secondary" type="button" onClick={() => downloadCapsuleFile(artifact.file)}><Download size={17} />Download request file</button>
      </div>
    </section>}

    {receivedRequest && <section className="capsule-preview" aria-labelledby="received-viewer-request-heading">
      <span className="eyebrow">Received public request</span>
      <h2 id="received-viewer-request-heading">Viewer Request Keyprint</h2>
      <Keyprint request={receivedRequest} />
      <p>This does not prove identity by itself. Compare the Keyprint with the intended recipient through another trusted channel.</p>
    </section>}

    <section className="capsule-preview" aria-labelledby="stored-viewer-requests-heading">
      <h2 id="stored-viewer-requests-heading">Viewer Requests stored in this browser</h2>
      {!requests.length && <p>No Viewer Request keys are stored in this browser profile.</p>}
      <ul className="viewer-request-list">{requests.map((request) => <li key={request.requestId}>
        <div><strong>{request.label ?? 'Unlabelled Viewer Request'}</strong><small>Created {new Date(request.createdAt).toLocaleString()}</small><Keyprint request={request.request} /></div>
        {pendingDelete === request.requestId
          ? <div className="capsule-danger-zone"><p><strong>This cannot be undone.</strong> Capsules locked to this request will no longer open in this browser profile.</p><button className="button danger" type="button" disabled={busy} onClick={() => void deleteRequest(request.requestId)}>Permanently delete key</button><button className="button secondary" type="button" onClick={() => setPendingDelete(null)}>Cancel</button></div>
          : <button className="button secondary" type="button" onClick={() => setPendingDelete(request.requestId)}><Trash2 size={17} />Delete this Viewer Request</button>}
      </li>)}</ul>
    </section>

    <p className="share-status" role="status" aria-live="polite">{status}</p>
  </div>
}

function Keyprint({ request }: { request: ViewerRequest }) {
  return <div className="viewer-keyprint">
    <span>Keyprint</span>
    <strong>{request.keyprint.short} · {request.keyprint.checksum}</strong>
    <details><summary>Advanced fingerprint</summary><code>{request.keyprint.fingerprint}</code></details>
  </div>
}
