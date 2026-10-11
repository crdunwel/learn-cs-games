import test from "node:test";
import assert from "node:assert/strict";
import { seeded } from "../src/engine/random.js";
import { generateRecursion, recursionLessons } from "../src/games/recursion.js";
import { generateBases, basesLessons } from "../src/games/bases.js";
import {
  evaluate,
  sessionReducer,
  startSession,
} from "../src/engine/session.js";

function recursionOracle(question) {
  const { topic, data, code } = question;
  if (topic === "sum") {
    assert(code.includes(`return ${data.base};`));
    assert(code.includes(`total(n - ${data.decrement})`));
    const count = Math.ceil(data.n / data.decrement);
    return String(
      count * data.n - (data.decrement * count * (count - 1)) / 2 + data.base,
    );
  }
  if (topic === "print") {
    // Derive direction from the displayed program, not its answer metadata.
    const before =
      code.indexOf('printf("%d ", n)') < code.indexOf("printSeq(n - 1)");
    assert.equal(before, data.before);
    return Array.from({ length: data.n }, (_, i) =>
      before ? data.n - i : i + 1,
    ).join(" ");
  }
  if (topic === "array-sum" || topic === "evens") {
    let result = 0;
    for (let index = data.low; index <= data.high; index++) {
      if (topic === "array-sum") result += data.values[index];
      else if (Number.isInteger(data.values[index] / 2)) result++;
    }
    return String(result);
  }
  if (topic === "power") {
    let result = 1;
    for (let index = 0; index < data.b; index++) result *= data.a;
    return String(result);
  }
  if (topic === "recurrence") {
    const values = [1, 1, 3];
    for (let n = 3; n <= data.n; n++)
      values.push(2 * values[n - 1] + values[n - 2] - 1);
    return String(values[data.n]);
  }
  if (["fibonacci", "fibonacci-calls"].includes(topic)) {
    const calls = topic === "fibonacci-calls";
    const values = calls ? [1, 1] : [0, 1];
    for (let n = 2; n <= data.n; n++)
      values.push((calls ? 1 : 0) + values[n - 1] + values[n - 2]);
    return String(values[data.n]);
  }
  if (topic === "permutations") {
    let count = 1;
    for (let position = 2; position <= data.size; position++) count *= position;
    return String(count);
  }
  if (topic === "recursive-search")
    return String(data.values.indexOf(data.key));
  if (topic === "base-case") return "n <= 0";
  return `n - ${data.decrement}`;
}

function decimalValue(text, radix) {
  const alphabet = "0123456789ABCDEF";
  let value = 0;
  for (const digit of text) {
    const index = alphabet.indexOf(digit.toUpperCase());
    assert(
      index >= 0 && index < radix,
      `${digit} is not a base-${radix} digit`,
    );
    value = value * radix + index;
  }
  return value;
}

test("3,600 generated recursion rounds match independent iterative oracles", () => {
  const seenTopics = new Set();
  const edges = new Set();
  for (let level = 1; level <= 3; level++) {
    const variants = new Set();
    for (let seed = 0; seed < 1200; seed++) {
      const q = generateRecursion(seeded(seed), level),
        step = q.steps[0];
      seenTopics.add(q.topic);
      variants.add(JSON.stringify([q.code, q.visual, step.prompt]));
      assert.equal(q.type, "trace");
      assert.equal(step.answer, recursionOracle(q));
      assert(step.explanation.length > 30);
      assert(step.illustration.length > 0 && step.illustration.length <= 4);
      if (step.kind === "choice") {
        assert.equal(new Set(step.options).size, step.options.length);
        assert.equal(
          step.options.filter((answer) => evaluate(step, answer)).length,
          1,
        );
      }
      const state = startSession(q);
      const answered = sessionReducer(
        { ...state, draft: step.answer },
        { type: "check" },
      );
      assert.equal(answered.status, "correct");
      assert.equal(answered.earned, 10);
      assert.equal(sessionReducer(answered, { type: "check" }).earned, 10);
      if (q.topic === "sum" && q.data.n === 0) edges.add("sum-base");
      if (q.topic === "power" && q.data.b === 0) edges.add("power-base");
      if (q.topic === "array-sum" && q.data.low > q.data.high)
        edges.add("empty-sum");
      if (q.topic === "evens" && q.data.low > q.data.high)
        edges.add("empty-evens");
      if (
        q.topic === "evens" &&
        q.data.values.slice(q.data.low, q.data.high + 1).includes(0)
      )
        edges.add("zero-is-even");
      if (q.topic === "recurrence" && q.data.n === 5)
        assert.equal(step.answer, "33");
    }
    assert(
      variants.size > 100,
      `level ${level}: only ${variants.size} variants`,
    );
  }
  assert.equal(seenTopics.size, 12);
  assert.deepEqual([...edges].sort(), [
    "empty-evens",
    "empty-sum",
    "power-base",
    "sum-base",
    "zero-is-even",
  ]);
});

test("3,600 base conversion rounds preserve value, cover all directions, and accept harmless spacing/case", () => {
  const directions = new Set();
  const seenEdges = new Set();
  for (let level = 1; level <= 3; level++) {
    const variants = new Set();
    for (let seed = 0; seed < 1200; seed++) {
      const q = generateBases(seeded(seed), level),
        step = q.steps[0];
      const { value, source, from, to } = q.data;
      assert.notEqual(from, to);
      assert.equal(decimalValue(source, from), value);
      assert.equal(decimalValue(step.answer, to), value);
      assert.equal(
        step.answer,
        Number.parseInt(source, from).toString(to).toUpperCase(),
      );
      assert(evaluate(step, step.answer.toLowerCase().split("").join(" ")));
      assert(!evaluate(step, `${step.answer}1`));
      assert(step.illustration.length >= 2 && step.illustration.length <= 4);
      assert(
        step.explanation.includes(to === 10 ? "rightmost" : "last to first"),
      );
      directions.add(`${from}-${to}`);
      variants.add(step.prompt);
      if (value === 0) {
        assert.equal(step.answer, "0");
        seenEdges.add("zero");
      }
      if (/[A-F]/.test(step.answer)) seenEdges.add("hex-letters");
      if (step.answer.length > 5) seenEdges.add("long-binary");
    }
    assert(
      variants.size > 100,
      `level ${level}: only ${variants.size} variants`,
    );
  }
  assert.equal(directions.size, 12);
  assert.deepEqual([...seenEdges].sort(), [
    "hex-letters",
    "long-binary",
    "zero",
  ]);
});

test("lessons include the supplied lab/exam results and complete readable steps", () => {
  for (const lessons of [recursionLessons, basesLessons]) {
    assert(lessons.length >= 3);
    assert.equal(
      new Set(lessons.map((lesson) => lesson.id)).size,
      lessons.length,
    );
    for (const lesson of lessons) {
      assert(lesson.steps.length >= 3);
      for (const step of lesson.steps) {
        assert.equal(step.type, "trace");
        assert(step.caption && step.result);
        if (step.visual) assert(step.visual.items.length > 0);
      }
    }
  }
  assert.equal(
    recursionLessons
      .find((lesson) => lesson.id === "exam-recurrence")
      .steps.at(-1).result,
    "f(5) = 2 × 14 + 6 − 1 = 33",
  );
  assert.equal(
    recursionLessons.find((lesson) => lesson.id === "unwind").steps.at(-1)
      .result,
    "total(3) = 3 + 3 = 6",
  );
  assert.equal(decimalValue("3605", 8), 1925);
  assert.equal(decimalValue("277", 8), decimalValue("BF", 16));
  assert.equal(decimalValue("7EC8", 16), 32456);
  assert.equal(
    basesLessons.find((lesson) => lesson.id === "remainders").steps.at(-1)
      .result,
    "1925₁₀ = 3605₈",
  );
  assert.equal(
    basesLessons.find((lesson) => lesson.id === "hex-remainders").steps.at(-1)
      .result,
    "32456₁₀ = 7EC8₁₆",
  );
});
