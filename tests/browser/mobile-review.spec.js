import { test, expect } from "@playwright/test";
import { practiceGames } from "../../src/games/index.js";

async function fits(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "page should fit without horizontal scrolling",
  ).toBe(true);
}
for (const width of [320, 375, 768]) {
  test(`all practice games remain usable at ${width}px across all levels`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      Math.random = () => 0.73;
    });
    await page.goto("/");
    await expect(page.locator(".game-card")).toHaveCount(9);
    await fits(page);
    for (const game of practiceGames) {
      await page.goto(`/#${game.id}`);
      await fits(page);
      const tutorialNext = page.getByRole("button", {
        name: "Next step",
        exact: true,
      });
      expect((await tutorialNext.boundingBox()).height).toBeGreaterThanOrEqual(
        44,
      );
      await page.getByRole("button", { name: "Play", exact: true }).click();
      for (const level of [1, 2, 3]) {
        await page
          .getByLabel("Level", { exact: true })
          .selectOption(String(level));
        const panel = page.locator(".practice-panel:visible");
        await fits(page);
        for (const control of await panel
          .locator(
            "input, .operator-buttons button, .choices button, .queue-slot-button, .dock-actions .primary",
          )
          .all()) {
          if (!(await control.isVisible())) continue;
          const box = await control.boundingBox();
          expect(
            box.height,
            `${game.id} input touch height`,
          ).toBeGreaterThanOrEqual(43);
        }
        await page.getByRole("button", { name: "Reveal", exact: true }).click();
        await expect(panel.locator(".feedback-text")).not.toBeEmpty();
        await fits(page);
      }
    }
  });
}
