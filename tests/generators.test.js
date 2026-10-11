import { validateBigOQuestion } from "../src/engine/bigOValidation.js";
import test from "node:test";
import assert from "node:assert/strict";
import { seeded } from "../src/engine/random.js";
import {
  convert,
  generatePostfix,
  postfixTutorial,
} from "../src/games/postfix.js";
import {
  emptyQueue,
  queueMove,
  generateCircularQueue as generateQueue,
  queueLabExample,
} from "../src/games/queue.js";
import { generateBigO } from "../src/games/bigO.js";

// Independent recursive-descent parser checks postfix conversion without using a stack.
function referencePostfix(tokens) {
  let at = 0;
  function atom() {
    if (tokens[at] !== "(") return [tokens[at++]];
    at++;
    const inner = sum();
    assert.equal(tokens[at++], ")");
    return inner;
  }
  function product() {
    let value = atom();
    while (["*", "/"].includes(tokens[at])) {
      const op = tokens[at++];
      value = [...value, ...atom(), op];
    }
    return value;
  }
  function sum() {
    let value = product();
    while (["+", "-"].includes(tokens[at])) {
      const op = tokens[at++];
      value = [...value, ...product(), op];
    }
    return value;
  }
  const output = sum();
  assert.equal(at, tokens.length);
  return output;
}
test("postfix precedence, left associativity, parentheses, and pre-flush state", () => {
  for (const [infix, output] of [
    ["A - B - C", "A B - C -"],
    ["A / B * C", "A B / C *"],
    ["A * ( B + C )", "A B C + *"],
    ["( ( A ) )", "A"],
    ["12 + 30 * 4", "12 30 4 * +"],
  ])
    assert.equal(convert(infix.split(" ")).postfix.join(" "), output);
  const result = convert(["A", "+", "B"]);
  assert.deepEqual(result.states[3].stack, ["+"]);
  assert.deepEqual(result.states[0].stack, []);
  for (const tokens of [
    [],
    ["("],
    ["A", "+"],
    ["A", ")"],
    ["A", "B"],
    ["A", "(", "B", ")"],
    ["A", "^", "B"],
    ["(", ")"],
  ])
    assert.throws(() => convert(tokens));
  assert.deepEqual(postfixTutorial.at(-1).stack, []);
  assert.deepEqual(postfixTutorial.at(-1).output, ["2", "3", "4", "+", "*"]);
});
test("1,500 generated postfix questions match independent parser and checkpoint replay", () => {
  let empty = 0,
    end = 0,
    parens = 0;
  for (let level = 1; level <= 3; level++)
    for (let seed = 0; seed < 500; seed++) {
      const q = generatePostfix(seeded(seed), level);
      assert.deepEqual(q.solution.postfix, referencePostfix(q.tokens));
      assert(q.stop >= 1 && q.stop <= q.tokens.length);
      assert.equal(q.checkpoint.label, "A");
      assert.equal(q.checkpoint.after, q.stop);
      assert(q.stackCapacity >= 6);
      assert(
        q.solution.states.every(
          (state) => state.stack.length <= q.stackCapacity,
        ),
      );
      assert(
        q.tokens.every(
          (token) => /^\d+$/.test(token) || "()+-*/".includes(token),
        ),
      );
      const stack = [];
      const rank = { "+": 1, "-": 1, "*": 2, "/": 2 };
      for (const t of q.tokens.slice(0, q.stop)) {
        if (t === "(") stack.push(t);
        else if (t === ")") {
          while (stack.at(-1) !== "(") stack.pop();
          stack.pop();
        } else if (t in rank) {
          while (rank[stack.at(-1)] >= rank[t]) stack.pop();
          stack.push(t);
        }
      }
      assert.equal(q.steps[0].answer, [...stack].reverse().join(" "));
      assert.equal(q.steps[1].answer, q.solution.postfix.join(" "));
      if (!stack.length) empty++;
      if (q.stop === q.tokens.length) end++;
      if (stack.includes("(")) parens++;
    }
  assert(empty > 0 && end > 0 && parens > 0);
});
test("queue full/empty preserve state, wraparound, immutable transitions", () => {
  let q = emptyQueue(2, 1);
  const blank = structuredClone(q);
  assert.equal(queueMove(q, { kind: "dequeue" }).result, "Empty");
  assert.deepEqual(q, blank);
  q = queueMove(q, { kind: "enqueue", value: "A" }).state;
  assert.equal(q.rear, 1);
  q = queueMove(q, { kind: "enqueue", value: "B" }).state;
  assert.equal((q.rear + 1) % q.capacity, q.front);
  assert.equal(q.count, 2);
  const full = structuredClone(q),
    rejected = queueMove(q, { kind: "enqueue", value: "C" });
  assert.equal(rejected.result, "Full");
  assert.deepEqual(rejected.state, full);
  assert.deepEqual(q, full);
  const out = queueMove(q, { kind: "dequeue" });
  assert.equal(out.result, "A");
  assert.equal(out.state.front, 0);
  q = queueMove(out.state, { kind: "dequeue" }).state;
  assert.equal(q.count, 0);
  assert.equal((q.rear + 1) % q.capacity, q.front);
});
test("1,500 generated queues match a separate FIFO-list oracle", () => {
  const events = new Set(),
    targets = new Set();
  for (let level = 1; level <= 3; level++)
    for (let seed = 0; seed < 500; seed++) {
      const q = generateQueue(seeded(seed), level),
        s = q.initial;
      const list = Array.from(
        { length: s.count },
        (_, i) => s.cells[(s.front + i) % s.capacity],
      );
      let f = s.front,
        r = s.rear,
        result;
      for (const op of q.operations) {
        if (op.kind === "enqueue") {
          if (list.length === s.capacity) result = "Full";
          else {
            list.push(op.value);
            result = op.value;
            r = (r + 1) % s.capacity;
          }
        } else if (!list.length) result = "Empty";
        else {
          result = list.shift();
          f = (f + 1) % s.capacity;
        }
        events.add(result);
      }
      const cells = Array(s.capacity).fill(null);
      list.forEach((v, i) => {
        cells[(f + i) % s.capacity] = v;
      });
      assert.deepEqual(q.final, {
        capacity: s.capacity,
        cells,
        front: f,
        rear: r,
        count: list.length,
      });
      for (const state of [q.initial, ...q.trace.map((entry) => entry.state)]) {
        assert.equal(
          state.rear,
          (state.front + state.count - 1 + state.capacity) % state.capacity,
        );
        if (state.count) {
          assert.notEqual(state.cells[state.front], null);
          assert.notEqual(state.cells[state.rear], null);
        }
      }
      const expected =
        q.target === "result"
          ? result
          : String({ front: f, rear: r, count: list.length }[q.target]);
      assert.equal(q.steps[0].answer, expected);
      assert(q.steps[0].options.includes(expected));
      if (q.target === "result") {
        if (q.operations.at(-1).kind === "enqueue") {
          assert.deepEqual(
            new Set(q.steps[0].options),
            new Set([q.operations.at(-1).value, "Full"]),
          );
        } else {
          assert(
            q.steps[0].options.length >= 2 && q.steps[0].options.length <= 4,
          );
          assert(q.steps[0].options.includes("Empty"));
          assert(!q.steps[0].options.includes("Full"));
        }
      }
      targets.add(q.target);
    }
  assert(events.has("Full") && events.has("Empty"));
  assert.equal(targets.size, 4);
});
test("1500 Big-O questions obey independent source contracts and exact scaling models", () => {
  const seen = new Set();
  for (let level = 1; level <= 3; level++)
    for (let seed = 0; seed < 500; seed++) {
      const q = generateBigO(seeded(seed), level);
      validateBigOQuestion(q);
      seen.add(q.scale ? `scale-${q.scale.mode}` : q.kind);
      if (q.scale) {
        const ratio = q.scale.factor ** q.scale.power;
        assert.equal(
          q.steps[0].answer,
          q.scale.mode === "time"
            ? `${q.scale.timeMs * ratio} ms`
            : `${ratio}×`,
        );
      }
    }
  assert.equal(seen.size, 15);
});

// Values and indices transcribed from Lab 6 Q3; this is deliberately not derived from queueMove.
test("Lab 6 Q3 exact rear-as-back trace matches the answer key", () => {
  let state = structuredClone(queueLabExample.initial);
  const expected = [
    {
      front: 3,
      rear: 1,
      count: 4,
      cells: ["20", "50", null, "40", "10"],
      result: "50",
    },
    {
      front: 4,
      rear: 1,
      count: 3,
      cells: ["20", "50", null, null, "10"],
      result: "40",
    },
    {
      front: 4,
      rear: 2,
      count: 4,
      cells: ["20", "50", "60", null, "10"],
      result: "60",
    },
    {
      front: 4,
      rear: 3,
      count: 5,
      cells: ["20", "50", "60", "70", "10"],
      result: "70",
    },
    {
      front: 4,
      rear: 3,
      count: 5,
      cells: ["20", "50", "60", "70", "10"],
      result: "Full",
    },
  ];
  queueLabExample.operations.forEach((operation, index) => {
    const { result, ...fields } = expected[index];
    const moved = queueMove(state, operation);
    assert.equal(moved.result, result);
    assert.deepEqual(moved.state, { capacity: 5, ...fields });
    state = moved.state;
  });
});

test("empty-to-single-item queues preserve the explicit retained-index convention", () => {
  for (let capacity = 1; capacity <= 6; capacity++) {
    for (let front = 0; front < capacity; front++) {
      let state = emptyQueue(capacity, front);
      assert.equal(state.rear, (front - 1 + capacity) % capacity);
      state = queueMove(state, { kind: "enqueue", value: "0" }).state;
      assert.equal(state.rear, front);
      assert.equal(state.cells[front], "0");
      const result = queueMove(state, { kind: "dequeue" });
      assert.equal(result.result, "0");
      state = result.state;
      assert.equal(state.count, 0);
      assert.equal(state.front, (front + 1) % capacity);
      assert.equal(state.rear, front);
      assert(state.cells.every((value) => value === null));
      state = queueMove(state, { kind: "enqueue", value: "25" }).state;
      assert.equal(state.cells[state.front], "25");
      assert.equal(state.front, state.rear);
    }
  }
});

test("stack-applications sample points fall between tokens, before the final flush", () => {
  const tokens =
    "1 * ( 7 - 4 ) / ( 5 + 6 ) + 9 * 2 - 3 / ( 6 * ( 4 - 3 ) ) + 4".split(" ");
  const solution = convert(tokens);
  assert.deepEqual(solution.states[11].stack, ["/", "(", "+"]); // A: after +, before 6.
  assert.deepEqual(solution.states[22].stack, ["-", "/", "("]); // B: after 6, before *.
  assert.deepEqual(solution.states[29].stack, ["-", "/"]); // C: after ), before +.
  assert.deepEqual(solution.postfix, referencePostfix(tokens));
});
