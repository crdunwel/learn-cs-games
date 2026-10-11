import { test, expect } from "@playwright/test";

async function expectInsideViewport(page, locator) {
  const bounds = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(11);
  expect(bounds.y).toBeGreaterThanOrEqual(11);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 11);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 11);
}

for (const width of [320, 1280]) {
  test(`tooltips stay within a ${width}px viewport and preserve the lesson layout`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/#postfix");
    const help = page.getByRole("button", {
      name: "About this example",
      exact: true,
    });
    await help.scrollIntoViewIfNeeded();
    const primary = page.locator(".tutorial-controls .primary");
    const before = await primary.boundingBox();
    await help.hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expectInsideViewport(page, tooltip);
    const after = await primary.boundingBox();
    expect(after.y).toBe(before.y);
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);

    // The progress help sits near the page bottom and must flip above its trigger.
    const progressHelp = page.getByRole("button", {
      name: "About levels and progress",
    });
    await progressHelp.scrollIntoViewIfNeeded();
    await progressHelp.hover();
    await expect(tooltip).toBeVisible();
    await expectInsideViewport(page, tooltip);
    const triggerBounds = await progressHelp.boundingBox();
    const tooltipBounds = await tooltip.boundingBox();
    expect(tooltipBounds.y + tooltipBounds.height).toBeLessThanOrEqual(
      triggerBounds.y,
    );
  });
}

test("work() explains constant-time work on hover, focus, and click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/#bigO");
  const work = page
    .getByRole("button", { name: "About work()", exact: true })
    .first();
  await work.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("constant-time step");
  await expect(tooltip).toContainText("O(1)");
  await expect(tooltip).toContainText("not a special C function");
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await page.mouse.move(1, 1);
  await work.focus();
  await expect(tooltip).toBeVisible();
  await expect(work).toHaveAttribute("aria-describedby", /.+/);
  await work.click();
  await page.mouse.move(1, 1);
  await expect(tooltip).toBeVisible();
  await work.click();
  await expect(tooltip).toHaveCount(0);
  await work.click();
  await expect(tooltip).toBeVisible();
  await page.locator(".game-heading h1").click();
  await expect(tooltip).toHaveCount(0);
});

test("home encouragement is centered in a larger padded circle", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const badge = page.locator(".hero-sticker");
  const bounds = await badge.boundingBox();
  expect(bounds.width).toBeGreaterThanOrEqual(300);
  expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
  const properties = await badge.evaluate((element) => {
    const style = getComputedStyle(element);
    return { align: style.alignItems, padding: parseFloat(style.paddingTop) };
  });
  expect(properties.align).toBe("center");
  expect(properties.padding).toBeGreaterThanOrEqual(30);
});
