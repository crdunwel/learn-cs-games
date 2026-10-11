import { test, expect } from "@playwright/test";
import {
  writingExercises,
  modelFunction,
  WRITING_KEY,
} from "../../src/engine/cWriting.js";

const byId = (id) => writingExercises.find((q) => q.id === id);
const lineInput = (page) =>
  page.getByLabel("Write the next line of C", { exact: true });
const feedback = (page) => page.locator(".coding-feedback");

async function completeGuided(page, exercise) {
  for (const [index, line] of exercise.lines.entries()) {
    if (line.fixed) continue;
    await expect(page.locator(".coding-helper")).toContainText(line.hint);
    await lineInput(page).fill(line.code);
    await page.getByRole("button", { name: "Check line", exact: true }).click();
    await expect(feedback(page)).toContainText("That fits.");
    await page
      .getByRole("button", { name: /^(Next line|Finish function)/ })
      .click();
  }
}

test("guided C accepts meaningful syntax, treats a missing semicolon as minor, and saves completion", async ({
  page,
}) => {
  await page.goto("/#code/memory-zero-array");
  const input = lineInput(page);
  await input.fill("int*scores=calloc(n,sizeof(int)) /* allocate */");
  await page.getByRole("button", { name: "Check line", exact: true }).click();
  await expect(feedback(page)).toContainText(
    "Logic matches. Add the missing semicolon",
  );
  await expect(feedback(page)).toContainText("calloc");
  await page.getByRole("button", { name: "Next line" }).click();
  await input.fill("return scores;");
  await page.getByRole("button", { name: "Check line", exact: true }).click();
  await page.getByRole("button", { name: "Finish function" }).click();
  await expect(page.getByRole("status")).toContainText("You built it.");
  await expect(page.locator(".coding-count")).toContainText("1 /");
  await expect(page.locator(".xp-pill")).toContainText("0 XP");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    WRITING_KEY,
  );
  expect(saved.drafts["memory-zero-array"].lines[0]).toContain("sizeof(int)");
  await page.reload();
  await expect(page.locator(".coding-count")).toContainText("1 /");
  await expect(input).toHaveValue(
    "int*scores=calloc(n,sizeof(int)) /* allocate */",
  );
});

test("unknown code needs review without calling it wrong; helpers can hide without shifting controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#code/rec-fibonacci");
  const input = lineInput(page);
  const before = await input.evaluate(
    (node) => node.getBoundingClientRect().top + scrollY,
  );
  await page.getByRole("button", { name: "Hide helper", exact: true }).click();
  await expect(page.locator(".coding-helper")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    await input.evaluate((node) => node.getBoundingClientRect().top + scrollY),
  ).toBeCloseTo(before, 1);
  await input.fill("return 99;");
  await page.getByRole("button", { name: "Check line", exact: true }).click();
  await expect(feedback(page)).toContainText("This needs review.");
  await expect(feedback(page)).not.toContainText(/incorrect|wrong/i);
  await expect(page.getByRole("button", { name: "Next line" })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show one approach", exact: true })
    .click();
  await expect(page.locator(".coding-model")).toContainText(
    byId("rec-fibonacci").lines[0].code,
  );
  await expect(page.locator(".coding-count")).toContainText("0 /");
});

test("whole functions preserve whitespace/comment flexibility and independent drafts through reload", async ({
  page,
}) => {
  const q = byId("rec-fibonacci");
  await page.goto(`/#code/${q.id}`);
  await lineInput(page).fill(q.lines[0].code);
  await page
    .getByRole("button", { name: "Whole function", exact: true })
    .click();
  const input = page.getByLabel("Write the complete function", { exact: true });
  await input.fill(
    `/* my solution */\n${modelFunction(q).replaceAll(";", ";  ")}`,
  );
  await page
    .getByRole("button", { name: "Check function", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("You built it.");
  await page.reload();
  await page
    .getByRole("button", { name: "Previous line", exact: false })
    .click();
  await expect(lineInput(page)).toHaveValue(q.lines[0].code);
  await page
    .getByRole("button", { name: "Whole function", exact: true })
    .click();
  await expect(input).toHaveValue(/my solution/);
  await input.fill("int fib(int n) { return n; }");
  await page
    .getByRole("button", { name: "Check function", exact: true })
    .click();
  await expect(feedback(page)).toContainText("This needs review.");
  await page
    .getByRole("button", { name: "Show one approach", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I compared my solution", exact: true })
    .click();
  await expect(feedback(page)).toContainText("self-reviewed");
});

test("all authored problems have working mobile routes; long-to-short changes are safe", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 800 });
  for (const q of writingExercises) {
    await page.goto(`/#code/${q.id}`);
    await expect(page.locator(".coding-problem h2")).toHaveText(q.title);
    await expect(
      page.getByLabel("Coding problem", { exact: true }),
    ).toHaveValue(q.id);
    await expect(lineInput(page)).toBeVisible();
    await expect(page.locator(".coding-helper")).toContainText(
      q.lines.find((line) => !line.fixed).hint,
    );
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("body *")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width && (rect.right > innerWidth + 1 || rect.left < -1);
        })
        .map(
          (node) =>
            `${node.tagName}.${node.className} parent=${node.parentElement.className} text=${node.textContent.slice(0, 60)}`,
        )
        .slice(0, 12),
    }));
    expect(
      overflow.scroll,
      `${q.id}: ${JSON.stringify(overflow)}`,
    ).toBeLessThanOrEqual(overflow.width);
  }
  const long = byId("queue-doubly-dequeue");
  await page.goto(`/#code/${long.id}`);
  await completeGuided(page, long);
  await page
    .getByRole("button", { name: "Review my work", exact: true })
    .click();
  await page
    .getByLabel("Coding problem", { exact: true })
    .selectOption("rec-fibonacci");
  await expect(page.locator(".coding-problem h2")).toHaveText(
    byId("rec-fibonacci").title,
  );
  await expect(page.locator(".coding-step-bar")).toContainText("Line 1 of");
  await page.goBack();
  await expect(page.locator(".coding-problem h2")).toHaveText(long.title);
  expect(errors).toEqual([]);
});

test("paper questions contain no line helpers or solutions; print focus and separate solutions work", async ({
  page,
}) => {
  const q = byId("queue-doubly-dequeue");
  await page.goto(`/#code/${q.id}`);
  await page
    .getByRole("button", { name: "Print C writing questions", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "C writing paper",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const paper = page.getByRole("article", {
    name: "C question paper",
    exact: true,
  });
  await expect(paper).toContainText(q.prompt);
  await expect(paper).toContainText(q.signature);
  for (const line of q.lines.filter((line) => !line.fixed)) {
    await expect(paper).not.toContainText(line.hint);
    await expect(paper).not.toContainText(line.why);
  }
  await expect(paper.locator(".paper-writing")).toHaveCount(1);
  await page
    .getByLabel("C worksheet question count", { exact: true })
    .selectOption("3");
  await expect(paper.locator(".paper-question")).toHaveCount(3);
  await page.evaluate(() => {
    window.print = () => {
      window.__printCalled = true;
    };
  });
  await page
    .getByRole("button", { name: "Print / Save PDF", exact: true })
    .click();
  expect(await page.evaluate(() => window.__printCalled)).toBe(true);
  await page
    .getByLabel("C worksheet content", { exact: true })
    .selectOption("answers");
  const answers = page.getByRole("article", {
    name: "C solution paper",
    exact: true,
  });
  await expect(answers).toContainText(modelFunction(q));
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Print C writing questions",
      exact: true,
    }),
  ).toBeFocused();
  expect(await page.locator("#root").evaluate((node) => node.inert)).toBe(
    false,
  );
});

test("an intentionally empty whole function stays empty across modes and reload", async ({
  page,
}) => {
  await page.goto("/#code/rec-fibonacci");
  await page
    .getByRole("button", { name: "Whole function", exact: true })
    .click();
  const input = page.getByLabel("Write the complete function", { exact: true });
  await input.fill("");
  await page.getByRole("button", { name: "Line by line", exact: true }).click();
  await page
    .getByRole("button", { name: "Whole function", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await page.reload();
  await page
    .getByRole("button", { name: "Whole function", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await page
    .getByRole("button", { name: "Check function", exact: true })
    .click();
  await expect(feedback(page)).toContainText("Write your code first.");
});

test("editing self-reviewed C clears the review marker without claiming automatic completion", async ({
  page,
}) => {
  await page.goto("/#code/rec-fibonacci");
  await page
    .getByRole("button", { name: "Whole function", exact: true })
    .click();
  const input = page.getByLabel("Write the complete function", { exact: true });
  await input.fill("int fib(int n) { return n; }");
  await page
    .getByRole("button", { name: "Show one approach", exact: true })
    .click();
  await page
    .getByRole("button", { name: "I compared my solution", exact: true })
    .click();
  await expect(page.locator(".coding-save")).toContainText("self-reviewed");
  await expect(page.locator(".coding-count")).toContainText("0 /");
  await input.fill("int fib(int n) { return n + 1; }");
  await expect(page.locator(".coding-save")).not.toContainText("self-reviewed");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    WRITING_KEY,
  );
  expect(saved.drafts["rec-fibonacci"].reviewed).toBe(false);
  await page.reload();
  await expect(page.locator(".coding-save")).not.toContainText("self-reviewed");
});

test("code-heavy C question and solution PDFs isolate monochrome, helper-free papers", async ({
  page,
}, testInfo) => {
  for (const id of ["queue-doubly-dequeue", "memory-create-book"]) {
    await page.goto(`/#code/${id}`);
    await page
      .getByRole("button", { name: "Print C writing questions", exact: true })
      .click();
    await page
      .getByLabel("C worksheet question count", { exact: true })
      .selectOption("1");
    for (const content of ["questions", "answers"]) {
      await page
        .getByLabel("C worksheet content", { exact: true })
        .selectOption(content);
      await page.emulateMedia({ media: "print" });
      await expect(page.locator("#root")).toBeHidden();
      await expect(page.locator(".print-controls")).toBeHidden();
      await expect(page.locator(".coding-paper")).toBeVisible();
      const color = await page
        .locator(".coding-paper")
        .evaluate((node) => getComputedStyle(node).color);
      expect(color).toBe("rgb(0, 0, 0)");
      if (process.env.SCREENSHOT_DIR) {
        const fs = await import("node:fs/promises");
        await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.pdf({
          path: `${process.env.SCREENSHOT_DIR}/c-writing-${id}-${content}.pdf`,
          format: "Letter",
          printBackground: true,
          preferCSSPageSize: true,
        });
      }
      await page.emulateMedia({ media: "screen" });
    }
    await page.keyboard.press("Escape");
  }
});

test("desktop writing stays one readable column with stable action placement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  const q = byId("queue-doubly-dequeue");
  await page.goto(`/#code/${q.id}`);
  const panel = await page.locator(".coding-problem").boundingBox();
  const library = await page.locator(".coding-library").boundingBox();
  expect(panel.width).toBeGreaterThan(800);
  expect(panel.x).toBeCloseTo(library.x, 1);
  const actions = page.locator(".coding-actions");
  const start = await actions.evaluate(
    (node) => node.getBoundingClientRect().top + scrollY,
  );
  await lineInput(page).fill(q.lines.find((line) => !line.fixed).code);
  await page.getByRole("button", { name: "Check line", exact: true }).click();
  expect(
    await actions.evaluate(
      (node) => node.getBoundingClientRect().top + scrollY,
    ),
  ).toBeCloseTo(start, 1);
  await page.getByRole("button", { name: "Next line" }).click();
  expect(
    await actions.evaluate(
      (node) => node.getBoundingClientRect().top + scrollY,
    ),
  ).toBeCloseTo(start, 1);
});
