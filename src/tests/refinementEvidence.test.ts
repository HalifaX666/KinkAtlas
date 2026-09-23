import { describe, expect, it } from "vitest";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { evaluateRefinementEvidence, preferredPrimaryRoleIdFromRefinement, supportedRefinementTargets } from "../engine/refinementEvidence";
import { applyRefinementAnswer, eligibleRefinementFamilies, selectRefinementQuestions } from "../engine/refinementRouting";
import { buildEditableRoleProfileEntries, buildRoleProfileCandidates, optimizeRoleProfile } from "../engine/roleProfileOptimizer";
import { matchRoles } from "../engine/roleMatching";
import type { AssessmentAnswers } from "../types";

const answers = (discovery: Record<string, string>, refinement: Record<string, string> = {}): AssessmentAnswers => ({
  discovery,
  refinement,
  readiness: {},
  boundaries: {},
  negotiation: {},
});

describe("Refine evidence architecture", () => {
  it("does not allow injected Refine confirmation to bypass Discovery routing", () => {
    const assessment = answers(
      {
        "d-power-receive": "no",
        "d-position-give": "strong",
        "r-top": "strong",
        "r-lead": "strong",
      },
      {
        "ref-sub-top": "yes",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "Submissive Top");

    expect(candidate).toMatchObject({
      evidenceType: "hybrid",
      eligible: false,
    });
  });

  it("does not recommend Submissive Top from Discovery evidence alone", () => {
    const assessment = answers({
      "d-power-receive": "strong",
      "r-surrender": "strong",
      "r-yielding-motivation": "strong",
      "d-position-give": "strong",
      "r-top": "strong",
      "r-lead": "strong",
    });

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery);

    const candidate = candidates.find((item) => item.label === "Submissive Top");

    expect(candidate).toMatchObject({
      decisionPathway: "hybrid",
      evidenceType: "hybrid",
      eligible: false,
    });

    expect(candidate?.rawAlignment).toBeUndefined();
  });

  it("makes Submissive Top eligible only after direct Refine confirmation", () => {
    const assessment = answers(
      {
        "d-power-receive": "strong",
        "r-surrender": "strong",
        "r-yielding-motivation": "strong",
        "d-position-give": "strong",
        "r-top": "strong",
        "r-lead": "strong",
      },
      {
        "ref-sub-top": "yes",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery);

    const candidate = candidates.find((item) => item.label === "Submissive Top");

    expect(candidate).toMatchObject({
      decisionPathway: "hybrid",
      evidenceType: "hybrid",
      eligible: true,
    });

    expect(candidate?.rawAlignment).toBeUndefined();
    expect(candidate?.confidence).toBeUndefined();
  });

  it("keeps a rejected Refine intersection out of the Suggested Role Set", () => {
    const assessment = answers(
      {
        "d-power-receive": "strong",
        "r-surrender": "strong",
        "r-yielding-motivation": "strong",
        "d-position-give": "strong",
        "r-top": "strong",
        "r-lead": "strong",
      },
      {
        "ref-sub-top": "no",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const optimization = optimizeRoleProfile(buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery));

    expect(optimization.recommendations.map((item) => item.candidate.label)).not.toContain("Submissive Top");
  });

  it("opens Primal Sadist refinement only when primal and pain-giving evidence coexist", () => {
    const assessment = answers({
      "d-primal": "strong",
      "r-primal-give": "strong",
      "d-intensity": "strong",
      "r-pain-give": "strong",
    });

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).toContain("ref-primal-sadist");
  });

  it("opens Service Rigger refinement only when service-giving and rope-giving evidence coexist", () => {
    const assessment = answers({
      "d-service": "strong",
      "r-service-give": "strong",
      "d-rope": "strong",
      "r-rope-give": "strong",
      "r-rope-motivation": "strong",
    });

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).toContain("ref-service-rigger");
  });

  it("does not treat maybe as sufficient hybrid evidence", () => {
    const assessment = answers(
      {
        "d-power-receive": "strong",
        "r-surrender": "strong",
        "r-yielding-motivation": "strong",
        "d-position-give": "strong",
        "r-top": "strong",
        "r-lead": "strong",
      },
      {
        "ref-sub-top": "maybe",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "Submissive Top");

    expect(candidate?.eligible).toBe(false);
  });

  it("does not open submission refinement from active-position evidence alone", () => {
    const assessment = answers({
      "d-position-give": "strong",
      "r-top": "strong",
      "r-lead": "strong",
      "d-power-receive": "no",
    });

    const scores = calculateTraitScores(assessment.discovery);

    expect(eligibleRefinementFamilies(assessment, scores)).not.toContain("submission");

    expect(selectRefinementQuestions(assessment, scores).map((question) => question.id)).not.toContain("ref-sub-top");
  });

  it("opens Submissive Top refinement only when submission and active-position evidence coexist", () => {
    const assessment = answers({
      "d-power-receive": "strong",
      "r-surrender": "strong",
      "r-yielding-motivation": "strong",
      "d-position-give": "strong",
      "r-top": "strong",
      "r-lead": "strong",
    });

    const scores = calculateTraitScores(assessment.discovery);

    expect(eligibleRefinementFamilies(assessment, scores)).toContain("submission");

    expect(selectRefinementQuestions(assessment, scores).map((question) => question.id)).toContain("ref-sub-top");
  });
  it("does not infer a pet persona from guiding or caring for an adult pet role", () => {
    const assessment = answers({
      "d-pet": "strong",
    });

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).not.toContain("ref-pet-persona");
  });
  it("opens direct pet-persona refinement from adult pet-role interest", () => {
    const assessment = answers({
      "d-pet": "some",
    });

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).toContain("ref-pet-persona");
  });
  it("makes Puppy eligible only after direct canine persona evidence", () => {
    const assessment = answers(
      {
        "d-pet": "some",
      },
      {
        "ref-pet-persona": "canine",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "Puppy");

    expect(candidate).toMatchObject({
      decisionPathway: "hybrid",
      evidenceType: "hybrid",
      eligible: true,
    });

    expect(candidate?.rawAlignment).toBeUndefined();
    expect(candidate?.confidence).toBeUndefined();
  });
  it("makes Kitten eligible only after direct feline persona evidence", () => {
    const assessment = answers(
      {
        "d-pet": "some",
      },
      {
        "ref-pet-persona": "feline",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "Kitten");

    expect(candidate).toMatchObject({
      decisionPathway: "hybrid",
      evidenceType: "hybrid",
      eligible: true,
    });

    expect(candidate?.rawAlignment).toBeUndefined();
    expect(candidate?.confidence).toBeUndefined();
  });
  it("keeps broad canine-and-feline interest exploratory rather than recommending both labels", () => {
    const assessment = answers(
      {
        "d-pet": "some",
      },
      {
        "ref-pet-persona": "both",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery);

    expect(candidates.find((item) => item.label === "Puppy")?.eligible).toBe(false);

    expect(candidates.find((item) => item.label === "Kitten")?.eligible).toBe(false);
  });
  it("does not allow injected pet-persona evidence to bypass broad pet-role interest", () => {
    const assessment = answers(
      {
        "d-pet": "no",
      },
      {
        "ref-pet-persona": "canine",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "Puppy");

    expect(candidate?.eligible).toBe(false);
  });
  it.each([
    [{ "ref-pet-persona": "canine" }, "role:puppy-75822bc4"],
    [{ "ref-caregiver-title": "daddy" }, "role:daddy-e585737a"],
    [{ "ref-age-roleplay-position": "middle" }, "role:middle-a4888af4"],
    [{ "ref-age-roleplay-position": "big" }, "role:big-f69fd263"],
    [{ "ref-age-roleplay-position": "little" }, "role:little-180ca01b"],
    [{ "ref-age-roleplay-position": "little", "ref-little-vocabulary": "babygirl" }, "role:babygirl-f95fc9d2"],
  ])("derives a deterministic preferred primary from direct vocabulary %o", (refinement, roleId) => {
    expect(preferredPrimaryRoleIdFromRefinement(refinement)).toBe(roleId);
  });
  it("opens age-roleplay position only after direct non-sexual interest confirmation", () => {
    const assessment = answers(
      {
        "d-care": "strong",
      },
      {
        "ref-age-roleplay-interest": "yes",
      },
    );

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).toContain("ref-age-roleplay-position");
  });
  it("opens caregiver title refinement only from the caregiver position", () => {
    const assessment = answers(
      {
        "d-care": "strong",
      },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "caregiver",
      },
    );

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).toContain("ref-caregiver-title");

    expect(questions.map((question) => question.id)).not.toContain("ref-little-vocabulary");
  });
  it("opens Little vocabulary refinement only from the Little position", () => {
    const assessment = answers(
      {
        "d-care": "strong",
      },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
      },
    );

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).toContain("ref-little-vocabulary");

    expect(questions.map((question) => question.id)).not.toContain("ref-caregiver-title");
  });
  it("clears only the age-roleplay descendants invalidated by a parent answer", () => {
    const current = {
      "ref-age-roleplay-interest": "yes",
      "ref-age-roleplay-position": "little",
      "ref-little-vocabulary": "little-princess",
      "ref-pet-persona": "canine",
    };

    const changedPosition = applyRefinementAnswer(current, "ref-age-roleplay-position", "middle");

    expect(changedPosition.refinement).toEqual({
      "ref-age-roleplay-interest": "yes",
      "ref-age-roleplay-position": "middle",
      "ref-pet-persona": "canine",
    });
    expect(changedPosition.invalidatedQuestionIds).toEqual(["ref-caregiver-title", "ref-little-vocabulary"]);

    const declinedInterest = applyRefinementAnswer(current, "ref-age-roleplay-interest", "no");

    expect(declinedInterest.refinement).toEqual({
      "ref-age-roleplay-interest": "no",
      "ref-pet-persona": "canine",
    });
    expect(declinedInterest.invalidatedQuestionIds).toEqual(["ref-age-roleplay-position", "ref-caregiver-title", "ref-little-vocabulary"]);
  });
  it("makes Little princess eligible only after direct Little vocabulary confirmation", () => {
    const assessment = answers(
      {
        "d-care": "strong",
      },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
        "ref-little-vocabulary": "little-princess",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "little princess");

    expect(candidate).toMatchObject({
      decisionPathway: "hybrid",
      evidenceType: "hybrid",
      eligible: true,
    });

    expect(candidate?.rawAlignment).toBeUndefined();
    expect(candidate?.confidence).toBeUndefined();
  });
  it("keeps generic Little eligible when that exact vocabulary is selected", () => {
    const assessment = answers(
      { "d-care": "some" },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
        "ref-little-vocabulary": "little",
      },
    );
    const roleResults = matchRoles(calculateTraitScores(assessment.discovery), assessment.discovery);
    const little = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.roleId === "role:little-180ca01b");

    expect(little).toMatchObject({ eligible: true, evidenceType: "hybrid", rawAlignment: undefined, confidence: undefined });
  });
  it("lets specific Little vocabulary supersede generic Little in recommendation eligibility", () => {
    const assessment = answers(
      { "d-care": "some" },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
        "ref-little-vocabulary": "little-princess",
      },
    );
    const roleResults = matchRoles(calculateTraitScores(assessment.discovery), assessment.discovery);
    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery);

    expect(candidates.find((item) => item.roleId === "role:little-princess-eb248642")?.eligible).toBe(true);
    expect(candidates.find((item) => item.roleId === "role:little-180ca01b")?.eligible).toBe(false);
  });
  it("makes babygirl eligible and supersedes generic Little only after direct vocabulary confirmation", () => {
    const assessment = answers(
      { "d-care": "some" },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
        "ref-little-vocabulary": "babygirl",
      },
    );
    const roleResults = matchRoles(calculateTraitScores(assessment.discovery), assessment.discovery);
    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery);
    const babygirl = candidates.find((item) => item.roleId === "role:babygirl-f95fc9d2");

    expect(babygirl).toMatchObject({ eligible: true, evidenceType: "hybrid", rawAlignment: undefined, confidence: undefined });
    expect(candidates.find((item) => item.roleId === "role:little-180ca01b")?.eligible).toBe(false);
  });
  it("does not force generic Little when another Little-related label is selected", () => {
    const assessment = answers(
      { "d-care": "some" },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
        "ref-little-vocabulary": "other",
      },
    );
    const roleResults = matchRoles(calculateTraitScores(assessment.discovery), assessment.discovery);
    const little = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.roleId === "role:little-180ca01b");

    expect(little?.eligible).toBe(false);
    expect(preferredPrimaryRoleIdFromRefinement(assessment.refinement)).toBeUndefined();
  });
  it("makes Daddy eligible only after direct caregiver-title confirmation", () => {
    const assessment = answers(
      {
        "d-care": "strong",
      },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "caregiver",
        "ref-caregiver-title": "daddy",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "Daddy");

    expect(candidate).toMatchObject({
      decisionPathway: "hybrid",
      evidenceType: "hybrid",
      eligible: true,
    });
  });
  it("does not allow injected Little vocabulary to bypass the adult age-roleplay gate", () => {
    const assessment = answers(
      {
        "d-care": "no",
      },
      {
        "ref-little-vocabulary": "little",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "little");

    expect(candidate?.eligible).toBe(false);
  });
  it("does not infer age-roleplay positions from caregiving evidence alone", () => {
    const assessment = answers({
      "d-care": "strong",
    });

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.map((question) => question.id)).toContain("ref-age-roleplay-interest");

    expect(questions.map((question) => question.id)).not.toContain("ref-age-roleplay-position");
  });
  it("does not open Dominant Bottom without independent dominance evidence", () => {
    const assessment = answers({
      "d-position-receive": "strong",
      "r-bottom": "strong",
      "r-receiving-focus": "some",
      "d-power-give": "no",
    });

    const scores = calculateTraitScores(assessment.discovery);

    expect(selectRefinementQuestions(assessment, scores).map((question) => question.id)).not.toContain("ref-dom-bottom");
  });

  it("caps adaptive refinement at six questions", () => {
    const assessment = answers({
      "d-power-give": "strong",
      "r-authority-style": "strong",
      "r-lead": "strong",

      "d-power-receive": "strong",
      "r-surrender": "strong",
      "r-yielding-motivation": "strong",

      "d-position-give": "strong",
      "r-top": "strong",

      "d-position-receive": "strong",
      "r-bottom": "strong",
      "r-receiving-focus": "some",

      "d-intensity": "strong",
      "r-pain-give": "strong",
      "r-pain-receive": "strong",

      "d-brat": "strong",
      "r-brat": "strong",

      "d-care": "some",
      "r-care-receive": "strong",
    });

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.length).toBeLessThanOrEqual(6);

    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
  });

  it("records supported, possible, rejected and unanswered refinement evidence without percentages", () => {
    const evidence = evaluateRefinementEvidence({
      "ref-sub-top": "yes",
      "ref-sub-sadist": "maybe",
      "ref-sub-masochist": "no",
    });

    expect(evidence.find((item) => item.targetId === "submissive-top")).toMatchObject({
      status: "supported",
      supportingQuestionIds: ["ref-sub-top"],
    });

    expect(evidence.find((item) => item.targetId === "submissive-sadist")).toMatchObject({
      status: "possible",
      possibleQuestionIds: ["ref-sub-sadist"],
    });

    expect(evidence.find((item) => item.targetId === "submissive-masochist")).toMatchObject({
      status: "rejected",
      rejectingQuestionIds: ["ref-sub-masochist"],
    });

    expect(evidence.find((item) => item.targetId === "sensual-dominant")).toMatchObject({
      status: "unanswered",
    });
  });

  it("only exposes explicit yes responses as supported refinement targets", () => {
    const supported = supportedRefinementTargets({
      "ref-sub-top": "yes",
      "ref-sub-sadist": "maybe",
      "ref-sub-masochist": "no",
    });

    expect(supported.map((item) => item.target.label)).toEqual(["Submissive Top"]);
  });

  it("never returns duplicate refinement questions across mixed families", () => {
    const assessment = answers(
      {
        "d-power-give": "strong",
        "r-authority-style": "strong",
        "r-lead": "strong",

        "d-power-receive": "strong",
        "r-surrender": "strong",
        "r-yielding-motivation": "strong",

        "d-position-give": "strong",
        "r-top": "strong",

        "d-position-receive": "strong",
        "r-bottom": "strong",
        "r-receiving-focus": "some",

        "d-intensity": "strong",
        "r-pain-give": "strong",
        "r-pain-receive": "strong",

        "d-care": "strong",
        "r-care-receive": "strong",
      },
      {
        "ref-age-roleplay-interest": "yes",
      },
    );

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    const ids = questions.map((question) => question.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps mixed-family refinement within the six-question cap", () => {
    const assessment = answers(
      {
        "d-power-give": "strong",
        "r-authority-style": "strong",
        "r-lead": "strong",

        "d-power-receive": "strong",
        "r-surrender": "strong",
        "r-yielding-motivation": "strong",

        "d-position-give": "strong",
        "r-top": "strong",

        "d-position-receive": "strong",
        "r-bottom": "strong",
        "r-receiving-focus": "some",

        "d-intensity": "strong",
        "r-pain-give": "strong",
        "r-pain-receive": "strong",

        "d-primal": "strong",
        "r-primal-give": "strong",

        "d-service": "strong",
        "r-service-give": "strong",

        "d-rope": "strong",
        "r-rope-give": "strong",
        "r-rope-motivation": "strong",

        "d-brat": "strong",
        "r-brat": "strong",

        "d-pet": "some",

        "d-care": "strong",
        "r-care-receive": "strong",
      },
      {
        "ref-age-roleplay-interest": "yes",
      },
    );

    const questions = selectRefinementQuestions(assessment, calculateTraitScores(assessment.discovery));

    expect(questions.length).toBeLessThanOrEqual(6);
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
  });

  it("can route refinement across multiple supported families at once", () => {
    const assessment = answers({
      "d-power-receive": "strong",
      "r-surrender": "strong",
      "r-yielding-motivation": "strong",

      "d-intensity": "strong",
      "r-pain-receive": "strong",

      "d-primal": "strong",
      "r-primal-receive": "strong",

      "d-service": "strong",
      "r-service-give": "strong",

      "d-brat": "strong",
      "r-brat": "strong",

      "d-pet": "some",
    });

    const scores = calculateTraitScores(assessment.discovery);
    const families = eligibleRefinementFamilies(assessment, scores);

    expect(families).toContain("submission");
    expect(families).toContain("primal");
    expect(families).toContain("service");
    expect(families).toContain("pet");
  });

  it.each(["maybe", "no", "unknown", "prefer-not"])("does not make a hybrid role eligible from %s refinement evidence", (answerId) => {
    const assessment = answers(
      {
        "d-power-receive": "strong",
        "r-surrender": "strong",
        "r-yielding-motivation": "strong",
        "d-position-give": "strong",
        "r-top": "strong",
        "r-lead": "strong",
      },
      {
        "ref-sub-top": answerId,
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery).find((item) => item.label === "Submissive Top");

    expect(candidate?.eligible).toBe(false);
  });

  it("keeps directly refined hybrid roles scoreless", () => {
    const assessment = answers(
      {
        "d-pet": "some",
        "d-care": "strong",
      },
      {
        "ref-pet-persona": "canine",
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
        "ref-little-vocabulary": "little",
      },
    );

    const scores = calculateTraitScores(assessment.discovery);
    const roleResults = matchRoles(scores, assessment.discovery);

    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery);

    const puppy = candidates.find((item) => item.label === "Puppy");
    const little = candidates.find((item) => item.label === "little");

    expect(puppy).toMatchObject({
      eligible: true,
      evidenceType: "hybrid",
    });

    expect(little).toMatchObject({
      eligible: true,
      evidenceType: "hybrid",
    });

    expect(puppy?.rawAlignment).toBeUndefined();
    expect(puppy?.confidence).toBeUndefined();
    expect(little?.rawAlignment).toBeUndefined();
    expect(little?.confidence).toBeUndefined();
  });
  it("uses the most specific eligible Refine vocabulary as primary and returns one canonical primary-first order", () => {
    const assessment = answers(
      {
        "d-care": "some",
        "r-care-receive": "some",
      },
      {
        "ref-age-roleplay-interest": "yes",
        "ref-age-roleplay-position": "little",
        "ref-little-vocabulary": "little-princess",
      },
    );
    const roleResults = matchRoles(calculateTraitScores(assessment.discovery), assessment.discovery);
    const preferredPrimaryRoleId = preferredPrimaryRoleIdFromRefinement(assessment.refinement);
    const optimization = optimizeRoleProfile(buildRoleProfileCandidates(roleResults, assessment.refinement, assessment.discovery), 5, { preferredPrimaryRoleId });
    const editable = buildEditableRoleProfileEntries(optimization);

    expect(preferredPrimaryRoleId).toBe("role:little-princess-eb248642");
    expect(optimization.primary?.candidate.roleId).toBe(preferredPrimaryRoleId);
    expect(optimization.recommendations[0]).toBe(optimization.primary);
    expect(editable[0]?.roleId).toBe(preferredPrimaryRoleId);
    expect(optimization.primary?.candidate.rawAlignment).toBeUndefined();
    expect(optimization.primary?.candidate.confidence).toBeUndefined();
  });
});
