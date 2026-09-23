import { ArrowDown, ArrowUp, Clipboard, Crown, Plus, RefreshCw, Search, Trash2, Undo2, X } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { roleLibrary, roleLibraryRoleById } from "../taxonomy/roleLibrary";
import { addRoleProfileEntry, buildEditableRoleProfileEntries, buildRoleProfileCandidates, makeRoleProfileEntryPrimary, optimizeRoleProfile, removeRoleProfileEntry, reorderRoleProfileEntry, replaceRoleProfileEntry, roleProfileEntriesEqual, selectDisplayableRoleProfileAlternates, type EditableRoleProfileEntry } from "../engine/roleProfileOptimizer";
import { buildRoleLabelList } from "../engine/roleProfileExport";
import { searchRoleLibrary } from "../engine/roleProfileSearch";
import { buildRelatedRoleProfiles } from "../engine/roleProfileExploration";
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
  const selectedRoleById = useMemo(() => new Map(selectedRoles.map((role) => [role.roleId, role])), [selectedRoles]);
  const recommendationById = useMemo(() => new Map(optimization.recommendations.map((item) => [item.candidate.roleId, item])), [optimization]);
  const relatedRoles = useMemo(() => buildRelatedRoleProfiles(selectedRoles.map((role) => role.roleId).sort((left, right) => left.localeCompare(right))), [selectedRoles]);
  const searchResults = useMemo(() => searchRoleLibrary(roleLibrary.roles, query), [query]);
  const omittedAlternates = selectDisplayableRoleProfileAlternates(optimization.alternates);
  const roleSetMatchesSuggestion = roleProfileEntriesEqual(selectedRoles, initialRoles);

  useEffect(() => onRoleSetChange?.(selectedRoles), [onRoleSetChange, selectedRoles]);

  const restoreSuggestedSet = () => {
    setSelectedRoles(initialRoles.map((role) => ({ ...role })));
    setReplacementRoleId(undefined);
    setStatus("Suggested role set restored.");
  };

  const cancelReplacement = () => {
    setReplacementRoleId(undefined);
    setStatus("Replacement cancelled.");
  };

  const addRole = (roleId: string, label: string, definition?: string) => {
    if (replacementRoleId) {
      setSelectedRoles((current) => replaceRoleProfileEntry(current, replacementRoleId, { roleId, label, source: "user-selected", definition }));
      setReplacementRoleId(undefined);
      setStatus(`${label} selected as a replacement. You can reorder it or make it primary.`);
      return;
    }
    if (selectedRoles.length >= 5) {
      setStatus("Remove a role before adding another; the role set allows at most five.");
      return;
    }
    setSelectedRoles((current) => addRoleProfileEntry(current, { roleId, label, source: "user-selected", definition }));
    setStatus(`${label} added by you.`);
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
      <div className="profile-role-set-outcome">
        <span className="eyebrow">From your assessment</span>
        <h3>Your role set is ready</h3>
        <p>KinkAtlas built a suggested starting set from roles that represent different parts of your results. Keep it as-is or make it yours before sharing; suggestions are not assignments.</p>
      </div>
      <section className="profile-recommendation-summary" aria-labelledby="role-recommendations-heading">
        <h3 id="role-recommendations-heading">Suggested role set</h3>
        <p>KinkAtlas suggested these roles from your assessment evidence. You can keep fewer or none; manually adding a role is separate from receiving an assessment suggestion.</p>
        <p className="profile-suggestion-explanation"><strong>Why these roles?</strong> KinkAtlas favors meaningful evidence while avoiding a set of near-duplicates, and may include a role that represents a distinct part of your results. Directly chosen vocabulary can shape the suggested primary. Five is a maximum, not a target; suggestions are not assignments.</p>
        {optimization.primaryExplanation && (
          <p>
            <strong>Why this suggested primary:</strong> {optimization.primaryExplanation}
          </p>
        )}
        {optimization.recommendations.length ? (
          <ol aria-label="Suggested roles">
            {optimization.recommendations.map((recommendation) => (
              <li key={recommendation.candidate.roleId}>
                <div>
                  <strong>{recommendation.candidate.label}</strong>
                  {optimization.primary?.candidate.roleId === recommendation.candidate.roleId && <span>Suggested primary</span>}
                </div>
                <p>{recommendation.explanation}</p>
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
              <p>Make it yours: reorder, replace, remove, or add roles. Shareable cards always use this current set.</p>
              <p>{selectedRoles.length} of 5 roles in your set; fewer or none is valid. The first role is primary within this role set.</p>
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
                    <span>{index === 0 ? "Primary" : `Role ${index + 1}`}</span>
                    <strong>{role.label}</strong>
                    <small>{role.source === "recommended" ? "Suggested" : "Added by you"}</small>
                    {role.source === "recommended" && recommendationById.get(role.roleId) && (
                      <details className="profile-role-reason">
                        <summary>Why suggested</summary>
                        <p>
                          {recommendationById.get(role.roleId)?.explanation} <span>{recommendationTrustLabel(recommendationById.get(role.roleId)!.candidate.evidenceType, recommendationById.get(role.roleId)!.candidate.confidence)}.</span>
                        </p>
                      </details>
                    )}
                  </div>
                  <div className="profile-role-actions">
                    {index > 0 && (
                      <button
                        type="button"
                        className="quiet-button profile-make-primary"
                        aria-label={`Make ${role.label} primary`}
                        onClick={() => {
                          setSelectedRoles((current) => makeRoleProfileEntryPrimary(current, role.roleId));
                          setStatus(`${role.label} is now primary in your role set.`);
                        }}
                      >
                        <Crown size={16} />
                        Make primary
                      </button>
                    )}
                    <button type="button" className="quiet-button" aria-label={`Move ${role.label} up`} disabled={index === 0} onClick={() => setSelectedRoles((current) => reorderRoleProfileEntry(current, index, index - 1))}>
                      <ArrowUp size={17} />
                    </button>
                    <button type="button" className="quiet-button" aria-label={`Move ${role.label} down`} disabled={index === selectedRoles.length - 1} onClick={() => setSelectedRoles((current) => reorderRoleProfileEntry(current, index, index + 1))}>
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
                        setStatus(`${role.label} removed.`);
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
                    <span>
                      <strong>{role.label}</strong>
                      <small>Related · {role.reason}</small>
                    </span>
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
                  const selectedRole = selectedRoleById.get(role.id);
                  const displayStatus = selectedRole?.source === "recommended" ? "recommended" : selectedRole ? "selected" : undefined;
                  return (
                    <li key={role.id}>
                      <div className="profile-search-copy">
                        <strong>{role.label}</strong>
                        <Suspense fallback={<small>Loading role details…</small>}>
                          <LazyRoleDefinitionDetails roleId={role.id} displayStatus={displayStatus} />
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
                  {omittedAlternates.map((alternate) => (
                    <li key={alternate.candidate.roleId}>
                      <strong>{alternate.candidate.label}</strong>
                      {alternate.reason.trim() && alternate.explanation.trim() ? (
                        <span>
                          {alternate.reason.replace("-", " ")}: {alternate.explanation}
                        </span>
                      ) : alternate.explanation.trim() ? (
                        <span>{alternate.explanation}</span>
                      ) : (
                        <span>{alternate.reason.replace("-", " ")}</span>
                      )}
                    </li>
                  ))}
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
