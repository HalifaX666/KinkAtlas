import { FileLock2, LockKeyhole } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { privacyReceiptForPayload } from '../capsules/capsuleData'
import { capsuleErrorMessage, decryptSharedDisclosure, parseSharedCapsuleFragment, readCapsuleFile } from '../capsules/capsuleTransport'
import type { SharedDisclosurePayload } from '../capsules/capsuleTypes'

export function CapsulePage() {
  const location = useLocation()
  const [serializedEnvelope, setSerializedEnvelope] = useState('')
  const [secret, setSecret] = useState('')
  const [payload, setPayload] = useState<SharedDisclosurePayload | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const receipt = useMemo(() => payload ? privacyReceiptForPayload(payload) : null, [payload])

  useEffect(() => {
    if (!location.hash) return
    try {
      const captured = parseSharedCapsuleFragment(location.hash)
      setSerializedEnvelope(captured)
      setStatus('Encrypted Capsule captured locally. Enter the separately shared secret to unlock it.')
      window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`)
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    }
  }, [location.hash, location.pathname, location.search])

  const unlock = async () => {
    setBusy(true); setPayload(null); setStatus('')
    try {
      setPayload(await decryptSharedDisclosure(serializedEnvelope, secret))
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
      <p>The encrypted Capsule and its secret are both required. Decryption happens in this browser; KinkAtlas does not receive the Capsule, secret, or disclosed content.</p>
    </div>

    {!payload && <section className="capsule-panel capsule-unlock" aria-labelledby="capsule-unlock-heading">
      <FileLock2 aria-hidden="true" />
      <h2 id="capsule-unlock-heading">Unlock disclosure</h2>
      <label><span>Encrypted Capsule text</span><textarea value={serializedEnvelope} rows={5} onChange={(event) => setSerializedEnvelope(event.target.value.trim())} /></label>
      <label className="capsule-file-input"><span>Or choose an encrypted Capsule file</span><input type="file" accept=".kinkatlas-capsule,application/vnd.kinkatlas.capsule" onChange={(event) => {
        const file = event.target.files?.[0]
        if (!file) return
        void readCapsuleFile(file).then((value) => { setSerializedEnvelope(value); setStatus('Encrypted Capsule file validated locally.') }).catch((error) => setStatus(capsuleErrorMessage(error)))
      }} /></label>
      <label><span>Separately shared secret</span><input type="password" autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
      <button className="button primary" type="button" disabled={!serializedEnvelope || !secret || busy} onClick={unlock}><LockKeyhole size={17} />Unlock Capsule</button>
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
    </section>}

    <p className="share-status" role="status" aria-live="polite">{status}</p>
  </div>
}
