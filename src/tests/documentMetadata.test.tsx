import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

describe("route document metadata", () => {
  it.each([
    ["/", "KinkAtlas | Private Kink & BDSM Self-Reflection Quiz", "index, follow"],
    ["/about", "About KinkAtlas", "index, follow"],
    ["/about/", "About KinkAtlas", "index, follow"],
    ["/faq", "KinkAtlas FAQ", "index, follow"],
    ["/contact", "Contact | KinkAtlas", "index, follow"],
    ["/philosophy", "Consent Philosophy | KinkAtlas", "index, follow"],
    ["/terms", "Terms of Use | KinkAtlas", "index, follow"],
    ["/assessment", "Kink & BDSM Exploration Quiz | KinkAtlas", "index, follow"],
    ["/results", "Your Kink Map | KinkAtlas", "noindex, nofollow"],
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

  it("sets route-specific canonical URLs", () => {
    renderMetadata("/about");

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/about");

    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute("content", "https://kinkatlas.ca/about");
  });

  it("normalizes trailing slashes when setting canonical URLs", () => {
    renderMetadata("/about/");

    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kinkatlas.ca/about");
  });

  it("uses only the reviewed role name in role metadata and keeps role pages out of the index", () => {
    renderMetadata("/roles/dominant");

    expect(document.title).toBe("Dominant | KinkAtlas");

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");

    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).not.toMatch(/alignment|confidence|score|answer/i);

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

  it("marks unknown routes noindex without echoing the invalid path", () => {
    renderMetadata("/not-a-real-route/private-value");

    expect(document.title).toBe("Page Not Found | KinkAtlas");

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

    expect(document.head.textContent).not.toContain("private-value");

    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();

    expect(document.querySelector('meta[property="og:url"]')).not.toBeInTheDocument();
  });
});
