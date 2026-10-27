import { Download, QrCode } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { QR_MAX_INPUT_BYTES, qrAvailability, type QrArtifactType } from '../qr/qrPolicy'
import type { QrTransportResult } from '../qr/qrTransport'

interface QrTransportProps {
  transportText: string
  artifactType: QrArtifactType
  accessibleLabel: string
  description: string
  downloadName: string
  initiallyVisible?: boolean
  plainLanguage?: boolean
}

function unavailableMessage(reason: 'empty' | 'oversized' | 'revisit-deferred'): string {
  if (reason === 'revisit-deferred') return 'QR is not available for Revisit Links. Use the complete copyable link instead.'
  if (reason === 'oversized') return `This artifact is too large for a reliable single QR code. Use the copyable link or file instead (QR limit: ${QR_MAX_INPUT_BYTES} bytes).`
  return 'QR is unavailable because this artifact is empty.'
}

export function QrTransport({ transportText, artifactType, accessibleLabel, description, downloadName, initiallyVisible = false, plainLanguage = false }: QrTransportProps) {
  const availability = useMemo(() => qrAvailability(transportText, artifactType), [artifactType, transportText])
  const [qr, setQr] = useState<QrTransportResult | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setQr(null)
    setStatus('')
    if (!initiallyVisible || !availability.available) return
    let active = true
    void import('../qr/qrTransport').then(({ createQrTransport }) => {
      if (active) setQr(createQrTransport(transportText, artifactType))
    }).catch(() => {
      if (active) setStatus('QR could not be created. Use the copyable link instead.')
    })
    return () => { active = false }
  }, [artifactType, availability.available, initiallyVisible, transportText])

  if (!availability.available) {
    return <div className="qr-transport qr-transport-unavailable" data-qr-availability="unavailable">
      <QrCode aria-hidden="true" />
      <p>{unavailableMessage(availability.reason)}</p>
    </div>
  }

  const toggleQr = async () => {
    if (qr) {
      setQr(null)
      setStatus('QR hidden. The text and file alternatives remain available.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const { createQrTransport } = await import('../qr/qrTransport')
      setQr(createQrTransport(transportText, artifactType))
      setStatus('QR created locally in this browser.')
    } catch {
      setStatus('QR could not be created. Use the copyable link or file instead.')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    if (!qr) return
    let url = ''
    let anchor: HTMLAnchorElement | null = null
    try {
      const { qrSvgText } = await import('../qr/qrTransport')
      url = URL.createObjectURL(new Blob([qrSvgText(qr, accessibleLabel)], { type: 'image/svg+xml' }))
      anchor = document.createElement('a')
      anchor.href = url
      anchor.download = downloadName
      document.body.append(anchor)
      anchor.click()
      setStatus('QR SVG download started.')
    } catch {
      setStatus('QR download is unavailable. Use the displayed QR or copyable link instead.')
    } finally {
      anchor?.remove()
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }

  return <div className="qr-transport" data-qr-availability="available">
    <div className="qr-transport-heading">
      <div><h4>Move with QR</h4><p>{description}</p></div>
      <button className="button secondary" type="button" disabled={busy} aria-expanded={Boolean(qr)} onClick={() => void toggleQr()}>
        <QrCode size={17} />{busy ? 'Creating QR…' : qr ? 'Hide QR' : 'Show QR'}
      </button>
    </div>
    {qr && <div className="qr-transport-output">
      <svg
        className="qr-code"
        role="img"
        aria-label={accessibleLabel}
        viewBox={`0 0 ${qr.matrixModules} ${qr.matrixModules}`}
        width={qr.renderedPixels}
        height={qr.renderedPixels}
        shapeRendering="crispEdges"
        data-qr-version={qr.version}
        data-qr-modules={qr.matrixModules}
        data-qr-bytes={qr.byteCount}
        data-qr-ecc={qr.errorCorrection}
      >
        <title>{accessibleLabel}</title>
        <rect width={qr.matrixModules} height={qr.matrixModules} fill="#fff" />
        <path d={qr.svgPath} fill="#000" />
      </svg>
      {!plainLanguage && <p className="qr-transport-metadata">ECC {qr.errorCorrection} · QR version {qr.version} · {qr.byteCount} bytes</p>}
      <p>{plainLanguage ? 'The QR can be saved or forwarded. It opens the same share as the link above.' : 'A screenshot or downloaded copy can be forwarded. QR adds no expiry, revocation, identity proof, or consent.'}</p>
      <button className="button secondary" type="button" onClick={() => void download()}><Download size={17} />Download QR as SVG</button>
    </div>}
    {status && <p className="share-status" aria-live="polite">{status}</p>}
  </div>
}
