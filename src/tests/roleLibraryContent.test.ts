import { describe, expect, it } from "vitest";
import { roleLibrary } from "../taxonomy/roleLibrary";

const PROHIBITED_PUBLIC_TEXT = /verified catalog|exact catalog|source-backed|source-derived|source association|source definition|https?:\/\//i;
const PLACEHOLDER_TEXT = /\b(?:todo|tbd|lorem ipsum)\b|placeholder definition|definition (?:is )?unavailable/i;

describe("public role-library content policy", () => {
  it("stores the reviewed primary policy for every role", () => {
    const counts = Object.fromEntries(
      ["direct-primary", "competitive", "contextual", "manual-only"].map((policy) => [
        policy,
        roleLibrary.roles.filter((role) => role.primaryPolicy === policy).length,
      ]),
    );

    expect(counts).toEqual({
      "direct-primary": 27,
      competitive: 22,
      contextual: 181,
      "manual-only": 582,
    });
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(812);
    expect(roleLibrary.roles.every((role) => role.primaryPolicy)).toBe(true);
    expect(roleLibrary.roles.filter((role) => role.recommendationEligibility === "exploration-only").every((role) => role.primaryPolicy === "manual-only")).toBe(true);
    expect(roleLibrary.roles.filter((role) => role.decisionPathway === "manual-only").every((role) => role.primaryPolicy === "manual-only")).toBe(true);
  });

  it("preserves reviewed direct-primary and contextual alias boundaries", () => {
    const directPrimaryLabels = roleLibrary.roles.filter((role) => role.primaryPolicy === "direct-primary").map((role) => role.label).sort();
    expect(directPrimaryLabels).toEqual([
      "Big", "Bondage Switch", "Bottom", "Brat", "Brat Tamer", "Bratty Little", "Daddy", "Dominant", "Kitten", "Mommy", "Owner", "Pet", "Puppy", "Rigger", "Rope Bottom", "Switch", "Top", "Vers", "babygirl", "little", "little boy", "little girl", "little one", "little prince", "little princess", "middle", "submissive",
    ].sort());
    expect(roleLibrary.roles.find((role) => role.label === "Rope Switch")?.primaryPolicy).toBe("contextual");
    expect(roleLibrary.roles.find((role) => role.label === "Bondage Switch")?.primaryPolicy).toBe("direct-primary");
    expect(roleLibrary.roles.find((role) => role.label === "Primal")?.primaryPolicy).toBe("competitive");
  });

  it("contains independently maintained descriptions or an intentional unavailable state", () => {
    const available = roleLibrary.roles.filter((role) => role.definition !== undefined);
    const unavailable = roleLibrary.roles.filter((role) => role.definition === undefined);

    expect(available).toHaveLength(708);
    expect(unavailable).toHaveLength(104);
    expect(new Set(available.map((role) => role.definition)).size).toBe(available.length);

    available.forEach((role) => {
      const definition = role.definition ?? "";
      const wordCount = definition.trim().split(/\s+/).length;
      expect(definition, role.label).toBe(definition.trim());
      expect(wordCount, role.label).toBeGreaterThanOrEqual(20);
      expect(wordCount, role.label).toBeLessThanOrEqual(70);
      expect(definition, role.label).not.toMatch(PROHIBITED_PUBLIC_TEXT);
      expect(definition, role.label).not.toMatch(PLACEHOLDER_TEXT);
    });
  });

  it("contains no URLs or private workflow language", () => {
    expect(JSON.stringify(roleLibrary)).not.toMatch(PROHIBITED_PUBLIC_TEXT);
  });
});
