import { Copy, Link2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createHostedContent, deleteHostedContent, hostedShareUrl } from '../sharing/hostedStorage'
import { removeHostedShareRecord, saveHostedShareRecord, type HostedShareRecord } from '../sharing/localVault'
import type { SharePackage } from '../sharing/sharePackage'
import { QrTransport } from './QrTransport'
import { RoleEmblem } from './RoleEmblem'

async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
  await navigator.clipboard.writeText(value)
}

export function SimpleSharePanel({ sharePackage }: { sharePackage: SharePackage }) {
  const [quick, setQuick] = useState<HostedShareRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const createQuick = async () => {
    setBusy(true); setStatus('')
    try {
      const created = await createHostedContent('quick-share', sharePackage)
      const record: HostedShareRecord = { ...created, kind: 'quick-share', url: hostedShareUrl('quick-share', created.id) }
      await saveHostedShareRecord(record)
      setQuick(record); setStatus('Your share is ready. The link and QR open the same shared result.')
    } catch { setStatus('The share could not be created. Nothing was uploaded unless the server confirmed creation.') }
    finally { setBusy(false) }
  }

  const remove = async (record: HostedShareRecord) => {
    setBusy(true); setStatus('')
    try {
      await deleteHostedContent(record.kind, record.id, record.deleteToken)
      await removeHostedShareRecord(record.id)
      setQuick(null)
      setStatus('Share deleted. The link and QR no longer load. Copies someone already saved cannot be recalled.')
    } catch { setStatus('The hosted share could not be deleted.') }
    finally { setBusy(false) }
  }

  const copy = async (value: string) => {
    try { await copyText(value); setStatus('Share link copied.') }
    catch { setStatus('Copy is unavailable. Select the displayed link manually.') }
  }

  return <section className="simple-share share-mode-panel" aria-labelledby="link-qr-heading">
    <div className="share-panel-heading"><div><h3 id="link-qr-heading">{quick ? 'Your share is ready' : 'Link & QR'}</h3><p>{quick ? 'Copy the short link or use its matching QR code.' : 'Create one share for your cards and historical result. Anyone with the link or QR code can view it. Your individual assessment answers are not included.'}</p></div></div>
    {!quick && <>
      <div className="link-share-preview" aria-label="Cards included in this share">
        {sharePackage.cards.map((card) => <article key={card.roleId}>
          <RoleEmblem recipe={card.emblem} />
          <div><span>{card.familyLabel}</span><strong>{card.label}</strong><p>{card.summary}</p></div>
        </article>)}
      </div>
      <button className="button primary" type="button" disabled={busy} onClick={() => void createQuick()}><Link2 size={17} />{busy ? 'Creating share…' : 'Create share'}</button>
    </>}
    {quick && <div className="link-share-ready">
      <label><span>Share link</span><input readOnly value={quick.url} /></label>
      <button className="button secondary" type="button" onClick={() => void copy(quick.url)}><Copy size={17} />Copy link</button>
      <QrTransport transportText={quick.url} artifactType="quick-share" accessibleLabel="QR code for shared KinkAtlas result" description="This QR opens the exact same shared result as the link above." downloadName="kinkatlas-share-qr.svg" initiallyVisible plainLanguage />
      <p className="share-delete-note">Deleting this share makes the hosted link and QR stop working. It cannot remove screenshots or copies someone already saved.</p>
      <button className="button danger" type="button" disabled={busy} onClick={() => void remove(quick)}><Trash2 size={16} />Delete share</button>
    </div>}
    {status && <p className="share-status" role="status" aria-live="polite">{status}</p>}
  </section>
}
