import { test, expect } from "@playwright/test";
import { queueLessons } from "../../src/games/queue.js";
import { linkedDequeueLessons } from "../../src/engine/linkedDequeue.js";
import { STORAGE_KEY } from "../../src/engine/progress.js";

const tutorialName = "Poolside Queue tutorial";

async function chooseLesson(page, id) {
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  const index = queueLessons.findIndex((lesson) => lesson.id === id);
  expect(index).toBeGreaterThanOrEqual(0);
  await page.getByLabel("Example", { exact: true }).selectOption(String(index));
  return page.getByRole("region", { name: tutorialName });
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.all(
      document
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
}

async function controlPosition(tutorial) {
  return tutorial.locator(".tutorial-controls").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x + scrollX, y: rect.y + scrollY, height: rect.height };
  });
}

async function assertScene(tutorial, lesson, index) {
  const step = lesson.steps[index];
  const scene = tutorial.locator(".linked-dequeue");
  const diagram = scene.getByRole("img", { name: "Linked queue pointers" });
  await expect(scene).toHaveAttribute("data-step", String(index));
  await expect(scene).toHaveAttribute("data-change", step.change);
  await expect(tutorial.locator(".tutorial-caption")).toHaveText(step.caption);
  await expect(scene.locator(".dequeue-why")).toHaveText(step.why);
  await expect(diagram).toBeVisible();
  for (const name of ["head", "tail"]) {
    const pointer = diagram.locator(`[data-pointer='${name}']`);
    await expect(pointer).toHaveAttribute(
      "data-target",
      step.state[name] ?? "NULL",
    );
    await expect(pointer).toContainText(new RegExp(name, "i"));
  }
  const temp = diagram.locator("[data-pointer='temp']");
  if (step.state.temp === null) await expect(temp).toHaveCount(0);
  else {
    await expect(temp).toHaveAttribute("data-target", step.state.temp);
    await expect(temp).toContainText(/temp/i);
    if (step.state.nodes.find((node) => node.id === step.state.temp)?.freed)
      await expect(diagram.locator("desc")).toContainText("dangling");
  }
  for (const node of step.state.nodes) {
    const group = diagram.locator(`[data-node='${node.id}']`);
    await expect(group).toHaveAttribute("data-freed", String(node.freed));
    if (node.freed) {
      await expect(group).not.toHaveAttribute("data-next", /.+/);
      await expect(group).not.toHaveAttribute("data-prev", /.+/);
      await expect(group).toContainText(/freed/i);
      await expect(group).not.toContainText(new RegExp(`\\b${node.value}\\b`));
      await expect(group).not.toContainText(/next|prev/);
    } else {
      await expect(group).toHaveAttribute("data-next", node.next ?? "NULL");
      await expect(group).toHaveAttribute("data-prev", node.prev ?? "NULL");
      for (const field of ["data", "next", "prev"])
        await expect(
          group.locator(`[data-field='${field}'] .dequeue-field-value`),
        ).toHaveText(
          field === "data" ? String(node.value) : (node[field] ?? "NULL"),
        );
    }
  }
  const expectedLinks = step.state.nodes
    .flatMap((node) =>
      ["next", "prev"]
        .filter(
          (field) =>
            !node.freed &&
            node[field] !== null &&
            !step.state.nodes.find((target) => target.id === node[field])
              ?.freed,
        )
        .map((field) => `${node.id}-${field}`),
    )
    .sort();
  expect(
    await diagram
      .locator("[data-link]")
      .evaluateAll((links) => links.map((link) => link.dataset.link).sort()),
  ).toEqual(expectedLinks);
  await expect(scene.locator("[data-local='retval'] b")).toHaveText(
    step.state.retval === null ? "—" : String(step.state.retval),
  );
  await expect(scene.locator(".dequeue-return b")).toHaveText(
    step.state.returned === null ? "—" : String(step.state.returned),
  );
  const active = scene.locator(".dequeue-code-line[data-active='true']");
  expect(
    await active.evaluateAll((lines) =>
      lines.map((line) => Number(line.dataset.line)),
    ),
  ).toEqual(step.activeLines);
  for (let i = 0; i < step.activeLines.length; i++)
    await expect(active.nth(i)).toBeVisible();
  await expect(scene.locator(".dequeue-state")).toContainText(
    new RegExp(`size\\s*=\\s*${step.state.size}`),
  );
  if (step.state.returned !== null)
    await expect(scene.locator(".dequeue-return")).toContainText(
      String(step.state.returned),
    );
}

for (const width of [320, 375, 1280])
  test(`linked dequeue teaches each code/pointer state with stable controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#queue");
    for (const lesson of linkedDequeueLessons) {
      const tutorial = await chooseLesson(page, lesson.id);
      await settle(page);
      const anchor = await controlPosition(tutorial);
      for (let index = 0; index < lesson.steps.length; index++) {
        await settle(page);
        await assertScene(tutorial, lesson, index);
        const position = await controlPosition(tutorial);
        expect(Math.abs(position.x - anchor.x)).toBeLessThan(0.75);
        expect(Math.abs(position.y - anchor.y)).toBeLessThan(0.75);
        expect(Math.abs(position.height - anchor.height)).toBeLessThan(0.75);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await tutorial
            .locator(".linked-dequeue")
            .evaluate((scene) => scene.getAnimations({ subtree: true }).length),
        ).toBe(0);
        if (index < lesson.steps.length - 1)
          await tutorial
            .getByRole("button", { name: "Next step", exact: true })
            .click();
      }
      await expect(
        tutorial.getByRole("button", { name: "Replay example", exact: false }),
      ).toBeVisible();
      await expect(
        tutorial.getByRole("button", { name: "Try a round", exact: false }),
      ).toHaveCount(0);
    }
  });

test("back, replay, and changing sample reset the walkthrough without changing progress", async ({
  page,
}) => {
  const progress = {
    version: 1,
    xp: 47,
    games: {
      queue: { rounds: 3, wins: 2, streak: 1, best: 2, tutorial: true },
    },
  };
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: progress },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#queue");
  const three = linkedDequeueLessons.find(
    (lesson) => lesson.id === "linked-dequeue-three",
  );
  const empty = linkedDequeueLessons.find(
    (lesson) => lesson.id === "linked-dequeue-empty",
  );
  const tutorial = await chooseLesson(page, three.id);
  for (let i = 0; i < 3; i++)
    await tutorial
      .getByRole("button", { name: "Next step", exact: true })
      .click();
  await tutorial
    .getByRole("button", { name: "Previous step", exact: false })
    .click();
  await assertScene(tutorial, three, 2);
  await tutorial
    .getByRole("button", { name: "Next step", exact: true })
    .click();
  await assertScene(tutorial, three, 3);
  await chooseLesson(page, empty.id);
  await assertScene(tutorial, empty, 0);
  await expect(
    tutorial.getByRole("button", { name: "Previous step", exact: false }),
  ).toBeDisabled();
  for (let i = 1; i < empty.steps.length; i++)
    await tutorial
      .getByRole("button", { name: "Next step", exact: true })
      .click();
  await tutorial
    .getByRole("button", { name: "Replay example", exact: false })
    .click();
  await assertScene(tutorial, empty, 0);
  await chooseLesson(page, three.id);
  await assertScene(tutorial, three, 0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      STORAGE_KEY,
    ),
  ).toEqual(progress);
  await expect(page.locator(".xp-pill")).toContainText("47 XP");
});

test("pointer motion is tied to the changed link and never hides the code", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#queue");
  const lesson = linkedDequeueLessons.find(
    (item) => item.id === "linked-dequeue-three",
  );
  const tutorial = await chooseLesson(page, lesson.id);
  await settle(page);
  expect(
    await tutorial
      .locator(".linked-queue-diagram")
      .evaluate((diagram) => diagram.getAnimations({ subtree: true }).length),
  ).toBe(0);
  const changeIndex = lesson.steps.findIndex(
    (step, index) =>
      index > 0 && step.state.head !== lesson.steps[index - 1].state.head,
  );
  expect(changeIndex).toBeGreaterThan(0);
  for (let i = 1; i < changeIndex; i++) {
    await tutorial
      .getByRole("button", { name: "Next step", exact: true })
      .click();
    await settle(page);
  }
  const headPath = tutorial
    .locator(".linked-queue-diagram [data-pointer='head'] path")
    .first();
  const before = await headPath.getAttribute("d");
  const during = await tutorial
    .locator(".tutorial-controls .primary")
    .evaluate(async (button) => {
      button.click();
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const scene = document.querySelector(".tutorial-stage > .linked-dequeue");
      return scene
        ?.querySelector("[data-pointer='head'] path")
        ?.getAttribute("d");
    });
  await page.waitForTimeout(350);
  const after = await headPath.getAttribute("d");
  expect(before).toBeTruthy();
  expect(during).toBeTruthy();
  expect(after).not.toBe(before);
  expect(during).not.toBe(after);
  await settle(page);
  await assertScene(tutorial, lesson, changeIndex);
});

for (const width of [320, 1280])
  test(`linked queue SVG stays readable and anchored at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#queue");
    for (const lesson of linkedDequeueLessons) {
      const tutorial = await chooseLesson(page, lesson.id);
      await settle(page);
      const diagram = tutorial.locator(".linked-queue-diagram");
      const initialY = await diagram.evaluate(
        (svg) => svg.getBoundingClientRect().top + scrollY,
      );
      for (let index = 0; index < lesson.steps.length; index++) {
        await settle(page);
        const visual = await diagram.evaluate((svg) => {
          const box = svg.viewBox.baseVal;
          const bounds = (node) => {
            const b = node.getBBox();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
          };
          const rgb = (color) =>
            color
              .match(/[\d.]+/g)
              ?.slice(0, 3)
              .map(Number);
          const luminance = (channels) => {
            const [r, g, b] = channels.map((channel) => {
              const value = channel / 255;
              return value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const nodes = [
            ...svg.querySelectorAll("[data-node][data-freed='false']"),
          ].flatMap((node) => {
            const fill = getComputedStyle(node.querySelector("rect")).fill;
            return [
              ...node.querySelectorAll(
                ".dequeue-field-label, .dequeue-field-value",
              ),
            ].map((text) => {
              const foreground = getComputedStyle(text).fill;
              const backgroundRgb = rgb(fill);
              const foregroundRgb = rgb(foreground);
              const a = luminance(backgroundRgb),
                b = luminance(foregroundRgb);
              return {
                id: node.dataset.node,
                text: text.textContent,
                fill,
                foreground,
                contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                blackFallback: backgroundRgb.every((value) => value === 0),
              };
            });
          });
          const labels = [...svg.querySelectorAll("[data-pointer]")].map(
            (pointer) => ({
              pointer: pointer.dataset.pointer,
              labels: [...pointer.querySelectorAll("text")].map(bounds),
            }),
          );
          const overlaps = [];
          for (let a = 0; a < labels.length; a++)
            for (let b = a + 1; b < labels.length; b++)
              for (const left of labels[a].labels)
                for (const right of labels[b].labels)
                  if (
                    left.x < right.x + right.width &&
                    left.x + left.width > right.x &&
                    left.y < right.y + right.height &&
                    left.y + left.height > right.y
                  )
                    overlaps.push(`${labels[a].pointer}/${labels[b].pointer}`);
          const pathOverlaps = [];
          for (const pointer of svg.querySelectorAll("[data-pointer]")) {
            const path = pointer.querySelector("path");
            for (const target of labels) {
              if (target.pointer === pointer.dataset.pointer) continue;
              for (const label of target.labels) {
                const length = path.getTotalLength();
                for (let distance = 0; distance <= length; distance += 2) {
                  const point = path.getPointAtLength(distance);
                  if (
                    point.x > label.x &&
                    point.x < label.x + label.width &&
                    point.y > label.y &&
                    point.y < label.y + label.height
                  ) {
                    pathOverlaps.push(
                      `${pointer.dataset.pointer} arrow/${target.pointer} label`,
                    );
                    break;
                  }
                }
              }
            }
          }
          return {
            y: svg.getBoundingClientRect().top + scrollY,
            textBounds: [...svg.querySelectorAll("text")].map((text) => ({
              text: text.textContent,
              ...bounds(text),
            })),
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            nodes,
            overlaps,
            pathOverlaps,
          };
        });
        expect(
          Math.abs(visual.y - initialY),
          `${lesson.id} step ${index} diagram position`,
        ).toBeLessThan(0.75);
        for (const node of visual.nodes) {
          expect(
            node.blackFallback,
            `${lesson.id} node ${node.id} has a defined background`,
          ).toBe(false);
          expect(
            node.contrast,
            `${lesson.id} node ${node.id} ${node.text}: ${node.foreground} on ${node.fill}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
        for (const text of visual.textBounds) {
          expect(
            text.x,
            `${lesson.id} step ${index}: ${text.text} left`,
          ).toBeGreaterThanOrEqual(visual.box.x - 0.5);
          expect(
            text.y,
            `${lesson.id} step ${index}: ${text.text} top`,
          ).toBeGreaterThanOrEqual(visual.box.y - 0.5);
          expect(
            text.x + text.width,
            `${lesson.id} step ${index}: ${text.text} right`,
          ).toBeLessThanOrEqual(visual.box.x + visual.box.width + 0.5);
          expect(
            text.y + text.height,
            `${lesson.id} step ${index}: ${text.text} bottom`,
          ).toBeLessThanOrEqual(visual.box.y + visual.box.height + 0.5);
        }
        expect(
          visual.overlaps,
          `${lesson.id} step ${index} pointer labels`,
        ).toEqual([]);
        expect(
          visual.pathOverlaps,
          `${lesson.id} step ${index} pointer arrow/label collisions`,
        ).toEqual([]);
        if (index < lesson.steps.length - 1)
          await tutorial
            .getByRole("button", { name: "Next step", exact: true })
            .click();
      }
    }
  });
