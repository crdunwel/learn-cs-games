import { test, expect } from "@playwright/test";

test("built app loads all nine routes and assets under the Pages subdirectory", async ({
  page,
}) => {
  const errors = [];
  const failedAssets = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failedAssets.push(response.url());
  });
  await page.goto("./");
  await expect(page.locator("a.game-card")).toHaveCount(9);
  const routes = await page
    .locator("a.game-card")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("href")));
  for (const route of routes) {
    await page.goto(`./${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Print practice sheets", exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/learn-cs-games/");
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "THE EXAM." })).toBeVisible();
  await page.goto("./#queue/learn/linked-dequeue-three");
  await expect(
    page.getByRole("button", { name: "Copy lesson link", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".tutorial-linked")).toBeVisible();
  await page.goto("./#code/queue-doubly-dequeue");
  await expect(
    page.getByRole("heading", { name: "C Writing Studio", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Coding problem", { exact: true })).toHaveValue(
    "queue-doubly-dequeue",
  );
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});
