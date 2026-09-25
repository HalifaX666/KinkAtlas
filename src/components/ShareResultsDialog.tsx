import { Copy, Download, FileText, Images, Share2, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BrandLogo } from './BrandLogo'
import {
  buildFullReflection,
  buildQuickSummary,
  copyText,
  defaultShareOptions,
  exportOverviewCard,
  exportRoleCards,
  getShareableRoleSet,
  shareRoleCards,
  type ShareOptions,
  type ShareResultsData,
} from '../engine/shareResults'

type ShareMode = 'cards' | 'quick' | 'full'

const shareChoices: { key: keyof ShareOptions; label: string; detail: string; sensitive?: boolean }[] = [
  { key: 'roles', label: 'Your Role Set', detail: 'The current roles and order you chose.' },
  { key: 'alignment', label: 'Alignment labels', detail: 'How closely your answers resemble each role’s themes.' },
  { key: 'confidence', label: 'Confidence', detail: 'How much relevant information was available, not the ranking order.' },
  { key: 'readiness', label: 'Reflection', detail: 'Knowledge and attitude observations.', sensitive: true },
  { key: 'blindSpots', label: 'Potential blind spots', detail: 'Response themes with clear context and severity.', sensitive: true },
  { key: 'boundaries', label: 'Wants & boundaries', detail: 'Your current activity selections.', sensitive: true },
  { key: 'negotiation', label: 'Negotiation preferences', detail: 'Your selected communication preferences.', sensitive: true },
]

const modes: { id: ShareMode; label: string; description: string; icon: typeof Images }[] = [
  { id: 'cards', label: 'Role Cards', description: 'Create individual images from your current role set.', icon: Images },
  { id: 'quick', label: 'Quick Summary', description: 'Copy a short version for a post or message.', icon: Copy },
  { id: 'full', label: 'Full Reflection', description: 'Copy a detailed, potentially sensitive report.', icon: FileText },
]

export function ShareResultsDialog({ data, onClose }: { data: ShareResultsData; onClose: () => void }) {
  const roleCards = useMemo(() => getShareableRoleSet(data.roleSet, data.roleResults), [data.roleSet, data.roleResults])
  const [mode, setMode] = useState<ShareMode>('cards')
  const [selectedIds, setSelectedIds] = useState(() => new Set(roleCards.map((role) => role.id)))
  const [overviewConfidence, setOverviewConfidence] = useState(true)
  const [options, setOptions] = useState<ShareOptions>(defaultShareOptions)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const selectedRoles = roleCards.filter((role) => selectedIds.has(role.id))
  const quickSummary = useMemo(() => buildQuickSummary(data), [data])
  const fullReflection = useMemo(() => buildFullReflection(data, options), [data, options])

  useEffect(() => setSelectedIds(new Set(roleCards.map((role) => role.id))), [roleCards])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const updateOption = (key: keyof ShareOptions, checked: boolean) => setOptions((current) => ({ ...current, [key]: checked }))
  const toggleRole = (id: string, checked: boolean) => setSelectedIds((current) => {
    const next = new Set(current)
    if (checked) next.add(id)
    else next.delete(id)
    return next
  })

  const copy = async (text: string, success: string) => {
    try {
      await copyText(text)
      setStatus(success)
    } catch {
      setStatus('Copy is not available in this browser. You can select the preview text manually.')
    }
  }

  const exportCards = async () => {
    setBusy(true)
    try {
      const count = await exportRoleCards(selectedRoles)
      setStatus(count === 1 ? 'Card exported.' : `${count} cards exported.`)
    } catch {
      setStatus('Image creation is not supported in this browser.')
    } finally {
      setBusy(false)
    }
  }

  const shareCards = async () => {
    setBusy(true)
    try {
      const result = await shareRoleCards(selectedRoles)
      setStatus(result === 'shared' ? 'Share sheet opened.' : 'Sharing images is not supported in this browser. The cards were exported instead.')
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setStatus('Sharing did not complete. You can export the cards instead.')
    } finally {
      setBusy(false)
    }
  }

  const exportOverview = async () => {
    setBusy(true)
    try {
      await exportOverviewCard(data, { alignment: true, confidence: overviewConfidence })
      setStatus('Overview card exported.')
    } catch {
      setStatus('Image creation is not supported in this browser.')
    } finally {
      setBusy(false)
    }
  }

  const cardCount = selectedRoles.length
  const exportLabel = cardCount === 1 ? 'Export card' : `Export ${cardCount} cards`
  const shareLabel = cardCount === 1 ? 'Share card' : `Share ${cardCount} cards`

  return <div className="share-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} ref={dialogRef}>
      <header><BrandLogo size="footer" /><button className="quiet-button share-close" type="button" onClick={onClose} aria-label="Close export and sharing dialog" ref={closeRef}><X /></button></header>
      <div className="share-heading"><span className="eyebrow">Private by design</span><h2 id={titleId}>Export & Share</h2><p id={descriptionId}>Create images from your current role set to save privately, share with someone you trust, or manually post to FetLife. Everything is generated locally; KinkAtlas never connects to or posts to a FetLife profile.</p></div>

      <div className="share-mode-grid" aria-label="What would you like to share?">{modes.map((item) => {
        const Icon = item.icon
        return <button type="button" key={item.id} className={mode === item.id ? 'active' : ''} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setStatus('') }}><Icon aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.description}</small></span></button>
      })}</div>

      {mode === 'cards' && <section className="share-mode-panel" aria-labelledby="role-cards-heading">
        <div className="share-panel-heading"><div><h3 id="role-cards-heading">Select roles to export</h3><p>These roles follow the current order of Your Role Set. Each selection becomes its own 1080 × 1350 PNG card.</p></div><div className="selection-actions"><button type="button" className="quiet-button" onClick={() => setSelectedIds(new Set(roleCards.map((role) => role.id)))}>Select all</button><button type="button" className="quiet-button" onClick={() => setSelectedIds(new Set())}>Clear all</button></div></div>
        <p className="selection-count" aria-live="polite">{cardCount} of {roleCards.length} roles selected</p>
        <fieldset className="role-card-options"><legend className="sr-only">Roles to export</legend>{roleCards.map((role) => {
          const details = role.source === 'user-selected'
            ? 'Added by you · No assessment score or confidence'
            : role.alignment === undefined && role.confidence === undefined
              ? 'Assessment suggestion · No alignment score or confidence'
              : `${role.alignment} · ${role.confidence}`
          return <label key={role.id}><input type="checkbox" checked={selectedIds.has(role.id)} onChange={(event) => toggleRole(role.id, event.target.checked)} /><span className="role-card-mini" aria-hidden="true"><small>Kink Atlas</small><strong>{role.name}</strong><em>{details}</em></span><span><strong>{role.name}</strong><small>{details}</small></span></label>
        })}</fieldset>
        {!roleCards.length && <div className="empty-panel"><p>Your current role set is empty. An empty set is valid; add a role in the builder if you want to create role cards.</p></div>}
        <label className="overview-option"><input type="checkbox" checked={overviewConfidence} onChange={(event) => setOverviewConfidence(event.target.checked)} /><span>Include confidence on overview card</span></label>
        <div className="share-actions"><button className="button primary" type="button" onClick={exportCards} disabled={cardCount === 0 || busy}><Download size={17} />{exportLabel}</button><button className="button secondary" type="button" onClick={shareCards} disabled={cardCount === 0 || busy}><Share2 size={17} />{shareLabel}</button><button className="button secondary" type="button" onClick={exportOverview} disabled={busy}><Images size={17} />Export overview card</button></div>
      </section>}

      {mode === 'quick' && <section className="share-mode-panel" aria-labelledby="quick-summary-heading"><div className="share-panel-heading"><div><h3 id="quick-summary-heading">Quick Summary</h3><p>A concise role-only summary for posting or messaging. Personal reflection sections are never included.</p></div></div><details className="share-preview" open><summary>Preview quick summary</summary><pre>{quickSummary}</pre></details><div className="share-actions"><button className="button primary" type="button" onClick={() => copy(quickSummary, 'Summary copied.')}><Copy size={17} />Copy Quick Summary</button></div></section>}

      {mode === 'full' && <section className="share-mode-panel" aria-labelledby="full-reflection-heading"><div className="share-panel-heading"><div><h3 id="full-reflection-heading">Full Reflection</h3><p>This can include sensitive information. Review it before sending.</p></div></div><fieldset className="share-options"><legend>Include in the full reflection</legend>{shareChoices.map((choice) => {
        const disabled = (choice.key === 'alignment' || choice.key === 'confidence') && !options.roles
        return <label key={choice.key} className={choice.sensitive ? 'sensitive-option' : ''}><input type="checkbox" checked={options[choice.key]} disabled={disabled} onChange={(event) => updateOption(choice.key, event.target.checked)} /><span><strong>{choice.label}</strong><small>{choice.detail}{choice.sensitive ? ' Off by default.' : ''}</small></span></label>
      })}</fieldset><details className="share-preview"><summary>Preview full reflection</summary><pre>{fullReflection}</pre></details><div className="share-actions"><button className="button primary" type="button" onClick={() => copy(fullReflection, 'Full reflection copied.')}><Copy size={17} />Copy Full Reflection</button></div></section>}

      <div className="share-disclaimer"><strong>Sharing is not consent.</strong><p>Sharing a result does not communicate consent, availability, boundaries, or agreement to any activity.</p>{mode === 'full' && options.boundaries && <p>Boundaries shown here reflect the selections made when this result was generated and should never replace direct communication.</p>}</div>
      <p className="share-status" role="status" aria-live="polite">{status}</p>
    </div>
  </div>
}
