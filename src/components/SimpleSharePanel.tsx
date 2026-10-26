import { Copy, KeyRound, Link2, QrCode, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createConsentCapsule } from '../sharing/consentCapsule'
import { createHostedContent, deleteHostedContent, hostedShareUrl } from '../sharing/hostedStorage'
import { removeHostedShareRecord, saveHostedShareRecord, type HostedShareRecord } from '../sharing/localVault'
import type { SharePackage } from '../sharing/sharePackage'
import type { ViewerRequest } from '../capsules/capsuleTypes'
import { parseViewerRequestInput } from '../capsules/viewerLockedTransport'
import { QrTransport } from './QrTransport'

async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
  await navigator.clipboard.writeText(value)
}

export function SimpleSharePanel({ sharePackage }: { sharePackage: SharePackage }) {
  const [quick, setQuick] = useState<HostedShareRecord | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [recipientInput, setRecipientInput] = useState('')
  const [recipient, setRecipient] = useState<ViewerRequest | null>(null)
  const [privateShare, setPrivateShare] = useState<HostedShareRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const createQuick = async () => {
    setBusy(true); setStatus('')
    try {
      const created = await createHostedContent('quick-share', sharePackage)
      const record: HostedShareRecord = { ...created, kind: 'quick-share', url: hostedShareUrl('quick-share', created.id) }
      await saveHostedShareRecord(record)
      setQuick(record); setShowQr(false); setStatus('Quick Share Link created. Anyone with this link can view the shared result.')
    } catch { setStatus('The share could not be created. Nothing was uploaded unless the server confirmed creation.') }
    finally { setBusy(false) }
  }

  const validateRecipient = async () => {
    setBusy(true); setRecipient(null); setPrivateShare(null); setStatus('')
    try {
      const value = await parseViewerRequestInput(recipientInput)
      setRecipient(value); setStatus('Recipient pairing information validated. Confirm the person separately when that matters.')
    } catch { setStatus('That recipient pairing link is incomplete or unsupported.') }
    finally { setBusy(false) }
  }

  const createPrivate = async () => {
    if (!recipient) return
    setBusy(true); setStatus('')
    try {
      const envelope = await createConsentCapsule(sharePackage, recipient)
      const created = await createHostedContent('consent-capsule', envelope)
      const record: HostedShareRecord = { ...created, kind: 'consent-capsule', url: hostedShareUrl('consent-capsule', created.id) }
      await saveHostedShareRecord(record)
      setPrivateShare(record); setStatus('ConsentCapsule™ created. Its encrypted result is locked to the selected browser key.')
    } catch { setStatus('The ConsentCapsule™ could not be created. No plaintext result was uploaded.') }
    finally { setBusy(false) }
  }

  const remove = async (record: HostedShareRecord) => {
    setBusy(true); setStatus('')
    try {
      await deleteHostedContent(record.kind, record.id, record.deleteToken)
      await removeHostedShareRecord(record.id)
      if (record.kind === 'quick-share') { setQuick(null); setShowQr(false) } else setPrivateShare(null)
      setStatus('Hosted share deleted. Copies someone already saved cannot be recalled.')
    } catch { setStatus('The hosted share could not be deleted.') }
    finally { setBusy(false) }
  }

  const copy = async (value: string) => {
    try { await copyText(value); setStatus('Share link copied.') }
    catch { setStatus('Copy is unavailable. Select the displayed link manually.') }
  }

  return <section className="simple-share" aria-labelledby="simple-share-heading">
    <div className="share-panel-heading"><div><h3 id="simple-share-heading">Share your KinkAtlas</h3><p>Your cards and historical result are included. Raw assessment answers are not.</p></div></div>
    <div className="simple-share-grid">
      <article>
        <Link2 aria-hidden="true" />
        <h4>Quick Share Link</h4>
        <p>Anyone with the link can view your shared KinkAtlas result.</p>
        {!quick ? <button className="button primary" type="button" disabled={busy} onClick={() => void createQuick()}>Create link</button> : <>
          <label><span>Quick Share Link</span><input readOnly value={quick.url} /></label>
          <div className="share-actions"><button className="button secondary" type="button" onClick={() => void copy(quick.url)}><Copy size={17} />Copy link</button><button className="quiet-button" type="button" disabled={busy} onClick={() => void remove(quick)}><Trash2 size={16} />Delete share</button></div>
        </>}
      </article>
      <article>
        <QrCode aria-hidden="true" />
        <h4>QR Code</h4>
        <p>Let someone scan the same Quick Share Link.</p>
        {!quick ? <button className="button secondary" type="button" disabled={busy} onClick={() => void createQuick()}>Create link and QR</button> : <button className="button secondary" type="button" onClick={() => setShowQr((current) => !current)}>{showQr ? 'Hide QR' : 'Show QR'}</button>}
        {quick && showQr && <QrTransport transportText={quick.url} artifactType="quick-share" accessibleLabel="QR code for Quick Share Link" description="Anyone who scans this QR can open the same Quick Share." downloadName="kinkatlas-quick-share-qr.svg" />}
      </article>
      <article>
        <KeyRound aria-hidden="true" />
        <h4>ConsentCapsule™</h4>
        <p>Create a private encrypted share for the person you choose.</p>
        {!recipient && <><label><span>Recipient pairing link</span><input value={recipientInput} onChange={(event) => setRecipientInput(event.target.value)} /></label><button className="button secondary" type="button" disabled={busy || !recipientInput.trim()} onClick={() => void validateRecipient()}>Confirm recipient</button></>}
        {recipient && !privateShare && <button className="button primary" type="button" disabled={busy} onClick={() => void createPrivate()}>Create ConsentCapsule™</button>}
        {privateShare && <><label><span>Private share link</span><input readOnly value={privateShare.url} /></label><div className="share-actions"><button className="button secondary" type="button" onClick={() => void copy(privateShare.url)}><Copy size={17} />Copy private link</button><button className="quiet-button" type="button" disabled={busy} onClick={() => void remove(privateShare)}><Trash2 size={16} />Delete share</button></div></>}
        <small>ConsentCapsule™ is a sharing feature. It does not give or imply consent to any activity.</small>
      </article>
    </div>
    {status && <p className="share-status" role="status" aria-live="polite">{status}</p>}
  </section>
}
