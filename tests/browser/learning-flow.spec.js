import { test, expect } from "@playwright/test";
import { generateMemory } from "../../src/games/memory.js";

for (const width of [320, 1280])
  test(`queue review starts before operations and teaches modulo at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      Math.random = () => 0.4;
    });
    await page.goto("/#queue");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    const initial = await page
      .locator(".practice-panel:visible .queue-state-values")
      .textContent();
    await page.getByRole("button", { name: "Slot 0", exact: true }).click();
    await page.locator(".dock-actions .primary").click();
    await expect(page.locator(".diagram-label")).toHaveText("STARTING QUEUE");
    await expect(
      page.locator(".practice-panel:visible .queue-state-values"),
    ).toHaveText(initial);
    await page
      .getByRole("button", { name: "Next operation", exact: false })
      .click();
    await expect(page.locator(".queue-move-detail")).toContainText("% 5");
    await expect(page.locator(".diagram-label")).toHaveText(
      "AFTER THE OPERATIONS",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("ordinary queue asks about FIFO values without array indices", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await page.goto("/#queue");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".ordinary-queue")).toBeVisible();
  await expect(page.locator(".queue-slot-button")).toHaveCount(0);
  await page.getByRole("button", { name: "Reveal", exact: true }).click();
  await page
    .getByRole("button", { name: "Next operation", exact: false })
    .click();
  await expect(page.locator(".queue-move-detail")).toContainText("Before:");
  await expect(page.locator(".queue-move-detail")).toContainText("After:");
  await expect(
    page.locator(".practice-panel:visible .fifo-item small"),
  ).toHaveText("FRONT + REAR");
});
test("decimal base conversion starts at target digits and has no decimal expansion inputs", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.8;
  });
  await page.goto("/#bases");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Read source places" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Decimal total", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("region", { name: "Build target places" }),
  ).toBeVisible();
  await expect(page.locator(".place-rule")).toContainText("8");
});
test("malloc accepts a missing semicolon for9XP, reminds and locks once", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.96;
  });
  await page.goto("/#memory");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const q = generateMemory(() => 0.96, 1);
  const input = page.getByLabel("Your answer", { exact: true });
  await input.fill(q.steps[0].answer.replace(/;$/, ""));
  await page.locator(".dock-actions .primary").click();
  await expect(page.getByRole("status")).toContainText("Correct. +9 XP");
  await expect(page.locator(".syntax-reminder")).toContainText("semicolon");
  await expect(input).toBeDisabled();
  await expect(page.locator(".xp-pill")).toContainText("9 XP");
  await expect(page.locator(".step-review")).toBeVisible();
});
