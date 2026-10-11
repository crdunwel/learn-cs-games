import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { generateExam } from "../../src/games/exam.js";
import { createExamAttempt } from "../../src/engine/exam.js";
const storageKey = "cs-club-exam-v1";

async function preset(page, { finished = false, index = 13 } = {}) {
  const exam = generateExam(72391);
  const attempt = createExamAttempt(exam, Date.now());
  if (finished) {
    attempt.status = "submitted";
    attempt.submittedAt = Date.now();
    attempt.answers[exam.questions[0].parts[0].id] =
      exam.questions[0].parts[0].answer;
  }
  await page.addInitScript(
    ({ storageKey, exam, attempt, index }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          exam,
          attempt,
          questionIndex: index,
          flagged: [],
        }),
      );
    },
    { storageKey, exam, attempt, index },
  );
  await page.goto("/#exam");
  return exam;
}

test("exam displays format help and grants full objective credit for equivalent notation", async ({
  page,
}) => {
  const exam = await preset(page);
  const runtime = exam.questions[13];
  const inputs = page.locator(".exam-answer-part input");
  await expect(inputs).toHaveCount(4);
  await expect(page.locator(".answer-format-hint").first()).toContainText(
    "Use the code’s variables",
  );
  for (let i = 0; i < 4; i++) {
    const value = runtime.parts[i].answer
      .replace(/^O\((.*)\)$/, "$1")
      .replace("n^2", "n*n")
      .replace("m log n", "m*log_2(n)");
    await inputs.nth(i).fill(value);
    await expect(inputs.nth(i)).toHaveAccessibleDescription(/Formats:/);
  }
  await page.getByRole("button", { name: "Question 13", exact: true }).click();
  const scaling = exam.questions[12].parts[0];
  await expect(page.locator(".answer-format-hint").first()).toContainText(
    "500 ms",
  );
  await page
    .locator(".exam-answer-part input")
    .fill(`${Number(scaling.answer) * 1000} ms`);
  await page.getByRole("button", { name: "Submit exam", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit now", exact: true })
    .click();
  const result = page.locator(".exam-review-question").nth(13);
  await result.locator("summary").click();
  await expect(result.locator(".exam-verdict.is-correct")).toHaveCount(4);
  await expect(result.locator("summary")).toContainText("8 / 8");
  const scaleReview = page.locator(".exam-review-question").nth(12);
  await scaleReview.locator("summary").click();
  await expect(scaleReview.locator(".exam-verdict.is-correct")).toHaveCount(1);
});

test("all review answers have readable contrast on light panels, including unanswered parts, at desktop and mobile", async ({
  page,
}) => {
  await preset(page, { finished: true });
  for (const summary of await page
    .locator(".exam-review-question > summary")
    .all())
    await summary.click();
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    const ratios = await page
      .locator(".exam-review-answer pre")
      .evaluateAll((elements) => {
        const luminance = (rgb) => {
          const values = rgb
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              v /= 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            });
          return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        };
        return elements.map((el) => {
          const style = getComputedStyle(el),
            a = luminance(style.color),
            b = luminance(style.backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      });
    expect(ratios.length).toBeGreaterThan(50);
    expect(Math.min(...ratios)).toBeGreaterThan(7);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (process.env.SCREENSHOT_DIR && width === 1280) {
      await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
      await page
        .locator(".exam-review-part")
        .first()
        .screenshot({
          path: `${process.env.SCREENSHOT_DIR}/readable-review.png`,
        });
    }
  }
});
