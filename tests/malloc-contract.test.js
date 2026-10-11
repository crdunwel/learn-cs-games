import test from "node:test";
import assert from "node:assert/strict";
import { generateMemory } from "../src/games/memory.js";
import { gradeMallocAnswer } from "../src/engine/mallocAnswer.js";
import { validateMallocQuestion } from "../src/engine/mallocValidation.js";

export function mallocCase(variant, count = 12, length = 2, level = 2) {
  const draws = [
    level === 1 ? 5.25 / 6 : 12.25 / 13,
    (count - 12 + 0.25) / 229,
    (variant + 0.25) / 6,
    (length - 2 + 0.25) / 95,
  ];
  return generateMemory(() => draws.shift() ?? 0.25, level);
}

test("all malloc writing templates are derived and graded throughout finite domains", () => {
  for (let count = 12; count <= 240; count++)
    for (let variant = 0; variant < 6; variant++) {
      const lengths =
        variant === 3 ? Array.from({ length: 95 }, (_, i) => i + 2) : [2];
      for (const length of lengths) {
        const q = mallocCase(variant, count, length);
        assert.equal(validateMallocQuestion(q), q);
        assert.equal(q.meta.kind, "malloc-write");
        assert.equal(q.meta.variant, variant);
        assert.deepEqual(gradeMallocAnswer(q.steps[0], q.steps[0].answer), {
          correct: true,
          earned: 10,
        });
        const allocation = q.steps[0].allocation;
        const expectedCount =
          variant === 3 ? length + 1 : variant === 4 ? 1 : count;
        const expectedSize = [4, 8, 4, 1, 44, 44][variant];
        assert.equal(allocation.count, expectedCount);
        assert.equal(allocation.elementBytes, expectedSize);
        assert.equal(
          gradeMallocAnswer(
            q.steps[0],
            `${allocation.name}=malloc(${expectedCount * expectedSize});`,
          ).correct,
          true,
        );
        assert.equal(
          gradeMallocAnswer(
            q.steps[0],
            `${allocation.name}=malloc(${expectedCount * expectedSize - 1});`,
          ).correct,
          false,
        );
      }
    }
  for (let variant = 0; variant < 6; variant++)
    assert.equal(
      validateMallocQuestion(mallocCase(variant, 12, 2, 1)).meta.kind,
      "malloc-write",
    );
});

test("malloc generated contract fails closed on corrupted meaning or learning aids", () => {
  const mutations = [
    (q) => (q.meta.count = 241),
    (q) => (q.meta.variant = 6),
    (q) => q.steps[0].allocation.count--,
    (q) => (q.steps[0].allocation.name = "wrong"),
    (q) => (q.steps[0].allocation.elementBytes = 8),
    (q) => (q.steps[0].format = "number"),
    (q) => (q.steps[0].answer = "scores = malloc(8);"),
    (q) => (q.code = q.code.replace("4 bytes", "8 bytes")),
    (q) => (q.steps[0].prompt = "Allocate a different array."),
    (q) => (q.visual.items[0] = "Wrong count"),
    (q) => (q.reviewSteps[1].math = "12 × 4 = 47"),
    (q) => (q.reviewSteps[2].math = "scores = malloc(8);"),
    (q) => q.steps.push(q.steps[0]),
  ];
  for (const mutate of mutations) {
    const q = mallocCase(0);
    mutate(q);
    assert.throws(() => validateMallocQuestion(q));
  }
  const string = mallocCase(3);
  string.meta.length = 1;
  assert.throws(() => validateMallocQuestion(string));
});
