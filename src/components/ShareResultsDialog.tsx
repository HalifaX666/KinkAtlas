import { Copy, Download, Eye, FileLock2, FileText, Images, KeyRound, Share2, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { roleLibraryRoleForIdentity } from '../data/roleIdentity'
import { BrandLogo } from './BrandLogo'
import { RoleIdentityCard } from './RoleIdentityCard'
import { ViewerKeyprintPanel } from './ViewerKeyprintPanel'
import { QrTransport } from './QrTransport'
import { SimpleSharePanel } from './SimpleSharePanel'
import type { SharePackage } from '../sharing/sharePackage'
import { buildSharedDisclosurePayload, privacyReceiptForPayload } from '../capsules/capsuleData'
import { capsuleErrorMessage, createSharedDisclosureArtifact, downloadCapsuleFile, revealRequestErrorMessage, viewerRequestErrorMessage, type SharedCapsuleArtifact } from '../capsules/capsuleTransport'
import { buildRevealRequestDisclosure, revealRequestPrivacyReceipt, revealRequestSectionLabels } from '../capsules/revealRequestDecision'
import type { RevealRequest, RevealRequestSectionId, ViewerRequest } from '../capsules/capsuleTypes'
import type { ViewerLockedArtifact } from '../capsules/viewerLockedTransport'
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

type ShareMode = 'cards' | 'quick' | 'full' | 'capsule'
type CapsuleLockMode = 'secret' | 'viewer-locked'

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
  { id: 'cards', label: 'Public Card', description: 'Create public, shareable images from your current role set.', icon: Images },
  { id: 'quick', label: 'Quick Summary', description: 'Copy a short version for a post or message.', icon: Copy },
  { id: 'full', label: 'Full Reflection', description: 'Copy a detailed, potentially sensitive report.', icon: FileText },
  { id: 'capsule', label: 'Encrypted Capsule', description: 'Create a Secret Capsule or Viewer-Locked Capsule.', icon: FileLock2 },
]

export function ShareResultsDialog({ data, sharePackage, onClose }: { data: ShareResultsData; sharePackage?: SharePackage; onClose: () => void }) {
  const roleCards = useMemo(() => getShareableRoleSet(data.roleSet, data.roleResults), [data.roleSet, data.roleResults])
  const [mode, setMode] = useState<ShareMode>('cards')
  const [selectedIds, setSelectedIds] = useState(() => new Set(roleCards.map((role) => role.id)))
  const [overviewConfidence, setOverviewConfidence] = useState(true)
  const [options, setOptions] = useState<ShareOptions>(defaultShareOptions)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [capsuleSections, setCapsuleSections] = useState({ currentRoleSet: true, roleDefinitions: true })
  const [capsuleLockMode, setCapsuleLockMode] = useState<CapsuleLockMode>('secret')
  const [capsuleArtifact, setCapsuleArtifact] = useState<SharedCapsuleArtifact | null>(null)
  const [viewerRequestInput, setViewerRequestInput] = useState('')
  const [viewerRequest, setViewerRequest] = useState<ViewerRequest | null>(null)
  const [viewerArtifact, setViewerArtifact] = useState<ViewerLockedArtifact | null>(null)
  const [revealRequestInput, setRevealRequestInput] = useState('')
  const [revealRequest, setRevealRequest] = useState<RevealRequest | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const revealInputRef = useRef<HTMLTextAreaElement>(null)
  const revealReviewRef = useRef<HTMLHeadingElement>(null)
  const revealResponseRef = useRef<HTMLHeadingElement>(null)
  const hadRevealRequestRef = useRef(false)
  const selectedRoles = roleCards.filter((role) => selectedIds.has(role.id))
  const quickSummary = useMemo(() => buildQuickSummary(data), [data])
  const fullReflection = useMemo(() => buildFullReflection(data, options), [data, options])
  const selectedRevealSections = useMemo(() => (['currentRoleSet', 'roleDefinitions'] as const)
    .filter((section) => capsuleSections[section]), [capsuleSections])
  const capsulePayload = useMemo(() => revealRequest
    ? buildRevealRequestDisclosure(data.roleSet, revealRequest, selectedRevealSections)
    : buildSharedDisclosurePayload(data.roleSet, capsuleSections), [data.roleSet, capsuleSections, revealRequest, selectedRevealSections])
  const capsuleReceipt = useMemo(() => privacyReceiptForPayload(capsulePayload), [capsulePayload])
  const revealReceipt = useMemo(() => revealRequest
    ? revealRequestPrivacyReceipt(revealRequest, capsulePayload)
    : null, [capsulePayload, revealRequest])

  useEffect(() => setSelectedIds(new Set(roleCards.map((role) => role.id))), [roleCards])

  useEffect(() => {
    if (revealRequest) {
      hadRevealRequestRef.current = true
      revealReviewRef.current?.focus()
      return
    }
    if (hadRevealRequestRef.current) {
      hadRevealRequestRef.current = false
      revealInputRef.current?.focus()
    }
  }, [revealRequest])

  useEffect(() => {
    if (revealRequest && viewerArtifact) revealResponseRef.current?.focus()
  }, [revealRequest, viewerArtifact])

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
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])') ?? [])]
        .filter((element) => element.tagName === 'SUMMARY' || !element.closest('details:not([open])'))
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

  const download = (file: File, alternative: string) => {
    try {
      downloadCapsuleFile(file)
      setStatus(`${file.name} download started.`)
    } catch {
      setStatus(`Download is unavailable. ${alternative}`)
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

  const createEncryptedDisclosure = async () => {
    setBusy(true); setCapsuleArtifact(null); setStatus('')
    try {
      setCapsuleArtifact(await createSharedDisclosureArtifact(capsulePayload))
      setStatus('Secret Capsule created locally. Share the encrypted Capsule and secret separately.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const validateRecipientRequest = async (input = viewerRequestInput) => {
    setBusy(true); setViewerRequest(null); setViewerArtifact(null); setStatus('')
    try {
      const { parseViewerRequestInput } = await import('../capsules/viewerLockedTransport')
      const request = await parseViewerRequestInput(input)
      setViewerRequest(request)
      setStatus('Viewer Request validated locally. Compare the Four-Word Keyprint through a separate trusted channel when substitution matters.')
    } catch (error) {
      setStatus(viewerRequestErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const createViewerLockedDisclosure = async () => {
    if (!viewerRequest) return
    setBusy(true); setViewerArtifact(null); setStatus('')
    try {
      const { createViewerLockedDisclosureArtifact } = await import('../capsules/viewerLockedTransport')
      setViewerArtifact(await createViewerLockedDisclosureArtifact(capsulePayload, viewerRequest))
      setStatus('Viewer-Locked disclosure created locally. The recipient needs the matching private key in their browser profile; no secret was generated.')
    } catch (error) {
      setStatus(capsuleErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const loadRecipientRequestFile = async (file: File) => {
    setBusy(true); setViewerRequest(null); setViewerArtifact(null); setStatus('')
    try {
      const { readViewerRequestFile, createViewerRequestArtifact } = await import('../capsules/viewerLockedTransport')
      const request = await readViewerRequestFile(file)
      const artifact = await createViewerRequestArtifact(request)
      setViewerRequestInput(artifact.serializedRequest)
      setViewerRequest(request)
      setStatus('Viewer Request file validated locally. Compare the Four-Word Keyprint through a separate trusted channel when substitution matters.')
    } catch (error) {
      setStatus(viewerRequestErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const applyRevealRequest = (request: RevealRequest, serialized: string) => {
    const requested = new Set<RevealRequestSectionId>(request.requestedSections)
    setRevealRequestInput(serialized)
    setRevealRequest(request)
    setCapsuleLockMode('viewer-locked')
    setViewerRequestInput('')
    setViewerRequest(request.recipientViewerRequest)
    setCapsuleSections({
      currentRoleSet: requested.has('currentRoleSet'),
      roleDefinitions: requested.has('roleDefinitions'),
    })
    setCapsuleArtifact(null)
    setViewerArtifact(null)
    setStatus('Reveal Request validated locally. Review the requested sections and choose what, if anything, to share.')
  }

  const validateRevealRequestInput = async (input = revealRequestInput) => {
    setBusy(true); setRevealRequest(null); setViewerArtifact(null); setStatus('')
    try {
      const { parseRevealRequestInput, createRevealRequestArtifact } = await import('../capsules/revealRequestTransport')
      const request = await parseRevealRequestInput(input)
      const artifact = await createRevealRequestArtifact(request)
      applyRevealRequest(request, artifact.serializedRequest)
    } catch (error) {
      setStatus(revealRequestErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const loadRevealRequestFile = async (file: File) => {
    setBusy(true); setRevealRequest(null); setViewerArtifact(null); setStatus('')
    try {
      const { readRevealRequestFile, createRevealRequestArtifact } = await import('../capsules/revealRequestTransport')
      const request = await readRevealRequestFile(file)
      const artifact = await createRevealRequestArtifact(request)
      applyRevealRequest(request, artifact.serializedRequest)
    } catch (error) {
      setStatus(revealRequestErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const declineRevealRequest = () => {
    setRevealRequest(null)
    setRevealRequestInput('')
    setViewerRequest(null)
    setViewerRequestInput('')
    setViewerArtifact(null)
    setCapsuleSections({ currentRoleSet: true, roleDefinitions: true })
    setStatus('Reveal Request declined locally. No disclosure artifact was created and nothing was sent.')
  }

  const cardCount = selectedRoles.length
  const exportLabel = cardCount === 1 ? 'Export card' : `Export ${cardCount} cards`
  const shareLabel = cardCount === 1 ? 'Share card' : `Share ${cardCount} cards`

  // The backdrop is a mouse convenience only; Escape and the focused close button provide keyboard-equivalent controls.
  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
  return <div className="share-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} ref={dialogRef}>
      <header><BrandLogo size="footer" /><button className="quiet-button share-close" type="button" onClick={onClose} aria-label="Close export and sharing dialog" ref={closeRef}><X /></button></header>
      <div className="share-heading"><span className="eyebrow">You choose what leaves this tab</span><h2 id={titleId}>Share your KinkAtlas</h2><p id={descriptionId}>Your cards and historical result are included. Raw assessment answers are not.</p></div>

      {sharePackage && <SimpleSharePanel sharePackage={sharePackage} />}

      <details className="advanced-privacy-options">
        <summary>Advanced privacy options</summary>
        <div className="advanced-privacy-options-content">
      <p className="advanced-privacy-note">You can still save legacy local exports or use them to manually post to FetLife. KinkAtlas never connects to or posts to a FetLife profile.</p>

      <div className="share-mode-grid" aria-label="What would you like to share?">{modes.map((item) => {
        const Icon = item.icon
        return <button type="button" key={item.id} className={mode === item.id ? 'active' : ''} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setStatus('') }}><Icon aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.description}</small></span></button>
      })}</div>

      {mode === 'cards' && <section className="share-mode-panel" aria-labelledby="role-cards-heading">
        <div className="share-panel-heading"><div><h3 id="role-cards-heading">Select roles for Public Cards</h3><p>Public Cards are not confidential. These roles follow the current order of Your Role Set, and each selection becomes its own 1080 × 1350 PNG card.</p></div><div className="selection-actions"><button type="button" className="quiet-button" onClick={() => setSelectedIds(new Set(roleCards.map((role) => role.id)))}>Select all</button><button type="button" className="quiet-button" onClick={() => setSelectedIds(new Set())}>Clear all</button></div></div>
        <p className="selection-count" aria-live="polite">{cardCount} of {roleCards.length} roles selected</p>
        <fieldset className="role-card-options"><legend className="sr-only">Roles to export</legend>{roleCards.map((role) => {
          const libraryRole = roleLibraryRoleForIdentity(role.roleId)
          if (!libraryRole) return null
          const details = [role.sourceLabel, ...role.assessmentDetails].join(' · ')
          return <label key={role.id}><input type="checkbox" checked={selectedIds.has(role.id)} onChange={(event) => toggleRole(role.id, event.target.checked)} /><div className="role-identity-card-export" aria-hidden="true"><RoleIdentityCard role={libraryRole} variant="preview" presentation={role} headingLevel={4} showLink={false} staticFooter={`kinkatlas.ca${role.publicPath}`} /></div><span><strong>{role.name}</strong><small>{details}</small></span></label>
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

      {mode === 'capsule' && <section className="share-mode-panel" aria-labelledby="encrypted-disclosure-heading">
        <div className="share-panel-heading"><div><h3 id="encrypted-disclosure-heading">Create an encrypted disclosure</h3><p>This read-only Capsule contains only the sections listed below. Raw assessment answers, restore state, and navigation cannot be selected.</p></div></div>
        <details className="viewer-request-import reveal-request-import">
          <summary>Review a request for more details</summary>
          <p>A Reveal Request asks whether you are willing to share selected results. You can share all, some, or none. Importing it does not create, copy, download, or send a disclosure.</p>
          <label><span>Reveal Request link or text</span><textarea ref={revealInputRef} rows={5} value={revealRequestInput} onChange={(event) => { setRevealRequestInput(event.target.value); setRevealRequest(null); setViewerRequest(null); setViewerArtifact(null) }} /></label>
          <label className="capsule-file-input"><span>Or choose a Reveal Request file</span><input type="file" accept=".kinkatlas-reveal-request,application/vnd.kinkatlas.reveal-request" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRevealRequestFile(file) }} /></label>
          <button className="button secondary" type="button" disabled={!revealRequestInput.trim() || busy} onClick={() => void validateRevealRequestInput()}><Eye size={17} />Review request</button>
        </details>
        {!revealRequest && <fieldset className="capsule-lock-options"><legend>Choose how the Capsule is unlocked</legend>
          <label><input type="radio" name="capsule-lock-mode" value="secret" checked={capsuleLockMode === 'secret'} onChange={() => { setCapsuleLockMode('secret'); setViewerArtifact(null); setStatus('') }} /><span><FileLock2 aria-hidden="true" /><strong>Secret Capsule</strong><small>Share the encrypted Capsule and a separate secret.</small></span></label>
          <label><input type="radio" name="capsule-lock-mode" value="viewer-locked" checked={capsuleLockMode === 'viewer-locked'} onChange={() => { setCapsuleLockMode('viewer-locked'); setCapsuleArtifact(null); setStatus('') }} /><span><KeyRound aria-hidden="true" /><strong>Viewer-Locked Capsule</strong><small>Lock it to a recipient’s public Viewer Request. No decryption secret is created.</small></span></label>
        </fieldset>}
        {revealRequest && <div className="viewer-request-import reveal-request-review">
          <span className="eyebrow">Recipient-bound request</span>
          <h4 ref={revealReviewRef} tabIndex={-1}>Choose what to share</h4>
          <p>The response will be a Viewer-Locked Capsule for the exact public key in this request. The Keyprint identifies that browser key, not a verified person.</p>
          <div><strong>Requested</strong><ul>{revealRequest.requestedSections.map((section) => <li key={section}>{revealRequestSectionLabels[section]}</li>)}</ul></div>
          <ViewerKeyprintPanel request={revealRequest.recipientViewerRequest} onCopy={copy} recipient />
        </div>}
        {!revealRequest && capsuleLockMode === 'viewer-locked' && <div className="viewer-request-import">
          <label><span>Recipient Viewer Request link or text</span><textarea rows={5} value={viewerRequestInput} onChange={(event) => { setViewerRequestInput(event.target.value); setViewerRequest(null); setViewerArtifact(null) }} /></label>
          <label className="capsule-file-input"><span>Or choose a Viewer Request file</span><input type="file" accept=".kinkatlas-viewer-request,application/vnd.kinkatlas.viewer-request" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadRecipientRequestFile(file) }} /></label>
          <button className="button secondary" type="button" disabled={!viewerRequestInput.trim() || busy} onClick={() => void validateRecipientRequest()}><KeyRound size={17} />Validate Viewer Request</button>
          {viewerRequest && <ViewerKeyprintPanel request={viewerRequest} onCopy={copy} recipient />}
        </div>}
        <fieldset className="share-options"><legend>{revealRequest ? 'Select requested sections to share' : 'Include in the encrypted disclosure'}</legend>
          <label><input type="checkbox" checked={capsuleSections.currentRoleSet} disabled={Boolean(revealRequest && !revealRequest.requestedSections.includes('currentRoleSet'))} onChange={(event) => { setCapsuleSections((current) => ({ ...current, currentRoleSet: event.target.checked })); setCapsuleArtifact(null); setViewerArtifact(null) }} /><span><strong>Current Role Set</strong><small>Your current labels, order, and primary role.</small></span></label>
          <label><input type="checkbox" checked={capsuleSections.roleDefinitions} disabled={Boolean(revealRequest && !revealRequest.requestedSections.includes('roleDefinitions'))} onChange={(event) => { setCapsuleSections((current) => ({ ...current, roleDefinitions: event.target.checked })); setCapsuleArtifact(null); setViewerArtifact(null) }} /><span><strong>Role definitions</strong><small>Historical definition text for roles in your current set.</small></span></label>
        </fieldset>
        {revealReceipt
          ? <div className="privacy-receipt reveal-request-receipt"><h4>Privacy receipt</h4><div><strong>Requested</strong><ul>{revealReceipt.requested.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Selected</strong>{revealReceipt.selected.length ? <ul>{revealReceipt.selected.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Nothing selected</p>}</div><div><strong>Excluded</strong><ul>{revealReceipt.excluded.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
          : <div className="privacy-receipt"><h4>Privacy receipt</h4><div><strong>Included</strong><ul>{capsuleReceipt.included.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>Not included</strong><ul>{capsuleReceipt.notIncluded.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
        <div className="share-actions">{!revealRequest && capsuleLockMode === 'secret'
          ? <button className="button primary" type="button" disabled={busy || (!capsuleSections.currentRoleSet && !capsuleSections.roleDefinitions)} onClick={createEncryptedDisclosure}><FileLock2 size={17} />Create encrypted disclosure</button>
          : <button className="button primary" type="button" disabled={busy || !viewerRequest || (!capsuleSections.currentRoleSet && !capsuleSections.roleDefinitions)} onClick={createViewerLockedDisclosure}><KeyRound size={17} />{revealRequest ? 'Share selected' : 'Create Viewer-Locked Capsule'}</button>}
          {revealRequest && <button className="button secondary" type="button" disabled={busy} onClick={declineRevealRequest}>Decline</button>}
        </div>
        {!revealRequest && capsuleLockMode === 'secret' && capsuleArtifact && <div className="capsule-artifact">
          <p><strong>Both parts are required.</strong> Send the encrypted Capsule and secret through separate channels when practical; sending both together weakens that separation.</p>
          <label><span>Encrypted Capsule link</span><textarea readOnly rows={4} value={capsuleArtifact.link} /></label>
          <label><span>Encrypted Capsule text</span><textarea readOnly rows={4} value={capsuleArtifact.serializedEnvelope} /></label>
          <label><span>Secret — never embedded in the link</span><input readOnly value={capsuleArtifact.secret} /></label>
          <div className="share-actions">
            <button className="button secondary" type="button" onClick={() => copy(capsuleArtifact.link, 'Encrypted Capsule link copied.')}><Copy size={17} />Copy Capsule link</button>
            <button className="button secondary" type="button" onClick={() => copy(capsuleArtifact.serializedEnvelope, 'Encrypted Capsule text copied.')}><Copy size={17} />Copy encrypted text</button>
            <button className="button secondary" type="button" onClick={() => copy(capsuleArtifact.secret, 'Capsule secret copied.')}><Copy size={17} />Copy secret</button>
            <button className="button secondary" type="button" onClick={() => download(capsuleArtifact.file, 'Copy the Capsule link or encrypted text instead.')}><Download size={17} />Download encrypted file</button>
          </div>
          <QrTransport
            transportText={capsuleArtifact.link}
            artifactType="secret-capsule"
            accessibleLabel="QR code for encrypted Secret Capsule"
            description="This QR contains only the encrypted Capsule link. It does not include the secret; share the secret separately."
            downloadName="kinkatlas-encrypted-capsule-qr.svg"
          />
        </div>}
        {capsuleLockMode === 'viewer-locked' && viewerArtifact && <div className="capsule-artifact">
          <h4 ref={revealResponseRef} tabIndex={revealRequest ? -1 : undefined}>{revealRequest ? 'Viewer-Locked response ready' : 'Viewer-Locked Capsule ready'}</h4>
          <p><strong>Locked to the validated Viewer Request.</strong> The matching non-exportable private key must be present in the recipient’s browser profile. The link alone is not enough.</p>
          <label><span>Viewer-Locked Capsule link</span><textarea readOnly rows={4} value={viewerArtifact.link} /></label>
          <label><span>Viewer-Locked Capsule text</span><textarea readOnly rows={4} value={viewerArtifact.serializedEnvelope} /></label>
          <div className="share-actions">
            <button className="button secondary" type="button" onClick={() => copy(viewerArtifact.link, 'Viewer-Locked Capsule link copied.')}><Copy size={17} />Copy Capsule link</button>
            <button className="button secondary" type="button" onClick={() => copy(viewerArtifact.serializedEnvelope, 'Viewer-Locked Capsule text copied.')}><Copy size={17} />Copy encrypted text</button>
            <button className="button secondary" type="button" onClick={() => download(viewerArtifact.file, 'Copy the Capsule link or encrypted text instead.')}><Download size={17} />Download encrypted file</button>
          </div>
          <QrTransport
            transportText={viewerArtifact.link}
            artifactType="viewer-locked-capsule"
            accessibleLabel="QR code for Viewer-Locked Capsule"
            description="This QR contains the encrypted Viewer-Locked Capsule link. The matching private key is still required, and the QR does not prove who supplied the Viewer Request."
            downloadName="kinkatlas-viewer-locked-capsule-qr.svg"
          />
          <p>This protects against link possession but does not authenticate the sender or prove who supplied a Viewer Request.</p>
        </div>}
      </section>}

        </div>
      </details>

      <div className="share-disclaimer"><strong>Sharing is not consent.</strong><p>Sharing a result does not communicate consent, availability, boundaries, or agreement to any activity.</p>{mode === 'full' && options.boundaries && <p>Boundaries shown here reflect the selections made when this result was generated and should never replace direct communication.</p>}</div>
      <p className="share-status" role="status" aria-live="polite">{status}</p>
    </div>
  </div>
}
