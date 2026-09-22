import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { CONTACT_TOPICS, EMAIL_PLACEHOLDERS, MESSAGE_PLACEHOLDERS, NAME_PLACEHOLDERS } from "../pages/ContactPage";
import contactPageSource from "../pages/ContactPage.tsx?raw";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function renderContact() {
  window.history.replaceState(null, "", "/contact");
  return render(<App />);
}

function fillValidContactForm() {
  fireEvent.change(screen.getByLabelText("Name (optional)"), { target: { value: "Velvet Tester" } });
  fireEvent.change(screen.getByLabelText("Email (optional)"), { target: { value: "velvet@example.com" } });
  fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Accessibility" } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "The focus ring needs attention." } });
}

describe("public Contact page", () => {
  it("renders an accessible, privacy-separated form with all required topics and honeypot", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { container } = renderContact();

    expect(screen.getByText("Contact", { selector: ".eyebrow" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Get in touch" })).toBeInTheDocument();
    for (const heading of ["General questions & feedback", "Bug reports", "Accessibility", "Privacy", "Press / collaboration"]) expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    const form = screen.getByRole("form", { name: "Write a note" });
    expect(form).toHaveAttribute("name", "contact");
    expect(form).toHaveAttribute("method", "POST");
    expect(form).toHaveAttribute("data-netlify", "true");
    expect(form).toHaveAttribute("netlify-honeypot", "website");
    expect(within(form).getByDisplayValue("contact")).toHaveAttribute("name", "form-name");

    const name = screen.getByLabelText("Name (optional)");
    const email = screen.getByLabelText("Email (optional)");
    const topic = screen.getByLabelText("Topic");
    const message = screen.getByLabelText("Message");
    expect(name).not.toBeRequired();
    expect(email).not.toBeRequired();
    expect(email).toHaveAttribute("type", "email");
    expect(topic).toBeRequired();
    expect(message).toBeRequired();
    expect(message).toHaveAttribute("maxlength", "5000");
    for (const contactTopic of CONTACT_TOPICS) expect(within(topic).getByRole("option", { name: contactTopic })).toBeInTheDocument();
    expect(name).toHaveAttribute("placeholder", NAME_PLACEHOLDERS[0]);
    expect(email).toHaveAttribute("placeholder", EMAIL_PLACEHOLDERS[0]);
    expect(message).toHaveAttribute("placeholder", MESSAGE_PLACEHOLDERS[0]);
    expect(name).toHaveValue("");
    expect(email).toHaveValue("");
    expect(message).toHaveValue("");
    expect(container.querySelector('input[name="website"]')).toHaveAttribute("tabindex", "-1");
    expect(container.querySelector("form[action]")).toBeNull();
    expect(screen.getByText(/Contact messages are separate from your KinkAtlas assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact submissions are processed through Netlify/i)).toBeInTheDocument();
    expect(screen.getByText(/assessment answers, results, recommendations, readiness data, boundaries, blind spots, and role selections are never automatically attached/i)).toBeInTheDocument();
    expect(container.textContent).not.toContain("contact@example.com");
    expect(container.textContent).not.toContain("mailto:");
  });

  it("keeps randomized placeholders stable over rerenders and selects only approved values", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { rerender } = renderContact();
    const name = screen.getByLabelText("Name (optional)");
    const email = screen.getByLabelText("Email (optional)");
    const message = screen.getByLabelText("Message");
    const placeholders = [name.getAttribute("placeholder"), email.getAttribute("placeholder"), message.getAttribute("placeholder")];

    expect(NAME_PLACEHOLDERS).toContain(placeholders[0]);
    expect(EMAIL_PLACEHOLDERS).toContain(placeholders[1]);
    expect(MESSAGE_PLACEHOLDERS).toContain(placeholders[2]);
    fireEvent.change(name, { target: { value: "A visitor" } });
    rerender(<App />);
    expect(screen.getByLabelText("Name (optional)")).toHaveAttribute("placeholder", placeholders[0] ?? "");
    expect(screen.getByLabelText("Email (optional)")).toHaveAttribute("placeholder", placeholders[1] ?? "");
    expect(screen.getByLabelText("Message")).toHaveAttribute("placeholder", placeholders[2] ?? "");
    expect(random).toHaveBeenCalledTimes(3);

    cleanup();
    random.mockReturnValue(0.9);
    renderContact();
    expect(screen.getByLabelText("Name (optional)")).not.toHaveAttribute("placeholder", placeholders[0] ?? "");
    expect(screen.getByLabelText("Email (optional)")).not.toHaveAttribute("placeholder", placeholders[1] ?? "");
    expect(screen.getByLabelText("Message")).not.toHaveAttribute("placeholder", placeholders[2] ?? "");
  });

  it("posts only contact fields, prevents duplicate submissions, and clears user input after success", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      input === "/.netlify/functions/completion-count"
        ? Promise.resolve(new Response(JSON.stringify({ count: 12 }), { status: 200 }))
        : new Promise<Response>((resolve) => {
            resolveRequest = resolve;
          }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderContact();
    const placeholders = [screen.getByLabelText("Name (optional)").getAttribute("placeholder"), screen.getByLabelText("Email (optional)").getAttribute("placeholder"), screen.getByLabelText("Message").getAttribute("placeholder")];
    fillValidContactForm();

    fireEvent.submit(screen.getByRole("form", { name: "Write a note" }));
    fireEvent.submit(screen.getByRole("form", { name: "Write a note" }));

    expect(fetchMock.mock.calls.filter(([input]) => input === "/")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "form-name=contact&name=Velvet+Tester&email=velvet%40example.com&topic=Accessibility&message=The+focus+ring+needs+attention.&website=",
    });
    resolveRequest?.(new Response(null, { status: 200 }));

    await waitFor(() => expect(screen.getByText("Thanks — your message was sent.")).toHaveAttribute("aria-live", "polite"));
    expect(screen.getByLabelText("Name (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Email (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Topic")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(container.querySelector('input[name="website"]')).toHaveValue("");
    expect(screen.getByLabelText("Name (optional)")).toHaveAttribute("placeholder", placeholders[0] ?? "");
    expect(screen.getByLabelText("Email (optional)")).toHaveAttribute("placeholder", placeholders[1] ?? "");
    expect(screen.getByLabelText("Message")).toHaveAttribute("placeholder", placeholders[2] ?? "");
  });

  it("retains user input and shows a generic failure message when delivery fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    renderContact();
    fillValidContactForm();

    fireEvent.submit(screen.getByRole("form", { name: "Write a note" }));

    await waitFor(() => expect(screen.getByText("Something went wrong while sending your message. Please try again.")).toHaveAttribute("data-status", "error"));
    expect(screen.getByLabelText("Name (optional)")).toHaveValue("Velvet Tester");
    expect(screen.getByLabelText("Email (optional)")).toHaveValue("velvet@example.com");
    expect(screen.getByLabelText("Topic")).toHaveValue("Accessibility");
    expect(screen.getByLabelText("Message")).toHaveValue("The focus ring needs attention.");
  });

  it("never substitutes randomized placeholders for blank optional values", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(input === "/.netlify/functions/completion-count" ? new Response(JSON.stringify({ count: 12 }), { status: 200 }) : new Response(null, { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    renderContact();

    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Privacy" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "A privacy question." } });
    fireEvent.submit(screen.getByRole("form", { name: "Write a note" }));

    await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => input === "/")).toHaveLength(1));
    const request = fetchMock.mock.calls.find(([input]) => input === "/")?.[1];
    expect(request).toBeDefined();
    expect(new URLSearchParams(request?.body as string)).toEqual(new URLSearchParams({ "form-name": "contact", name: "", email: "", topic: "Privacy", message: "A privacy question.", website: "" }));
  });

  it("does not access assessment state, persistence, or obsolete Contact integrations", () => {
    expect(contactPageSource).not.toMatch(/AssessmentContext|useAssessment|recommendation state|readiness state|boundary state/);
    expect(contactPageSource).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(contactPageSource).not.toMatch(/mailto:|XMLHttpRequest|sendBeacon/);
    expect(contactPageSource).not.toMatch(/VITE_CONTACT_API_URL|RESEND_API_KEY|CONTACT_FROM_EMAIL|Authorization|smtp|workers\.dev|api\.resend\.com/i);
    expect(contactPageSource).toMatch(/fetch\("\/"/);
  });

  it("exposes Contact in the footer and applies public route metadata", () => {
    renderContact();

    const footerNavigation = within(screen.getByRole("contentinfo")).getByRole("navigation", { name: "Further information" });
    expect(within(footerNavigation).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(document.title).toBe("Contact | KinkAtlas");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute("content", "Contact KinkAtlas for questions, feedback, bug reports, accessibility issues, privacy questions, or collaboration inquiries.");
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  });
});
