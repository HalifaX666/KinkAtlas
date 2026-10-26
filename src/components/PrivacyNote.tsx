import { ShieldCheck } from 'lucide-react'

export function PrivacyNote({ compact = false }: { compact?: boolean }) {
  return <aside className={`privacy-note ${compact ? 'compact' : ''}`} aria-label="Privacy promise">
    <ShieldCheck aria-hidden="true" />
    <div><strong>Ephemeral by default.</strong>{!compact && <p>Your assessment stays in this tab unless you explicitly save or share. Saved assessments are encrypted before upload; Quick Shares contain only the result you choose to share.</p>}</div>
  </aside>
}
