import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RoleIdentityCard } from '../components/RoleIdentityCard'
import { searchRoleLibrary } from '../engine/roleProfileSearch'
import { roleLibrary } from '../taxonomy/roleLibrary'

const PAGE_SIZE = 48
const UNFAMILIED = '__unfamilied__'

export function RoleLibraryPage() {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('')
  const [sort, setSort] = useState<'ascending' | 'descending'>('ascending')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const familyOptions = useMemo(() => Object.entries(roleLibrary.families)
    .map(([id, label]) => ({ id, label, count: roleLibrary.roles.filter((role) => role.familyIds.includes(id)).length }))
    .filter((option) => option.count > 0)
    .sort((left, right) => left.label.localeCompare(right.label)), [])

  const filteredRoles = useMemo(() => {
    const searched = query.trim()
      ? searchRoleLibrary(roleLibrary.roles, query, roleLibrary.roles.length)
      : [...roleLibrary.roles]
    return searched
      .filter((role) => !family || (family === UNFAMILIED ? role.familyIds.length === 0 : role.familyIds.includes(family)))
      .sort((left, right) => {
        const comparison = left.label.localeCompare(right.label, 'en-US', { sensitivity: 'base' })
        return sort === 'ascending' ? comparison : -comparison
      })
  }, [family, query, sort])

  const displayedRoles = filteredRoles.slice(0, visibleCount)

  return <div className="role-library-page">
    <header className="role-library-hero page-width">
      <span className="eyebrow">Role Library</span>
      <h1>Explore the language of kink.</h1>
      <p>Browse role vocabulary without taking the assessment. A label can offer language for reflection; opening one never assigns it to you.</p>
      <div className="role-library-principles" aria-label="About the Role Library">
        <span>Browse role vocabulary</span>
        <span>No quiz required</span>
        <span>Identity stays yours</span>
      </div>
    </header>

    <section className="section page-width role-library-browser" aria-labelledby="browse-role-library-heading">
      <div className="section-heading">
        <span className="eyebrow">Browse the collection</span>
        <h2 id="browse-role-library-heading">Find useful vocabulary</h2>
        <p>Search names and reviewed explanations, or narrow the collection through its editorial families.</p>
      </div>
      <div className="role-library-controls">
        <label className="role-library-search" htmlFor="role-library-search">
          <span>Search roles</span>
          <span><Search size={18} /><input id="role-library-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE) }} placeholder="Try rope, playful, service…" /></span>
        </label>
        <label htmlFor="role-library-family"><span>Family</span><select id="role-library-family" value={family} onChange={(event) => { setFamily(event.target.value); setVisibleCount(PAGE_SIZE) }}><option value="">All families</option>{familyOptions.map((option) => <option key={option.id} value={option.id}>{option.label} ({option.count})</option>)}<option value={UNFAMILIED}>No reviewed family</option></select></label>
        <label htmlFor="role-library-sort"><span>Order</span><select id="role-library-sort" value={sort} onChange={(event) => { setSort(event.target.value as 'ascending' | 'descending'); setVisibleCount(PAGE_SIZE) }}><option value="ascending">A–Z</option><option value="descending">Z–A</option></select></label>
      </div>
      {(query || family) && <div className="role-library-results-heading" aria-live="polite">
        <strong>{filteredRoles.length} matching {filteredRoles.length === 1 ? 'role' : 'roles'}</strong>
        <button type="button" className="quiet-button" onClick={() => { setQuery(''); setFamily(''); setVisibleCount(PAGE_SIZE) }}>Clear filters</button>
      </div>}
      {displayedRoles.length > 0 ? <div className="role-library-grid">{displayedRoles.map((role) => <RoleIdentityCard role={role} key={role.id} />)}</div> : <div className="empty-panel"><p>No roles match those filters. Try a broader term or another family.</p></div>}
      {visibleCount < filteredRoles.length && <div className="role-library-more"><p>{query || family ? `Showing ${displayedRoles.length} matching roles.` : `Showing ${displayedRoles.length} roles.`}</p><button type="button" className="button secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Show more roles</button></div>}
    </section>
  </div>
}
