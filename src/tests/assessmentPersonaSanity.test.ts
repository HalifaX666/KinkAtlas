import { describe, expect, it, vi } from "vitest";
import { boundaryItems } from "../data/boundaries";
import { roles } from "../data/roles";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { matchRoles } from "../engine/roleMatching";
import { addRoleProfileEntry, makeRoleProfileEntryPrimary, removeRoleProfileEntry, reorderRoleProfileEntry, replaceRoleProfileEntry, roleProfileEntriesEqual, selectDisplayableRoleProfileAlternates, type EditableRoleProfileEntry } from "../engine/roleProfileOptimizer";
import { getShareableRoleSet } from "../engine/shareResults";
import { roleLibrary } from "../taxonomy/roleLibrary";
import type { AssessmentPersona } from "./fixtures/assessmentPersonas";
import { assessmentPersonas, createAnswerRecord } from "./fixtures/assessmentPersonas";
import { evaluateAssessmentPersona, validateAssessmentPersona, validateAssessmentPersonas } from "./helpers/assessmentPersonaRunner";

const roleIds = new Set(roles.map((role) => role.id));
const publicRoleIds = new Set(roleLibrary.roles.map((role) => role.id));
const substantivePersonaIds = new Set(["balanced-authority-pattern", "directive-leaning-pattern", "receptive-leaning-pattern", "service-giving-emphasis", "service-receiving-care-emphasis", "rope-bondage-emphasis", "impact-sensation-emphasis", "care-nurturing-emphasis", "playful-resistance-emphasis", "primal-emphasis", "observing-exhibition-emphasis", "broad-exploratory-pattern", "refined-primal-submission-pattern", "refined-puppy-pattern", "refined-little-vocabulary-pattern", "refined-babygirl-vocabulary-pattern", "multiple-hard-limits-pattern"]);

function roleSnapshot(persona: AssessmentPersona) {
  return evaluateAssessmentPersona(persona).roleResults.map((result) => ({
    id: result.role.id,
    raw: result.rawScore,
    ranked: result.rankedScore,
    alignment: result.alignment,
    confidence: result.confidence,
    relevantAnswers: result.relevantAnswers,
    coverage: result.coverage,
  }));
}

function clonePersona(persona: AssessmentPersona, answers: Partial<AssessmentPersona["answers"]>): AssessmentPersona {
  return { ...persona, answers: { ...persona.answers, ...answers } };
}

function expectFinite(value: number, context: string) {
  expect(Number.isFinite(value), `${context}: expected a finite number, received ${String(value)}`).toBe(true);
}

describe("assessment persona fixture validation", () => {
  it("contains 29 completed, uniquely identified personas", () => {
    expect(assessmentPersonas).toHaveLength(29);
    expect(() => validateAssessmentPersonas(assessmentPersonas)).not.toThrow();
  });

  it("fails clearly for duplicate IDs, unknown questions, invalid options, and malformed sections", () => {
    expect(() =>
      createAnswerRecord("discovery", [
        ["d-rope", "strong"],
        ["d-rope", "no"],
      ]),
    ).toThrow("discovery: duplicate question ID d-rope");
    expect(() => validateAssessmentPersonas([assessmentPersonas[0], assessmentPersonas[0]])).toThrow("duplicate persona ID");

    const unknownQuestion = clonePersona(assessmentPersonas[0], { discovery: { ...assessmentPersonas[0].answers.discovery, "not-a-question": "strong" } });
    expect(() => validateAssessmentPersona(unknownQuestion)).toThrow("unknown question ID not-a-question");
    const invalidOption = clonePersona(assessmentPersonas[0], { readiness: { ...assessmentPersonas[0].answers.readiness, "c-ongoing-1": "not-an-option" } });
    expect(() => validateAssessmentPersona(invalidOption)).toThrow("invalid option not-an-option");
    const malformed = { ...assessmentPersonas[0], answers: { ...assessmentPersonas[0].answers, negotiation: [] } } as unknown as AssessmentPersona;
    expect(() => validateAssessmentPersona(malformed)).toThrow("malformed negotiation section");
  });
});

describe.each(assessmentPersonas)("Persona: $name", (persona) => {
  it("Invariant: evaluates the complete Results pipeline locally with valid finite structures", () => {
    const evaluation = evaluateAssessmentPersona(persona);
    const roleResultIds = evaluation.roleResults.map((result) => result.role.id);

    expect(roleResultIds.length, `${persona.id}: Role Discovery should contain the scored role catalog`).toBe(roles.length);
    expect(new Set(roleResultIds).size, `${persona.id}: Role Discovery contains duplicate roles`).toBe(roleResultIds.length);
    expect(
      roleResultIds.every((id) => roleIds.has(id)),
      `${persona.id}: Role Discovery contains an unknown role ID`,
    ).toBe(true);
    if (substantivePersonaIds.has(persona.id))
      expect(
        evaluation.roleResults.some((result) => result.relevantAnswers > 0),
        `${persona.id}: expected at least one evidenced role`,
      ).toBe(true);

    for (const [traitId, score] of Object.entries(evaluation.traitScores)) {
      if (!score) continue;
      expectFinite(score.value, `${persona.id}: trait ${traitId} value`);
      expectFinite(score.evidence, `${persona.id}: trait ${traitId} evidence`);
      expect(score.value, `${persona.id}: trait ${traitId} value below range`).toBeGreaterThanOrEqual(0);
      expect(score.value, `${persona.id}: trait ${traitId} value above range`).toBeLessThanOrEqual(1);
    }
    for (const result of evaluation.roleResults) {
      for (const [label, value] of Object.entries({ rawScore: result.rawScore, rankedScore: result.rankedScore, coverage: result.coverage, relevantAnswers: result.relevantAnswers })) expectFinite(value, `${persona.id}: role ${result.role.id} ${label}`);
      expect(result.rawScore, `${persona.id}: role ${result.role.id} raw score below range`).toBeGreaterThanOrEqual(0);
      expect(result.rawScore, `${persona.id}: role ${result.role.id} raw score above range`).toBeLessThanOrEqual(1);
      expect(result.rankedScore, `${persona.id}: role ${result.role.id} ranked score below range`).toBeGreaterThanOrEqual(0);
      expect(result.rankedScore, `${persona.id}: role ${result.role.id} ranked score above range`).toBeLessThanOrEqual(1);
      expect(result.coverage, `${persona.id}: role ${result.role.id} coverage below range`).toBeGreaterThanOrEqual(0);
      expect(result.coverage, `${persona.id}: role ${result.role.id} coverage above range`).toBeLessThanOrEqual(1);
    }

    for (let index = 1; index < evaluation.roleResults.length; index += 1) {
      const previous = evaluation.roleResults[index - 1];
      const current = evaluation.roleResults[index];
      const correctlyOrdered = previous.rankedScore > current.rankedScore || (previous.rankedScore === current.rankedScore && previous.rawScore > current.rawScore) || (previous.rankedScore === current.rankedScore && previous.rawScore === current.rawScore && previous.relevantAnswers > current.relevantAnswers) || (previous.rankedScore === current.rankedScore && previous.rawScore === current.rawScore && previous.relevantAnswers === current.relevantAnswers && previous.role.id.localeCompare(current.role.id) <= 0);
      expect(correctlyOrdered, `${persona.id}: ${previous.role.id} and ${current.role.id} violate Role Discovery ordering`).toBe(true);
    }

    const suggestedIds = evaluation.suggestedRoleSet.map((role) => role.roleId);
    expect(suggestedIds.length, `${persona.id}: Suggested Role Set exceeds five roles`).toBeLessThanOrEqual(5);
    expect(new Set(suggestedIds).size, `${persona.id}: Suggested Role Set contains duplicates`).toBe(suggestedIds.length);
    expect(
      suggestedIds.every((id) => publicRoleIds.has(id)),
      `${persona.id}: Suggested Role Set contains an unknown public role`,
    ).toBe(true);
    expect(evaluation.yourRoleSet).toEqual(evaluation.suggestedRoleSet);
    expect(evaluation.exportRoles.map((role) => role.name)).toEqual(evaluation.yourRoleSet.map((role) => role.label));

    expect(new Set(evaluation.adaptiveQuestionIds).size, `${persona.id}: adaptive selection repeated a question`).toBe(evaluation.adaptiveQuestionIds.length);
    expect(evaluation.adaptiveQuestionIds.length, `${persona.id}: adaptive selection exceeded its maximum`).toBeLessThanOrEqual(26);
    expect(new Set(evaluation.adaptiveQuestionIds), `${persona.id}: fixture answers do not match the production adaptive path`).toEqual(new Set(Object.keys(persona.answers.discovery)));
    expect(evaluation.conversationStarters).toHaveLength(Object.keys(persona.answers.negotiation).length);

    for (const competency of evaluation.readiness.competencies) {
      expectFinite(competency.value, `${persona.id}: readiness ${competency.competency} value`);
      expectFinite(competency.evidence, `${persona.id}: readiness ${competency.competency} evidence`);
      expect(competency.value).toBeGreaterThanOrEqual(0);
      expect(competency.value).toBeLessThanOrEqual(1);
    }
    expect(new Set(evaluation.readiness.blindSpots.map((spot) => spot.id)).size, `${persona.id}: duplicate reflection cues`).toBe(evaluation.readiness.blindSpots.length);
    expect(new Set(evaluation.readiness.criticalFlags.map((flag) => flag.id)).size, `${persona.id}: duplicate critical flags`).toBe(evaluation.readiness.criticalFlags.length);
    expect(new Set(evaluation.activityGuidance.map((item) => item.item.id)).size, `${persona.id}: duplicate activity guidance`).toBe(evaluation.activityGuidance.length);

    const publicResultJson = JSON.stringify({
      roleResults: evaluation.roleResults,
      suggestedRoleSet: evaluation.suggestedRoleSet,
      yourRoleSet: evaluation.yourRoleSet,
      readiness: evaluation.readiness,
      activityGuidance: evaluation.activityGuidance,
      conversationStarters: evaluation.conversationStarters,
      exportRoles: evaluation.exportRoles,
    });
    expect(publicResultJson, `${persona.id}: private source/provenance data leaked into public result structures`).not.toMatch(/sourceUrl|provenance|rawHtml|sourcePage|sourceCorpus|internalSourceId/i);
  });

  it("Invariant: readiness and boundaries remain independent from Role Discovery", () => {
    const baseline = roleSnapshot(persona);
    const changedReadiness = Object.fromEntries(Object.keys(persona.answers.readiness).map((questionId) => [questionId, persona.answers.readiness[questionId] === "a" ? "c" : "a"]));
    const changedBoundaries = Object.fromEntries(boundaryItems.map((item) => [item.id, "hard-limit"])) as AssessmentPersona["answers"]["boundaries"];

    expect(roleSnapshot(clonePersona(persona, { readiness: changedReadiness })), `${persona.id}: readiness changed Role Discovery`).toEqual(baseline);
    expect(roleSnapshot(clonePersona(persona, { boundaries: changedBoundaries })), `${persona.id}: boundaries changed Role Discovery`).toEqual(baseline);
  });
});

describe("paired persona calibration tendencies", () => {
  it("carries direct Refine evidence into the Suggested Role Set", () => {
    const puppyPersona = assessmentPersonas.find((persona) => persona.id === "refined-puppy-pattern")!;

    const evaluation = evaluateAssessmentPersona(puppyPersona);

    const puppy = evaluation.roleProfile.recommendations.find((item) => item.candidate.label === "Puppy");

    expect(puppy).toBeDefined();

    expect(puppy?.candidate).toMatchObject({
      evidenceType: "hybrid",
      eligible: true,
    });

    expect(puppy?.candidate.rawAlignment).toBeUndefined();
    expect(puppy?.candidate.confidence).toBeUndefined();
  });
  it("makes directly confirmed Little vocabulary the scoreless suggested primary", () => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "refined-little-vocabulary-pattern")!);
    const little = evaluation.roleProfile.recommendations.find((item) => item.candidate.roleId === "role:little-180ca01b");

    expect(little?.candidate).toMatchObject({
      evidenceType: "hybrid",
      eligible: true,
      rawAlignment: undefined,
      confidence: undefined,
    });
    expect(evaluation.roleProfile.primary?.candidate.roleId).toBe("role:little-180ca01b");
    expect(evaluation.roleProfile.recommendations[0]).toBe(evaluation.roleProfile.primary);
    expect(evaluation.suggestedRoleSet[0]?.roleId).toBe("role:little-180ca01b");
  });
  it("makes directly confirmed babygirl vocabulary the scoreless suggested primary", () => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "refined-babygirl-vocabulary-pattern")!);
    const babygirl = evaluation.roleProfile.recommendations.find((item) => item.candidate.roleId === "role:babygirl-f95fc9d2");

    expect(babygirl?.candidate).toMatchObject({
      evidenceType: "hybrid",
      eligible: true,
      rawAlignment: undefined,
      confidence: undefined,
    });
    expect(evaluation.roleProfile.primary?.candidate.roleId).toBe("role:babygirl-f95fc9d2");
    expect(evaluation.roleProfile.recommendations[0]).toBe(evaluation.roleProfile.primary);
    expect(evaluation.suggestedRoleSet[0]?.roleId).toBe("role:babygirl-f95fc9d2");
  });
  it("shows meaningful evidence in both authority directions for the balanced pattern", () => {
    const scores = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "balanced-authority-pattern")!).traitScores;
    expect(scores.givingControl?.value ?? 0).toBeGreaterThan(0.5);
    expect(scores.receivingControl?.value ?? 0).toBeGreaterThan(0.5);
  });

  it("makes rope and service evidence stronger in their focused profiles than comparison profiles", () => {
    const rope = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "rope-bondage-emphasis")!).traitScores;
    const directive = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "directive-leaning-pattern")!).traitScores;
    const service = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "service-giving-emphasis")!).traitScores;

    expect(rope.ropeGiving?.value ?? 0).toBeGreaterThan(directive.ropeGiving?.value ?? 0);
    expect(service.serviceGiving?.value ?? 0).toBeGreaterThan(directive.serviceGiving?.value ?? 0);
  });

  it("treats Prefer not to answer as absent evidence rather than negative evidence", () => {
    const directive = assessmentPersonas.find((persona) => persona.id === "directive-leaning-pattern")!;
    const withheldDiscovery = Object.fromEntries(Object.keys(directive.answers.discovery).map((questionId) => [questionId, "prefer-not"]));
    const withheld = evaluateAssessmentPersona(clonePersona(directive, { discovery: withheldDiscovery }));
    const unansweredRoleResults = matchRoles(calculateTraitScores({}), {});
    const original = evaluateAssessmentPersona(directive);
    const originalDominant = original.roleResults.find((result) => result.role.id === "dominant")!;
    const withheldDominant = withheld.roleResults.find((result) => result.role.id === "dominant")!;

    expect(withheld.traitScores).toEqual({});
    expect(withheld.roleResults).toEqual(unansweredRoleResults);
    expect(withheldDominant.coverage).toBeLessThan(originalDominant.coverage);
  });

  it("keeps hard limits as activity guidance without lowering role alignment", () => {
    const hardLimits = assessmentPersonas.find((persona) => persona.id === "multiple-hard-limits-pattern")!;
    const baseline = roleSnapshot(hardLimits);
    const neutralBoundaries = Object.fromEntries(boundaryItems.map((item) => [item.id, "neutral"])) as AssessmentPersona["answers"]["boundaries"];
    const neutral = clonePersona(hardLimits, { boundaries: neutralBoundaries });
    const evaluation = evaluateAssessmentPersona(hardLimits);

    expect(roleSnapshot(neutral)).toEqual(baseline);
    for (const itemId of ["rope", "impact", "primal", "psychological", "roleplay"]) expect(evaluation.activityGuidance.find((item) => item.item.id === itemId)?.status).toBe("off-table");
  });

  it("exercises reflection cues and non-averaging critical flags", () => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "multiple-hard-limits-pattern")!);
    expect(evaluation.readiness.blindSpots.length).toBeGreaterThan(0);
    expect(evaluation.readiness.criticalFlags.length).toBeGreaterThan(0);
    expect(evaluation.readiness.criticalFlags.every((flag) => flag.sourceQuestionIds.length > 0)).toBe(true);
  });
});

describe("role-set and export constitution", () => {
  it("moves a chosen role directly to primary without changing source or remaining-role order", () => {
    const roles = [
      { roleId: "a", label: "A", source: "recommended" as const },
      { roleId: "b", label: "B", source: "recommended" as const },
      { roleId: "c", label: "C", source: "user-selected" as const },
      { roleId: "d", label: "D", source: "recommended" as const },
    ];

    const reordered = makeRoleProfileEntryPrimary(roles, "c");

    expect(reordered.map((role) => role.roleId)).toEqual(["c", "a", "b", "d"]);
    expect(reordered[0].source).toBe("user-selected");
    expect(roles.map((role) => role.roleId)).toEqual(["a", "b", "c", "d"]);
  });

  it("compares complete editable role-set state and preserves replacement positions", () => {
    const roles = [
      { roleId: "a", label: "A", source: "recommended" as const, assessmentRoleId: "assessment-a" },
      { roleId: "b", label: "B", source: "recommended" as const },
    ];
    const matchingCopy = roles.map((role) => ({ ...role }));
    const sourceChanged = roles.map((role, index) => index === 0 ? { ...role, source: "user-selected" as const } : role);
    const primaryReplacement = replaceRoleProfileEntry(roles, "a", { roleId: "c", label: "C", source: "user-selected" });
    const secondReplacement = replaceRoleProfileEntry(roles, "b", { roleId: "d", label: "D", source: "user-selected" });

    expect(roleProfileEntriesEqual(roles, matchingCopy)).toBe(true);
    expect(roleProfileEntriesEqual(roles, sourceChanged)).toBe(false);
    expect(primaryReplacement.map((role) => role.roleId)).toEqual(["c", "b"]);
    expect(secondReplacement.map((role) => role.roleId)).toEqual(["a", "d"]);
    expect(replaceRoleProfileEntry([roles[0]], "a", { roleId: "c", label: "C", source: "user-selected" }).map((role) => role.roleId)).toEqual(["c"]);
  });

  it("filters unusable alternates before applying the eight-entry display cap", () => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "broad-exploratory-pattern")!);
    const invalid = evaluation.roleProfile.alternates.slice(0, 8).map((alternate) => ({ ...alternate, candidate: { ...alternate.candidate, label: " " } }));
    const valid = evaluation.roleProfile.alternates.slice(8, 16);
    const displayed = selectDisplayableRoleProfileAlternates([...invalid, ...valid]);

    expect(valid).toHaveLength(8);
    expect(displayed).toEqual(valid);
  });

  it("keeps a five-role maximum while allowing partial and empty sets", () => {
    const roles: EditableRoleProfileEntry[] = Array.from({ length: 5 }, (_, index) => ({ roleId: String(index), label: String(index), source: "recommended" }));
    const unchanged = addRoleProfileEntry(roles, { roleId: "six", label: "Six", source: "user-selected" });
    const empty = roles.reduce((current, role) => removeRoleProfileEntry(current, role.roleId), roles);

    expect(unchanged).toBe(roles);
    expect(empty).toEqual([]);
  });

  it("keeps Suggested Role Set separate from first-five Role Discovery assumptions", () => {
    const hasIndependentSuggestion = assessmentPersonas.some((persona) => {
      const evaluation = evaluateAssessmentPersona(persona);
      const discoveryFirstFive = evaluation.roleResults
        .filter((result) => result.alignment !== "insufficient")
        .slice(0, 5)
        .map((result) => result.role.name);
      return JSON.stringify(evaluation.suggestedRoleSet.map((role) => role.label)) !== JSON.stringify(discoveryFirstFive);
    });
    expect(hasIndependentSuggestion).toBe(true);
  });

  it("preserves manual role-set membership/order without fabricating assessment metrics", () => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "broad-exploratory-pattern")!);
    const discoveryBefore = evaluation.roleResults.map((result) => result.role.id);
    const manualRole = roleLibrary.roles.find((role) => !evaluation.yourRoleSet.some((selected) => selected.roleId === role.id))!;
    const withoutLast = evaluation.yourRoleSet.length === 5 ? removeRoleProfileEntry(evaluation.yourRoleSet, evaluation.yourRoleSet[4].roleId) : evaluation.yourRoleSet;
    const withManual = addRoleProfileEntry(withoutLast, { roleId: manualRole.id, label: manualRole.label, definition: manualRole.definition, source: "user-selected" });
    const reordered = withManual.length > 1 ? reorderRoleProfileEntry(withManual, withManual.length - 1, 0) : withManual;
    const exported = getShareableRoleSet(reordered, evaluation.roleResults);
    const manualExport = exported.find((role) => role.id === manualRole.id)!;

    expect(exported.map((role) => role.name)).toEqual(reordered.map((role) => role.label));
    expect(manualExport.source).toBe("user-selected");
    expect(manualExport.alignment).toBeUndefined();
    expect(manualExport.confidence).toBeUndefined();
    expect(evaluation.roleResults.map((result) => result.role.id)).toEqual(discoveryBefore);
  });
});

describe("core vocabulary personas", () => {
  it.each([
    ["confirmed-dominant-vocabulary", "Dominant"],
    ["confirmed-submissive-vocabulary", "submissive"],
    ["confirmed-switch-vocabulary", "Switch"],
    ["confirmed-top-vocabulary", "Top"],
    ["confirmed-bottom-vocabulary", "Bottom"],
    ["confirmed-vers-vocabulary", "Vers"],
  ])("keeps %s as scored inferred evidence with direct vocabulary context", (personaId, label) => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === personaId)!);
    const candidate = [...evaluation.roleProfile.recommendations.map((item) => item.candidate), ...evaluation.roleProfile.alternates.map((item) => item.candidate)]
      .find((item) => item.label === label)!;

    expect(candidate).toMatchObject({ evidenceType: "inferred", vocabularyConfirmation: "confirmed" });
    expect(candidate.rawAlignment).toBeTypeOf("number");
    expect(candidate.confidence).toBeDefined();
  });

  it.each([
    ["confirmed-dominant-top-vocabulary", ["Dominant", "Top"]],
    ["confirmed-submissive-bottom-vocabulary", ["submissive", "Bottom"]],
    ["confirmed-switch-vers-vocabulary", ["Switch", "Vers"]],
  ] as const)("keeps both independently confirmed families for %s", (personaId, labels) => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === personaId)!);
    const candidates = [...evaluation.roleProfile.recommendations.map((item) => item.candidate), ...evaluation.roleProfile.alternates.map((item) => item.candidate)];

    labels.forEach((label) => expect(candidates.find((item) => item.label === label)?.vocabularyConfirmation).toBe("confirmed"));
  });

  it("preserves strong authority evidence while excluding declined Dominant vocabulary", () => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "declined-dominant-vocabulary")!);
    const dominantResult = evaluation.roleResults.find((item) => item.role.id === "dominant")!;
    const dominantCandidate = evaluation.roleProfile.alternates.find((item) => item.candidate.label === "Dominant")!.candidate;

    expect(dominantResult.alignment).toMatch(/strong|explore/);
    expect(dominantCandidate).toMatchObject({ eligible: false, vocabularyConfirmation: "declined", rawAlignment: dominantResult.rawScore });
    expect(evaluation.roleProfile.recommendations.map((item) => item.candidate.label)).not.toContain("Dominant");
  });

  it("includes directly confirmed Dominant vocabulary in its focused suggested set", () => {
    const evaluation = evaluateAssessmentPersona(assessmentPersonas.find((persona) => persona.id === "confirmed-dominant-vocabulary")!);

    expect(evaluation.roleProfile.recommendations.map((item) => item.candidate.label)).toContain("Dominant");
    expect(evaluation.roleProfile.primary?.candidate.vocabularyConfirmation).toBe("confirmed");
  });
});

describe("persona engine privacy", () => {
  it("evaluates every persona without making a network request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    assessmentPersonas.forEach(evaluateAssessmentPersona);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
