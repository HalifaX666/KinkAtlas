import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { generateRoleLibrary, roleLibraryRuntimePath, validateRoleLibraryDataset } from "./role-library-pipeline";

const role = {
  id: "role:example",
  label: "Example",
  aliases: [],
  facets: [],
  assessmentMode: "exploration",
  recommendationEligibility: "exploration-only",
  primaryPolicy: "manual-only",
  nearestRoleIds: [],
  decisionPathway: "manual-only",
  familyIds: ["example-family"],
};

const dataset = () => ({
  schemaVersion: 2,
  roles: [{ ...role }],
  relationships: [],
  families: { "example-family": "Example family" },
});

const relationshipDataset = () => {
  const value = dataset();
  value.roles.push({ ...role, id: "role:other", label: "Other" });
  return value;
};

describe("neutral role-library pipeline", () => {
  it("reproduces the checked-in runtime deterministically", async () => {
    const generated = await generateRoleLibrary();
    expect(generated).toMatchObject({
      roleCount: 1107,
      definitionCount: 998,
      unavailableCount: 109,
      relationshipCount: 59,
      familyCount: 26,
    });
    expect(generated.serialized).toBe(await readFile(roleLibraryRuntimePath, "utf8"));
  });

  it("rejects duplicate IDs and unsupported assessment metadata", () => {
    const duplicate = dataset();
    duplicate.roles.push({ ...role });
    expect(() => validateRoleLibraryDataset(duplicate)).toThrow(/duplicate role ID/);

    const malformed = dataset();
    malformed.roles[0].assessmentMode = "guessed";
    expect(() => validateRoleLibraryDataset(malformed)).toThrow(/unsupported value/);

    const unknownPrimaryPolicy = dataset();
    unknownPrimaryPolicy.roles[0].primaryPolicy = "incidental";
    expect(() => validateRoleLibraryDataset(unknownPrimaryPolicy)).toThrow(/unsupported value/);
  });

  it("rejects automatic primary policy for exploration-only and manual-pathway roles", () => {
    const explorationPrimary = dataset();
    explorationPrimary.roles[0].primaryPolicy = "competitive";
    expect(() => validateRoleLibraryDataset(explorationPrimary)).toThrow(/exploration-only/);

    const manualPathwayPrimary = dataset();
    manualPathwayPrimary.roles[0].recommendationEligibility = "eligible-with-direct-evidence";
    manualPathwayPrimary.roles[0].primaryPolicy = "direct-primary";
    expect(() => validateRoleLibraryDataset(manualPathwayPrimary)).toThrow(/decision pathway is manual-only/);
  });

  it("rejects missing family and relationship references", () => {
    const missingFamily = dataset();
    missingFamily.roles[0].familyIds = ["missing-family"];
    expect(() => validateRoleLibraryDataset(missingFamily)).toThrow(/references missing family/);

    const missingRole = dataset();
    missingRole.relationships.push({
      fromRoleId: role.id,
      toRoleId: "role:missing",
      type: "sibling",
      rationale: "Test relationship.",
    });
    expect(() => validateRoleLibraryDataset(missingRole)).toThrow(/references missing role/);
  });

  it("rejects exact duplicate semantic relationship edges even when rationales differ", () => {
    const value = relationshipDataset();
    value.relationships.push(
      { fromRoleId: role.id, toRoleId: "role:other", type: "sibling", rationale: "First rationale." },
      { fromRoleId: role.id, toRoleId: "role:other", type: "sibling", rationale: "Different rationale." },
    );

    expect(() => validateRoleLibraryDataset(value)).toThrow(/duplicates relationship/);
  });

  it("rejects reversed duplicates for symmetric relationship types", () => {
    const value = relationshipDataset();
    value.relationships.push(
      { fromRoleId: role.id, toRoleId: "role:other", type: "switch-counterpart", rationale: "First direction." },
      { fromRoleId: "role:other", toRoleId: role.id, type: "switch-counterpart", rationale: "Reverse direction." },
    );

    expect(() => validateRoleLibraryDataset(value)).toThrow(/reverses an existing symmetric relationship/);
  });

  it("accepts independent relationship types and preserves directional edges", () => {
    const value = relationshipDataset();
    value.relationships.push(
      { fromRoleId: role.id, toRoleId: "role:other", type: "broader-than", rationale: "Example is broader." },
      { fromRoleId: "role:other", toRoleId: role.id, type: "broader-than", rationale: "Other is independently broader." },
      { fromRoleId: role.id, toRoleId: "role:other", type: "activity-related", rationale: "A separate symmetric relationship type." },
    );

    expect(() => validateRoleLibraryDataset(value)).not.toThrow();
  });
});
