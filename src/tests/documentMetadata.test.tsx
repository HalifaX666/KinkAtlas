import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { baseDescription, DocumentMetadata } from "../components/DocumentMetadata";

const originalHead = document.head.innerHTML;

afterEach(() => {
  cleanup();
  document.head.innerHTML = originalHead;
});

function renderMetadata(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DocumentMetadata />
      <main aria-label="route content" />
    </MemoryRouter>,
  );

  expect(screen.getByRole("main", { name: "route content" })).toBeInTheDocument();
}

function MetadataNavigation() {
  const navigate = useNavigate();

  return <><DocumentMetadata /><button type="button" onClick={() => navigate("/about")}>Open About</button></>;
}

describe("route document metadata", () => {
  it.each([
    ["/", "KinkAtlas | Private Kink & BDSM Self-Reflection Quiz", "index, follow"],
    ["/about", "About KinkAtlas", "index, follow"],
    ["/about/", "About KinkAtlas", "index, follow"],
    ["/faq", "KinkAtlas FAQ", "index, follow"],
    ["/contact", "Contact | KinkAtlas", "index, follow"],
    ["/philosophy", "Consent Philosophy | KinkAtlas", "index, follow"],
    ["/terms", "Terms of Use | KinkAtlas", "index, follow"],
    ["/assessment", "Kink & BDSM Exploration Quiz | KinkAtlas", "noindex, nofollow"],
    ["/results", "Your Kink Map | KinkAtlas", "noindex, nofollow"],
    ["/capsule", "Open Encrypted Capsule | KinkAtlas", "noindex, nofollow"],
    ["/restore", "Private Restore | KinkAtlas", "noindex, nofollow"],
    ["/viewer-request", "Viewer Request | KinkAtlas", "noindex, nofollow"],
    ["/roles", "Role Library | KinkAtlas", "index, follow"],
  ])("sets safe metadata for %s", (path, title, robots) => {
    renderMetadata(path);

    expect(document.title).toBe(title);

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", robots);

    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute("content", title);

    expect(document.querySelector('meta[name="twitter:title"]')).toHaveAttribute("content", title);
  });

  it("uses stable homepage SEO metadata without assessment state", () => {
    renderMetadata("/");

    expect(document.querySelector('meta[name="description"]')).toHaveAttribute("content", baseDescription);

    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute("content", "https://kinkatlas.ca/social-preview.png");

    expect(document.querySelector('meta[property="og:image:alt"]')).toHaveAttribute("content", "KinkAtlas | Discover your desires. Know your boundaries. Learn your language.");

    expect(document.querySelector('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

    expect(document.querySelector('meta[name="twitter:image"]')).toHaveAttribute("content", "https://kinkatlas.ca/social-preview.png");

    expect(document.querySelector('meta[name="twitter:image:alt"]')).toHaveAttribute("content", "KinkAtlas | Discover your desires. Know your boundaries. Learn your language.");

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/");

    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute("content", "https://kinkatlas.ca/");
  });

  it("does not advertise a fixed Role Library total in public metadata", () => {
    renderMetadata("/roles");

    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).not.toMatch(/812|\b\d+\s+(?:roles|terms)\b/i);
  });

  it("sets route-specific canonical URLs", () => {
    renderMetadata("/about");

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/about");

    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute("content", "https://kinkatlas.ca/about");
  });

  it("normalizes trailing slashes when setting canonical URLs", () => {
    renderMetadata("/about/");

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/about");
  });

  it("uses only the reviewed role name in public role metadata", async () => {
    renderMetadata("/roles/dominant");

    await waitFor(() => expect(document.title).toBe("Dominant | KinkAtlas"));

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "index, follow");

    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).not.toMatch(/alignment|confidence|score|answer/i);

    expect(document.querySelector('meta[name="description"]')).toHaveAttribute("content", expect.stringContaining("negotiated authority"));

    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute("content", "article");

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/roles/dominant");

    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute("content", "https://kinkatlas.ca/roles/dominant");
  });

  it("uses the human-readable scored-role page for Discovery vocabulary without a library-label match", async () => {
    renderMetadata("/roles/praise-receiver");

    await waitFor(() => expect(document.title).toBe("Praise Receiver | KinkAtlas"));
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/roles/praise-receiver");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).not.toMatch(/alignment|confidence|score|answer/i);
  });

  it("does not let a pending role lookup overwrite metadata after navigation", async () => {
    render(<MemoryRouter initialEntries={["/roles/dominant"]}><MetadataNavigation /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Open About" }));

    await waitFor(() => expect(document.title).toBe("About KinkAtlas"));
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/about");
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  });

  it("keeps the private assessment workflow out of the index and without a canonical URL", () => {
    renderMetadata("/assessment");

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
    expect(document.querySelector('meta[property="og:url"]')).not.toBeInTheDocument();
  });

  it("keeps private results out of the index and without a canonical URL", () => {
    renderMetadata("/results");

    expect(document.title).toBe("Your Kink Map | KinkAtlas");

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();

    expect(document.querySelector('meta[property="og:url"]')).not.toBeInTheDocument();
  });

  it.each(["/capsule", "/restore", "/viewer-request"])("keeps the private Capsule route %s out of the index without a canonical URL", (path) => {
    renderMetadata(path);
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
    expect(document.querySelector('meta[property="og:url"]')).not.toBeInTheDocument();
  });

  it("marks unknown routes noindex without echoing the invalid path", () => {
    renderMetadata("/not-a-real-route/private-value");

    expect(document.title).toBe("Page Not Found | KinkAtlas");

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

    expect(document.head.textContent).not.toContain("private-value");

    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();

    expect(document.querySelector('meta[property="og:url"]')).not.toBeInTheDocument();
  });
});
