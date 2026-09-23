import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";

describe("assessment flow", () => {
  it("runs from onboarding through adaptive questions to explainable results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 12482 }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/");

    render(<App />);

    const startLinks = screen.getAllByRole("link", {
      name: /start exploring/i,
    });

    fireEvent.click(startLinks[startLinks.length - 1]);
    fireEvent.click(screen.getByRole("button", { name: /begin/i }));

    expect(screen.getByRole("group").querySelector("legend")).toHaveFocus();

    fireEvent.click(screen.getAllByRole("radio")[0]);

    expect(screen.getByRole("group").querySelector("legend")).toHaveFocus();

    for (let index = 1; index < 26; index += 1) {
      fireEvent.click(screen.getAllByRole("radio")[0]);
    }

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Refine" })).toBeInTheDocument();

    let refinementQuestion = screen.queryByRole("group");

    while (refinementQuestion) {
      expect(refinementQuestion.querySelector("legend")).toHaveFocus();

      fireEvent.click(screen.getAllByRole("radio")[0]);

      refinementQuestion = screen.queryByRole("group");
    }

    expect(screen.getByText(/Refinement complete|No extra refinement is needed yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Reflect" })).toBeInTheDocument();

    expect(screen.getByRole("group").querySelector("legend")).toHaveFocus();

    fireEvent.click(screen.getAllByRole("radio")[0]);

    expect(screen.getByRole("group").querySelector("legend")).toHaveFocus();

    for (let index = 1; index < 17; index += 1) {
      fireEvent.click(screen.getAllByRole("radio")[0]);
    }

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText(/Your boundaries stay separate from role alignment/i)).toBeInTheDocument();

    expect(screen.queryByText(/not evaluated/i)).not.toBeInTheDocument();

    const defineContinueButton = screen.getByRole("button", {
      name: "Continue",
    });

    expect(defineContinueButton).toBeDisabled();

    /*
     * "Not answered" should no longer be a visible option.
     */
    expect(screen.queryByRole("option", { name: "Not answered" })).not.toBeInTheDocument();

    const boundarySelects = screen.getAllByRole("combobox");

    boundarySelects.forEach((select) => {
      fireEvent.change(select, {
        target: { value: "prefer-not" },
      });
    });

    expect(defineContinueButton).toBeEnabled();

    fireEvent.click(defineContinueButton);

    expect(screen.getByRole("group").querySelector("legend")).toHaveFocus();

    fireEvent.click(screen.getAllByRole("radio")[0]);

    expect(screen.getByRole("group").querySelector("legend")).toHaveFocus();

    for (let index = 1; index < 16; index += 1) {
      fireEvent.click(screen.getAllByRole("radio")[0]);
    }

    fireEvent.click(
      screen.getByRole("button", {
        name: /view my results/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "A map, not a verdict.",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Role discovery",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Build your role set",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/Your answers and results were not uploaded or stored/i)).toBeInTheDocument();

    const createRoleCards = await screen.findByRole("button", {
      name: /create my role cards/i,
    });
    await waitFor(() => expect(createRoleCards).toBeEnabled());
    fireEvent.click(createRoleCards);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    expect(screen.getByText(/role-alignment suggestions, not identities assigned to you/i)).toBeInTheDocument();

    expect(screen.getByText(/does not establish readiness, boundaries, compatibility, or consent/i)).toBeInTheDocument();

    const incrementRequests = fetchMock.mock.calls.filter(([, options]) => options?.method === "POST");

    expect(incrementRequests).toHaveLength(1);

    expect(incrementRequests[0][1]).not.toHaveProperty("body");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
