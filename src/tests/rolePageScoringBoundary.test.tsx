import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { AssessmentProvider, useAssessment } from "../context/AssessmentContext";
import { boundaryItems } from "../data/boundaries";
import { negotiationQuestions } from "../data/negotiation";
import { discoveryQuestions } from "../data/questions";
import { requiredReadinessQuestions } from "../data/readiness";
import { refinementQuestions } from "../data/refinement";
import { calculateTraitScores } from "../engine/discoveryScoring";
import { matchRoles } from "../engine/roleMatching";
import { buildSuggestedRoleProfileEntries } from "../engine/roleProfileOptimizer";
import { AssessmentPage } from "../pages/AssessmentPage";
import { ResultsPage } from "../pages/ResultsPage";
import { RolePage } from "../pages/RolePage";

function CompleteAssessment() {
  const { answerDiscovery, answerRefinement, answerReadiness, answerBoundary, answerNegotiation, updateAssessmentNavigation } = useAssessment();
  const navigate = useNavigate();

  const complete = () => {
    discoveryQuestions.forEach((question) => answerDiscovery(question.id, question.answers[0].id));
    refinementQuestions.forEach((question) => answerRefinement(question.id, question.answers[0].id));
    requiredReadinessQuestions.forEach((question) => answerReadiness(question.id, "prefer-not"));
    boundaryItems.forEach((item) => answerBoundary(item.id, "prefer-not"));
    negotiationQuestions.forEach((question) => answerNegotiation(question.id, "prefer-not"));
    updateAssessmentNavigation((current) => ({ ...current, phase: "negotiation", negotiationIndex: negotiationQuestions.length }));
    navigate("/results");
  };

  return <button onClick={complete}>Complete assessment</button>;
}

function BoundaryProbe() {
  const { answers, currentRoleSet, assessmentCompletion } = useAssessment();
  const traitScores = calculateTraitScores(answers.discovery);
  const roleResults = matchRoles(traitScores, answers.discovery);
  const suggested = buildSuggestedRoleProfileEntries(roleResults, answers.refinement, answers.discovery);

  return <div className="sr-only">
    <output aria-label="Discovery snapshot">{JSON.stringify(answers.discovery)}</output>
    <output aria-label="Refine snapshot">{JSON.stringify(answers.refinement)}</output>
    <output aria-label="Trait snapshot">{JSON.stringify(traitScores)}</output>
    <output aria-label="Role ranking snapshot">{JSON.stringify(roleResults.map((result) => ({ id: result.role.id, raw: result.rawScore, ranked: result.rankedScore, alignment: result.alignment, confidence: result.confidence })))}</output>
    <output aria-label="Suggested role set snapshot">{JSON.stringify(suggested.map((role) => role.roleId))}</output>
    <output aria-label="Current role set snapshot">{currentRoleSet === null ? "uninitialized" : JSON.stringify(currentRoleSet)}</output>
    <output aria-label="Completion snapshot">{JSON.stringify(assessmentCompletion)}</output>
    <output aria-label="Negotiation snapshot">{JSON.stringify(answers.negotiation)}</output>
  </div>;
}

function renderBoundarySession() {
  return render(
    <MemoryRouter initialEntries={["/seed"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AssessmentProvider>
        <BoundaryProbe />
        <Routes>
          <Route path="/seed" element={<CompleteAssessment />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/roles/:roleId" element={<RolePage />} />
        </Routes>
      </AssessmentProvider>
    </MemoryRouter>,
  );
}

const probe = (name: string) => screen.getByRole("status", { name }).textContent;

function captureAssessmentOutput() {
  return {
    discovery: probe("Discovery snapshot"),
    refinement: probe("Refine snapshot"),
    traits: probe("Trait snapshot"),
    ranking: probe("Role ranking snapshot"),
    suggested: probe("Suggested role set snapshot"),
    current: probe("Current role set snapshot"),
    completion: probe("Completion snapshot"),
  };
}

describe("post-assessment role-page scoring boundary", () => {
  it("keeps role exploration educational and preserves every assessment-derived output across related roles", async () => {
    renderBoundarySession();
    fireEvent.click(screen.getByRole("button", { name: "Complete assessment" }));
    await screen.findByRole("heading", { name: "A map, not a verdict." });
    await waitFor(() => expect(probe("Current role set snapshot")).not.toBe("uninitialized"));
    const before = captureAssessmentOutput();

    fireEvent.click(screen.getAllByRole("link", { name: /Explore this result/i })[0]);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(document.querySelector("fieldset.question-card")).not.toBeInTheDocument();
    expect(screen.queryByText("Refine this result")).not.toBeInTheDocument();
    expect(screen.queryByText("Add discriminating context")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What does this mean?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How this relates to your answers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Does the vocabulary feel useful?" })).toBeInTheDocument();
    expect(screen.getByText(/optional prompts do not affect scoring/i)).toBeInTheDocument();
    expect(screen.getByText(/browsing role pages does not change your results/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("How was this calculated?"));
    expect(screen.getByText("How was this calculated?").closest("details")).toHaveTextContent("Alignment describes how closely your observed preferences resemble this role's weighted themes");

    for (let index = 0; index < 2; index += 1) {
      const relatedSection = screen.getByRole("heading", { name: "Useful distinctions" }).closest("section")!;
      fireEvent.click(within(relatedSection).getAllByRole("link")[0]);
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "How this relates to your answers" })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("link", { name: "Back to your results" }));
    await screen.findByRole("heading", { name: "A map, not a verdict." });
    expect(captureAssessmentOutput()).toEqual(before);
  });

  it("keeps the completed Assessment route editable without reopening a role-page scoring path", async () => {
    renderBoundarySession();
    fireEvent.click(screen.getByRole("button", { name: "Complete assessment" }));
    await screen.findByRole("heading", { name: "A map, not a verdict." });
    fireEvent.click(screen.getAllByRole("link", { name: /Explore this result/i })[0]);

    const before = probe("Negotiation snapshot");
    fireEvent.click(screen.getByRole("link", { name: "Return to the assessment" }));
    await screen.findByRole("heading", { name: /^Communicate$/ });
    const alternate = screen.getAllByRole("radio").find((radio) => !(radio as HTMLInputElement).checked)!;
    fireEvent.click(alternate);

    expect(probe("Negotiation snapshot")).not.toBe(before);
    expect(JSON.parse(probe("Completion snapshot")!)).toMatchObject({ complete: true });
  });
});

afterEach(cleanup);
