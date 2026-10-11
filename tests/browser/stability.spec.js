import { test, expect } from "@playwright/test";
import { practiceGames as games } from "../../src/games/index.js";
import { generateQueue } from "../../src/games/queue.js";

// Compare document coordinates: browser auto-scroll is not a layout change.
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
}
async function position(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x + scrollX,
      y: rect.y + scrollY,
      width: rect.width,
      height: rect.height,
    };
  });
}
function expectSamePosition(actual, expected) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(0.75);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(0.75);
  expect(Math.abs(actual.width - expected.width)).toBeLessThan(0.75);
  expect(Math.abs(actual.height - expected.height)).toBeLessThan(0.75);
}
async function expectNoOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

for (const width of [1440, 320]) {
  test.describe(`stable controls at ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        Math.random = () => 0.4;
      });
    });

    test("stack bottom and answer button stay put while editing, checking and advancing", async ({
      page,
    }) => {
      await page.goto("/#postfix");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await settle(page);
      const panel = page.locator(".practice-panel:visible");
      const button = panel.locator(".dock-actions .primary");
      const bottom = panel.locator(".stack-edge:last-child");
      const anchor = await position(button);
      const stackBottom = await position(bottom);
      async function unchanged() {
        await settle(page);
        expectSamePosition(await position(button), anchor);
        if (await bottom.count())
          expectSamePosition(await position(bottom), stackBottom);
        await expectNoOverflow(page);
      }
      for (let count = 0; count < 8; count++) {
        await page.getByRole("button", { name: "Push +", exact: true }).click();
        await unchanged();
      }
      await page.getByRole("button", { name: "Pop", exact: false }).click();
      await unchanged();
      await page.getByRole("button", { name: "Clear", exact: true }).click();
      await unchanged();
      await panel.getByLabel("Show hint", { exact: true }).click();
      await expect(page.getByRole("tooltip")).toBeVisible();
      await unchanged();
      await button.click();
      await expect(panel.locator(".feedback-copy strong")).toContainText(
        "Here’s why",
      );
      await unchanged();
      await button.click();
      await expect(
        page.getByLabel("Your postfix", { exact: true }),
      ).toBeVisible();
      await expect(panel.locator(".point-label")).toHaveCount(0);
      await expect(panel.locator(".stack-wrap")).toHaveCount(0);
      await unchanged();
      await page.getByLabel("Your postfix", { exact: true }).fill("4 4 +");
      await button.click();
      await unchanged();
    });

    test("queue feedback, hints and operation replays preserve the answer position", async ({
      page,
    }) => {
      const question = generateQueue(() => 0.4, 1);
      expect(["front", "rear"]).toContain(question.target);
      await page.goto("/#queue");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await settle(page);
      const panel = page.locator(".practice-panel:visible");
      const button = panel.locator(".dock-actions .primary");
      const anchor = await position(button);
      const wrong =
        (Number(question.steps[0].answer) + 1) % question.initial.capacity;
      await page
        .getByRole("button", { name: `Slot ${wrong}`, exact: true })
        .click();
      await panel.getByLabel("Show hint", { exact: true }).click();
      await settle(page);
      expectSamePosition(await position(button), anchor);
      await button.click();
      await expect(panel.locator(".feedback-copy strong")).toContainText(
        "Not quite",
      );
      await settle(page);
      expectSamePosition(await position(button), anchor);
      await expect(
        page.getByRole("button", { name: "Previous", exact: false }),
      ).toBeDisabled();
      await page
        .getByRole("button", { name: "Next operation", exact: false })
        .click();
      await page
        .getByRole("button", { name: "Previous", exact: false })
        .click();
      await settle(page);
      expectSamePosition(await position(button), anchor);
      await page
        .getByRole("button", { name: "Next operation", exact: false })
        .click();
      await settle(page);
      expectSamePosition(await position(button), anchor);
      await expectNoOverflow(page);
    });

    test("all tutorial steps keep navigation fixed, including long captions and empty queues", async ({
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
          await settle(page);
          const controls = page.locator(".tutorial-controls:visible");
          const anchor = await position(controls);

          for (let index = 0; index < lesson.steps.length; index++) {
            await settle(page);
            expectSamePosition(await position(controls), anchor);
            await expectNoOverflow(page);
            if (index < lesson.steps.length - 1)
              await page
                .getByRole("button", { name: "Next step", exact: true })
                .click();
          }
          await page
            .getByRole("button", { name: "Previous step", exact: false })
            .click();
          await settle(page);
          expectSamePosition(await position(controls), anchor);
        }
      }
    });
  });
}
