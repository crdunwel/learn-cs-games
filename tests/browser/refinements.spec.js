import { test, expect } from "@playwright/test";
import { practiceGames as games } from "../../src/games/index.js";
import { generateQueue } from "../../src/games/queue.js";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.4;
  });
});

test("each Learn example can be stepped forward and backward", async ({
  page,
}) => {
  for (const game of games) {
    await page.goto(`/#${game.id}`);
    for (
      let lessonIndex = 0;
      lessonIndex < game.lessons.length;
      lessonIndex++
    ) {
      const lesson = game.lessons[lessonIndex];
      await page
        .getByLabel("Example", { exact: true })
        .selectOption(String(lessonIndex));
      await expect(page.locator(".tutorial-caption")).toHaveText(
        lesson.steps[0].caption,
      );
      for (let index = 1; index < lesson.steps.length; index++) {
        await page
          .getByRole("button", { name: "Next step", exact: true })
          .click();
        await expect(page.locator(".tutorial-caption")).toHaveText(
          lesson.steps[index].caption,
        );
      }
      await expect(
        page.getByRole("button", { name: "Try a round" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Previous step", exact: false })
        .click();
      await expect(page.locator(".tutorial-caption")).toHaveText(
        lesson.steps.at(-2).caption,
      );
    }
  }
});

test("stack editing preserves top order and survives a trip to Learn", async ({
  page,
}) => {
  await page.goto("/#postfix");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Push +", exact: true }).click();
  await page.getByRole("button", { name: "Push *", exact: true }).click();
  await expect(
    page.locator(
      '.play-panel[aria-label$="practice"] .stack-cell:not(.stack-leaving)',
    ),
  ).toHaveText(["*", "+"]);
  await page.getByRole("button", { name: "Pop", exact: false }).click();
  await expect(
    page.locator(
      '.play-panel[aria-label$="practice"] .stack-cell:not(.stack-leaving)',
    ),
  ).toHaveText(["+"]);
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.locator(
      '.play-panel[aria-label$="practice"] .stack-cell:not(.stack-leaving)',
    ),
  ).toHaveText(["+"]);
  await page.getByRole("button", { name: "Check", exact: false }).click();
  await expect(page.locator(".answer-comparison")).toContainText("You: +");
  await expect(page.locator(".feedback-copy")).toContainText("Here’s why");
});

test("queue index answers use slots; wrong feedback and replay explain the move without awarding XP", async ({
  page,
}) => {
  const q = generateQueue(() => 0.4, 1);
  expect(q.target).toBe("rear");
  await page.goto("/#queue");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".queue-instruction")).toContainText(
    "DEQUEUE removes the first item",
  );
  await page
    .getByRole("button", { name: `Slot ${q.initial.rear}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Check", exact: false }).click();
  await expect(page.locator(".feedback-copy")).toContainText("Not quite");
  await expect(page.locator(".feedback-copy")).toContainText(/rear|insertion/i);
  await expect(page.locator(".diagram-label")).toHaveText("STARTING QUEUE");
  await expect(page.locator(".replay-status")).toContainText("Start here");
  await expect(
    page.getByRole("button", { name: "Previous", exact: false }),
  ).toBeDisabled();
  await expect(page.locator(".diagram-label")).toHaveText("STARTING QUEUE");
  await page
    .getByRole("button", { name: "Next operation", exact: false })
    .click();
  await expect(page.locator(".diagram-label")).toHaveText(
    "AFTER THE OPERATIONS",
  );
  await page.getByRole("button", { name: "Replay", exact: false }).click();
  await expect(page.locator(".diagram-label")).toHaveText(
    "AFTER THE OPERATIONS",
  );
  await expect(page.locator(".xp-pill")).toContainText("0 XP");
});

test("larger viewport sizing and all examples fit a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#queue");
  await expect(page.locator(".play-panel:visible")).toHaveCSS(
    "font-size",
    /1[6789].*px/,
  );
  expect(
    await page
      .locator(".play-panel:visible")
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThan(900);
  expect(
    await page
      .getByRole("button", { name: "Next step", exact: true })
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  await page.getByLabel("Example", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/revised-queue.png`,
      fullPage: true,
      animations: "disabled",
    });
  await page.setViewportSize({ width: 320, height: 800 });
  for (const game of games) {
    await page.goto(`/#${game.id}`);
    for (let index = 0; index < game.lessons.length; index++) {
      await page
        .getByLabel("Example", { exact: true })
        .selectOption(String(index));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page
        .getByRole("button", { name: "Next step", exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
});

test("reduced motion shows queue outcome immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#queue");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Reveal", exact: true }).click();
  await expect(page.locator(".diagram-label")).toHaveText("STARTING QUEUE");
  await expect(page.locator(".xp-pill")).toContainText("0 XP");
});
