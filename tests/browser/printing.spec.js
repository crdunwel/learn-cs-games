import { test, expect } from "@playwright/test";
import { practiceGames } from "../../src/games/index.js";
import fs from "node:fs/promises";

test.beforeEach(async () => {
  if (process.env.SCREENSHOT_DIR)
    await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
});

async function openPaper(page, id) {
  await page.goto(`/#${id}`);
  await page
    .getByRole("button", { name: "Print practice sheets", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function checkPrintedGrids(paper) {
  for (const question of await paper
    .locator(".paper-question:has(.paper-stacks)")
    .all()) {
    const tokens = await question.locator(".paper-token").allTextContents();
    const boxes = question.locator(".paper-postfix-boxes");
    const count = tokens.filter(
      (token) => token !== "(" && token !== ")",
    ).length;
    await expect(boxes).toHaveAttribute("data-columns", String(count));
    await expect(boxes.locator("[data-grid-divider]")).toHaveCount(count - 1);
    for (const stack of await question.locator(".paper-stack").all()) {
      await expect(stack).toHaveAttribute("data-rows", "8");
      await expect(stack.locator("[data-grid-divider]")).toHaveCount(7);
    }
    for (const grid of await question
      .locator(".paper-stack, .paper-postfix-boxes")
      .all()) {
      await expect(grid.locator("g")).toHaveAttribute("stroke-width", "2");
      await expect(grid.locator("[data-grid-outline]")).toHaveAttribute(
        "x",
        "1",
      );
      await expect(grid.locator("[data-grid-outline]")).toHaveAttribute(
        "y",
        "1",
      );
      expect(
        await grid.evaluate((svg) => {
          const [x, y, width, height] = svg
            .getAttribute("viewBox")
            .split(" ")
            .map(Number);
          const outline = svg.querySelector("rect");
          const inset = Number(outline.getAttribute("x"));
          // The outline is inset; no stroke is placed directly on the viewport edge.
          return (
            inset > 0.75 &&
            Number(outline.getAttribute("width")) + inset + 0.75 < width &&
            Number(outline.getAttribute("height")) +
              Number(outline.getAttribute("y")) +
              0.75 <
              height
          );
        }),
      ).toBe(true);
    }
  }
}

test("each game prints fresh questions and a separate answer key without hints", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.print = () => {
      window.__printCalls = (window.__printCalls || 0) + 1;
    };
  });
  for (const game of practiceGames) {
    await openPaper(page, game.id);
    const paper = page.getByRole("article", { name: "Question paper preview" });
    await expect(paper.locator(".paper-question")).toHaveCount(3);
    await expect(
      paper.locator(".paper-answer, .help, .trace-visual, button"),
    ).toHaveCount(0);
    if (game.id === "postfix") {
      await expect(paper.locator(".paper-marker")).toHaveCount(9);
      await expect(paper.locator(".paper-stack")).toHaveCount(9);
      await expect(
        paper.locator(".paper-stack [data-grid-divider]"),
      ).toHaveCount(63);
      await expect(
        paper.locator(".paper-stack [data-grid-outline]"),
      ).toHaveCount(9);
    }
    await checkPrintedGrids(paper);
    if (process.env.SCREENSHOT_DIR) {
      await page.pdf({
        path: `${process.env.SCREENSHOT_DIR}/${game.id}-practice.pdf`,
        preferCSSPageSize: true,
      });
    }
    const oldId = await paper.locator(".paper-id").textContent();
    await page.getByRole("button", { name: "New set" }).click();
    await expect(paper.locator(".paper-id")).not.toHaveText(oldId);
    await page.getByLabel("Worksheet question count").selectOption("5");
    await expect(paper.locator(".paper-question")).toHaveCount(5);
    await page.getByLabel("Worksheet level").selectOption("1");
    await expect(paper.locator(".paper-id")).toContainText("Level 1");
    const sheetId = await paper.locator(".paper-id").textContent();
    await page.getByLabel("Worksheet content").selectOption("answers");
    const key = page.getByRole("article", { name: "Answer key preview" });
    await expect(key.locator(".paper-id")).toHaveText(sheetId);
    await expect(key.locator(".paper-question")).toHaveCount(5);
    await expect(key.locator(".paper-answer").first()).toBeVisible();
    await expect(key.locator(".paper-writing, .paper-stack")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Print / Save PDF", exact: true })
      .click();
    expect(await page.evaluate(() => window.__printCalls)).toBe(
      practiceGames.indexOf(game) + 1,
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Print practice sheets", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Print practice sheets", exact: true })
      .click();
    await expect(page.locator(".paper-id")).toHaveText(sheetId);
    await page.getByLabel("Worksheet content").selectOption("answers");
    await expect(page.locator(".paper-id")).toHaveText(sheetId);
    await page.keyboard.press("Escape");
  }
});

test("exam prints the exact current paper with separate model answers", async ({
  page,
}) => {
  await openPaper(page, "exam");
  const paper = page.getByRole("article", { name: "Question paper preview" });
  await expect(paper.locator(".paper-question")).toHaveCount(16);
  await expect(paper).toContainText("120 minutes · 100 points");
  await expect(paper.locator(".paper-answer")).toHaveCount(0);
  await expect(page.getByLabel("Worksheet question count")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New set" })).toHaveCount(0);
  await checkPrintedGrids(paper);
  const id = await paper.locator(".paper-id").textContent();
  if (process.env.SCREENSHOT_DIR)
    await page.pdf({
      path: `${process.env.SCREENSHOT_DIR}/the-exam.pdf`,
      preferCSSPageSize: true,
    });
  await page.getByLabel("Worksheet content").selectOption("answers");
  const key = page.getByRole("article", { name: "Answer key preview" });
  await expect(key.locator(".paper-id")).toHaveText(id);
  await expect(key.locator(".paper-answer").first()).toBeVisible();
  if (process.env.SCREENSHOT_DIR)
    await page.pdf({
      path: `${process.env.SCREENSHOT_DIR}/the-exam-answer-key.pdf`,
      preferCSSPageSize: true,
    });
  await page.getByRole("button", { name: "Close print preview" }).click();
  await page
    .getByRole("button", { name: "Print practice sheets", exact: true })
    .click();
  await expect(page.locator(".paper-id")).toHaveText(id);
});

test("print controls and all nine papers fit a 320px screen and isolate the printed document", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const id of [...practiceGames.map((game) => game.id), "exam"]) {
    await openPaper(page, id);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".print-dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      await page
        .locator(".print-preview")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    const printButton = page.getByRole("button", {
      name: "Print / Save PDF",
      exact: true,
    });
    await expect(printButton).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("#root")).toBeHidden();
    await expect(page.locator(".print-controls")).toBeHidden();
    await expect(page.locator(".worksheet")).toBeVisible();
    const color = await page
      .locator(".worksheet")
      .evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(0, 0, 0)");
    await page.emulateMedia({ media: "screen" });
    await page.keyboard.press("Escape");
  }
});
