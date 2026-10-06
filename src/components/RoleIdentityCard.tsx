import { ArrowRight } from 'lucide-react'
import type { ElementType } from 'react'
import { Link, useInRouterContext } from 'react-router-dom'
import { roleAssessmentSupport, roleIdentityForRole, type RoleSetCardPresentation } from '../data/roleIdentity'
import { roleLibraryPath } from '../taxonomy/roleLibrarySlugs'
import type { RoleLibraryRole } from '../taxonomy/roleLibrary'
import { RoleEmblem } from './RoleEmblem'

export type RoleIdentityCardVariant = 'browse' | 'results' | 'preview' | 'detail'

interface RoleIdentityCardProps {
  role: RoleLibraryRole
  variant?: RoleIdentityCardVariant
  contextLabel?: string
  assessmentDetails?: string[]
  presentation?: RoleSetCardPresentation
  headingLevel?: 2 | 3 | 4
  showLink?: boolean
  staticFooter?: string
}

export function RoleIdentityCard({ role, variant = 'browse', contextLabel, assessmentDetails = [], presentation, headingLevel = 2, showLink = true, staticFooter }: RoleIdentityCardProps) {
  const identity = presentation ?? roleIdentityForRole(role)
  const Heading = `h${headingLevel}` as ElementType
  const inRouter = useInRouterContext()
  const path = roleLibraryPath(role)
  const visibleAttributes = identity.attributes.slice(0, variant === 'detail' ? 6 : 4)

  return <article className={`role-identity-card role-identity-card-${variant}${identity.hasCuratedEditorial ? ' has-curated-editorial' : ''}`} data-role-id={role.id}>
    <div className="role-identity-brand"><span>KinkAtlas</span></div>
    <div className="role-identity-emblem"><RoleEmblem recipe={identity.emblem} /></div>
    <div className="role-identity-copy">
      <span className="role-identity-family">{identity.familyLabel}</span>
      <Heading>{identity.label}</Heading>
      {identity.summary ? <p>{identity.summary}</p> : <p className="role-definition-unavailable">A reviewed explanation for this term is not available yet.</p>}
    </div>
    <dl className={`role-attribute-list${visibleAttributes.length ? '' : ' role-attribute-list-empty'}`} aria-hidden={visibleAttributes.length ? undefined : true}>
      {visibleAttributes.map((attribute) => <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>)}
    </dl>
    <div className="role-identity-context">
      <span>{contextLabel ?? presentation?.sourceLabel ?? roleAssessmentSupport(role)}</span>
      {(presentation?.assessmentDetails ?? assessmentDetails).map((detail) => <small key={detail}>{detail}</small>)}
    </div>
    {staticFooter
      ? <div className="role-identity-link role-identity-static-footer"><span>{staticFooter}</span></div>
      : showLink && (inRouter
        ? <Link className="role-identity-link" to={path} aria-label={`Explore ${identity.label}`}><span>Explore role</span><ArrowRight size={16} /></Link>
        : <a className="role-identity-link" href={path} aria-label={`Explore ${identity.label}`}><span>Explore role</span><ArrowRight size={16} /></a>)}
  </article>
}
