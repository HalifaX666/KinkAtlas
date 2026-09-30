import { describe, expect, it } from "vitest";
import { boundaryItems } from "../data/boundaries";
import { negotiationQuestions } from "../data/negotiation";
import { discoveryQuestions } from "../data/questions";
import { requiredReadinessQuestions } from "../data/readiness";
import { refinementQuestions } from "../data/refinement";
import { getAssessmentCompletion } from "../engine/assessmentCompletion";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { selectRefinementQuestions } from "../engine/refinementRouting";
import type { AssessmentAnswers } from "../types";

function completeAnswers(): AssessmentAnswers {
  return {
    discovery: Object.fromEntries(discoveryQuestions.map((question) => [question.id, question.answers[0].id])),
    refinement: Object.fromEntries(refinementQuestions.map((question) => [question.id, question.answers[0].id])),
    readiness: Object.fromEntries(requiredReadinessQuestions.map((question) => [question.id, "prefer-not"])),
    boundaries: Object.fromEntries(boundaryItems.map((item) => [item.id, "prefer-not"])),
    negotiation: Object.fromEntries(negotiationQuestions.map((question) => [question.id, "prefer-not"])),
  } as AssessmentAnswers;
}

describe("central assessment completion invariant", () => {
  it("requires every actual assessment stage while accepting deliberate prefer-not answers", () => {
    const answers = completeAnswers();
    expect(getAssessmentCompletion(answers)).toEqual({
      discoveryComplete: true,
      refinementComplete: true,
      readinessComplete: true,
      boundariesComplete: true,
      negotiationComplete: true,
      complete: true,
    });

    const withoutReadiness = structuredClone(answers);
    delete withoutReadiness.readiness[requiredReadinessQuestions[0].id];
    expect(getAssessmentCompletion(withoutReadiness).readinessComplete).toBe(false);

    const withoutBoundary = structuredClone(answers);
    delete withoutBoundary.boundaries[boundaryItems[0].id];
    expect(getAssessmentCompletion(withoutBoundary).boundariesComplete).toBe(false);

    const withoutNegotiation = structuredClone(answers);
    delete withoutNegotiation.negotiation[negotiationQuestions[0].id];
    expect(getAssessmentCompletion(withoutNegotiation).negotiationComplete).toBe(false);
  });

  it("uses adaptive Discovery and the existing capped routed Refine set", () => {
    const partialAnswers = completeAnswers();
    partialAnswers.discovery = { [discoveryQuestions[0].id]: discoveryQuestions[0].answers[0].id };
    expect(getAssessmentCompletion(partialAnswers).discoveryComplete).toBe(false);

    const answers = completeAnswers();
    const routedQuestions = selectRefinementQuestions(answers, calculateTraitScores(answers.discovery));
    expect(routedQuestions.length).toBeLessThanOrEqual(6);
    expect(routedQuestions.length).toBeGreaterThan(0);
    delete answers.refinement[routedQuestions[0].id];
    const completion = getAssessmentCompletion(answers);
    expect(completion.discoveryComplete).toBe(true);
    expect(completion.refinementComplete).toBe(false);
    expect(completion.complete).toBe(false);
  });

  it("does not treat injected keys or invalid option values as completion evidence", () => {
    const answers = completeAnswers();
    answers.discovery = Object.fromEntries(Array.from({ length: 26 }, (_, index) => [`injected-${index}`, "strong"]));
    expect(getAssessmentCompletion(answers).discoveryComplete).toBe(false);

    const invalidBoundary = completeAnswers();
    invalidBoundary.boundaries[boundaryItems[0].id] = "invalid" as AssessmentAnswers["boundaries"][string];
    expect(getAssessmentCompletion(invalidBoundary).boundariesComplete).toBe(false);
  });
});
