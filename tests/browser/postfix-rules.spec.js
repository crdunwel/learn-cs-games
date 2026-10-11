import { test, expect } from "@playwright/test";
import { postfixLessons } from "../../src/games/postfix.js";
for (const width of [320, 1280])
  test(`postfix rule tour shows separate pops and parentheses barrier at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#postfix");
    const index = postfixLessons.findIndex((l) => l.id === "push-pop-rules"),
      lesson = postfixLessons[index];
    await page
      .getByLabel("Example", { exact: true })
      .selectOption(String(index));
    const tutorial = page.getByRole("region", {
      name: "Stack & Slay tutorial",
    });
    let anchor;
    for (let i = 0; i < lesson.steps.length; i++) {
      await expect(tutorial.locator(".tutorial-caption")).toHaveText(
        lesson.steps[i].caption,
      );
      const pos = await tutorial
        .locator(".tutorial-controls")
        .evaluate((n) => n.getBoundingClientRect().top + scrollY);
      anchor ??= pos;
      expect(Math.abs(pos - anchor)).toBeLessThan(1);
      await expect(tutorial.locator(".output-well p")).toHaveText(
        lesson.steps[i].output.join(" ") || "—",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (i < lesson.steps.length - 1)
        await tutorial
          .getByRole("button", { name: "Next step", exact: true })
          .click();
    }
    await expect(tutorial.locator(".tokens .current")).toHaveCount(0);
    await tutorial.getByLabel("About this example", { exact: true }).click();
    await expect(page.getByRole("tooltip")).toContainText("higher or equal");
    await expect(page.getByRole("tooltip")).toContainText("Do not push");
  });
