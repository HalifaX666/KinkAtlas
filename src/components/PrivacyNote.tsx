import { ShieldCheck } from 'lucide-react'

export function PrivacyNote({ compact = false }: { compact?: boolean }) {
  return <aside className={`privacy-note ${compact ? 'compact' : ''}`} aria-label="Privacy promise">
    <ShieldCheck aria-hidden="true" />
    <div><strong>Your kink is none of our business.</strong>{!compact && <p>This questionnaire runs entirely on your device. Your answers and results are not transmitted or stored.</p>}</div>
  </aside>
}
