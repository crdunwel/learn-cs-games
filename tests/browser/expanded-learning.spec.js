import { test, expect } from "@playwright/test";
import { generateBigO } from "../../src/games/bigO.js";

const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
const kinds = [
  "constant",
  "linear",
  "square",
  "log",
  "nlog",
  "triangle",
  "sequential",
  "cube",
  "binary-search",
  "recursive-binary-search",
  "linear-search",
  "independent-inputs",
  "sequential-log-square",
];
const tapeQuestion = (values) => {
  let at = 0;
  return generateBigO(() => values[at++] ?? 0.25, 3);
};
const scaleTape = (power, factor, size, timeMs = null) => [
  0,
  0,
  0,
  0,
  draw(power, 0, 3),
  draw(factor, 2, 4),
  draw([10, 20, 50, 100, 200].indexOf(size), 0, 4),
  timeMs === null ? 0 : 0.9,
  ...(timeMs === null
    ? []
    : [draw([2, 5, 10, 20, 40, 80].indexOf(timeMs), 0, 5)]),
];
const sourceTape = (kind) => [0.9, draw(kinds.indexOf(kind), 0, 12), 0, 0];

test.use({ viewport: { width: 320, height: 900 }, reducedMotion: "reduce" });

async function openQuestion(page, values) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0.25;
  });
  await page.goto("/#bigO");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  // Install a complete repeating tape after initial warm-up generation. Both
  // development StrictMode initializations then produce the identical question.
  await page.evaluate((draws) => {
    let at = 0;
    Math.random = () => draws[at++ % draws.length];
  }, values);
  await page.getByLabel("Level", { exact: true }).selectOption("3");
  const q = tapeQuestion(values),
    panel = page.locator(".practice-panel:visible");
  await expect(panel.locator("h2")).toHaveText(q.steps[0].prompt);
  await expect(panel.locator("h2")).not.toContainText(
    "new work divided by the original work",
  );
  expect(errors).toEqual([]);
  return { q, panel, errors };
}
async function noPageOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}
async function mainButtonPosition(panel) {
  return panel
    .locator(".dock-actions .primary")
    .evaluate((button) => button.getBoundingClientRect().top + scrollY);
}
async function wrongAnswerAndWalk(page, panel, q) {
  const wrong = q.steps[0].options.find(
    (answer) => answer !== q.steps[0].answer,
  );
  await panel.getByRole("button", { name: wrong, exact: true }).click();
  await settle(page);
  const anchor = await mainButtonPosition(panel);
  await panel.getByRole("button", { name: "Check", exact: false }).click();
  await expect(panel.locator(".feedback-copy strong")).toContainText(
    "Not quite",
  );
  await expect(panel.locator(".answer-comparison")).toContainText(wrong);
  await expect(panel.locator(".answer-comparison")).toContainText(
    q.steps[0].answer,
  );
  const review = panel.locator(".step-review");
  await expect(review).toHaveAttribute("aria-label", "Step-by-step solution");
  const back = review.getByRole("button", {
    name: "← Back one step",
    exact: true,
  });
  const next = review.getByRole("button", {
    name: "Continue solution →",
    exact: true,
  });
  await expect(back).toBeDisabled();
  for (let i = 0; i < q.reviewSteps.length; i++) {
    const step = q.reviewSteps[i];
    await expect(review.locator(".review-step-heading")).toContainText(
      `Step ${i + 1} / ${q.reviewSteps.length}`,
    );
    await expect(review.locator(".review-step-heading")).toContainText(
      step.title,
    );
    await expect(review.locator("p")).toHaveText(step.detail);
    const math = review.locator("pre");
    await expect(math).toHaveText(step.math);
    await expect(math).toHaveCSS("white-space", "pre");
    await expect(math).toHaveAttribute("tabindex", "0");
    await math.focus();
    // Long equations stay intact in their own keyboard-scrollable region.
    const overflow = await math.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    if (overflow) {
      await math.press("End");
      await math.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      expect(
        await math.evaluate((element) => element.scrollLeft),
      ).toBeGreaterThan(0);
    }
    await noPageOverflow(page);
    await settle(page);
    expect(Math.abs((await mainButtonPosition(panel)) - anchor)).toBeLessThan(
      1,
    );
    if (i < q.reviewSteps.length - 1) await next.click();
  }
  await expect(next).toBeDisabled();
  await expect(back).toBeEnabled();
  await back.click();
  await expect(review.locator("pre")).toHaveText(q.reviewSteps.at(-2).math);
  await next.click();
  await expect(review.locator("pre")).toHaveText(q.reviewSteps.at(-1).math);
  return review;
}

for (const scenario of [
  { name: "quadratic work", power: 2, factor: 2, size: 20, timeMs: null },
  { name: "cubic milliseconds", power: 3, factor: 3, size: 50, timeMs: 10 },
  { name: "constant milliseconds", power: 0, factor: 4, size: 100, timeMs: 80 },
]) {
  test(`phone: ${scenario.name} explains concrete input change and every worked calculation`, async ({
    page,
  }) => {
    const values = scaleTape(
      scenario.power,
      scenario.factor,
      scenario.size,
      scenario.timeMs,
    );
    const { q, panel, errors } = await openQuestion(page, values);
    await expect(panel.locator(".scale-scene")).toContainText(
      `${scenario.size} items`,
    );
    await expect(panel.locator(".scale-scene")).toContainText(
      `${scenario.size * scenario.factor} items`,
    );
    if (scenario.timeMs !== null) {
      await expect(panel.locator(".scale-scene")).toContainText(
        `${scenario.timeMs} ms`,
      );
      await expect(panel.locator(".scale-scene")).toContainText(
        /same machine/i,
      );
    }
    const review = await wrongAnswerAndWalk(page, panel, q);
    if (scenario.timeMs !== null) {
      await expect(panel.locator(".feedback-text")).toContainText(
        `${scenario.timeMs} ms`,
      );
      await expect(panel.locator(".feedback-text")).toContainText(
        `${scenario.timeMs * scenario.factor ** scenario.power} ms`,
      );
    }
    if (process.env.SCREENSHOT_DIR)
      await review.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/mobile-${scenario.name.replaceAll(" ", "-")}-review.png`,
        animations: "disabled",
      });
    expect(errors).toEqual([]);
  });
}
for (const kind of [
  "cube",
  "binary-search",
  "recursive-binary-search",
  "linear-search",
  "independent-inputs",
  "sequential-log-square",
]) {
  test(`phone: ${kind} shows valid source and an ordered wrong-answer walkthrough`, async ({
    page,
  }) => {
    const { q, panel, errors } = await openQuestion(page, sourceTape(kind));
    const code = panel.getByLabel("C code", { exact: true });
    await expect(code).toHaveText(q.code);
    await expect(code).toHaveCSS("white-space", "pre");
    if (kind.includes("search"))
      await expect(panel.locator("h2")).toContainText("worst-case");
    if (kind.includes("binary-search")) {
      await expect(code).toContainText("sorted");
      await expect(code).toContainText("mid + 1");
      await expect(code).toContainText("mid - 1");
    }
    if (kind === "cube") {
      await expect(code).toContainText("int k");
      await expect(
        panel.getByRole("button", { name: "O(n³)", exact: true }),
      ).toBeVisible();
    }
    await wrongAnswerAndWalk(page, panel, q);
    expect(errors).toEqual([]);
  });
}
