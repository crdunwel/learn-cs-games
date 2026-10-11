import test from "node:test";
import assert from "node:assert/strict";
import { generateBigO } from "../src/games/bigO.js";
import { validateBigOQuestion } from "../src/engine/bigOValidation.js";
import { paperQuestion } from "../src/engine/worksheet.js";
import { equalAnswer } from "../src/engine/answerFormats.js";

const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
const tape = (...values) => {
  let at = 0;
  return () => values[at++] ?? 0.25;
};
const scaled = (power, factor, size, timeMs = null) =>
  generateBigO(
    tape(
      0,
      0,
      0,
      0,
      draw(power, 0, 3),
      draw(factor, 2, 4),
      draw([10, 20, 50, 100, 200].indexOf(size), 0, 4),
      timeMs === null ? 0 : 0.9,
      draw([2, 5, 10, 20, 40, 80].indexOf(timeMs), 0, 5),
    ),
    3,
  );

test("all 420 Big-O worksheets retain the exact model, concrete sizes, timing context, choices and answers", () => {
  for (let power = 0; power <= 3; power++)
    for (let factor = 2; factor <= 4; factor++)
      for (const size of [10, 20, 50, 100, 200])
        for (const ms of [null, 2, 5, 10, 20, 40, 80]) {
          const q = scaled(power, factor, size, ms);
          validateBigOQuestion(q);
          const paper = paperQuestion("bigO", q, () => 0.25);
          assert(paper.prompt.includes(`${size} items`));
          assert(paper.prompt.includes(`${size * factor} items`));
          assert(paper.prompt.includes(`n^${power}`));
          assert(!paper.prompt.includes("undefined"));
          assert.equal(paper.code, null);
          assert.equal(paper.parts.length, 1);
          assert.deepEqual(paper.parts[0].options, q.steps[0].options);
          assert.equal(paper.parts[0].answer, q.steps[0].answer);
          assert.equal(paper.parts[0].prompt, q.steps[0].prompt);
          assert(equalAnswer(paper.parts[0], q.steps[0].answer));
          if (ms === null) {
            assert(paper.prompt.includes("exact work model W(n)"));
            assert(
              paper.prompt.includes("larger work divided by the original work"),
            );
            assert.equal(paper.parts[0].unit, undefined);
          } else {
            assert(paper.prompt.includes("exact timing model T(n) = c"));
            assert(paper.prompt.includes("same machine with fixed c"));
            assert(
              paper.prompt.includes(`original time is ${ms} milliseconds`),
            );
            assert.equal(paper.parts[0].unit, "milliseconds");
            assert.equal(paper.parts[0].answer, `${ms * factor ** power} ms`);
          }
        }
});

test("C runtime worksheets preserve complete source and Big-O answer semantics for every family", () => {
  const kinds = [
    "constant",
    "linear",
    "square",
    "log",
    "nlog",
    "triangle",
    "sequential",
    "cube",
    "binary-search",
    "recursive-binary-search",
    "linear-search",
    "independent-inputs",
    "sequential-log-square",
  ];
  for (const [index, kind] of kinds.entries()) {
    const q = generateBigO(tape(0.9, draw(index, 0, 12), 0, 0), 3);
    assert.equal(q.kind, kind);
    validateBigOQuestion(q);
    const paper = paperQuestion("bigO", q, () => 0.25);
    assert.equal(paper.code, q.code);
    assert.equal(paper.parts[0].format, "bigO");
    assert.equal(paper.parts[0].answer, q.steps[0].answer);
    assert(equalAnswer(paper.parts[0], q.steps[0].answer));
    if (kind === "independent-inputs")
      assert(paper.prompt.includes("independent input sizes"));
    if (kind.includes("search")) assert(paper.prompt.includes("worst case"));
    if (kind.includes("binary-search")) assert(paper.code.includes("sorted"));
  }
});

test("legacy exact scaling paper retains symbolic sizes without inventing a timing measurement", () => {
  const q = {
    type: "bigO",
    code: null,
    scale: { power: 2, factor: 3 },
    steps: [
      {
        kind: "choice",
        prompt: "What is the new work divided by the original work?",
        answer: "9×",
        options: ["1×", "3×", "9×", "27×"],
        explanation: "9 times as much work.",
      },
    ],
  };
  validateBigOQuestion(q);
  const paper = paperQuestion("bigO", q, () => 0.25);
  assert(paper.prompt.includes("n to 3n"));
  assert(paper.prompt.includes("W(n) = n^2"));
  assert(!paper.prompt.includes("undefined"));
  assert(!paper.prompt.includes("milliseconds"));
});
