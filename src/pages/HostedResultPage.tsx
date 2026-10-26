import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SharedResultView } from '../components/SharedResultView'
import { openConsentCapsule } from '../sharing/consentCapsule'
import { getHostedContent } from '../sharing/hostedStorage'
import { validateConsentCapsuleEnvelope, type ConsentCapsuleEnvelope } from '../sharing/hostedContracts'
import { validateSharePackage, type SharePackage } from '../sharing/sharePackage'

export function HostedResultPage({ privateShare = false }: { privateShare?: boolean }) {
  const { id = '' } = useParams()
  const [pkg, setPackage] = useState<SharePackage | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setPackage(null); setError('')
      try {
        if (!/^[A-Za-z0-9_-]{22}$/u.test(id)) throw new Error('Invalid share')
        if (privateShare) {
          const envelope = await getHostedContent<ConsentCapsuleEnvelope>('consent-capsule', id)
          validateConsentCapsuleEnvelope(envelope)
          const result = await openConsentCapsule(envelope)
          if (active) setPackage(result)
        } else {
          const result = await getHostedContent<SharePackage>('quick-share', id)
          validateSharePackage(result)
          if (active) setPackage(result)
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'This shared result is unavailable.')
      }
    }
    void load()
    return () => { active = false }
  }, [id, privateShare])

  if (error) return <div className="section page-width empty-results" role="alert"><h1>Shared result unavailable</h1><p>{error}</p></div>
  if (!pkg) return <div className="section page-width empty-results" role="status" aria-live="polite"><p>{privateShare ? 'Opening ConsentCapsule™ locally…' : 'Loading shared result…'}</p></div>
  return <SharedResultView sharePackage={pkg} privateShare={privateShare} />
}
