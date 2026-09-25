import { expect, test } from "@playwright/test";
import { expectRenderedSanity, installBrowserGuards, namedRoleSetLabels, openPersonaResults, openRoleSetBuilder, roleSetLabels } from "./support/browserGuards";

test("Assessment smoke: questions and answers remain readable and selectable", async ({ page }) => {
  const guards = await installBrowserGuards(page);
  await page.goto("/assessment");
  await page.getByRole("button", { name: /begin/i }).click();

  const question = page.locator("fieldset.question-card");
  const prompt = (await question.locator("legend").textContent())?.trim();
  const labels = (await question.locator(".answer-option > span:last-child").allTextContents()).map((label) => label.trim());

  expect(prompt).toBeTruthy();
  expect(labels.length).toBeGreaterThan(0);
  expect(labels.every(Boolean)).toBe(true);
  expect(new Set(labels).size).toBe(labels.length);

  await question.locator(".answer-option").first().click();
  await expect(question.locator("legend")).not.toHaveText(prompt!);
  await expect(question.getByRole("radio")).not.toHaveCount(0);
  await guards.assertClean();
});

test("Persona smoke: completed assessment renders coherent Results", async ({ page }) => {
  const guards = await installBrowserGuards(page);
  await openPersonaResults(page, "balanced-authority-pattern");

  await expect(page.getByRole("heading", { name: "Strongest dimensions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Role discovery" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reflection" })).toBeVisible();
  await expect(page.getByText(/Wants & boundaries/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conversation starters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create my role cards" })).toBeVisible();

  await openRoleSetBuilder(page);
  const suggested = await roleSetLabels(page, ".profile-recommendation-summary > ol > li .profile-suggestion-heading > strong");
  const current = await roleSetLabels(page, ".profile-role-list > li > div:first-child > strong");
  expect(suggested.length).toBeGreaterThan(0);
  expect(current).toEqual(suggested);
  const suggestedPrimary = page.locator(".profile-recommendation-summary > ol > li").first();
  await expect(suggestedPrimary).toContainText("Suggested primary");
  await suggestedPrimary.getByText("About this role").click();
  await expect(suggestedPrimary.getByText("How this relates to your results")).toBeVisible();

  await expectRenderedSanity(page);
  await guards.assertClean();
});

test("Persona smoke: edited Your Role Set drives Export & Share", async ({ page }) => {
  const guards = await installBrowserGuards(page);
  await openPersonaResults(page, "balanced-authority-pattern");
  await openRoleSetBuilder(page);

  const suggested = await namedRoleSetLabels(page, "Suggested roles");
  const before = await namedRoleSetLabels(page, "Current role set");
  expect(before).toEqual(suggested);
  expect(before.length).toBeGreaterThan(2);

  await page.getByRole("button", { name: `Replace ${before[1]}` }).click();
  await expect(page.getByRole("group", { name: "Replacement mode" })).toContainText(`Choose a role to replace ${before[1]}.`);
  await page.getByRole("button", { name: "Cancel replacement" }).click();
  await expect(page.getByRole("group", { name: "Replacement mode" })).toHaveCount(0);

  const movedRole = before[1];
  await page.getByRole("button", { name: `Move ${movedRole} down` }).click();
  await expect(page.getByRole("status")).toContainText(`${movedRole} moved down in your role set.`);
  await page.getByRole("button", { name: `Move ${movedRole} up` }).click();
  expect(await namedRoleSetLabels(page, "Current role set")).toEqual(before);

  const chosenPrimary = before[2];
  await page.getByRole("button", { name: `Make ${chosenPrimary} primary` }).click();
  const primaryOrder = [chosenPrimary, ...before.slice(0, 2), ...before.slice(3)];
  await expect(page.getByRole("status")).toContainText(`${chosenPrimary} is now your primary. KinkAtlas’s suggested primary is unchanged.`);
  expect(await namedRoleSetLabels(page, "Current role set")).toEqual(primaryOrder);
  expect(await namedRoleSetLabels(page, "Suggested roles")).toEqual(suggested);
  await expect(page.locator(".profile-role-list > li").first()).toContainText("Your primary");
  await expect(page.locator(".profile-recommendation-summary > ol > li").first()).toContainText("Suggested primary");

  await page.getByRole("button", { name: "Create my role cards" }).click();
  let dialog = page.getByRole("dialog", { name: "Export & Share" });
  await expect(dialog).toBeVisible();
  expect(await roleSetLabels(page, ".role-card-options > label > span:last-child > strong")).toEqual(primaryOrder);
  await dialog.getByRole("button", { name: "Close export and sharing dialog" }).click();

  await page.getByRole("button", { name: "Restore suggested set" }).click();
  await expect(page.getByRole("status")).toContainText("Your role set was restored to the assessment suggestion.");
  expect(await namedRoleSetLabels(page, "Current role set")).toEqual(suggested);
  expect(await namedRoleSetLabels(page, "Suggested roles")).toEqual(suggested);

  await page.getByRole("button", { name: "Create my role cards" }).click();
  dialog = page.getByRole("dialog", { name: "Export & Share" });
  await expect(dialog).toBeVisible();
  expect(await roleSetLabels(page, ".role-card-options > label > span:last-child > strong")).toEqual(suggested);
  await dialog.getByRole("button", { name: "Close export and sharing dialog" }).click();

  await page.getByRole("searchbox", { name: "Search roles" }).fill("Kinkster");
  const alternateResult = page.getByRole("button", { name: "Add Kinkster", exact: true }).locator("..");
  await alternateResult.getByText("About this role").click();
  await expect(alternateResult.getByText("How this relates to your results")).toBeVisible();
  await expect(alternateResult).toContainText(/Not suggested automatically|Supported alternative|Overlapping evidence/);

  await page.getByRole("searchbox", { name: "Search roles" }).fill("Soft Dom");
  const manualResult = page.getByRole("button", { name: "Add Soft Dom", exact: true }).locator("..");
  await manualResult.getByText("About this role").click();
  await expect(manualResult).toContainText("Available for self-exploration");
  await expect(manualResult).toContainText("How this relates to your results");

  const replacedRole = suggested[1];

  await page.getByRole("button", { name: `Replace ${replacedRole}` }).click();
  await page.getByRole("button", { name: "Replace with Soft Dom", exact: true }).click();
  await expect(page.getByText(`${replacedRole} was replaced with Soft Dom. The assessment suggestion is unchanged.`)).toBeVisible();
  await expect(manualResult).toContainText("Added by you");
  await expect(manualResult).not.toContainText(/Strong alignment|High confidence|Medium confidence|evidence breadth/i);
  await page.getByRole("button", { name: "Make Soft Dom primary" }).click();

  const edited = await namedRoleSetLabels(page, "Current role set");
  expect(edited[0]).toBe("Soft Dom");
  expect(edited).not.toContain(replacedRole);

  await page.getByRole("button", { name: "Create my role cards" }).click();
  dialog = page.getByRole("dialog", { name: "Export & Share" });
  await expect(dialog).toBeVisible();
  const exported = await roleSetLabels(page, ".role-card-options > label > span:last-child > strong");
  expect(exported).toEqual(edited);
  expect(exported).not.toContain(replacedRole);

  const manualRole = dialog.locator(".role-card-options > label").filter({ hasText: "Soft Dom" });
  await expect(manualRole).toContainText("Added by you");
  await expect(manualRole).toContainText("No assessment score or confidence");
  await expect(manualRole).not.toContainText(/Strong alignment|High confidence|Medium confidence|evidence breadth/i);
  await expect(dialog).toContainText("manually post to FetLife");
  await expect(dialog).toContainText("never connects to or posts to a FetLife profile");

  await expectRenderedSanity(page);
  await guards.assertClean();
});

test("Persona smoke: hard-limit profile preserves coherent Results", async ({ page }) => {
  const guards = await installBrowserGuards(page);
  await openPersonaResults(page, "multiple-hard-limits-pattern");
  await openRoleSetBuilder(page);

  await expect(page.getByRole("heading", { name: "Role discovery" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Suggested role set" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your role set", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reflection" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Independent by design" })).toBeVisible();
  await expect(page.getByText("These choices guide activity suggestions but never alter role alignment or ordering.")).toBeVisible();
  await expect(page.locator(".boundary-result").filter({ hasText: "Hard limit" })).toHaveCount(5);
  await expect(page.getByText("You marked this as a hard boundary. It remains off the table unless you independently change it.").first()).toBeVisible();

  await expectRenderedSanity(page);
  await guards.assertClean();
});
test("Persona smoke: Refine evidence reaches Suggested Role Set without fabricated metrics", async ({ page }) => {
  const guards = await installBrowserGuards(page);

  await openPersonaResults(page, "refined-puppy-pattern");
  await openRoleSetBuilder(page);

  const suggested = await roleSetLabels(page, ".profile-recommendation-summary > ol > li .profile-suggestion-heading > strong");

  expect(suggested).toContain("Puppy");

  const puppyRole = page.locator(".profile-role-list > li").filter({ hasText: "Puppy" });

  await expect(puppyRole).toContainText("Assessment suggestion");

  await puppyRole.getByText("About this role").click();

  await expect(puppyRole).toContainText("Assessment evidence plus your confirmation");

  await expect(puppyRole).not.toContainText(/Strong alignment|High confidence|Medium confidence|evidence breadth/i);

  await expectRenderedSanity(page);
  await guards.assertClean();
});

test("Persona smoke: Results and role editing remain usable at mobile width", async ({ page }) => {
  const guards = await installBrowserGuards(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openPersonaResults(page, "balanced-authority-pattern");
  await openRoleSetBuilder(page);

  await expect(page.getByRole("heading", { name: "Suggested role set" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your role set", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /make .* primary/i }).first()).toBeVisible();
  await expect(page.getByText("Why this result appeared").first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);

  await expectRenderedSanity(page);
  await guards.assertClean();
});
