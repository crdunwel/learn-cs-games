import test from "node:test";
import assert from "node:assert/strict";
import { generateSearch } from "../src/games/search.js";
import { validateSearchQuestion } from "../src/engine/searchValidation.js";
import { seeded } from "../src/engine/random.js";
const kinds = [
  "mid",
  "bounds",
  "result",
  "comparisons",
  "probe-value",
  "direction",
  "next-mid",
  "remaining",
  "worst-checks",
];
const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
const tape = (draws) => {
  let i = 0;
  return () => draws[i++] ?? 0.25;
};
function question(size, start, gap, key, kind, fraction = 0) {
  const values = Array.from({ length: size }, (_, i) => start + i * gap),
    index = values.indexOf(key);
  const draws = [
    draw(size, 5, 10),
    draw(start, 1, 20),
    draw(gap, 2, 8),
    index >= 0 ? 0 : 0.9,
  ];
  if (index >= 0) draws.push(draw(index, 0, size - 1));
  else
    draws.push(
      draw(Math.max(0, values.indexOf(key - 1)), 0, size - 1),
      draw(key < start ? 0 : key > values.at(-1) ? 1 : 2, 0, 2),
    );
  draws.push(draw(kinds.indexOf(kind), 0, 8), fraction);
  return generateSearch(tape(draws), 3);
}
function partitions(values, key, lo = 0, hi = values.length - 1) {
  if (lo > hi) return [];
  const middle = Math.floor((lo + hi) / 2),
    r = { low: lo, high: hi, mid: middle, value: values[middle] };
  return key === r.value
    ? [r]
    : [
        r,
        ...partitions(
          values,
          key,
          key > r.value ? middle + 1 : lo,
          key < r.value ? middle - 1 : hi,
        ),
      ];
}

test("all generated array/key/round inputs validate new probe and transition questions", () => {
  let pairs = 0,
    instances = 0;
  for (let size = 5; size <= 10; size++)
    for (let start = 1; start <= 20; start++)
      for (let gap = 2; gap <= 8; gap++) {
        const values = Array.from({ length: size }, (_, i) => start + i * gap);
        const targets = [
          ...new Set([
            start - 1,
            values.at(-1) + 1,
            ...values,
            ...values.map((value) => value + 1),
          ]),
        ];
        for (const key of targets) {
          pairs++;
          const trace = partitions(values, key),
            mismatch = trace.filter((r) => r.value !== key);
          for (const kind of [
            "probe-value",
            "direction",
            "next-mid",
            "remaining",
          ])
            for (
              let at = 0;
              at <
              Math.max(
                1,
                kind === "probe-value" ? trace.length : mismatch.length,
              );
              at++
            ) {
              const rounds = kind === "probe-value" ? trace : mismatch;
              const q = question(
                size,
                start,
                gap,
                key,
                kind,
                (at + 0.25) / Math.max(1, rounds.length),
              );
              validateSearchQuestion(q);
              if (!rounds.length) {
                assert.equal(q.meta.kind, "result");
                continue;
              }
              const r = rounds[at];
              assert.equal(q.meta.mid, r.mid);
              let expected = r.value;
              if (kind !== "probe-value") {
                const candidates = Array.from(
                  { length: r.high - r.low + 1 },
                  (_, i) => r.low + i,
                ).filter((i) => (key < r.value ? i < r.mid : i > r.mid));
                expected =
                  kind === "direction"
                    ? key < r.value
                      ? "Left half"
                      : "Right half"
                    : kind === "remaining"
                      ? candidates.length
                      : candidates.length
                        ? candidates[Math.floor((candidates.length - 1) / 2)]
                        : -1;
              }
              assert.equal(q.steps[0].answer, String(expected));
              assert(q.reviewSteps.length <= 6);
              if (kind === "probe-value") {
                assert.equal(
                  q.reviewSteps[0].math,
                  `${r.low} + floor((${r.high} − ${r.low}) / 2) = ${r.mid}`,
                );
                assert.equal(q.reviewSteps[1].math, `a[${r.mid}] = ${r.value}`);
              } else {
                const left = key < r.value,
                  low = left ? r.low : r.mid + 1,
                  high = left ? r.mid - 1 : r.high;
                assert.equal(
                  q.reviewSteps[1].math,
                  `${key} ${left ? "<" : ">"} ${r.value}`,
                );
                assert.equal(
                  q.reviewSteps[2].math,
                  `${left ? "high" : "low"} = ${r.mid} ${left ? "−" : "+"} 1 = ${left ? high : low}; range ${low}…${high}`,
                );
                assert.equal(
                  q.reviewSteps[3].math,
                  low <= high
                    ? `${high} − ${low} + 1 = ${high - low + 1} candidates; next mid = ${low} + floor((${high} − ${low}) / 2) = ${Math.floor((low + high) / 2)}`
                    : "0 candidates; next index = -1",
                );
              }
              instances++;
            }
        }
        const q = question(size, start, gap, values[0], "worst-checks");
        validateSearchQuestion(q);
        assert.equal(
          Number(q.steps[0].answer),
          Math.max(...targets.map((key) => partitions(values, key).length)),
        );
      }
  assert.equal(pairs, 13440);
  assert(instances > 100000);
});

test("all search families give worked steps and reject false answers/source/inputs", () => {
  const seen = new Set();
  for (let seed = 0; seed < 1000; seed++) {
    const q = generateSearch(seeded(seed), 3);
    validateSearchQuestion(q);
    seen.add(q.meta.kind);
    assert(q.reviewSteps.length >= 2 && q.reviewSteps.length <= 6);
    assert(q.reviewSteps.every((r) => r.title && r.detail && r.math));
  }
  assert.deepEqual([...seen].sort(), [...kinds].sort());
  for (const kind of kinds) {
    const q = question(10, 20, 8, 92, kind);
    validateSearchQuestion(q);
    const wrong = structuredClone(q);
    wrong.steps[0].answer += "999";
    assert.throws(() => validateSearchQuestion(wrong));
    const source = structuredClone(q);
    source.code += "\nlow = 0;";
    assert.throws(() => validateSearchQuestion(source));
    const display = structuredClone(q);
    display.visual.items[0] = "999";
    assert.throws(() => validateSearchQuestion(display));
    const state = structuredClone(q);
    state.meta.mid = 999;
    assert.throws(() => validateSearchQuestion(state));
  }
});
