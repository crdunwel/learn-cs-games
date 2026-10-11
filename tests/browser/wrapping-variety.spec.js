import { test, expect } from "@playwright/test";
import { practiceGames } from "../../src/games/index.js";
import { basesLessons } from "../../src/games/bases.js";

for (const width of [320, 768, 1440]) {
  test(`teaching notation stays intact at ${width}px across modules`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    for (const game of practiceGames) {
      await page.goto(`/#${game.id}`);
      await page.getByRole("button", { name: "Play", exact: true }).click();
      const panel = page.locator(".practice-panel:visible");
      await expect(panel).toBeVisible();
      for (const code of await panel.locator("pre").all())
        await expect(code).toHaveCSS("white-space", "pre");
      for (const token of await panel.locator(".trace-value").all())
        await expect(token).toHaveCSS("white-space", "nowrap");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/#memory");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    const options = page.locator(".option-code");
    await expect(options).toHaveCount(4);
    for (const option of await options.all())
      await expect(option).toHaveCSS("white-space", "pre");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("all six added base walkthroughs reach their final result on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#bases");
  for (const lesson of basesLessons.filter((l) => l.conversion)) {
    await page
      .getByRole("combobox")
      .selectOption(String(basesLessons.indexOf(lesson)));
    for (let i = 1; i < lesson.steps.length; i++)
      await page
        .getByRole("button", { name: "Next step", exact: false })
        .click();
    await expect(page.locator(".trace-result")).toHaveText(
      lesson.steps.at(-1).result,
    );
    await expect(page.locator(".trace-result")).toHaveCSS(
      "white-space",
      "nowrap",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
