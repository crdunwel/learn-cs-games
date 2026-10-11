import test from "node:test";
import assert from "node:assert/strict";
import { generateBigO, bigOLessons } from "../src/games/bigO.js";
import { seeded } from "../src/engine/random.js";
import {
  validateBigOQuestion,
  countBigOWork,
} from "../src/engine/bigOValidation.js";

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
const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
const tape = (...values) => {
  let at = 0;
  return () => values[at++] ?? 0.25;
};
const loop = (kind, parameter = 3) =>
  generateBigO(
    tape(
      0.9,
      draw(kinds.indexOf(kind), 0, 12),
      draw(kind === "linear" ? parameter : 2, 2, 5),
      draw(kind === "constant" ? parameter : 3, 3, 20),
    ),
    3,
  );
const scale = (power, factor, initialSize, timeMs = null) =>
  generateBigO(
    tape(
      0,
      0,
      0,
      0,
      draw(power, 0, 3),
      draw(factor, 2, 4),
      draw([10, 20, 50, 100, 200].indexOf(initialSize), 0, 4),
      timeMs === null ? 0 : 0.9,
      draw([2, 5, 10, 20, 40, 80].indexOf(timeMs), 0, 5),
    ),
    3,
  );

// Enumerate every scalar/source branch. Growth classes follow the source's count,
// while independent oracle formulas and the native suite establish the counts.
test("all thirteen Big-O families have validated source, tight classes, and worked steps", () => {
  const expected = {
    constant: "O(1)",
    linear: "O(n)",
    square: "O(n²)",
    log: "O(log n)",
    nlog: "O(n log n)",
    triangle: "O(n²)",
    sequential: "O(n)",
    cube: "O(n³)",
    "binary-search": "O(log n)",
    "recursive-binary-search": "O(log n)",
    "linear-search": "O(n)",
    "independent-inputs": "O(mn)",
    "sequential-log-square": "O(n²)",
  };
  let sourceVariants = 0;
  for (const kind of kinds) {
    const parameters =
      kind === "constant"
        ? Array.from({ length: 18 }, (_, i) => i + 3)
        : kind === "linear"
          ? [2, 3, 4, 5]
          : [3];
    for (const parameter of parameters) {
      const q = loop(kind, parameter);
      assert.equal(validateBigOQuestion(q), q);
      assert.equal(q.kind, kind);
      assert.equal(q.steps[0].answer, expected[kind]);
      assert(q.reviewSteps.length >= 2 && q.reviewSteps.length <= 5);
      for (let n = 1; n <= 128; n++) {
        const h = Math.floor(Math.log2(n));
        const counts = {
          constant: parameter,
          linear: Math.ceil(n / parameter),
          square: n ** 2,
          log: h,
          nlog: n * h,
          triangle: (n * (n - 1)) / 2,
          sequential: 2 * n,
          cube: n ** 3,
          "binary-search": h + 1,
          "recursive-binary-search": h + 1,
          "linear-search": n,
          "independent-inputs": 7 * n,
          "sequential-log-square": h + n ** 2,
        };
        assert.equal(countBigOWork(q, n, 7), counts[kind], `${kind}, n=${n}`);
      }
      sourceVariants++;
    }
  }
  assert.equal(sourceVariants, 33);
});

test("all 420 exact work and milliseconds scaling parameter combinations are independently checked", () => {
  let cases = 0;
  for (let power = 0; power <= 3; power++)
    for (let factor = 2; factor <= 4; factor++)
      for (const initialSize of [10, 20, 50, 100, 200])
        for (const timeMs of [null, 2, 5, 10, 20, 40, 80]) {
          const q = scale(power, factor, initialSize, timeMs);
          assert.equal(validateBigOQuestion(q), q);
          const original = initialSize ** power,
            larger = (initialSize * factor) ** power;
          const ratio = larger / original;
          assert.equal(q.scale.oldWork, original);
          assert.equal(q.scale.newWork, larger);
          assert.equal(
            q.steps[0].answer,
            timeMs === null ? `${ratio}×` : `${timeMs * ratio} ms`,
          );
          assert(q.steps[0].prompt.includes(String(initialSize * factor)));
          assert.equal(
            q.reviewSteps.at(-1).math,
            timeMs === null
              ? `${larger} ÷ ${original} = ${ratio}×`
              : `${timeMs} ms × ${ratio} = ${timeMs * ratio} ms`,
          );
          assert(q.scale.mode !== "time" || q.steps[0].prompt.includes(" ms"));
          cases++;
        }
  assert.equal(cases, 420);
});

test("Big-O guards reject corrupt answers, C tokens, choices, inputs, and teaching arithmetic", () => {
  const bad = (q, change) => {
    const altered = structuredClone(q);
    change(altered);
    assert.throws(() => validateBigOQuestion(altered));
  };
  for (const kind of kinds) {
    const q = loop(kind);
    bad(q, (x) => (x.steps[0].answer = "O(2ⁿ)"));
    bad(q, (x) => (x.code += "\nreturn 123;"));
    bad(q, (x) => (x.code = x.code.replace(/\bint\b/, "i nt")));
    bad(q, (x) => (x.reviewSteps[0].math += " wrong"));
    bad(q, (x) => x.steps[0].options.push(x.steps[0].answer));
  }
  for (const q of [scale(2, 2, 20), scale(3, 4, 100, 20)]) {
    bad(q, (x) => x.scale.oldWork++);
    bad(q, (x) => x.scale.newWork++);
    bad(q, (x) => (x.scale.factor = 5));
    bad(
      q,
      (x) =>
        (x.steps[0].prompt = x.steps[0].prompt.replace(
          "items",
          "oranges instead of items",
        )),
    );
    bad(q, (x) => (x.reviewSteps[2].math = "2 × 2 = 3"));
    bad(q, (x) => (x.steps[0].options[0] = "999 ms"));
  }
  bad(scale(2, 2, 20, 5), (x) => (x.scale.timeMs = 3));
});

test("Big-O generation stays inside validated domains across levels and legacy scaling still works", () => {
  const seen = new Set();
  for (let level = 1; level <= 3; level++)
    for (let seed = 0; seed < 1000; seed++) {
      const q = generateBigO(seeded(seed), level);
      validateBigOQuestion(q);
      seen.add(q.scale ? `scale-${q.scale.mode}` : q.kind);
      if (level === 1)
        assert(["constant", "linear", "square"].includes(q.kind));
    }
  assert.equal(seen.size, 15);
  for (let power = 0; power <= 3; power++)
    for (let factor = 2; factor <= 4; factor++) {
      const q = {
        type: "bigO",
        code: null,
        scale: { power, factor },
        steps: [
          {
            kind: "choice",
            answer: `${factor ** power}×`,
            options: [...new Set([1, factor, factor ** 2, factor ** 3])].map(
              (x) => `${x}×`,
            ),
          },
        ],
      };
      assert.equal(validateBigOQuestion(q), q);
    }
});

test("new lessons distinguish full nested loops, one binary-search branch, and an exact timing model", () => {
  const cube = bigOLessons.find((lesson) => lesson.id === "three-loops");
  assert.equal(cube.steps.at(-1).answer, "O(n³)");
  assert.equal(cube.steps[1].answer, "2³ = 8");
  const search = bigOLessons.find(
    (lesson) => lesson.id === "binary-search-runtime",
  );
  assert.equal(search.steps.at(-1).answer, "O(log n)");
  assert(search.steps[1].caption.includes("five comparisons"));
  const time = bigOLessons.find(
    (lesson) => lesson.id === "milliseconds-scaling",
  );
  assert.equal(time.steps[2].answer, "200 items · 80 ms");
  assert(time.steps[0].caption.includes("exact T(n)"));
  assert(time.steps.at(-1).caption.includes("Big-O label alone"));
});
