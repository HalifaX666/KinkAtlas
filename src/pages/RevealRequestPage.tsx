import { Copy, Download, Eye, KeyRound } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { downloadCapsuleFile, revealRequestErrorMessage } from '../capsules/capsuleTransport'
import { createRevealRequest } from '../capsules/revealRequest'
import { revealRequestSectionLabels } from '../capsules/revealRequestDecision'
import {
  createRevealRequestArtifact,
  parseRevealRequestInput,
  type RevealRequestArtifact,
} from '../capsules/revealRequestTransport'
import { REVEAL_REQUEST_SECTION_IDS, type RevealRequest, type RevealRequestSectionId } from '../capsules/capsuleTypes'
import { listStoredViewerRequests, type StoredViewerRequest } from '../capsules/viewerKeyStore'
import { QrTransport } from '../components/QrTransport'
import { ViewerKeyprintPanel } from '../components/ViewerKeyprintPanel'

export function RevealRequestPage() {
  const location = useLocation()
  const [viewerRequests, setViewerRequests] = useState<StoredViewerRequest[]>([])
  const [selectedViewerRequestId, setSelectedViewerRequestId] = useState('')
  const [selectedSections, setSelectedSections] = useState<RevealRequestSectionId[]>([])
  const [artifact, setArtifact] = useState<RevealRequestArtifact | null>(null)
  const [artifactRequest, setArtifactRequest] = useState<RevealRequest | null>(null)
  const [receivedRequest, setReceivedRequest] = useState<RevealRequest | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const outputHeadingRef = useRef<HTMLHeadingElement>(null)
  const receivedHeadingRef = useRef<HTMLHeadingElement>(null)

  const refreshViewerRequests = useCallback(async () => {
    try {
      const requests = await listStoredViewerRequests()
      setViewerRequests(requests)
      setSelectedViewerRequestId((current) => current || requests[0]?.requestId || '')
    } catch {
      setStatus('Local Viewer Request key storage is unavailable in this browser context.')
    }
  }, [])

  useEffect(() => { void refreshViewerRequests() }, [refreshViewerRequests])

  useEffect(() => {
    if (artifact) outputHeadingRef.current?.focus()
  }, [artifact])

  useEffect(() => {
    if (receivedRequest) receivedHeadingRef.current?.focus()
  }, [receivedRequest])

  useEffect(() => {
    if (!location.hash) return
    void parseRevealRequestInput(location.hash).then((request) => {
      setReceivedRequest(request)
      setStatus('Reveal Request captured locally. No disclosure was created and nothing was shared.')
      window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`)
    }).catch((error) => setStatus(revealRequestErrorMessage(error)))
  }, [location.hash, location.pathname, location.search])

  const toggleSection = (section: RevealRequestSectionId, checked: boolean) => {
    setArtifact(null)
    setArtifactRequest(null)
    setSelectedSections((current) => REVEAL_REQUEST_SECTION_IDS.filter((candidate) => (
      candidate === section ? checked : current.includes(candidate)
    )))
  }

  const createRequest = async () => {
    const selectedViewerRequest = viewerRequests.find((request) => request.requestId === selectedViewerRequestId)
    if (!selectedViewerRequest || !selectedSections.length) return
    setBusy(true); setStatus(''); setArtifact(null); setArtifactRequest(null)
    try {
      const request = await createRevealRequest(selectedViewerRequest.request, selectedSections)
      setArtifact(await createRevealRequestArtifact(request))
      setArtifactRequest(request)
      setStatus('Reveal Request created locally. It asks for information but does not cause anything to be shared.')
    } catch (error) {
      setStatus(revealRequestErrorMessage(error))
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

  const download = (file: File) => {
    try {
      downloadCapsuleFile(file)
      setStatus(`${file.name} download started.`)
    } catch {
      setStatus('Download is unavailable. Copy the request link or text instead.')
    }
  }

  return <div className="section page-width private-capsule-page">
    <div className="section-heading">
      <span className="eyebrow">Optional disclosure request</span>
      <h1>Create a Reveal Request</h1>
      <p>A Reveal Request asks whether someone is willing to share selected results. They can share all, some, or none. It is not consent, approval, remote access, or an obligation.</p>
    </div>

    <section className="capsule-panel" aria-labelledby="reveal-request-create-heading">
      <Eye aria-hidden="true" />
      <h2 id="reveal-request-create-heading">Choose what to ask for</h2>
      <p>The request is public metadata. It contains requested section names and the public Viewer Request key you select, but no private key, local label, assessment answer, or result content.</p>
      {!viewerRequests.length
        ? <p>Create a local Viewer Request first so any response can be locked to that browser key. <Link to="/viewer-request">Create a Viewer Request</Link>.</p>
        : <fieldset className="share-options"><legend>Response key stored in this browser</legend>{viewerRequests.map((stored) => <label key={stored.requestId}>
          <input type="radio" name="reveal-recipient" value={stored.requestId} checked={selectedViewerRequestId === stored.requestId} onChange={() => { setSelectedViewerRequestId(stored.requestId); setArtifact(null); setArtifactRequest(null) }} />
          <span><strong>{stored.label ?? 'Unlabelled Viewer Request'}</strong><small>Local label only; it is not included in the Reveal Request.</small></span>
        </label>)}</fieldset>}
      <fieldset className="share-options"><legend>Sections to request</legend>{REVEAL_REQUEST_SECTION_IDS.map((section) => <label key={section}>
        <input type="checkbox" checked={selectedSections.includes(section)} onChange={(event) => toggleSection(section, event.target.checked)} />
        <span><strong>{revealRequestSectionLabels[section]}</strong><small>{section === 'currentRoleSet' ? 'The sender’s current labels, order, and primary role.' : 'Definition text for roles in the shared Current Role Set.'}</small></span>
      </label>)}</fieldset>
      <p className="capsule-warning">This asks for information. It does not cause anything to be shared.</p>
      <button className="button primary" type="button" disabled={busy || !selectedViewerRequestId || !selectedSections.length} onClick={() => void createRequest()}><Eye size={17} />Review and create request</button>
    </section>

    {artifact && artifactRequest && <section className="capsule-preview" aria-labelledby="reveal-request-output-heading">
      <span className="eyebrow">Public request metadata</span>
      <h2 id="reveal-request-output-heading" ref={outputHeadingRef} tabIndex={-1}>Send this Reveal Request</h2>
      <p>Requested: {artifactRequest.requestedSections.map((section) => revealRequestSectionLabels[section]).join(', ')}. The sender still chooses the final disclosure.</p>
      <ViewerKeyprintPanel request={artifactRequest.recipientViewerRequest} onCopy={copy} recipient />
      <label><span>Reveal Request link</span><textarea readOnly rows={4} value={artifact.link} /></label>
      <label><span>Reveal Request text</span><textarea readOnly rows={6} value={artifact.serializedRequest} /></label>
      <div className="share-actions">
        <button className="button secondary" type="button" onClick={() => void copy(artifact.link, 'Reveal Request link copied.')}><Copy size={17} />Copy request link</button>
        <button className="button secondary" type="button" onClick={() => void copy(artifact.serializedRequest, 'Reveal Request text copied.')}><Copy size={17} />Copy request text</button>
        <button className="button secondary" type="button" onClick={() => download(artifact.file)}><Download size={17} />Download request file</button>
      </div>
      <QrTransport
        transportText={artifact.link}
        artifactType="reveal-request"
        accessibleLabel="QR code for Reveal Request"
        description="This QR, when available, contains only the same public request link. It contains no result content, private key, or local label."
        downloadName="kinkatlas-reveal-request-qr.svg"
      />
    </section>}

    {receivedRequest && <section className="capsule-preview" aria-labelledby="received-reveal-request-heading">
      <span className="eyebrow">Received request</span>
      <h2 id="received-reveal-request-heading" ref={receivedHeadingRef} tabIndex={-1}>Review this Reveal Request</h2>
      <p>A Reveal Request asks whether you are willing to share selected results. You can share all, some, or none. Import it from Export &amp; Share on your Results page to choose.</p>
      <div className="privacy-receipt"><h3>Requested</h3><div><ul>{receivedRequest.requestedSections.map((section) => <li key={section}>{revealRequestSectionLabels[section]}</li>)}</ul></div></div>
      <ViewerKeyprintPanel request={receivedRequest.recipientViewerRequest} onCopy={copy} recipient />
      <p><Link className="button secondary" to="/results"><KeyRound size={17} />Go to Results</Link></p>
    </section>}

    <p className="share-status" role="status" aria-live="polite">{status}</p>
  </div>
}
