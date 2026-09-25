import { ArrowDown, ArrowUp, Clipboard, Crown, Plus, RefreshCw, Search, Trash2, Undo2, X } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { roleLibrary, roleLibraryRoleById } from "../taxonomy/roleLibrary";
import { addRoleProfileEntry, buildEditableRoleProfileEntries, buildRoleProfileCandidates, makeRoleProfileEntryPrimary, optimizeRoleProfile, removeRoleProfileEntry, reorderRoleProfileEntry, replaceRoleProfileEntry, roleProfileEntriesEqual, selectDisplayableRoleProfileAlternates, type EditableRoleProfileEntry } from "../engine/roleProfileOptimizer";
import { buildRoleLabelList } from "../engine/roleProfileExport";
import { searchRoleLibrary } from "../engine/roleProfileSearch";
import { buildRelatedRoleProfiles } from "../engine/roleProfileExploration";
import { buildRoleAssessmentExplanationMap } from "../engine/roleAssessmentExplanation";
import { preferredPrimaryRoleIdsFromRefinement } from "../engine/refinementEvidence";
import { copyText } from "../engine/shareResults";
import type { AssessmentAnswers, RoleResult } from "../types";

const LazyRoleDefinitionDetails = lazy(async () => {
  const module = await import("./RoleDefinitionDetails");
  return { default: module.RoleDefinitionDetails };
});

function recommendationTrustLabel(evidenceType: "inferred" | "direct" | "hybrid" | "explicit" | "exact-label" | "exploration", confidence?: RoleResult["confidence"]): string {
  if (evidenceType === "direct") return "Directly confirmed by you";
  if (evidenceType === "hybrid") return "Assessment evidence plus your confirmation";
  if (evidenceType === "exact-label") return "Label confirmed by you";
  if (evidenceType === "inferred") return confidence === "high" ? "Strong assessment evidence" : "Assessment evidence";
  return "Needs your confirmation";
}

export function RoleProfileBuilder({ roleResults, refinementAnswers, discoveryAnswers, embedded = false, onRoleSetChange }: { roleResults: RoleResult[]; refinementAnswers?: AssessmentAnswers["refinement"]; discoveryAnswers?: AssessmentAnswers["discovery"]; embedded?: boolean; onRoleSetChange?: (roles: EditableRoleProfileEntry[]) => void }) {
  const optimization = useMemo(() => {
    const currentRefinementAnswers = refinementAnswers ?? {};
    const currentDiscoveryAnswers = discoveryAnswers ?? {};

    return optimizeRoleProfile(buildRoleProfileCandidates(roleResults, currentRefinementAnswers, currentDiscoveryAnswers), 5, {
      preferredPrimaryRoleIds: preferredPrimaryRoleIdsFromRefinement(currentRefinementAnswers, currentDiscoveryAnswers),
    });
  }, [roleResults, refinementAnswers, discoveryAnswers]);
  const initialRoles = useMemo(() => buildEditableRoleProfileEntries(optimization), [optimization]);
  const [selectedRoles, setSelectedRoles] = useState<EditableRoleProfileEntry[]>(initialRoles);
  const [query, setQuery] = useState("");
  const [replacementRoleId, setReplacementRoleId] = useState<string>();
  const [status, setStatus] = useState("");
  const selectedIds = new Set(selectedRoles.map((role) => role.roleId));
  const recommendationById = useMemo(() => new Map(optimization.recommendations.map((item) => [item.candidate.roleId, item])), [optimization]);
  const relatedRoles = useMemo(() => buildRelatedRoleProfiles(selectedRoles.map((role) => role.roleId).sort((left, right) => left.localeCompare(right))), [selectedRoles]);
  const searchResults = useMemo(() => searchRoleLibrary(roleLibrary.roles, query), [query]);
  const omittedAlternates = selectDisplayableRoleProfileAlternates(optimization.alternates);
  const roleSetMatchesSuggestion = roleProfileEntriesEqual(selectedRoles, initialRoles);
  const assessmentExplanationByRoleId = useMemo(() => buildRoleAssessmentExplanationMap(optimization, selectedRoles), [optimization, selectedRoles]);

  useEffect(() => onRoleSetChange?.(selectedRoles), [onRoleSetChange, selectedRoles]);

  const restoreSuggestedSet = () => {
    setSelectedRoles(initialRoles.map((role) => ({ ...role })));
    setReplacementRoleId(undefined);
    setStatus("Your role set was restored to the assessment suggestion.");
  };

  const cancelReplacement = () => {
    setReplacementRoleId(undefined);
    setStatus("Replacement cancelled.");
  };

  const addRole = (roleId: string, label: string, definition?: string) => {
    if (replacementRoleId) {
      const replacedLabel = selectedRoles.find((role) => role.roleId === replacementRoleId)?.label;
      setSelectedRoles((current) => replaceRoleProfileEntry(current, replacementRoleId, { roleId, label, source: "user-selected", definition }));
      setReplacementRoleId(undefined);
      setStatus(`${replacedLabel ?? "Role"} was replaced with ${label}. The assessment suggestion is unchanged.`);
      return;
    }
    if (selectedRoles.length >= 5) {
      setStatus("Remove a role before adding another; the role set allows at most five.");
      return;
    }
    setSelectedRoles((current) => addRoleProfileEntry(current, { roleId, label, source: "user-selected", definition }));
    setStatus(`${label} was added by you. The assessment suggestion is unchanged.`);
  };
  const moveRole = (role: EditableRoleProfileEntry, from: number, to: number) => {
    setSelectedRoles((current) => reorderRoleProfileEntry(current, from, to));
    setStatus(`${role.label} moved ${to < from ? "up" : "down"} in your role set. The assessment suggestion is unchanged.`);
  };
  const copyRoles = async () => {
    const text = buildRoleLabelList(selectedRoles);
    if (!text) {
      setStatus("There are no selected roles to copy.");
      return;
    }
    try {
      await copyText(text);
      setStatus(`${selectedRoles.length} role label${selectedRoles.length === 1 ? "" : "s"} copied.`);
    } catch {
      setStatus("Copy was not available in this browser.");
    }
  };

  const content = (
    <>
      <section className="profile-recommendation-summary" aria-labelledby="role-recommendations-heading">
        <h3 id="role-recommendations-heading">Suggested role set</h3>
        <p>This is KinkAtlas’s original suggestion from your answers. Your editable role set starts here; changes below affect only what you keep and share, not this assessment output.</p>
        <details className="profile-suggestion-method">
          <summary>How KinkAtlas chose this set</summary>
          <p>KinkAtlas favors meaningful evidence while avoiding a set of near-duplicates. Five is a maximum, not a target, and every suggestion remains vocabulary for reflection—not an assignment.</p>
        </details>
        {optimization.primary && (
          <p className="profile-suggested-primary-note">
            <strong>Suggested primary:</strong> {optimization.primary.candidate.label} best represents this assessment-generated set. Choosing a different primary below will not change this original suggestion.
          </p>
        )}
        {optimization.recommendations.length ? (
          <ol aria-label="Suggested roles">
            {optimization.recommendations.map((recommendation) => (
              <li key={recommendation.candidate.roleId}>
                <div className="profile-suggestion-heading">
                  <strong>{recommendation.candidate.label}</strong>
                  {optimization.primary?.candidate.roleId === recommendation.candidate.roleId && <span>Suggested primary</span>}
                </div>
                <small>{recommendationTrustLabel(recommendation.candidate.evidenceType, recommendation.candidate.confidence)}</small>
                <Suspense fallback={<small>Loading role details…</small>}>
                  <LazyRoleDefinitionDetails roleId={recommendation.candidate.roleId} assessmentExplanation={assessmentExplanationByRoleId.get(recommendation.candidate.roleId)} />
                </Suspense>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-panel">
            <p>Your answers do not currently support an automatic role suggestion. Choosing none—or exploring labels manually—is valid.</p>
          </div>
        )}
      </section>
      <div className="profile-builder-grid">
        <section className="profile-role-editor" aria-labelledby="current-role-set-heading">
          <header className="profile-role-editor-heading">
            <div>
              <h3 id="current-role-set-heading">Your role set</h3>
              <p>Reorder, replace, remove, or add roles here. Shareable cards always use this current set.</p>
              <p>{selectedRoles.length} of 5 roles in your set; fewer or none is valid. The first role is your chosen primary.</p>
              {selectedRoles.length === 5 && <p className="profile-role-limit">Your role set is full. Remove or replace a role before adding another.</p>}
            </div>
            {!roleSetMatchesSuggestion && (
              <button type="button" className="button secondary profile-restore-button" onClick={restoreSuggestedSet}>
                <Undo2 size={16} />
                Restore suggested set
              </button>
            )}
          </header>
          {selectedRoles.length ? (
            <ol className="profile-role-list" aria-label="Current role set">
              {selectedRoles.map((role, index) => (
                <li key={role.roleId}>
                  <div>
                    <span>{index === 0 ? "Your primary" : `Role ${index + 1}`}</span>
                    <strong>{role.label}</strong>
                    <small>{role.source === "recommended" ? `Assessment suggestion · ${recommendationTrustLabel(recommendationById.get(role.roleId)?.candidate.evidenceType ?? "exploration", recommendationById.get(role.roleId)?.candidate.confidence)}` : "Added by you"}</small>
                    <Suspense fallback={<small>Loading role details…</small>}>
                      <LazyRoleDefinitionDetails roleId={role.roleId} assessmentExplanation={assessmentExplanationByRoleId.get(role.roleId)} />
                    </Suspense>
                  </div>
                  <div className="profile-role-actions">
                    {index > 0 && (
                      <button
                        type="button"
                        className="quiet-button profile-make-primary"
                        aria-label={`Make ${role.label} primary`}
                        onClick={() => {
                          setSelectedRoles((current) => makeRoleProfileEntryPrimary(current, role.roleId));
                          setStatus(`${role.label} is now your primary. KinkAtlas’s suggested primary is unchanged.`);
                        }}
                      >
                        <Crown size={16} />
                        Make primary
                      </button>
                    )}
                    <button type="button" className="quiet-button" aria-label={`Move ${role.label} up`} disabled={index === 0} onClick={() => moveRole(role, index, index - 1)}>
                      <ArrowUp size={17} />
                    </button>
                    <button type="button" className="quiet-button" aria-label={`Move ${role.label} down`} disabled={index === selectedRoles.length - 1} onClick={() => moveRole(role, index, index + 1)}>
                      <ArrowDown size={17} />
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      aria-label={`Replace ${role.label}`}
                      aria-pressed={replacementRoleId === role.roleId}
                      onClick={() => {
                        setReplacementRoleId(role.roleId);
                        setStatus(`Search role vocabulary to replace ${role.label}.`);
                      }}
                    >
                      <RefreshCw size={17} />
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      aria-label={`Remove ${role.label}`}
                      onClick={() => {
                        setSelectedRoles((current) => removeRoleProfileEntry(current, role.roleId));
                        if (replacementRoleId === role.roleId) setReplacementRoleId(undefined);
                        setStatus(`${role.label} was removed from your role set. The assessment suggestion is unchanged.`);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-panel">
              <p>No roles selected. Search the KinkAtlas role library whenever you want.</p>
            </div>
          )}
          <div className="profile-copy-actions">
            <button type="button" className="button secondary" onClick={copyRoles}>
              <Clipboard size={17} />
              Copy role labels
            </button>
          </div>
        </section>

        <div className="profile-catalog-search">
          <section className="profile-related-roles" aria-labelledby="related-roles-heading">
            <h3 id="related-roles-heading">Explore related roles</h3>
            <p>Related labels are suggestions for further exploration, not recommendations or inferred identities.</p>
            {relatedRoles.length ? (
              <ul className="profile-search-results related-role-results">
                {relatedRoles.map((role) => (
                  <li key={role.roleId}>
                    <div className="profile-search-copy">
                      <strong>{role.label}</strong>
                      <small>Related · {role.reason}</small>
                      <Suspense fallback={<small>Loading role details…</small>}>
                        <LazyRoleDefinitionDetails roleId={role.roleId} assessmentExplanation={assessmentExplanationByRoleId.get(role.roleId)} />
                      </Suspense>
                    </div>
                    <button type="button" className="quiet-button" disabled={selectedIds.has(role.roleId)} aria-label={`Add related role ${role.label}`} onClick={() => addRole(role.roleId, role.label, roleLibraryRoleById.get(role.roleId)?.definition)}>
                      <Plus size={17} />
                      {selectedIds.has(role.roleId) ? "Selected" : "Add"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No relationship-reviewed nearby roles are available for the current role set.</p>
            )}
          </section>
          <section className="profile-vocabulary-browser" aria-labelledby="role-vocabulary-heading">
            <h3 id="role-vocabulary-heading">Browse role vocabulary</h3>
            <p>Search the KinkAtlas role library and add any role that feels meaningful to you.</p>
            <label htmlFor="role-vocabulary-search">Search roles</label>
            <div className="profile-search-box">
              <Search size={18} />
              <input id="role-vocabulary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Dominant, pup, Latex…" />
            </div>
            {replacementRoleId && (
              <div className="profile-replacement-note" role="group" aria-label="Replacement mode">
                <span>Choose a role to replace <strong>{selectedRoles.find((role) => role.roleId === replacementRoleId)?.label}</strong>.</span>
                <button type="button" className="quiet-button" onClick={cancelReplacement}>
                  <X size={15} />
                  Cancel replacement
                </button>
              </div>
            )}
            {query && (
              <ul className="profile-search-results">
                {searchResults.map((role) => {
                  return (
                    <li key={role.id}>
                      <div className="profile-search-copy">
                        <strong>{role.label}</strong>
                        <Suspense fallback={<small>Loading role details…</small>}>
                          <LazyRoleDefinitionDetails roleId={role.id} assessmentExplanation={assessmentExplanationByRoleId.get(role.id)} />
                        </Suspense>
                      </div>
                      <button type="button" className="quiet-button" disabled={selectedIds.has(role.id)} aria-label={`${replacementRoleId ? "Replace with" : "Add"} ${role.label}`} onClick={() => addRole(role.id, role.label, role.definition)}>
                        <Plus size={17} />
                        {selectedIds.has(role.id) ? "Selected" : replacementRoleId ? "Replace" : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {query && !searchResults.length && <p>No roles match that search.</p>}
            <details className="profile-alternates">
              <summary>Why other suggestions were not included</summary>
              {omittedAlternates.length ? (
                <ul>
                  {omittedAlternates.map((alternate) => {
                    const explanation = assessmentExplanationByRoleId.get(alternate.candidate.roleId);
                    return (
                      <li key={alternate.candidate.roleId}>
                        <strong>{alternate.candidate.label}</strong>
                        {explanation && <span><b>{explanation.heading}.</b> {explanation.message}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>No additional supported suggestions are available right now.</p>
              )}
            </details>
          </section>
        </div>
      </div>
      <p className="profile-builder-privacy">Everything stays in this tab. Copying happens only when you choose it; nothing is sent anywhere.</p>
      <p className="share-status" role="status" aria-live="polite">
        {status}
      </p>
    </>
  );

  if (embedded) return content;
  return <section className="section page-width profile-builder-section">{content}</section>;
}
