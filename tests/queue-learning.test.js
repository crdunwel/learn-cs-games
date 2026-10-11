import test from "node:test";
import assert from "node:assert/strict";
import {
  generateFifoQueue,
  generateQueue,
  emptyQueue,
  queueMove,
} from "../src/games/queue.js";
import { validatePracticeQuestion } from "../src/engine/practiceValidation.js";
import { draw, tape } from "./support/practice-cases.js";
import { queueMoveSteps } from "../src/engine/learningSteps.js";

test("ordinary queues exhaust every length, operation sequence and answer target", () => {
  for (let count = 0; count <= 4; count++)
    for (let start = 1; start <= 5; start++)
      for (let level = 1; level <= 3; level++)
        for (let mask = 0; mask < 2 ** level; mask++)
          for (let target = 0; target < 4; target++) {
            const draws = [
              draw(count, 0, 4),
              draw(start, 1, 5),
              ...Array.from({ length: level }, (_, i) =>
                mask & (1 << i) ? 0.9 : 0.1,
              ),
              draw(target, 0, 3),
            ];
            const q = generateFifoQueue(tape(...draws), level);
            validatePracticeQuestion("queue", q);
            const list = Array.from({ length: count }, (_, i) =>
              String(start * 10 + i * 10),
            );
            let serial = start * 10 + count * 10,
              result;
            for (let i = 0; i < level; i++) {
              if (mask & (1 << i))
                result = list.length ? list.splice(0, 1)[0] : "Empty";
              else {
                result = String((serial += 10));
                list.push(result);
              }
            }
            assert.deepEqual(q.final.items, list);
            const expected = [
              list[0] ?? "Empty",
              list.at(-1) ?? "Empty",
              String(list.length),
              result,
            ][target];
            assert.equal(q.steps[0].answer, expected);
            assert.equal(
              new Set(q.steps[0].options).size,
              q.steps[0].options.length,
            );
            const corrupt = structuredClone(q);
            corrupt.final.items.push("999");
            assert.throws(() => validatePracticeQuestion("queue", corrupt));
          }
});
test("mixed queue pool includes ordinary and circular questions", () => {
  assert.equal(generateQueue(() => 0.1, 1).variant, "fifo");
  assert.equal(generateQueue(() => 0.4, 1).variant, undefined);
});
test("circular wrap review displays before/result and modulo arithmetic", () => {
  let state = emptyQueue(4, 3);
  let moved = queueMove(state, { kind: "enqueue", value: "10" });
  state = moved.state;
  const op = { kind: "enqueue", value: "20" };
  moved = queueMove(state, op);
  const steps = queueMoveSteps({
    before: state,
    state: moved.state,
    operation: op,
    result: moved.result,
  });
  assert.match(steps[0].math, /\(3 \+ 1\) % 4 = 0/);
  assert.match(steps[1].math, /Q\[0\] = 20/);
  const changed = {
    before: state,
    state: moved.state,
    operation: op,
    result: moved.result,
  };
  assert.equal(changed.before.rear, 3);
});
