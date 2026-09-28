import { readFile, writeFile } from "node:fs/promises";
import { roleLibrarySourcePath } from "./role-library-pipeline";

type PrimaryPolicy = "direct-primary" | "competitive" | "contextual" | "manual-only";

// Reviewed exact-vocabulary labels whose answer metadata may express a primary preference.
const directPrimaryLabels = new Set([
  "Dominant", "submissive", "Switch", "Top", "Bottom", "Vers", "Owner", "Rigger", "Rope Bottom",
  "Bondage Switch", "Brat", "Brat Tamer", "Pet", "Daddy", "Mommy", "Big", "middle", "little",
  "little one", "little girl", "little boy", "little princess", "little prince", "babygirl", "Bratty Little",
  "Puppy", "Kitten",
]);

// Reviewed inferred labels that describe a narrower expression or presentation variant rather than a headline.
const contextualInferredLabels = new Set([
  "Sensual Sadist", "Pleasure Dom", "Rope Top", "Rope Bunny", "Bondage Top", "Impact Top", "Sensation Top",
]);

const source = JSON.parse(await readFile(roleLibrarySourcePath, "utf8")) as {
  schemaVersion: number;
  roles: Array<{ id: string; label: string; assessmentMode: string; recommendationEligibility: string; primaryPolicy?: PrimaryPolicy }>;
};

const policyByRoleId = new Map<string, PrimaryPolicy>();
for (const role of source.roles) {
  // Exploration-only vocabulary cannot become an assessment-generated headline. The reviewed direct set is checked
  // before the remaining evidence groups; Primal is deliberately competitive because its answer has no primary preference.
  // The remaining inferred roles are reviewed standalone headlines, while focused interests and non-excepted hybrids are contextual.
  const policy: PrimaryPolicy = role.recommendationEligibility === "exploration-only"
    ? "manual-only"
    : directPrimaryLabels.has(role.label)
      ? "direct-primary"
      : role.label === "Primal"
        ? "competitive"
        : role.assessmentMode === "inferred"
          ? contextualInferredLabels.has(role.label) ? "contextual" : "competitive"
          : "contextual";
  policyByRoleId.set(role.id, policy);
}

if (source.roles.length !== 812 || policyByRoleId.size !== 812) {
  throw new Error(`Expected 812 uniquely classified roles; received ${source.roles.length} roles and ${policyByRoleId.size} policies.`);
}

const counts = [...policyByRoleId.values()].reduce<Record<PrimaryPolicy, number>>((result, policy) => {
  result[policy] += 1;
  return result;
}, { "direct-primary": 0, competitive: 0, contextual: 0, "manual-only": 0 });

const expected = { "direct-primary": 27, competitive: 22, contextual: 181, "manual-only": 582 };
if (JSON.stringify(counts) !== JSON.stringify(expected)) throw new Error(`Unexpected classification: ${JSON.stringify(counts)}`);

const sourceText = await readFile(roleLibrarySourcePath, "utf8");
const rolesWithPersistedPolicy = source.roles.filter((role) => role.primaryPolicy !== undefined);
if (rolesWithPersistedPolicy.length) {
  if (rolesWithPersistedPolicy.length !== source.roles.length) throw new Error("Source contains a partial primary-policy assignment.");
  if (source.schemaVersion !== 2) throw new Error(`Expected schemaVersion 2; received ${source.schemaVersion}.`);
  for (const role of source.roles) {
    const expectedPolicy = policyByRoleId.get(role.id);
    if (role.primaryPolicy !== expectedPolicy) throw new Error(`${role.label} has ${role.primaryPolicy}; expected ${expectedPolicy}.`);
  }
  console.log(`Validated reviewed primary-policy assignment: ${JSON.stringify(counts)}`);
  process.exit(0);
}

let currentRoleId: string | undefined;
const output: string[] = [];
for (const line of sourceText.replace('"schemaVersion": 1', '"schemaVersion": 2').split(/\r?\n/)) {
  const roleId = line.match(/^\s+"id": "(role:[^"]+)",$/)?.[1];
  if (roleId) currentRoleId = roleId;
  output.push(line);
  if (currentRoleId && line.includes('"recommendationEligibility":')) {
    const policy = policyByRoleId.get(currentRoleId);
    if (!policy) throw new Error(`No primary policy for ${currentRoleId}`);
    output.push(`${line.match(/^\s*/)?.[0] ?? ""}"primaryPolicy": "${policy}",`);
  }
}

await writeFile(roleLibrarySourcePath, output.join("\n"), "utf8");
console.log(JSON.stringify(counts));
