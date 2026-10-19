import { Copy } from 'lucide-react'
import { deriveViewerWordKeyprintFromHex } from '../capsules/keyprintVocabulary'
import type { ViewerRequest } from '../capsules/capsuleTypes'

interface ViewerKeyprintPanelProps {
  request: ViewerRequest
  onCopy: (text: string, success: string) => Promise<void>
  recipient?: boolean
}

export function ViewerKeyprintPanel({ request, onCopy, recipient = false }: ViewerKeyprintPanelProps) {
  const wordKeyprint = deriveViewerWordKeyprintFromHex(request.keyprint.fingerprint)
  const comparisonCode = `${request.keyprint.short} · ${request.keyprint.checksum}`
  const prefix = recipient ? 'Recipient ' : ''

  return <div className="viewer-keyprint">
    <span>{prefix}Four-Word Keyprint</span>
    <strong className="viewer-word-keyprint" aria-label={`${prefix}Four-Word Keyprint: ${wordKeyprint.phrase}`}>{wordKeyprint.phrase}</strong>
    <button className="quiet-button viewer-keyprint-copy" type="button" onClick={() => void onCopy(wordKeyprint.phrase, 'Four-Word Keyprint copied.')}><Copy size={15} />Copy Four-Word Keyprint</button>
    <div className="viewer-comparison-code">
      <span>{prefix}Comparison code</span>
      <strong aria-label={`${prefix}Comparison code ${request.keyprint.short}, checksum ${request.keyprint.checksum}`}>{comparisonCode}</strong>
      <button className="quiet-button viewer-keyprint-copy" type="button" onClick={() => void onCopy(comparisonCode, 'Comparison code copied.')}><Copy size={15} />Copy comparison code</button>
    </div>
    <details>
      <summary>Full fingerprint</summary>
      <code>{request.keyprint.fingerprint}</code>
      <button className="quiet-button viewer-keyprint-copy" type="button" onClick={() => void onCopy(request.keyprint.fingerprint, 'Full fingerprint copied.')}><Copy size={15} />Copy full fingerprint</button>
    </details>
    <p>Compare these four words with the other person through another trusted channel. Matching words help detect request mix-ups; they do not verify someone’s real-world identity.</p>
  </div>
}
