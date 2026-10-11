import test from "node:test";
import assert from "node:assert/strict";
import { memoryCase } from "./support/practice-cases.js";
import { validatePracticeQuestion } from "../src/engine/practiceValidation.js";
import { basesLessons } from "../src/games/bases.js";

function check(kind, data, expected) {
  const q = memoryCase(kind, data);
  assert.equal(q.meta.kind, kind);
  assert.equal(validatePracticeQuestion("memory", q), q);
  assert.equal(q.steps[0].answer, String(expected));
  return q;
}
test("new memory families exhaust their independent finite parameter domains", () => {
  for (let count = 12; count <= 240; count++) {
    check("array-length", { count }, count);
    for (let index = 0; index < count; index++)
      check("zero-read", { count, index }, 0);
  }
  for (let value = 1; value <= 40; value++)
    for (let delta = 1; delta <= 9; delta++)
      for (let index = 0; index < 3; index++)
        check("alias-write", { value, delta, index }, value + delta);
  for (let start = 1; start <= 20; start++) {
    const original = [start, start + 3, start + 6, start + 9, start + 12];
    for (let offset = 1; offset <= 3; offset++)
      for (let index = 0; index < 5 - offset; index++)
        check(
          "pointer-offset",
          { start, offset, index },
          original.slice(offset)[index],
        );
    for (let nextCount = 1; nextCount <= 5; nextCount++)
      for (let index = 0; index < nextCount; index++)
        check(
          "shrink",
          { start, nextCount, index },
          [start, start + 1, start + 2, start + 3, start + 4, start + 5].slice(
            0,
            nextCount,
          )[index],
        );
  }
  for (let rows = 1; rows <= 8; rows++)
    for (let columns = 2; columns <= 10; columns++)
      check("row-allocations", { rows, columns }, 1 + rows);
});
test("new memory contracts reject changed answers, code and invalid indices", () => {
  const samples = [
    memoryCase("array-length", { count: 12 }),
    memoryCase("zero-read", { count: 12, index: 11 }),
    memoryCase("alias-write", { value: 3, delta: 2, index: 1 }),
    memoryCase("pointer-offset", { start: 2, offset: 3, index: 1 }),
    memoryCase("shrink", { start: 2, nextCount: 3, index: 2 }),
    memoryCase("row-allocations", { rows: 3, columns: 4 }),
  ];
  for (const q of samples) {
    const answer = structuredClone(q);
    answer.steps[0].answer = "999";
    assert.throws(() => validatePracticeQuestion("memory", answer));
    const source = structuredClone(q);
    source.code += "\nint unexpected = 1;";
    assert.throws(() => validatePracticeQuestion("memory", source));
    if ("index" in q.meta) {
      const invalid = structuredClone(q);
      invalid.meta.index = 999;
      assert.throws(() => validatePracticeQuestion("memory", invalid));
    }
  }
  const diagram = structuredClone(samples[3]);
  diagram.visual.items[0] = "999";
  assert.throws(() => validatePracticeQuestion("memory", diagram));
});
test("new octal and hex walkthroughs preserve value and complete all conversions", () => {
  const additions = basesLessons.filter((l) => l.conversion);
  assert.equal(additions.length, 6);
  const value = (text, base) =>
    [...text].reduce((n, d) => n * base + "0123456789ABCDEF".indexOf(d), 0);
  for (const lesson of additions) {
    const c = lesson.conversion;
    assert.equal(value(c.source, c.from), value(c.answer, c.to));
    assert.ok(lesson.steps.length >= 3);
    assert.ok(lesson.steps.at(-1).result.includes(c.source));
    assert.ok(lesson.steps.at(-1).result.includes(c.answer));
  }
  assert.equal(
    basesLessons.find((l) => l.id === "octal-binary-groups").steps[1].result,
    "101 | 000 | 111",
  );
  assert.equal(
    basesLessons.find((l) => l.id === "binary-octal-groups").steps[2].result,
    "011 | 010 | 110",
  );
});
