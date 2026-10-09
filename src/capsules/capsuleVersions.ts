export const ASSESSMENT_SCHEMA_VERSION = 1 as const

// This is an intentional semantic boundary, independent of package releases.
// Changes to questions, scoring, evidence, routing, or recommendation semantics
// must deliberately advance it; CSS, copy, and layout changes must not.
export const ASSESSMENT_ENGINE_REVISION = 'kinkatlas-assessment-engine-1' as const

export const ROLE_LIBRARY_SCHEMA_VERSION = 2 as const

// SHA-256 of canonical JSON from role-library.source.json (object keys sorted,
// array order retained). A focused test recomputes it from the canonical source.
export const ROLE_LIBRARY_REVISION = 'sha256:28e0dcf6d531573d6b8d60e72046006016515e542695bef4ffcbd71ae2f9e712' as const
