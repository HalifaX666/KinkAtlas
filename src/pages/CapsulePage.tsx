import { FileLock2, KeyRound, LockKeyhole } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { parseCapsuleEnvelope } from '../capsules/capsuleCodec'
import { privacyReceiptForPayload } from '../capsules/capsuleData'
import { CapsuleError } from '../capsules/capsuleError'
import { capsuleErrorMessage, decryptSharedDisclosure, parseSharedCapsuleFragment, readCapsuleFile } from '../capsules/capsuleTransport'
import type { CapsuleEnvelopeTransport, SharedDisclosurePayload } from '../capsules/capsuleTypes'

type CapsuleMode = 'secret' | 'viewer-locked'

export function CapsulePage() {
  const location = useLocation()
  const [serializedEnvelope, setSerializedEnvelope] = useState('')
  const [transport, setTransport] = useState<CapsuleEnvelopeTransport>('fragment')
  const [mode, setMode] = useState<CapsuleMode | null>(null)
  const [secret, setSecret] = useState('')
  const [payload, setPayload] = useState<SharedDisclosurePayload | null>(null)
  const [status, setStatus] = useState('')
  const [missingKey, setMissingKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const receipt = useMemo(() => payload ? privacyReceiptForPayload(payload) : null, [payload])

  const unlockViewerLocked = async (serialized: string, source: CapsuleEnvelopeTransport) => {
    setBusy(true); setPayload(null); setMissingKey(false)
    try {
      const { decryptViewerLockedDisclosure } = await import('../capsules/viewerLockedTransport')
      setPayload(await decryptViewerLockedDisclosure(serialized, source))
      setStatus('Viewer-Locked Capsule opened locally with the matching key from this browser profile.')
    } catch (error) {
      setMissingKey(error instanceof CapsuleError && error.code === 'missing-recipient-key')
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const inspectEnvelope = async (serialized: string, source: CapsuleEnvelopeTransport, removeFragment = false) => {
    setPayload(null); setMissingKey(false); setStatus('')
    try {
      const envelope = parseCapsuleEnvelope(serialized, source)
      if (envelope.mode === 'viewer-locked') {
        const { parseViewerLockedEnvelope } = await import('../capsules/viewerLockedTransport')
        await parseViewerLockedEnvelope(serialized, source)
      }
      setSerializedEnvelope(serialized)
      setTransport(source)
      setMode(envelope.mode)
      if (removeFragment) window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`)
      if (envelope.mode === 'viewer-locked') await unlockViewerLocked(serialized, source)
      else setStatus('Secret Capsule captured locally. Enter the separately shared secret to unlock it.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    }
  }

  useEffect(() => {
    if (!location.hash) return
    try {
      const captured = parseSharedCapsuleFragment(location.hash)
      void inspectEnvelope(captured, 'fragment', true)
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    }
    // Capture once per incoming fragment. The inspected route path is stable for this navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash])

  const unlock = async () => {
    setBusy(true); setPayload(null); setStatus('')
    try {
      setPayload(await decryptSharedDisclosure(serializedEnvelope, secret, transport))
      setStatus('Capsule unlocked locally. No content was uploaded or stored.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const definitions = new Map(payload?.sections.roleDefinitions?.map((item) => [item.roleId, item.definition]) ?? [])

  return <div className="section page-width private-capsule-page">
    <div className="section-heading">
      <span className="eyebrow">Encrypted disclosure</span>
      <h1>Open a private KinkAtlas Capsule</h1>
      <p>Secret Capsules use a separately shared secret. Viewer-Locked Capsules require the matching private key stored in the recipient’s browser profile. KinkAtlas does not receive either one.</p>
    </div>

    {!payload && <section className="capsule-panel capsule-unlock" aria-labelledby="capsule-unlock-heading">
      {mode === 'viewer-locked' ? <KeyRound aria-hidden="true" /> : <FileLock2 aria-hidden="true" />}
      <h2 id="capsule-unlock-heading">{mode === 'viewer-locked' ? 'Viewer-Locked disclosure' : 'Unlock disclosure'}</h2>
      <label><span>Encrypted Capsule text</span><textarea value={serializedEnvelope} rows={5} onChange={(event) => { setSerializedEnvelope(event.target.value.trim()); setMode(null); setPayload(null); setMissingKey(false) }} /></label>
      <label className="capsule-file-input"><span>Or choose an encrypted Capsule file</span><input type="file" accept=".kinkatlas-capsule,application/vnd.kinkatlas.capsule" onChange={(event) => {
        const file = event.target.files?.[0]
        if (!file) return
        void readCapsuleFile(file).then((value) => inspectEnvelope(value, 'file')).catch((error) => setStatus(capsuleErrorMessage(error)))
      }} /></label>
      {!mode && <button className="button secondary" type="button" disabled={!serializedEnvelope || busy} onClick={() => void inspectEnvelope(serializedEnvelope, 'file')}><FileLock2 size={17} />Check Capsule</button>}
      {mode === 'secret' && <>
        <label><span>Separately shared secret</span><input type="password" autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
        <button className="button primary" type="button" disabled={!serializedEnvelope || !secret || busy} onClick={unlock}><LockKeyhole size={17} />Unlock Capsule</button>
      </>}
      {mode === 'viewer-locked' && !missingKey && <p>The matching local Viewer Request key is required. No password or secret fallback exists.</p>}
      {missingKey && <div className="capsule-warning">
        <p><strong>This Capsule is locked to a Viewer Request that is not available in this browser profile.</strong></p>
        <p>It may have been opened on another device or browser, browser storage may have been cleared, or the Viewer Request may have been deleted. KinkAtlas cannot recover the key.</p>
        <Link className="button secondary" to="/viewer-request">Manage Viewer Requests</Link>
      </div>}
    </section>}

    {payload && <section className="capsule-preview" aria-labelledby="disclosure-heading">
      <span className="eyebrow">Read-only disclosure</span>
      <h2 id="disclosure-heading">Shared Role Set</h2>
      {payload.sections.currentRoleSet?.length ? <ol className="historical-role-list">
        {payload.sections.currentRoleSet.map((role) => <li key={role.roleId}>
          <strong>{role.label}</strong>{role.primary && <span>Shared primary</span>}
          {definitions.get(role.roleId) && <p>{definitions.get(role.roleId)}</p>}
        </li>)}
      </ol> : <p>No role set was included.</p>}
      {receipt && <div className="privacy-receipt"><h3>Privacy receipt</h3><div><strong>Included</strong><ul>{receipt.included.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Not included</strong><ul>{receipt.notIncluded.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
      <p className="share-disclaimer"><strong>Sharing is not consent.</strong> A shared role label does not communicate consent, availability, boundaries, or agreement to an activity.</p>
      {mode === 'viewer-locked' && <p className="share-disclaimer">Viewer-Locked encryption does not authenticate the sender. Decrypted content can still be copied or captured by its recipient.</p>}
    </section>}

    <p className="share-status" role="status" aria-live="polite">{status}</p>
  </div>
}
