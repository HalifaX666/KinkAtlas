import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ResultSnapshot } from '../capsules/capsuleData'
import { HistoricalResultView } from '../components/HistoricalResultView'
import { parseRevisitFragment, revisitErrorMessage } from '../revisit/revisitCodec'

export function RevisitPage() {
  const { hash } = useLocation()
  const [snapshot, setSnapshot] = useState<ResultSnapshot | null>(null)
  const [error, setError] = useState('')
  const errorHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let active = true
    setSnapshot(null); setError('')
    void parseRevisitFragment(hash).then((result) => {
      if (active) setSnapshot(result)
    }).catch((reason) => {
      if (active) setError(revisitErrorMessage(reason))
    })
    return () => { active = false }
  }, [hash])

  useEffect(() => {
    if (error) errorHeadingRef.current?.focus()
  }, [error])

  return <div className="section page-width private-capsule-page revisit-page">
    <div className="section-heading">
      <span className="eyebrow">Revisit Link</span>
      <h1>Saved historical result</h1>
      <p>This is a read-only result encoded in the complete URL. It is not encrypted: anyone who has the full link can view it.</p>
    </div>
    {!snapshot && !error && <p role="status" aria-live="polite">Opening saved result locally…</p>}
    {error && <section className="capsule-warning" aria-labelledby="revisit-error-heading">
      <h2 id="revisit-error-heading" ref={errorHeadingRef} tabIndex={-1}>Revisit link could not be opened</h2>
      <p>{error}</p>
      <p>Ask for the complete link again, or use an encrypted Capsule or Private Restore file when appropriate.</p>
    </section>}
    {snapshot && <HistoricalResultView snapshot={snapshot} />}
  </div>
}
