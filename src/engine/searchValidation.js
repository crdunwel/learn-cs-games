// Independent, deterministic checks run before a practice question is shown or printed.
// This module deliberately imports neither generators nor their solution helpers.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const need = (condition, message) => {
  if (!condition) throw new Error(`Invalid practice question: ${message}`);
};
const integer = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;
// Token boundaries and string contents matter: `re turn` must not become `return`.
// Comments are trivia; placeholders are intentionally comments in fill-in questions.
const cTokens = (code) =>
  (
    code.match(
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_]\w*|\d+|\+\+|--|->|<=|>=|==|!=|\+=|-=|\*=|\/=|&&|\|\||[^\s]/g,
    ) || []
  ).filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
const canonical = (code) => JSON.stringify(cTokens(code));
const codeIs = (q, expected) =>
  need(
    canonical(q.code) === canonical(expected),
    "displayed C does not match its model",
  );
const answerIs = (q, value, at = 0) =>
  need(
    q.steps[at].answer === String(value),
    "answer disagrees with independent model",
  );
// Recursive interval partitioning: independent of the iterative production trace.
export function searchByPartition(
  values,
  target,
  low = 0,
  high = values.length - 1,
) {
  if (low > high) return [];
  const mid = Math.floor((low + high) / 2);
  const round = { low, high, mid, value: values[mid] };
  if (values[mid] === target) return [round];
  return [
    round,
    ...searchByPartition(
      values,
      target,
      target > values[mid] ? mid + 1 : low,
      target < values[mid] ? mid - 1 : high,
    ),
  ];
}
export function validateSearchQuestion(q) {
  const m = q.meta;
  need(
    integer(m.array.length, 5, 10) &&
      m.array.every(
        (v, i) => Number.isInteger(v) && (!i || v > m.array[i - 1]),
      ),
    "search requires sorted distinct integers",
  );
  need(
    same(q.visual.items, m.array.map(String)) &&
      q.visual.label.includes(`searchKey = ${m.target}`),
    "displayed search inputs",
  );
  const rounds = searchByPartition(m.array, m.target);
  need(
    rounds.some((r) =>
      ["low", "high", "mid", "value"].every((key) => r[key] === m[key]),
    ),
    "displayed search round was never reached",
  );
  need(integer(m.array[0], 1, 20), "search first value");
  const gap = m.array[1] - m.array[0];
  need(
    integer(gap, 2, 8) &&
      m.array.every((value, i) => value === m.array[0] + i * gap),
    "generated search array domain",
  );
  need(
    m.array.includes(m.target) ||
      m.target === m.array[0] - 1 ||
      m.target === m.array.at(-1) + 1 ||
      m.array.some((value) => m.target === value + 1),
    "search target domain",
  );
  let expected;
  if (m.kind === "mid") {
    expected = Math.floor((m.low + m.high) / 2);
    codeIs(
      q,
      `int low = ${m.low}, high = ${m.high}; int mid = low + (high - low) / 2;`,
    );
  } else if (m.kind === "bounds") {
    need(m.target !== m.value, "matching key must return, not update bounds");
    need(q.code.includes(`// a[mid] = ${m.value}`), "displayed midpoint value");
    expected =
      m.target < m.value ? `high = ${m.mid - 1}` : `low = ${m.mid + 1}`;
    codeIs(q, `int low = ${m.low}, high = ${m.high}; int mid = ${m.mid};`);
  } else if (m.kind === "probe-value") {
    expected = m.array[m.mid];
    codeIs(
      q,
      `int low = ${m.low}, high = ${m.high}; int mid = low + (high - low) / 2; int probe = a[mid];`,
    );
  } else if (["direction", "next-mid", "remaining"].includes(m.kind)) {
    need(m.target !== m.value, "matching key must return");
    need(q.code.includes(`// a[mid] = ${m.value}`), "displayed midpoint value");
    const possible = Array.from(
      { length: m.high - m.low + 1 },
      (_, i) => m.low + i,
    ).filter((i) => (m.target < m.value ? i < m.mid : i > m.mid));
    expected =
      m.kind === "direction"
        ? m.target < m.value
          ? "Left half"
          : "Right half"
        : m.kind === "remaining"
          ? possible.length
          : possible.length
            ? possible[Math.floor((possible.length - 1) / 2)]
            : -1;
    codeIs(
      q,
      `int low = ${m.low}, high = ${m.high}; int mid = ${m.mid}; if (${m.target} < a[mid]) high = mid - 1; else low = mid + 1;`,
    );
  } else {
    need(
      ["result", "comparisons", "worst-checks"].includes(m.kind),
      "unknown search question",
    );
    expected = m.kind === "result" ? m.array.indexOf(m.target) : rounds.length;
    if (m.kind === "worst-checks") {
      // Enumerate every possible found key and every gap/boundary absent key.
      const candidates = [
        m.array[0] - 1,
        m.array.at(-1) + 1,
        ...m.array,
        ...m.array.slice(0, -1).map((value) => value + 1),
      ];
      expected = Math.max(
        ...candidates.map((key) => searchByPartition(m.array, key).length),
      );
    }
    codeIs(
      q,
      `int low = 0, high = n - 1; while (low <= high) { int mid = low + (high - low) / 2; if (a[mid] == ${m.target}) return mid; if (${m.target} < a[mid]) high = mid - 1; else low = mid + 1; } return -1;`,
    );
  }
  const prompts = {
    mid: "What is the value of mid?",
    bounds: `Search for ${m.target}: which update is correct?`,
    result: `What index does the search for ${m.target} return?`,
    comparisons: `How many middle values are checked for ${m.target}?`,
    "probe-value": "What array value is checked at this midpoint?",
    direction: `The key is ${m.target}. Which half can still contain it?`,
    "next-mid":
      "After this comparison, what index will be checked next? Write -1 if no indices remain.",
    remaining: "After this comparison, how many candidate indices remain?",
    "worst-checks": `For this ${m.array.length}-item array, what is the maximum number of middle values binary search can check for any key?`,
  };
  need(q.steps[0].prompt === prompts[m.kind], "displayed search question");
  answerIs(q, expected);
  return q;
}
