import { generateBigO } from "../../src/games/bigO.js";
import { generateRecursion } from "../../src/games/recursion.js";
import { generateLinks } from "../../src/games/links.js";
import { generateSearch } from "../../src/games/search.js";
import { generateMemory } from "../../src/games/memory.js";
import { generateBases } from "../../src/games/bases.js";

// Choose exact finite-domain values. Remaining draws only permute distractors.
export const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
export const tape = (...values) => {
  let at = 0;
  return () => values[at++] ?? 0.25;
};
export function recursionCase(topic, d = {}) {
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
  const head = draw(topics.indexOf(topic), 0, topics.length - 1);
  let rest;
  if (topic === "sum")
    rest = [draw(d.n, 0, 18), draw(d.decrement, 1, 4), draw(d.base, 0, 4)];
  if (topic === "power") rest = [draw(d.a, 2, 9), draw(d.b, 0, 4)];
  if (topic === "print") rest = [draw(d.n, 2, 8), d.before ? 0 : 0.9];
  if (topic === "recurrence") rest = [draw(d.n, 0, 7)];
  if (["fibonacci", "fibonacci-calls"].includes(topic))
    rest = [draw(d.n, 0, 10)];
  if (topic === "permutations") rest = [draw(d.size, 2, 5)];
  if (topic === "recursive-search") {
    const values =
      d.values ?? Array.from({ length: d.size }, (_, i) => d.start + i * d.gap);
    const start = values[0],
      gap = values[1] - start,
      index = values.indexOf(d.key);
    rest = [
      draw(values.length, 5, 10),
      draw(start, 1, 20),
      draw(gap, 2, 8),
      index >= 0 ? 0 : 0.9,
      draw(
        index >= 0 ? index : d.key < start ? 0 : 1,
        0,
        index >= 0 ? values.length - 1 : 1,
      ),
    ];
  }
  if (["base-case", "recursive-step"].includes(topic))
    rest = [draw(d.decrement, 1, 5), draw(d.n, 3, 20)];
  if (["array-sum", "evens"].includes(topic)) {
    const end = d.high ?? d.values.length - 1;
    const start = Math.min(d.low, end);
    rest = [
      draw(d.values.length, 3, 7),
      ...d.values.map((v) => draw(v, 0, topic === "evens" ? 19 : 9)),
      draw(start, 0, d.values.length - 1),
    ];
    if (topic === "evens") rest.push(draw(end, start, d.values.length - 1));
    rest.push(d.low > end ? 0 : 0.9);
  }
  return generateRecursion(tape(head, ...rest), 3);
}
export function bigOCase(kind, parameter = 3) {
  const kinds = [
    "constant",
    "linear",
    "square",
    "log",
    "nlog",
    "triangle",
    "sequential",
  ];
  return generateBigO(
    tape(
      0.9,
      draw(kinds.indexOf(kind), 0, 12),
      draw(kind === "linear" ? parameter : 2, 2, 5),
      draw(kind === "constant" ? parameter : 3, 3, 20),
    ),
    3,
  );
}
export function baseCase(from, to, value) {
  const bases = [2, 8, 10, 16];
  return generateBases(
    tape(
      draw(bases.indexOf(from), 0, 3),
      draw(bases.filter((b) => b !== from).indexOf(to), 0, 2),
      draw(value, 0, 4095),
    ),
    3,
  );
}
export function linkCase(kind, data = {}) {
  const values = data.values ?? [1, 12, 23, 34, 45];
  const kinds = ["insert", "mutation", "pointer-order", "free"];
  const rest = [
    draw(kinds.indexOf(kind), 0, 3),
    draw(values.length, 3, 5),
    ...values.map((v, i) => draw(v - i * 10, 1, 8)),
    draw(data.x ?? 51, 51, 89),
  ];
  if (kind === "insert") rest.push(draw(data.p, 2, values.length + 3));
  if (kind === "mutation")
    rest.push(
      draw([3, 5, 7].indexOf(data.offset), 0, 2),
      draw(data.parity, 0, 1),
    );
  if (kind === "pointer-order")
    rest.push(draw(data.index ?? 0, 0, values.length - 2));
  return generateLinks(tape(...rest), 3);
}
export function memoryCase(kind, data = {}) {
  const kinds = [
    "calloc",
    "bytes",
    "string",
    "realloc",
    "free-order",
    "resize",
    "array-length",
    "zero-read",
    "alias-write",
    "pointer-offset",
    "shrink",
    "row-allocations",
    "malloc-write",
  ];
  const rest = [
    draw(kinds.indexOf(kind), 0, kinds.length - 1),
    draw(data.count ?? 12, 12, 240),
  ];
  if (kind === "bytes")
    rest.push(
      draw(["int", "double", "Book", "float"].indexOf(data.type), 0, 3),
    );
  if (kind === "string") rest.push(draw(data.length, 2, 96));
  if (kind === "realloc") rest.push(draw(data.factor ?? 2, 2, 4));
  if (kind === "free-order")
    rest.push(
      draw(data.authors ?? 1, 1, 12),
      draw(data.titleLength ?? 5, 5, 45),
    );
  if (kind === "resize") {
    rest.push(
      draw(data.values.length, 3, 5),
      ...data.values.map((v) => draw(v, 1, 40)),
      draw(data.factor ?? 2, 2, 4),
      draw(data.index ?? 0, 0, data.values.length - 1),
    );
  }
  if (kind === "zero-read")
    rest.push(draw(data.index ?? 0, 0, (data.count ?? 12) - 1));
  if (kind === "alias-write")
    rest.push(
      draw(data.value, 1, 40),
      draw(data.delta, 1, 9),
      draw(data.index, 0, 2),
    );
  if (kind === "pointer-offset")
    rest.push(
      draw(data.start, 1, 20),
      draw(data.offset, 1, 3),
      draw(data.index, 0, 4 - data.offset),
    );
  if (kind === "shrink")
    rest.push(
      draw(data.start, 1, 20),
      draw(data.nextCount, 1, 5),
      draw(data.index, 0, data.nextCount - 1),
    );
  if (kind === "row-allocations")
    rest.push(draw(data.rows, 1, 8), draw(data.columns, 2, 10));
  if (kind === "malloc-write") {
    rest.push(draw(data.variant ?? 0, 0, 5));
    if (data.variant === 3) rest.push(draw(data.length ?? 2, 2, 96));
  }
  return generateMemory(tape(...rest), 3);
}
export function searchCase(n, start, gap, target, kind = "result", round = 0) {
  const values = Array.from({ length: n }, (_, i) => start + i * gap);
  const index = values.indexOf(target);
  const rest = [
    draw(n, 5, 10),
    draw(start, 1, 20),
    draw(gap, 2, 8),
    index >= 0 ? 0 : 0.9,
  ];
  if (index >= 0) rest.push(draw(index, 0, n - 1));
  else {
    // The generator evaluates the +1 candidate before selecting between three candidates.
    const candidate = values.indexOf(target - 1);
    rest.push(
      draw(Math.max(0, candidate), 0, n - 1),
      draw(
        target === start - 1 ? 0 : target === values.at(-1) + 1 ? 1 : 2,
        0,
        2,
      ),
    );
  }
  rest.push(
    draw(
      [
        "mid",
        "bounds",
        "result",
        "comparisons",
        "probe-value",
        "direction",
        "next-mid",
        "remaining",
        "worst-checks",
      ].indexOf(kind),
      0,
      8,
    ),
    round,
  );
  return generateSearch(tape(...rest), 3);
}
