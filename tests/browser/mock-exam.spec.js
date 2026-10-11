import { test, expect } from "@playwright/test";
import { generateExam } from "../../src/games/exam.js";
import { createExamAttempt } from "../../src/engine/exam.js";

const key = "cs-club-exam-v1";
const snapshot = (page) =>
  page.evaluate((name) => JSON.parse(localStorage.getItem(name)), key);
const noOverflow = async (page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

async function seedAttempt(page, { expired = false, allAnswers = false } = {}) {
  const exam = generateExam(72391);
  const now = Date.now();
  const attempt = createExamAttempt(exam, expired ? now - 7_200_001 : now);
  if (allAnswers)
    attempt.answers = Object.fromEntries(
      exam.questions.flatMap((q) => q.parts.map((p) => [p.id, p.answer])),
    );
  const stored = { version: 1, exam, attempt, questionIndex: 0, flagged: [] };
  await page.addInitScript(
    ({ key, stored }) => localStorage.setItem(key, JSON.stringify(stored)),
    { key, stored },
  );
  await page.goto("/#exam");
  return exam;
}

test("exam begins only on request, saves drafts and review flags, and keeps wall-clock time through navigation and reload", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-11T14:00:00Z") });
  await page.goto("/#exam");
  await expect(page.getByRole("button", { name: "Begin exam" })).toBeVisible();
  expect((await snapshot(page)).attempt).toBeNull();
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/the-exam-screen.png`,
      fullPage: true,
      animations: "disabled",
    });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Begin exam" }).click();
  await expect(page.getByRole("timer")).toHaveText("2:00:00");
  await expect
    .poll(async () => {
      const heading = await page.locator(".exam-question h2").boundingBox();
      const header = await page.locator(".exam-live-header").boundingBox();
      return heading.y >= header.y + header.height && heading.y < 400;
    })
    .toBe(true);
  await page
    .locator(".exam-answer-part textarea")
    .first()
    .fill("int *scores = calloc(400, sizeof *scores);");
  await page
    .getByRole("button", { name: "Mark for review", exact: true })
    .click();
  const initial = await snapshot(page);
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(page.locator(".exam-question h2")).toContainText(
    "2. Create a book",
  );
  await expect(page.locator(".exam-review-answer")).toHaveCount(0);
  await page.clock.fastForward(61_000);
  await page.reload();
  const reloaded = await snapshot(page);
  expect(reloaded.attempt.deadline).toBe(initial.attempt.deadline);
  expect(reloaded.attempt.answers).toEqual(initial.attempt.answers);
  expect(reloaded.flagged).toEqual(["q1"]);
  await expect(page.getByRole("timer")).toHaveText("1:58:59");
  await page
    .getByRole("button", { name: "Question 1, marked for review", exact: true })
    .click();
  await expect(page.locator(".exam-answer-part textarea").first()).toHaveValue(
    "int *scores = calloc(400, sizeof *scores);",
  );
  await page.goto("/#");
  await page.clock.fastForward(60_000);
  await page.goto("/#exam");
  await expect(page.getByRole("timer")).toHaveText("1:57:59");
});

test("fresh exam papers can be generated and printed without starting the timer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let seed = 0.23;
    Math.random = () => {
      seed += 0.17;
      return seed % 1;
    };
  });
  await page.goto("/#exam");
  const first = await snapshot(page);
  await page
    .getByRole("button", { name: "Print practice sheets", exact: true })
    .click();
  await expect(page.locator(".paper-id")).toHaveText(`Set ${first.exam.id}`);
  await page.getByRole("button", { name: "Close print preview" }).click();
  await page
    .getByRole("button", { name: "Generate a new paper", exact: true })
    .click();
  const second = await snapshot(page);
  expect(second.exam.seed).not.toBe(first.exam.seed);
  expect(second.attempt).toBeNull();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Print practice sheets", exact: true })
    .click();
  await expect(page.locator(".paper-id")).toHaveText(`Set ${second.exam.id}`);
  await expect(
    page.locator('.paper-question[data-question="q1"]'),
  ).toContainText(second.exam.questions[0].parts[0].prompt);
  await page.getByRole("button", { name: "Close print preview" }).click();
  await page.getByRole("button", { name: "Begin exam" }).click();
  await expect(
    page.getByRole("button", { name: "Generate a new paper", exact: true }),
  ).toHaveCount(0);
  expect((await snapshot(page)).attempt.exam.id).toBe(second.exam.id);
});

test("submit confirms blank answers and manual code points stay explicitly self-scored", async ({
  page,
}) => {
  await page.goto("/#exam");
  await page.getByRole("button", { name: "Begin exam" }).click();
  await page.getByRole("button", { name: "Submit exam", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "16 questions still have a blank part",
  );
  await page.getByRole("button", { name: "Keep working" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Submit exam", exact: true }).click();
  await page.getByRole("button", { name: "Submit now" }).click();
  await expect(page.locator(".exam-results")).toBeVisible();
  await expect(page.locator(".exam-review-note")).toContainText(
    "Unreviewed parts count as 0",
  );
  await page.locator(".exam-review-question summary").first().click();
  await expect(page.locator(".exam-rubric").first()).toBeVisible();
  await expect(page.locator(".is-model pre").first()).toContainText("calloc");
  await page.getByLabel("Rubric score for q1a").selectOption("2");
  const saved = await snapshot(page);
  expect(saved.attempt.status).toBe("submitted");
  expect(saved.attempt.manualScores.q1a).toBe(2);
  await page.reload();
  await page.locator(".exam-review-question summary").first().click();
  await expect(page.getByLabel("Rubric score for q1a")).toHaveValue("2");
  await expect(page.locator(".exam-score-grid > div").last()).toContainText(
    "2 / 100",
  );
});

test("expired saved exam closes immediately and preserves answers for review", async ({
  page,
}) => {
  const exam = await seedAttempt(page, { expired: true, allAnswers: true });
  await expect(page.locator(".exam-results")).toBeVisible();
  await expect(page.locator(".exam-results-heading")).toContainText(
    "TIME’S UP",
  );
  expect((await snapshot(page)).attempt.status).toBe("expired");
  const possible = exam.questions
    .flatMap((q) => q.parts)
    .filter((p) => p.auto)
    .reduce((sum, p) => sum + p.points, 0);
  await expect(page.locator(".exam-score-grid > div").first()).toContainText(
    `${possible} / ${possible}`,
  );
  await expect(page.locator(".exam-answer-part")).toHaveCount(0);
  await page.getByRole("button", { name: "Generate new exam" }).click();
  await expect(page.getByRole("button", { name: "Begin exam" })).toBeVisible();
  expect((await snapshot(page)).attempt).toBeNull();
});

test("timer auto-submits at the deadline while the page is open", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-11T14:00:00Z") });
  await page.goto("/#exam");
  await page.getByRole("button", { name: "Begin exam" }).click();
  await page
    .locator(".exam-answer-part textarea")
    .first()
    .fill("my saved answer");
  await page.clock.fastForward(7_200_000);
  await expect(page.locator(".exam-results-heading")).toContainText(
    "TIME’S UP",
  );
  expect((await snapshot(page)).attempt.answers.q1a).toBe("my saved answer");
});

test("malformed saved exam is safely replaced without touching arcade XP", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      '{"version":1,"exam":{"seed":0},"attempt":{"deadline":"bad"}}',
    );
    localStorage.setItem("unrelated-progress", "keep me");
  }, key);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#exam");
  await expect(page.getByRole("button", { name: "Begin exam" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("unrelated-progress")),
  ).toBe("keep me");
  expect(errors).toEqual([]);
});

for (const width of [320, 375, 768]) {
  test(`exam questions and review fit ${width}px with readable inputs and touch targets`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#exam");
    await noOverflow(page);
    await page.getByRole("button", { name: "Begin exam" }).click();
    for (let index = 1; index <= 16; index++) {
      await page
        .locator(".exam-question-nav button")
        .nth(index - 1)
        .click();
      await noOverflow(page);
      for (const field of await page
        .locator(
          ".exam-answer-part input, .exam-answer-part textarea, .exam-answer-part select",
        )
        .all()) {
        expect(
          await field.evaluate((el) =>
            parseFloat(getComputedStyle(el).fontSize),
          ),
        ).toBeGreaterThanOrEqual(16);
        expect((await field.boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
      for (const button of await page
        .locator(".exam-question-nav button")
        .all()) {
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page
      .getByRole("button", { name: "Submit exam", exact: true })
      .click();
    await noOverflow(page);
    await page.getByRole("button", { name: "Submit now" }).click();
    for (const summary of await page
      .locator(".exam-review-question summary")
      .all()) {
      await summary.click();
      await noOverflow(page);
    }
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/exam-${width}.png`,
        fullPage: false,
        animations: "disabled",
      });
  });
}

test("a running exam prints questions but keeps its answer key locked until submission", async ({
  page,
}) => {
  await page.goto("/#exam");
  const openPrint = () =>
    page
      .getByRole("button", { name: "Print practice sheets", exact: true })
      .click();
  const content = page.getByRole("combobox", { name: "Worksheet content" });
  await openPrint();
  await content.selectOption("answers");
  await expect(
    page.getByRole("article", { name: "Answer key preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close print preview" }).click();

  await page.getByRole("button", { name: "Begin exam" }).click();
  await openPrint();
  await expect(content).toHaveValue("questions");
  await expect(content.locator('option[value="answers"]')).toHaveJSProperty(
    "disabled",
    true,
  );
  await expect(
    page.getByRole("article", { name: "Question paper preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Answer key preview" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Print / Save PDF", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".print-exam-note")).toContainText(
    "answer key unlocks after you submit",
  );
  await page.getByRole("button", { name: "Close print preview" }).click();

  await page.getByRole("button", { name: "Submit exam", exact: true }).click();
  await page.getByRole("button", { name: "Submit now" }).click();
  await openPrint();
  await expect(content.locator('option[value="answers"]')).toHaveJSProperty(
    "disabled",
    false,
  );
  await content.selectOption("answers");
  await expect(
    page.getByRole("article", { name: "Answer key preview" }),
  ).toBeVisible();
});
