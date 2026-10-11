import { test, expect } from "@playwright/test";
import { generateBases } from "../../src/games/bases.js";

for (const width of [320, 1280])
  test(`guided place values: arithmetic, feedback and stable checks at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      Math.random = () => 0.4;
    });
    await page.goto("/#bases");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    const q = generateBases(() => 0.4, 1),
      w = q.steps[0].work;
    const first = page.getByLabel(
      `Product at ${w.from}^${w.source[0].exponent}`,
      { exact: true },
    );
    await first.focus();
    await first.press("Enter");
    await expect(
      page.getByLabel(`Product at ${w.from}^${w.source[1].exponent}`, {
        exact: true,
      }),
    ).toBeFocused();
    await expect(page.locator(".xp-pill")).toContainText("0 XP");

    await expect(page.locator(".trace-visual:visible")).toHaveCount(0);
    await expect(page.locator(".place-power sup")).not.toHaveCount(0);
    for (const r of w.source)
      await page
        .getByLabel(`Product at ${w.from}^${r.exponent}`, { exact: true })
        .fill(`${r.value} * ${w.from}^${r.exponent}`);
    await page
      .getByLabel("Decimal total", { exact: true })
      .fill(String(q.data.value));
    if (w.to !== 10)
      for (const r of w.target)
        await page
          .getByLabel(`Digit at ${w.to}^${r.exponent}`, { exact: true })
          .fill(r.digit.toLowerCase());
    const check = page.locator(".dock-actions .primary");
    const before = await check.evaluate(
      (el) => el.getBoundingClientRect().top + scrollY,
    );
    await check.click();
    await expect(page.getByRole("status")).toContainText("Correct. +10 XP");
    expect(
      Math.abs(
        (await check.evaluate(
          (el) => el.getBoundingClientRect().top + scrollY,
        )) - before,
      ),
    ).toBeLessThan(1);
    await expect(page.getByLabel("Assembled answer")).toHaveText(
      q.steps[0].answer,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await check.click();
    await page
      .getByLabel(`Product at ${w.from}^${w.source[0].exponent}`, {
        exact: true,
      })
      .fill("999");
    await check.click();
    await expect(page.locator(".feedback-text")).toContainText("Position");
    await expect(
      page.getByLabel(`Product at ${w.from}^${w.source[0].exponent}`, {
        exact: true,
      }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await check.click();
    await page.getByRole("button", { name: "Reveal", exact: true }).click();
    await expect(page.getByLabel("Assembled answer")).toHaveText(
      q.steps[0].answer,
    );
    await expect(page.locator(".xp-pill")).toContainText("10 XP");
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/guided-${width}.png`,
        fullPage: true,
      });
  });
