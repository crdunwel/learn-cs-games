import { test, expect } from "@playwright/test";
import { practiceGames as games } from "../../src/games/index.js";
const additions = games.filter(
  (game) => !["postfix", "queue", "bigO"].includes(game.id),
);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.4;
  });
});

test("all five new games are playable at every level and retain earned progress", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".game-card")).toHaveCount(9);
  let xp = 0;
  for (const game of additions) {
    await page.goto(`/#${game.id}`);
    for (let i = 1; i < game.tutorial.length; i++)
      await page
        .getByRole("button", { name: "Next step", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Try a round", exact: false })
      .click();
    for (const level of [1, 2, 3]) {
      await page
        .getByLabel("Level", { exact: true })
        .selectOption(String(level));
      const question = game.generate(() => 0.4, level),
        step = question.steps[0];
      if (step.work) {
        for (const row of step.work.source)
          await page
            .getByLabel(`Product at ${step.work.from}^${row.exponent}`, {
              exact: true,
            })
            .fill(String(row.product));
        await page
          .getByLabel("Decimal total", { exact: true })
          .fill(String(question.data.value));
        if (step.work.to !== 10)
          for (const row of step.work.target)
            await page
              .getByLabel(`Digit at ${step.work.to}^${row.exponent}`, {
                exact: true,
              })
              .fill(row.digit);
      } else if (step.kind === "input")
        await page
          .getByLabel("Your answer", { exact: true })
          .fill(` ${step.answer} `);
      else
        await page
          .locator(".choices button")
          .nth(step.options.indexOf(step.answer))
          .click();
      await page.getByRole("button", { name: "Check", exact: false }).click();
      xp += 10;
      await expect(page.getByRole("status")).toContainText("Correct. +10 XP");
      await expect(page.locator(".xp-pill")).toContainText(`${xp} XP`);
      await expect(page.locator(".feedback-illustration")).not.toBeEmpty();
      if (process.env.SCREENSHOT_DIR && level === 2)
        await page.screenshot({
          path: `${process.env.SCREENSHOT_DIR}/${game.id}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
    await page.reload();
    await expect(page.locator(".xp-pill")).toContainText(`${xp} XP`);
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".game-bottom")).toContainText(
      "3 perfect rounds",
    );
  }
  expect(errors).toEqual([]);
});

test("compact postfix earns full credit; wrong Big-O answers include a readable worked example", async ({
  page,
}) => {
  await page.goto("/#postfix");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Reveal", exact: true }).click();
  await page.locator(".dock-actions .primary").click();
  const answer = games.find((g) => g.id === "postfix").generate(() => 0.4, 1)
    .steps[1].answer;
  await page.getByLabel("Your postfix").fill(answer.replace(/\s+/g, ""));
  await page.getByLabel("Your postfix").press("Enter");
  await expect(page.getByRole("status")).toContainText("Correct. +10 XP");
  await page.goto("/#bigO");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByLabel("Level", { exact: true }).selectOption("3");
  await page.getByRole("button", { name: "O(2ⁿ)", exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: false }).click();
  const generated = games.find((g) => g.id === "bigO").generate(() => 0.4, 3);
  await expect(page.locator(".feedback-text")).toContainText(
    generated.steps[0].explanation,
  );
  await expect(page.locator(".step-review")).toContainText(
    generated.reviewSteps[0].math,
  );
  await page
    .getByRole("button", { name: "Continue solution", exact: false })
    .click();
  await expect(page.locator(".step-review")).toContainText(
    generated.reviewSteps[1].math,
  );
  expect(
    await page
      .locator(".feedback-text")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(17);
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/bigO-explanation.png`,
      fullPage: true,
      animations: "disabled",
    });
});

test("new practice games fit 320px before and after feedback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  for (const game of additions) {
    await page.goto(`/#${game.id}`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    for (const level of [1, 2, 3]) {
      await page
        .getByLabel("Level", { exact: true })
        .selectOption(String(level));
      const button = page.locator(".dock-actions .primary");
      const before = await button.evaluate(
        (el) => el.getBoundingClientRect().top + scrollY,
      );
      await page.getByRole("button", { name: "Reveal", exact: true }).click();
      const after = await button.evaluate(
        (el) => el.getBoundingClientRect().top + scrollY,
      );
      expect(Math.abs(after - before)).toBeLessThan(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
