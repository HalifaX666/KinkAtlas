import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { AssessmentProvider, useAssessment } from "../context/AssessmentContext";
import { boundaryItems } from "../data/boundaries";
import { negotiationQuestions } from "../data/negotiation";
import { discoveryQuestions } from "../data/questions";
import { requiredReadinessQuestions } from "../data/readiness";
import { refinementQuestions } from "../data/refinement";
import { AssessmentPage } from "../pages/AssessmentPage";
import { ResultsPage } from "../pages/ResultsPage";
import { RolePage } from "../pages/RolePage";
import { roleLibrary } from "../taxonomy/roleLibrary";

function SessionSetup() {
  const {
    answerDiscovery,
    answerRefinement,
    answerReadiness,
    answerBoundary,
    answerNegotiation,
    updateAssessmentNavigation,
  } = useAssessment();
  const navigate = useNavigate();

  const openPartialResults = () => {
    const firstQuestion = discoveryQuestions[0];
    answerDiscovery(firstQuestion.id, firstQuestion.answers[0].id);
    updateAssessmentNavigation((current) => ({ ...current, phase: "discovery", discoveryHistory: [firstQuestion.id] }));
    navigate("/results");
  };

  const openCompleteResults = () => {
    discoveryQuestions.forEach((question) => answerDiscovery(question.id, question.answers[0].id));
    refinementQuestions.forEach((question) => answerRefinement(question.id, question.answers[0].id));
    requiredReadinessQuestions.forEach((question) => answerReadiness(question.id, "prefer-not"));
    boundaryItems.forEach((item) => answerBoundary(item.id, "prefer-not"));
    negotiationQuestions.forEach((question) => answerNegotiation(question.id, "prefer-not"));
    updateAssessmentNavigation((current) => ({ ...current, phase: "negotiation", negotiationIndex: negotiationQuestions.length }));
    navigate("/results");
  };

  return <div><button onClick={openPartialResults}>Open partial results</button><button onClick={openCompleteResults}>Open complete results</button></div>;
}

function renderSession(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AssessmentProvider>
        <Routes>
          <Route path="/seed" element={<SessionSetup />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/roles/:roleId" element={<RolePage />} />
        </Routes>
      </AssessmentProvider>
    </MemoryRouter>,
  );
}

function listLabels(name: string) {
  return within(screen.getByRole("list", { name })).getAllByRole("listitem").map((item) => item.querySelector("strong")?.textContent ?? "");
}

describe("memory-only session integrity", () => {
  it("redirects empty and partial Results access back to the exact assessment session", () => {
    renderSession("/results");
    expect(screen.getByRole("heading", { name: "A private reflection for adults." })).toBeInTheDocument();
    cleanup();

    renderSession("/seed");
    fireEvent.click(screen.getByRole("button", { name: "Open partial results" }));
    expect(screen.getByRole("heading", { name: "Discover" })).toBeInTheDocument();
    expect(screen.getByRole("group")).toHaveTextContent(discoveryQuestions[1].prompt);
  });

  it("renders Results only for a complete session", async () => {
    renderSession("/seed");
    fireEvent.click(screen.getByRole("button", { name: "Open complete results" }));
    expect(await screen.findByRole("heading", { name: "A map, not a verdict." })).toBeInTheDocument();
  });

  it("preserves edited order, chosen primary, and an intentionally empty Current Role Set across role routes", async () => {
    renderSession("/seed");
    fireEvent.click(screen.getByRole("button", { name: "Open complete results" }));
    await screen.findByRole("heading", { name: "A map, not a verdict." });

    fireEvent.click(screen.getByText("Build your role set"));
    await screen.findByRole("list", { name: "Current role set" });
    const suggestedLabels = listLabels("Suggested roles");
    const initialLabels = listLabels("Current role set");
    expect(initialLabels.length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: `Replace ${initialLabels[0]}` }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search roles" }), { target: { value: "Fetishist" } });
    fireEvent.click(await screen.findByRole("button", { name: "Replace with Fetishist" }));
    let editedLabels = ["Fetishist", ...initialLabels.slice(1)];

    const removedLabel = editedLabels.at(-1)!;
    fireEvent.click(screen.getByRole("button", { name: `Remove ${removedLabel}` }));
    editedLabels = editedLabels.slice(0, -1);
    const manualRole = roleLibrary.roles.find((role) => !editedLabels.includes(role.label))!;
    fireEvent.change(screen.getByRole("searchbox", { name: "Search roles" }), { target: { value: manualRole.label } });
    fireEvent.click(await screen.findByRole("button", { name: `Add ${manualRole.label}` }));
    editedLabels = [...editedLabels, manualRole.label];

    fireEvent.click(screen.getByRole("button", { name: `Make ${editedLabels[1]} primary` }));
    const reorderedLabels = [editedLabels[1], editedLabels[0], ...editedLabels.slice(2)];
    expect(listLabels("Current role set")).toEqual(reorderedLabels);

    fireEvent.click(screen.getAllByRole("link", { name: /Explore this result/i })[0]);
    fireEvent.click(screen.getByRole("link", { name: "Back to your map" }));
    fireEvent.click(screen.getByText("Build your role set"));
    await waitFor(() => expect(listLabels("Current role set")).toEqual(reorderedLabels));
    expect(listLabels("Suggested roles")).toEqual(suggestedLabels);

    while (screen.queryAllByRole("button", { name: /^Remove / }).length) {
      fireEvent.click(screen.getAllByRole("button", { name: /^Remove / })[0]);
    }
    expect(screen.getByText("No roles selected. Search the KinkAtlas role library whenever you want.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("link", { name: /Explore this result/i })[0]);
    fireEvent.click(screen.getByRole("link", { name: "Back to your map" }));
    fireEvent.click(screen.getByText("Build your role set"));
    await screen.findByText("No roles selected. Search the KinkAtlas role library whenever you want.");
    expect(screen.queryByRole("list", { name: "Current role set" })).not.toBeInTheDocument();
    expect(listLabels("Suggested roles")).toEqual(suggestedLabels);
  });
});

afterEach(() => cleanup());
