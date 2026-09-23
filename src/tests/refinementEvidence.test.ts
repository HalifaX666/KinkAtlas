import { describe, expect, it } from "vitest";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { evaluateRefinementEvidence, supportedRefinementTargets } from "../engine/refinementEvidence";
import { eligibleRefinementFamilies, selectRefinementQuestions } from "../engine/refinementRouting";
import type { AssessmentAnswers } from "../types";
import { buildRoleProfileCandidates, optimizeRoleProfile } from "../engine/roleProfileOptimizer";
import { matchRoles } from "../engine/roleMatching";

const answers = (discovery: Record<string, string>, refinement: Record<string, string> = {}): AssessmentAnswers => ({
  discovery,
  refinement,
  readiness: {},
  boundaries: {},
  negotiation: {},
});

describe("Refine evidence architecture", () => {
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

    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement);

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

    const candidates = buildRoleProfileCandidates(roleResults, assessment.refinement);

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

    const optimization = optimizeRoleProfile(buildRoleProfileCandidates(roleResults, assessment.refinement));

    expect(optimization.recommendations.map((item) => item.candidate.label)).not.toContain("Submissive Top");
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

    const candidate = buildRoleProfileCandidates(roleResults, assessment.refinement).find((item) => item.label === "Submissive Top");

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
});
