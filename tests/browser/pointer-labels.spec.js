import { test, expect } from "@playwright/test";
for (const width of [320, 1280])
  test(`front and rear remain named throughout empty queue explanation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#queue");
    const tutorial = page.getByRole("region", {
      name: "Poolside Queue tutorial",
    });
    await page.getByLabel("Example", { exact: true }).selectOption("2");
    for (let i = 0; i <= 8; i++) {
      await expect(
        tutorial.locator(".front-marker .marker-full"),
      ).toBeVisible();
      await expect(tutorial.locator(".rear-marker .marker-full")).toBeVisible();
      await expect(tutorial.locator(".front-marker .marker-full")).toHaveText(
        "FRONT",
      );
      await expect(tutorial.locator(".rear-marker .marker-full")).toHaveText(
        "REAR",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (i < 8)
        await tutorial
          .getByRole("button", { name: "Next step", exact: true })
          .click();
    }
    await expect(tutorial.locator(".queue-state-note")).toContainText("Empty");
  });
test("ordinary queue keeps front/rear in both diagram and operation math", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await page.goto("/#queue");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const panel = page.locator(".practice-panel:visible");
  await expect(panel.locator(".fifo-empty")).toContainText("FRONT: no item");
  await expect(panel.locator(".fifo-empty")).toContainText("REAR: no item");
  await page.getByRole("button", { name: "Reveal", exact: true }).click();
  await page
    .getByRole("button", { name: "Next operation", exact: false })
    .click();
  await expect(panel.locator(".queue-move-detail")).toContainText(
    "Before: FRONT: no item",
  );
  await expect(panel.locator(".queue-move-detail")).toContainText(
    "After: FRONT + REAR",
  );
});
