import test from "node:test";
import assert from "node:assert/strict";
import { generateRecursion, recursionLessons } from "../src/games/recursion.js";
import { validateRecursionQuestion } from "../src/engine/recursionValidation.js";
import { seeded } from "../src/engine/random.js";
const topics = [
  "sum",
  "print",
  "array-sum",
  "base-case",
  "evens",
  "power",
  "recurrence",
  "recursive-step",
  "fibonacci",
  "fibonacci-calls",
  "permutations",
  "recursive-search",
];
const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
const tape = (draws) => {
  let i = 0;
  return () => draws[i++] ?? 0.25;
};
const scalar = (topic, n) =>
  generateRecursion(
    tape([
      draw(topics.indexOf(topic), 0, 11),
      draw(
        n,
        topic === "permutations" ? 2 : 0,
        topic === "permutations" ? 5 : 10,
      ),
    ]),
    3,
  );
function search(size, start, gap, key) {
  const index = (key - start) / gap;
  return generateRecursion(
    tape([
      draw(11, 0, 11),
      draw(size, 5, 10),
      draw(start, 1, 20),
      draw(gap, 2, 8),
      index >= 0 && index < size && Number.isInteger(index) ? 0 : 0.9,
      draw(
        index >= 0 && index < size && Number.isInteger(index)
          ? index
          : key < start
            ? 0
            : 1,
        0,
        index >= 0 && index < size && Number.isInteger(index) ? size - 1 : 1,
      ),
    ]),
    3,
  );
}

test("all Fibonacci return and call-count inputs have independent table answers", () => {
  const values = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  const calls = [1, 1, 3, 5, 9, 15, 25, 41, 67, 109, 177];
  for (const topic of ["fibonacci", "fibonacci-calls"])
    for (let n = 0; n <= 10; n++) {
      const q = scalar(topic, n);
      validateRecursionQuestion(q);
      assert.equal(q.topic, topic);
      assert.equal(
        q.steps[0].answer,
        String((topic === "fibonacci" ? values : calls)[n]),
      );
      assert(q.reviewSteps.length <= 6);
      for (const row of q.reviewSteps.filter((r) =>
        r.title.startsWith("Build"),
      )) {
        for (const part of row.math.split("; ")) {
          const index = Number(part.match(/\((\d+)\)/)[1]);
          assert(
            part.endsWith(
              `= ${(topic === "fibonacci" ? values : calls)[index]}`,
            ),
          );
        }
      }
    }
});

test("permutation leaves equal distinct arrangements for every allowed size", () => {
  for (let size = 2; size <= 5; size++) {
    const q = scalar("permutations", size);
    validateRecursionQuestion(q);
    const seen = new Set();
    // Backtracking by selecting unused indices, independently of the C swaps.
    function choose(prefix, used) {
      if (prefix.length === size) {
        seen.add(prefix);
        return;
      }
      for (let i = 0; i < size; i++)
        if (!used.has(i))
          choose(prefix + q.data.word[i], new Set([...used, i]));
    }
    choose("", new Set());
    assert.equal(Number(q.steps[0].answer), seen.size);
    assert.equal(q.reviewSteps.length, size + 1);
    for (let position = 0; position < size; position++)
      assert.equal(
        q.reviewSteps[position].math,
        `${size - position} ${size - position === 1 ? "choice" : "choices"}`,
      );
    assert(q.reviewSteps.at(-1).math.endsWith(`= ${seen.size}`));
    assert(q.code.includes("swap(&word[pos], &word[i]);"));
    assert(q.steps[0].prompt.includes("writable char array"));
  }
});

test("all recursive-search array/key combinations terminate and return the linear lookup index", () => {
  let count = 0;
  for (let size = 5; size <= 10; size++)
    for (let start = 1; start <= 20; start++)
      for (let gap = 2; gap <= 8; gap++) {
        const values = Array.from({ length: size }, (_, i) => start + i * gap);
        for (const key of [start - 1, ...values, values.at(-1) + 1]) {
          const q = search(size, start, gap, key);
          validateRecursionQuestion(q);
          assert.equal(q.steps[0].answer, String(values.indexOf(key)));
          assert(q.reviewSteps.length <= 6);
          assert(q.data.trace.length <= 4);
          for (let i = 0; i < q.data.trace.length; i++) {
            const round = q.data.trace[i];
            assert.equal(
              q.reviewSteps[i].math,
              `mid = ${round.low} + floor((${round.high} − ${round.low}) / 2) = ${round.mid}; a[${round.mid}] = ${values[round.mid]}`,
            );
          }
          assert.equal(
            q.reviewSteps.at(-1).math,
            `return ${values.indexOf(key)}`,
          );
          for (let i = 1; i < q.data.trace.length; i++) {
            const prior = q.data.trace[i - 1],
              next = q.data.trace[i];
            assert(next.high - next.low < prior.high - prior.low);
            assert(next.low > prior.mid || next.high < prior.mid);
          }
          count++;
        }
      }
  assert.equal(count, 7980);
});

test("recursive validators reject corrupt answers, sources, displays, and trace transitions", () => {
  const samples = [
    scalar("fibonacci", 10),
    scalar("fibonacci-calls", 10),
    scalar("permutations", 5),
    search(10, 20, 8, 92),
  ];
  for (const q of samples) {
    const wrong = structuredClone(q);
    wrong.steps[0].answer += "1";
    assert.throws(() => validateRecursionQuestion(wrong));
    const source = structuredClone(q);
    source.code += "return 999;";
    assert.throws(() => validateRecursionQuestion(source));
    const prompt = structuredClone(q);
    prompt.steps[0].prompt += "999";
    assert.throws(() => validateRecursionQuestion(prompt));
  }
  const q = search(10, 20, 8, 92);
  const diagram = structuredClone(q);
  diagram.visual.items[0] = "999";
  assert.throws(() => validateRecursionQuestion(diagram));
  const trace = structuredClone(q);
  trace.data.trace[1].low = 0;
  assert.throws(() => validateRecursionQuestion(trace));
  const duplicate = scalar("permutations", 3);
  duplicate.data.word = "ABA";
  assert.throws(() => validateRecursionQuestion(duplicate));
});

test("every old and new topic provides bounded worked rows and new Learn paths", () => {
  const seen = new Set();
  for (let seed = 0; seed < 2000; seed++) {
    const q = generateRecursion(seeded(seed), 3);
    validateRecursionQuestion(q);
    seen.add(q.topic);
    assert(q.reviewSteps.length >= 2 && q.reviewSteps.length <= 6);
    assert(q.reviewSteps.every((r) => r.title && r.detail && r.math));
  }
  assert.equal(seen.size, 12);
  for (const id of [
    "fibonacci-branches",
    "permutation-backtracking",
    "recursive-binary-search",
  ])
    assert(
      recursionLessons.find((lesson) => lesson.id === id).steps.length >= 3,
    );
});
