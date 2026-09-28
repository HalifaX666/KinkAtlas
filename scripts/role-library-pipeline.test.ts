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

describe("neutral role-library pipeline", () => {
  it("reproduces the checked-in runtime deterministically", async () => {
    const generated = await generateRoleLibrary();
    expect(generated).toMatchObject({
      roleCount: 812,
      definitionCount: 708,
      unavailableCount: 104,
      relationshipCount: 60,
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
});
