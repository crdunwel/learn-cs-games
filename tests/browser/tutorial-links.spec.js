import { test, expect } from "@playwright/test";
import { games } from "../../src/games/index.js";
import { tutorialHash } from "../../src/engine/routes.js";

test("every tutorial can open from its unique link, including a completed game's Learn mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "cs-club-progress-v1",
      JSON.stringify({
        version: 1,
        xp: 40,
        games: {
          queue: {
            tutorial: true,
            rounds: 1,
            wins: 1,
            streak: 1,
            bestStreak: 1,
          },
        },
      }),
    );
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 800 });
  for (const game of games.filter((item) => item.kind !== "exam")) {
    const lessons = game.lessons || [
      { id: "basics", title: "The basics", steps: game.tutorial },
    ];
    for (const [index, lesson] of lessons.entries()) {
      await page.goto(`/${tutorialHash(game.id, lesson.id)}`);
      await expect(
        page.getByRole("button", { name: "Learn", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByLabel("Example", { exact: true })).toHaveValue(
        String(index),
      );
      await expect(page.locator(".tutorial-caption")).toHaveText(
        lesson.steps[0].caption,
      );
      await expect(page.locator(".tutorial-step-tools")).toContainText(
        `Step 1 / ${lesson.steps.length}`,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
  }
  await expect(page.locator(".xp-pill")).toContainText("40 XP");
  expect(errors).toEqual([]);
});

test("selector, shortcut, Back and Forward keep lesson links and practice drafts in sync", async ({
  page,
}) => {
  await page.goto("/#postfix/play");
  await page.getByRole("button", { name: "Push +", exact: true }).click();
  const before = await page.locator(".practice-panel .stack-scene").innerText();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page).toHaveURL(/#postfix\/learn\//);
  await page.getByLabel("Example", { exact: true }).selectOption("1");
  const second = games.find((game) => game.id === "postfix").lessons[1];
  await expect(page).toHaveURL(
    new RegExp(`${tutorialHash("postfix", second.id)}$`),
  );
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByLabel("Example", { exact: true }).selectOption("2");
  await page.goBack();
  await expect(page.getByLabel("Example", { exact: true })).toHaveValue("1");
  await expect(page.locator(".tutorial-step-tools")).toContainText("Step 1 /");
  await page.goForward();
  await expect(page.getByLabel("Example", { exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL(/#postfix\/play$/);
  await expect(page.locator(".practice-panel .stack-scene")).toHaveText(
    before,
    { useInnerText: true },
  );
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Learn", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#queue");
  await page.getByRole("button", { name: "Dequeue in C" }).click();
  await expect(page).toHaveURL(/#queue\/learn\/linked-dequeue-three$/);
  await page.reload();
  await expect(page.locator(".tutorial-panel")).toHaveClass(/tutorial-linked/);
  await expect(page.locator(".tutorial-step-tools")).toContainText(
    "Step 1 / 11",
  );
});

test("copy links preserve the serving path and offer a selectable fallback without clipboard", async ({
  page,
}) => {
  await page.goto("/#queue/learn/linked-dequeue-empty");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__copiedLesson = text;
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Copy lesson link" }).click();
  await expect(page.getByRole("status")).toHaveText("Lesson link copied.");
  expect(await page.evaluate(() => window.__copiedLesson)).toBe(page.url());
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    }),
  );
  await page.getByRole("button", { name: "Copy lesson link" }).click();
  const fallback = page.getByLabel("Lesson link", { exact: true });
  await expect(fallback).toHaveValue(page.url());
  await fallback.focus();
  expect(
    await fallback.evaluate(
      (input) => input.selectionEnd - input.selectionStart,
    ),
  ).toBe(page.url().length);
  await page.getByLabel("Example", { exact: true }).selectOption("7");
  await expect(fallback).toHaveCount(0);
});

test("invalid hashes are safe and the writing feature does not renumber games", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const hash of [
    "#queue/learn/not-a-lesson",
    "#queue/%E0%A4",
    "#exam/learn",
    "#code/one/two",
  ]) {
    await page.goto(`/${hash}`);
    await expect(page.locator(".home")).toBeVisible();
  }
  await expect(page.locator("a.game-card")).toHaveCount(9);
  await expect(
    page.locator('a.game-card[href="#exam"] .card-art-header'),
  ).toContainText("09");
  await expect(page.locator('a.coding-home-card[href="#code"]')).toBeVisible();
  expect(errors).toEqual([]);
});
