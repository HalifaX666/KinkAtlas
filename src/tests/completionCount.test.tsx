import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompletionCounter } from "../components/CompletionCounter";
import { loadCompletionCount, recordAssessmentCompletion } from "../services/completionCount";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("aggregate completion counter", () => {
  it("loads and formats the aggregate count, and refreshes without incrementing", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ count: 12481 }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const first = render(<CompletionCounter />);

    expect(await screen.findByText("12,481 assessments completed")).toBeInTheDocument();

    first.unmount();

    render(<CompletionCounter />);

    expect(await screen.findByText("12,481 assessments completed")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });

  it("opens by mouse or keyboard activation and closes with Escape while preserving focus", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 7 }), { status: 200 })));

    render(<CompletionCounter />);

    const button = await screen.findByRole("button", {
      name: "How completion counting works",
    });

    button.focus();

    fireEvent.click(button, { detail: 0 });

    expect(button).toHaveAttribute("aria-expanded", "true");

    expect(button).toHaveAttribute("aria-controls", "completion-count-explanation");

    const dialog = screen.getByRole("dialog", {
      name: "About the assessment completion count",
    });

    expect(dialog).toHaveTextContent("We count completions, not answers.");

    expect(dialog).toHaveTextContent("not unique people");

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    expect(button).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.queryByRole("dialog", {
        name: "About the assessment completion count",
      }),
    ).not.toBeInTheDocument();

    expect(button).toHaveFocus();

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByRole("dialog", {
        name: "About the assessment completion count",
      }),
    ).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(button).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.queryByRole("dialog", {
        name: "About the assessment completion count",
      }),
    ).not.toBeInTheDocument();
  });

  it("hides the counter and does not throw when reading fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("unavailable"));

    vi.stubGlobal("fetch", fetchMock);

    render(<CompletionCounter />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    expect(screen.queryByText(/assessments completed/i)).not.toBeInTheDocument();
  });

  it("sends an empty increment request and silently tolerates failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("unavailable"));

    vi.stubGlobal("fetch", fetchMock);

    await expect(recordAssessmentCompletion()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith("/.netlify/functions/completion-count", {
      method: "POST",
      credentials: "omit",
      keepalive: true,
      referrerPolicy: "no-referrer",
    });

    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("body");
  });

  it("rejects malformed count responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: "12" }), { status: 200 })));

    await expect(loadCompletionCount()).resolves.toBeNull();
  });
});
