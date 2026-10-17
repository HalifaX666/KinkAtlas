import { Copy, ExternalLink, Link2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ResultSnapshot } from '../capsules/capsuleData'
import type { RevisitArtifact } from '../revisit/revisitCodec'

interface RevisitLinkCreatorProps {
  createSnapshot: () => ResultSnapshot
  available: boolean
}

export function RevisitLinkCreator({ createSnapshot, available }: RevisitLinkCreatorProps) {
  const [artifact, setArtifact] = useState<RevisitArtifact | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const warningId = useId()
  const outputHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    setArtifact(null)
    setStatus('')
  }, [createSnapshot])

  const create = async () => {
    setBusy(true); setArtifact(null); setStatus('')
    try {
      const { createRevisitArtifact } = await import('../revisit/revisitCodec')
      const next = await createRevisitArtifact(createSnapshot(), window.location.origin)
      setArtifact(next)
      setStatus('Revisit link created locally.')
      window.requestAnimationFrame(() => outputHeadingRef.current?.focus())
    } catch (error) {
      const { revisitErrorMessage } = await import('../revisit/revisitCodec')
      setStatus(`${revisitErrorMessage(error)} Use an encrypted Capsule or Private Restore file instead.`)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!artifact) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(artifact.link)
      setStatus('Revisit link copied.')
    } catch {
      setStatus('Copy is unavailable. Select the complete Revisit link manually.')
    }
  }

  return <section className="page-width revisit-link-section" aria-labelledby="revisit-link-heading">
    <div>
      <span className="eyebrow">Save this historical result</span>
      <h2 id="revisit-link-heading">Create a revisit link</h2>
      <p>The saved result is encoded directly in the link. KinkAtlas does not upload or store it, and it does not include raw assessment answers.</p>
      <p className="capsule-warning" id={warningId}><strong>Anyone with the complete link can view this saved result.</strong> It is not encrypted, recipient-restricted, revocable, or private. Use Secret Capsule or Viewer-Locked Capsule when access protection is needed.</p>
      <button className="button secondary" type="button" disabled={!available || busy} onClick={() => void create()}><Link2 size={17} />{busy ? 'Creating revisit link…' : 'Create revisit link'}</button>
    </div>
    {artifact && <div className="capsule-artifact revisit-link-output" aria-describedby={warningId}>
      <h3 ref={outputHeadingRef} tabIndex={-1}>Save or bookmark this link</h3>
      <p>The complete URL is the saved result. It remains in browser history and can be forwarded.</p>
      <label><span>Revisit link</span><textarea aria-describedby={warningId} readOnly rows={5} value={artifact.link} /></label>
      <div className="share-actions">
        <button className="button secondary" type="button" onClick={() => void copy()}><Copy size={17} />Copy revisit link</button>
        <a className="button secondary" href={artifact.link}><ExternalLink size={17} />Open revisit view</a>
      </div>
    </div>}
    {status && <p className="share-status" role="status" aria-live="polite">{status}</p>}
  </section>
}
