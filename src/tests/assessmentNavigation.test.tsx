import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { boundaryItems } from "../data/boundaries";
import { discoveryQuestions } from "../data/questions";
import { negotiationQuestions } from "../data/negotiation";
import { readinessQuestions } from "../data/readiness";

const readinessSet = readinessQuestions.filter((question, index, all) => all.findIndex((item) => item.domain === question.domain) === index);

function renderAssessment() {
  window.history.replaceState({}, "", "/assessment");
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /begin/i }));
}

function currentRadios(): HTMLInputElement[] {
  return screen.getAllByRole("radio") as HTMLInputElement[];
}

function completeDiscovery() {
  for (let index = 0; index < 26; index += 1) fireEvent.click(currentRadios()[0]);
  expect(screen.getByText("Your discovery map has enough coverage for a first reading.")).toBeInTheDocument();
}

function completeReadiness() {
  for (let index = 0; index < readinessSet.length; index += 1) fireEvent.click(currentRadios()[0]);
  expect(screen.getByText("Reflection complete.")).toBeInTheDocument();
}

function completeBoundaries() {
  screen.getAllByRole("combobox").forEach((select) => fireEvent.change(select, { target: { value: "prefer-not" } }));
  expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

function completeNegotiation() {
  for (let index = 0; index < negotiationQuestions.length; index += 1) fireEvent.click(currentRadios()[0]);
  expect(screen.getByText("Your first map is ready.")).toBeInTheDocument();
}

describe("assessment navigation", () => {
  it("preserves Discover answers while revisiting, re-advances same answers, recalculates after a change, and resets only on request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderAssessment();

    const firstQuestion = discoveryQuestions[0];
    const secondQuestion = discoveryQuestions[1];
    const firstAnswer = () => screen.getByRole("radio", { name: firstQuestion.answers[0].label }) as HTMLInputElement;
    const changedAnswer = () => screen.getByRole("radio", { name: firstQuestion.answers[1].label }) as HTMLInputElement;
    const secondAnswer = () => screen.getByRole("radio", { name: secondQuestion.answers[0].label }) as HTMLInputElement;
    fireEvent.click(firstAnswer());
    expect(screen.getByRole("group")).toHaveTextContent(secondQuestion.prompt);
    fireEvent.click(secondAnswer());

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(secondAnswer()).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(firstAnswer()).toBeChecked();
    fireEvent.click(firstAnswer());
    expect(screen.getByRole("group")).toHaveTextContent(secondQuestion.prompt);
    expect(secondAnswer()).toBeChecked();
    fireEvent.click(secondAnswer());

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(firstAnswer()).toBeChecked();
    fireEvent.click(changedAnswer());
    expect(screen.getByRole("group")).toHaveTextContent(secondQuestion.prompt);
    expect(secondAnswer()).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(changedAnswer()).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "A private reflection for adults." })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { name: "A private reflection for adults." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /begin/i }));
    expect(currentRadios().some((radio) => radio.checked)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports Reflect revisits, cross-stage Back, and the reflection completion Back action", () => {
    renderAssessment();
    completeDiscovery();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(currentRadios()[0]).toBeChecked();
    fireEvent.click(currentRadios()[0]);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const firstAnswer = currentRadios()[0];
    const changedAnswer = currentRadios()[1];
    fireEvent.click(firstAnswer);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(firstAnswer).toBeChecked();
    fireEvent.click(firstAnswer);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(changedAnswer);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(changedAnswer).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Discover" })).toBeInTheDocument();
    expect(currentRadios()[0]).toBeChecked();
    fireEvent.click(currentRadios()[0]);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    completeReadiness();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(currentRadios()[0]).toBeChecked();
  });

  it("returns from Define to Reflect and keeps Communicate reversible through its completion screen", () => {
    renderAssessment();
    completeDiscovery();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    completeReadiness();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText(/Your boundaries stay separate from role alignment/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Reflect" })).toBeInTheDocument();
    expect(currentRadios()[0]).toBeChecked();
    fireEvent.click(currentRadios()[0]);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getAllByRole("combobox")).toHaveLength(boundaryItems.length);
    completeBoundaries();
    const firstAnswer = currentRadios()[0];
    const changedAnswer = currentRadios()[1];
    fireEvent.click(firstAnswer);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(firstAnswer).toBeChecked();
    fireEvent.click(firstAnswer);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(changedAnswer);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(changedAnswer).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText(/Your boundaries stay separate from role alignment/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    completeNegotiation();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(currentRadios()[0]).toBeChecked();
  });

  it("aligns StageComplete actions and returns from Results to the completed assessment review state", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const storageSetItem = vi.spyOn(Storage.prototype, "setItem");
    renderAssessment();
    completeDiscovery();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    completeReadiness();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    completeBoundaries();
    completeNegotiation();

    const stageActions = screen.getByRole("button", { name: "Back" }).parentElement;
    expect(stageActions).toHaveClass("question-controls", "stage-complete-controls");
    expect(within(stageActions as HTMLElement).getByRole("button", { name: /view my results/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view my results/i }));
    expect(screen.getByRole("heading", { name: "A map, not a verdict." })).toBeInTheDocument();
    const guideLink = screen.getByRole("link", { name: /learn how to read your results/i });
    expect(guideLink).toHaveAttribute("href", "/about#how-to-read-results");
    expect(guideLink).toHaveAttribute("target", "_blank");
    const requestsBeforeReturn = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("link", { name: "Go back to assessment" }));
    expect(screen.getByRole("heading", { name: "Communicate" })).toBeInTheDocument();
    expect(currentRadios()[0]).toBeChecked();
    expect(fetchMock).toHaveBeenCalledTimes(requestsBeforeReturn);
    expect(storageSetItem).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
