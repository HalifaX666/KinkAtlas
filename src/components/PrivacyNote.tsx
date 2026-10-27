import { ShieldCheck } from 'lucide-react'

export function PrivacyNote({ compact = false }: { compact?: boolean }) {
  return <aside className={`privacy-note ${compact ? 'compact' : ''}`} aria-label="Privacy promise">
    <ShieldCheck aria-hidden="true" />
    <div><strong>Ephemeral by default.</strong>{!compact && <p>Your assessment is not remotely saved unless you choose to save or share it. Saved assessments are encrypted first; Link &amp; QR contains only the result you choose to share.</p>}</div>
  </aside>
}
