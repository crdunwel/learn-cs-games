import test from "node:test";
import assert from "node:assert/strict";
import { practiceGames } from "../src/games/index.js";
import { seeded } from "../src/engine/random.js";
import { convert } from "../src/games/postfix.js";
import { emptyQueue, queueMove } from "../src/games/queue.js";
import { traceSearch } from "../src/games/search.js";
import {
  validatePracticeQuestion,
  postfixByGrammar,
  postfixPrefixStates,
  queueStateIsValid,
  searchByPartition,
} from "../src/engine/practiceValidation.js";
import {
  baseCase,
  recursionCase,
  memoryCase,
  searchCase,
  linkCase,
} from "./support/practice-cases.js";

test("every practice instance is independently checked; answer, source, and trace mutations fail closed", () => {
  for (const game of practiceGames)
    for (let level = 1; level <= 3; level++)
      for (let seed = 0; seed < 250; seed++) {
        const q = game.generate(seeded(seed), level);
        assert.equal(validatePracticeQuestion(game.id, q), q);
        const bad = structuredClone(q);
        bad.steps[0].answer += " deliberately-wrong";
        assert.throws(() => validatePracticeQuestion(game.id, bad));
        if (q.code && !q.scale) {
          const source = structuredClone(q);
          source.code += "\nreturn 999;";
          assert.throws(() => validatePracticeQuestion(game.id, source));
        }
      }
  const stack = practiceGames
    .find((g) => g.id === "postfix")
    .generate(seeded(1), 3);
  stack.solution.states[1].output = ["999"];
  assert.throws(() => validatePracticeQuestion("postfix", stack));
  const queue = practiceGames
    .find((g) => g.id === "queue")
    .generate(seeded(2), 3);
  queue.trace[0].state.front = 99;
  assert.throws(() => validatePracticeQuestion("queue", queue));
});

test("C source contracts preserve identifier, operator, and string-literal boundaries", () => {
  const q = recursionCase("sum", { n: 3, decrement: 1, base: 0 });
  for (const [before, after] of [
    ["return", "re turn"],
    ["int total", "inttotal"],
    ["<=", "< ="],
    ["n - 1", "n - 2"],
  ]) {
    const bad = structuredClone(q);
    bad.code = bad.code.replace(before, after);
    assert.notEqual(bad.code, q.code);
    assert.throws(() => validatePracticeQuestion("recursion", bad));
  }
  const print = recursionCase("print", { n: 3, before: true });
  print.code = print.code.replace('"%d "', '"%d"');
  assert.throws(() => validatePracticeQuestion("recursion", print));
});

test("all 49,152 radix directions and values in the complete generated domain preserve value", () => {
  let cases = 0;
  for (const from of [2, 8, 10, 16])
    for (const to of [2, 8, 10, 16])
      if (from !== to)
        for (let value = 0; value <= 4095; value++) {
          const q = baseCase(from, to, value);
          assert.deepEqual(q.data, {
            value,
            from,
            to,
            source: value.toString(from).toUpperCase(),
          });
          validatePracticeQuestion("bases", q);
          cases++;
        }
  assert.equal(cases, 49152);
});

test("all recursive scalar parameters and all array boundary/element classes are checked", () => {
  for (let n = 0; n <= 18; n++)
    for (let decrement = 1; decrement <= 4; decrement++)
      for (let base = 0; base <= 4; base++) {
        const q = recursionCase("sum", { n, decrement, base });
        assert.deepEqual(q.data, { n, decrement, base });
        validatePracticeQuestion("recursion", q);
      }
  for (let a = 2; a <= 9; a++)
    for (let b = 0; b <= 4; b++)
      validatePracticeQuestion("recursion", recursionCase("power", { a, b }));
  for (let n = 0; n <= 7; n++)
    validatePracticeQuestion("recursion", recursionCase("recurrence", { n }));
  for (let n = 2; n <= 8; n++)
    for (const before of [false, true])
      validatePracticeQuestion(
        "recursion",
        recursionCase("print", { n, before }),
      );
  for (const topic of ["base-case", "recursive-step"])
    for (let decrement = 1; decrement <= 5; decrement++)
      for (let n = 3; n <= 20; n++)
        validatePracticeQuestion(
          "recursion",
          recursionCase(topic, { n, decrement }),
        );
  for (const topic of ["array-sum", "evens"])
    for (let size = 3; size <= 7; size++)
      for (let high = 0; high < size; high++) {
        if (topic === "array-sum" && high !== size - 1) continue;
        for (let low = 0; low <= high + 1; low++)
          for (let index = 0; index < size; index++)
            for (
              let value = 0;
              value <= (topic === "evens" ? 19 : 9);
              value++
            ) {
              const values = Array(size).fill(topic === "evens" ? 1 : 0);
              values[index] = value;
              const q = recursionCase(topic, { values, low, high });
              assert.deepEqual(q.data, { values, low, high });
              validatePracticeQuestion("recursion", q);
            }
      }
});

test("all generated search arrays, possible keys, and reached intervals agree with independent partitioning", () => {
  let cases = 0;
  for (let n = 5; n <= 10; n++)
    for (let start = 1; start <= 20; start++)
      for (let gap = 2; gap <= 8; gap++) {
        const values = Array.from({ length: n }, (_, i) => start + i * gap);
        const targets = [
          ...new Set([
            start - 1,
            values.at(-1) + 1,
            ...values,
            ...values.map((v) => v + 1),
          ]),
        ];
        for (const target of targets) {
          const trace = traceSearch(values, target);
          assert.deepEqual(trace.rounds, searchByPartition(values, target));
          assert.equal(trace.index, values.indexOf(target));
          for (const kind of ["mid", "bounds", "result", "comparisons"]) {
            const q = searchCase(n, start, gap, target, kind);
            assert.equal(q.meta.target, target);
            validatePracticeQuestion("search", q);
          }
          cases++;
        }
      }
  assert.equal(cases, 13440);
});

test("all small circular states and every enqueue/dequeue sequence through length 3 satisfy FIFO", () => {
  for (let capacity = 1; capacity <= 6; capacity++)
    for (let front = 0; front < capacity; front++)
      for (let count = 0; count <= capacity; count++)
        for (let bits = 0; bits < 8; bits++) {
          let state = emptyQueue(capacity, front);
          for (let i = 0; i < count; i++)
            state = queueMove(state, {
              kind: "enqueue",
              value: String(i),
            }).state;
          const fifo = Array.from({ length: count }, (_, i) => String(i));
          let expectedFront = front;
          assert(queueStateIsValid(state));
          for (let depth = 0; depth < 3; depth++) {
            const add = Boolean(bits & (1 << depth)),
              value = String(10 + depth);
            const op = add ? { kind: "enqueue", value } : { kind: "dequeue" };
            let expected;
            if (add) {
              if (fifo.length === capacity) expected = "Full";
              else {
                fifo.push(value);
                expected = value;
              }
            } else if (!fifo.length) expected = "Empty";
            else {
              expected = fifo.shift();
              expectedFront = (expectedFront + 1) % capacity;
            }
            const old = structuredClone(state),
              moved = queueMove(state, op);
            assert.deepEqual(state, old);
            assert.equal(moved.result, expected);
            state = moved.state;
            assert(queueStateIsValid(state));
            assert.equal(state.front, expectedFront);
            assert.equal(state.count, fifo.length);
            assert.deepEqual(
              fifo,
              Array.from(
                { length: state.count },
                (_, i) => state.cells[(state.front + i) % capacity],
              ),
            );
          }
        }
});

test("all binary expression trees through four operands, operators, and internal parenthesis choices agree", () => {
  const trees = [null, [["1"]]];
  for (let size = 2; size <= 4; size++) {
    trees[size] = [];
    for (let left = 1; left < size; left++)
      for (const a of trees[left])
        for (const b of trees[size - left])
          for (const op of ["+", "-", "*", "/"]) {
            const body = [...a, op, ...b];
            trees[size].push(body, ["(", ...body, ")"]);
          }
  }
  let cases = 0;
  for (const tokens of trees.slice(1).flat()) {
    const result = convert(tokens);
    assert.deepEqual(result.postfix, postfixByGrammar(tokens));
    assert.deepEqual(result.states, postfixPrefixStates(tokens));
    cases++;
  }
  assert.equal(cases, 2697);
});

test("all memory scalar parameters and linked-list branch classes are checked", () => {
  for (let count = 12; count <= 240; count++) {
    validatePracticeQuestion("memory", memoryCase("calloc", { count }));
    for (const type of ["int", "double", "Book", "float"])
      validatePracticeQuestion("memory", memoryCase("bytes", { count, type }));
    for (const factor of [2, 3, 4])
      validatePracticeQuestion(
        "memory",
        memoryCase("realloc", { count, factor }),
      );
  }
  for (let length = 2; length <= 96; length++)
    validatePracticeQuestion("memory", memoryCase("string", { length }));
  for (let authors = 1; authors <= 12; authors++)
    for (let titleLength = 5; titleLength <= 45; titleLength++)
      validatePracticeQuestion(
        "memory",
        memoryCase("free-order", { authors, titleLength }),
      );
  for (let size = 3; size <= 5; size++)
    for (let index = 0; index < size; index++)
      for (let value = 1; value <= 40; value++)
        for (let factor = 2; factor <= 4; factor++) {
          const values = Array(size).fill(1);
          values[index] = value;
          validatePracticeQuestion(
            "memory",
            memoryCase("resize", { values, index, factor }),
          );
        }
  for (let size = 3; size <= 5; size++) {
    const values = Array.from({ length: size }, (_, i) => i * 10 + 1);
    for (let p = 2; p <= size + 3; p++)
      for (let x = 51; x <= 89; x++)
        validatePracticeQuestion("links", linkCase("insert", { values, p, x }));
    for (let bits = 0; bits < 2 ** size; bits++)
      for (const parity of [0, 1])
        for (const offset of [3, 5, 7]) {
          const mixed = values.map(
            (v, i) => v + Number(Boolean(bits & (1 << i))),
          );
          validatePracticeQuestion(
            "links",
            linkCase("mutation", { values: mixed, parity, offset }),
          );
        }
    for (let index = 0; index < size - 1; index++)
      validatePracticeQuestion(
        "links",
        linkCase("pointer-order", { values, index }),
      );
    validatePracticeQuestion("links", linkCase("free", { values }));
  }
});
