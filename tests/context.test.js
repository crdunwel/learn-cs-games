import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkReferences, selectRoutes } from "../scripts/context.mjs";

const ids = (task) => selectRoutes(task).map(({ id }) => id);

test("task routing is bounded and identifies cross-domain work", () => {
  assert.deepEqual(ids("fix queue feedback"), ["queue", "grading"]);
  assert(ids("queue scoring").includes("state"));
  assert(ids("exam timer persistence").includes("exam"));
  assert(ids("exam timer persistence").includes("state"));
  assert(ids("fix PDF stack border").includes("printing"));
  assert(ids("fix PDF stack border").includes("postfix"));
  assert(ids("binary search midpoint").includes("search"));
  assert(ids("hex radix conversion").includes("bases"));
  assert(ids("deploy on push to GitHub Pages").includes("deployment"));
  assert.equal(
    selectRoutes(
      "queue stack exam format input tooltip persist print deploy correctness context",
    ).length,
    4,
  );
  assert.deepEqual(ids("unrecognized task"), ["architecture"]);
  assert(
    !ids("recursion practice").includes("deployment"),
    "ci inside another word must not match CI",
  );
});

test("the real documentation graph and all context route files resolve", () => {
  const result = checkReferences();
  assert.deepEqual(result.errors, []);
  assert(result.documentsChecked >= 20);
  assert(result.filesChecked >= 50);
});

test("reference checks reject missing and escaping local links without following external links", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "cs-context-"));
  try {
    mkdirSync(path.join(root, "docs"));
    writeFileSync(
      path.join(root, "AGENTS.md"),
      "[guide](docs/guide.md)\n[external](https://example.invalid/no-fetch)\n",
    );
    writeFileSync(path.join(root, "README.md"), "[self](#section)\n");
    writeFileSync(
      path.join(root, "docs/guide.md"),
      "[entry](../README.md)\n[missing](missing.md)\n[escape](../../outside.md)\n",
    );
    const result = checkReferences(root, []);
    assert(
      result.errors.some((error) => error.includes("missing docs/missing.md")),
    );
    assert(result.errors.some((error) => error.includes("escapes repository")));
    assert.equal(result.errors.length, 2);
    writeFileSync(path.join(root, "docs/guide.md"), "[entry](../README.md)\n");
    assert.deepEqual(checkReferences(root, []).errors, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
