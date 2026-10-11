import { test, expect } from "@playwright/test";
import { generatePostfix } from "../../src/games/postfix.js";
import { generateQueue } from "../../src/games/queue.js";
import { games } from "../../src/games/index.js";
import { generateBigO } from "../../src/games/bigO.js";
const generators = {
  postfix: generatePostfix,
  queue: generateQueue,
  bigO: generateBigO,
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.4;
  });
});
test("all three games: tutorials, correct answers, persistence, reveal, and levels", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 960 });
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/home.png`,
      fullPage: false,
    });
  let xp = 0;
  for (const [id, generator] of Object.entries(generators)) {
    await page.locator(`a.game-card[href="#${id}"]`).click();
    for (
      let index = 1;
      index < games.find((game) => game.id === id).tutorial.length;
      index++
    )
      await page.getByRole("button", { name: /^Next/ }).click();
    await page.getByRole("button", { name: "Try a round" }).click();
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/${id}.png`,
        fullPage: true,
      });
    const q = generator(() => 0.4, 1);
    for (let i = 0; i < q.steps.length; i++) {
      const step = q.steps[i];
      if (step.kind === "stack")
        for (const op of step.answer.split(" ").filter(Boolean).reverse())
          await page
            .getByRole("button", { name: `Push ${op}`, exact: true })
            .click();
      else if (step.kind === "postfix")
        await page.getByLabel("Your postfix").fill(step.answer);
      else if (id === "queue" && ["front", "rear"].includes(q.target))
        await page
          .getByRole("button", { name: `Slot ${step.answer}`, exact: true })
          .click();
      else
        await page
          .getByRole("button", {
            name: step.optionLabels?.[step.answer] || step.answer,
            exact: true,
          })
          .click();
      await page.getByRole("button", { name: "Check", exact: false }).click();
      xp += 10;
      await expect(page.getByRole("status")).toContainText("Correct. +10 XP");
      await expect(page.locator(".xp-pill")).toContainText(`${xp} XP`);
      if (process.env.SCREENSHOT_DIR && i === 0) {
        await page.screenshot({
          path: `${process.env.SCREENSHOT_DIR}/${id}-feedback.png`,
          fullPage: true,
          animations: "disabled",
        });
      }
      if (i < q.steps.length - 1)
        await page.getByRole("button", { name: "Next", exact: false }).click();
    }
    await expect(page.locator(".game-bottom")).toContainText("1 perfect round");
    await page.getByLabel("Show hint", { exact: true }).click();
    await page
      .getByRole("button", { name: "Next round", exact: false })
      .click();
    await expect(
      page.getByLabel("Show hint", { exact: true }),
    ).not.toHaveAttribute("open");
    await page.reload();
    await expect(page.locator(".xp-pill")).toContainText(`${xp} XP`);
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Reveal", exact: true }).click();
    await expect(page.locator(".xp-pill")).toContainText(`${xp} XP`);
    await page.getByLabel("Level", { exact: true }).selectOption("3");
    await expect(
      page.getByRole("button", { name: "Reveal", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "All games", exact: false }).click();
  }
  expect(errors).toEqual([]);
});
test("incorrect answer ends streak; hint toggles; keyboard can submit postfix", async ({
  page,
}) => {
  await page.goto("/#postfix");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByLabel("Show hint", { exact: true }).click();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.getByLabel("Show hint", { exact: true }).click();
  await page.getByRole("button", { name: "Push +", exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: false }).click();
  await expect(page.getByRole("status")).toContainText("Not quite");
  await page.getByRole("button", { name: "Next", exact: false }).click();
  await page
    .getByLabel("Your postfix")
    .fill(generatePostfix(() => 0.4, 1).steps[1].answer);
  await page.getByLabel("Your postfix").press("Enter");
  await expect(page.getByRole("status")).toContainText("Correct. +10 XP");
  await expect(page.locator(".game-bottom")).toContainText("0 perfect rounds");
});
test("320px layout fits each game, long questions, expanded hints, and feedback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  const fits = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  await fits();
  for (const id of Object.keys(generators)) {
    await page.goto(`/#${id}`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByLabel("Level", { exact: true }).selectOption("3");
    await fits();
    await page.getByLabel("Show hint", { exact: true }).click();
    await fits();
    await page.getByRole("button", { name: "Reveal", exact: true }).click();
    await fits();
  }
});
