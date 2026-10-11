import { integer, pick, shuffle } from "../engine/random.js";

export function traceSearch(array, target, low = 0, high = array.length - 1) {
  const rounds = [];
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    rounds.push({ low, high, mid, value: array[mid] });
    if (array[mid] === target) return { rounds, index: mid };
    if (target < array[mid]) high = mid - 1;
    else low = mid + 1;
  }
  return { rounds, index: -1 };
}
const visual = (array, label) => ({
  kind: "array",
  label,
  items: array.map(String),
});
const fullCode = (target) =>
  `// Array is sorted; indices start at 0.\nint low = 0, high = n - 1;\nwhile (low <= high) {\n  int mid = low + (high - low) / 2;\n  if (a[mid] == ${target}) return mid;\n  if (${target} < a[mid]) high = mid - 1;\n  else low = mid + 1;\n}\nreturn -1;`;

export function generateSearch(rng, level = 1) {
  const n = integer(rng, 5, 10),
    start = integer(rng, 1, 20),
    gap = integer(rng, 2, 8);
  const array = Array.from({ length: n }, (_, i) => start + i * gap);
  const present = rng() < 0.65;
  const target = present
    ? pick(rng, array)
    : pick(rng, [start - 1, array[n - 1] + 1, pick(rng, array) + 1]);
  const trace = traceSearch(array, target);
  let kind = pick(
    rng,
    level === 1
      ? ["mid", "bounds", "result", "probe-value", "direction"]
      : [
          "mid",
          "bounds",
          "result",
          "comparisons",
          "probe-value",
          "direction",
          "next-mid",
          "remaining",
          "worst-checks",
        ],
  );
  const unmatched = trace.rounds.filter((round) => round.value !== target);
  const needsMismatch = [
    "bounds",
    "direction",
    "next-mid",
    "remaining",
  ].includes(kind);
  if (needsMismatch && !unmatched.length) kind = "result";
  const round =
    needsMismatch && kind !== "result"
      ? pick(rng, unmatched)
      : pick(rng, trace.rounds);
  let step,
    code = fullCode(target);
  if (kind === "mid") {
    code = `int low = ${round.low}, high = ${round.high};\nint mid = low + (high - low) / 2;`;
    step = {
      kind: "input",
      prompt: "What is the value of mid?",
      answer: String(round.mid),
      hint: "Integer division drops the fractional part. mid is an index, not an array value.",
      explanation: `${round.low} + (${round.high} − ${round.low}) / 2 gives index ${round.mid} after integer division. The value stored there is ${round.value}, but this asks for its index.`,
      illustration: [
        `low = ${round.low}`,
        `mid = ${round.mid} → a[mid] = ${round.value}`,
        `high = ${round.high}`,
      ],
    };
  } else if (kind === "bounds") {
    const left = target < round.value;
    const answer = `${left ? "high" : "low"} = ${left ? round.mid - 1 : round.mid + 1}`;
    const alternatives = [
      `high = ${round.mid - 1}`,
      `high = ${round.mid + 1}`,
      `low = ${round.mid + 1}`,
      `low = ${round.mid - 1}`,
    ];
    code = `// Search for ${target}.\nint low = ${round.low}, high = ${round.high};\nint mid = ${round.mid}; // a[mid] = ${round.value}\n// Which bound changes next?`;
    step = {
      kind: "choice",
      prompt: `Search for ${target}: which update is correct?`,
      answer,
      options: shuffle(rng, [...new Set(alternatives)]),
      hint: "A smaller key is to the left; a larger key is to the right. Exclude mid after it fails to match.",
      explanation: `${target} is ${left ? "smaller" : "larger"} than ${round.value}, so discard mid and everything to its ${left ? "right" : "left"}. ${left ? "high" : "low"} moves to mid ${left ? "−" : "+"} 1; the other bound stays put.`,
      illustration: [
        `Compare: ${target} ${left ? "<" : ">"} ${round.value}`,
        `Update: ${answer}`,
        `Next range: ${left ? round.low : round.mid + 1}…${left ? round.mid - 1 : round.high}${(left ? round.mid - 1 < round.low : round.mid + 1 > round.high) ? " (empty)" : ""}`,
      ],
    };
  } else if (kind === "probe-value") {
    code = `int low = ${round.low}, high = ${round.high};
int mid = low + (high - low) / 2;
int probe = a[mid];`;
    step = {
      kind: "input",
      prompt: "What array value is checked at this midpoint?",
      answer: String(round.value),
      hint: "First find the index mid, then read a[mid]. This asks for the stored value.",
      explanation: `The midpoint is index ${round.mid}. The value at that index is ${round.value}; an index and a stored value are different.`,
      illustration: [`mid = ${round.mid}`, `a[${round.mid}] = ${round.value}`],
    };
  } else if (["direction", "next-mid", "remaining"].includes(kind)) {
    const left = target < round.value;
    const nextLow = left ? round.low : round.mid + 1;
    const nextHigh = left ? round.mid - 1 : round.high;
    const remaining = Math.max(0, nextHigh - nextLow + 1);
    const nextMid = remaining
      ? nextLow + Math.floor((nextHigh - nextLow) / 2)
      : -1;
    code = `// Search for ${target}.
int low = ${round.low}, high = ${round.high};
int mid = ${round.mid}; // a[mid] = ${round.value}
if (${target} < a[mid]) high = mid - 1;
else low = mid + 1;`;
    step = {
      kind: kind === "direction" ? "choice" : "input",
      prompt:
        kind === "direction"
          ? `The key is ${target}. Which half can still contain it?`
          : kind === "next-mid"
            ? "After this comparison, what index will be checked next? Write -1 if no indices remain."
            : "After this comparison, how many candidate indices remain?",
      answer:
        kind === "direction"
          ? left
            ? "Left half"
            : "Right half"
          : String(kind === "next-mid" ? nextMid : remaining),
      ...(kind === "direction"
        ? { options: shuffle(rng, ["Left half", "Right half"]) }
        : {}),
      hint: "Compare the key with a[mid]. Exclude mid, then use the new inclusive bounds.",
      explanation: `${target} is ${left ? "smaller" : "larger"} than ${round.value}, so ${left ? "high" : "low"} becomes ${left ? round.mid - 1 : round.mid + 1}. ${remaining ? `Indices ${nextLow} through ${nextHigh} remain.` : "The inclusive range is now empty."}`,
      illustration: [
        `${target} ${left ? "<" : ">"} ${round.value}`,
        `low = ${nextLow}; high = ${nextHigh}`,
        kind === "next-mid"
          ? `Next mid: ${nextMid}`
          : `${remaining} candidate indices`,
      ],
    };
  } else if (kind === "worst-checks") {
    let size = n,
      checks = 0;
    while (size > 0) {
      checks++;
      size = Math.floor(size / 2);
    }
    step = {
      kind: "input",
      prompt: `For this ${n}-item array, what is the maximum number of middle values binary search can check for any key?`,
      answer: String(checks),
      hint: "Count the largest remaining half until no candidate is left. Each nonempty range makes one check.",
      explanation:
        "This asks for the worst key, rather than the displayed key. A mismatch discards mid and at least half of the other candidates.",
      illustration: [
        `Largest halves: ${n} → ${Math.floor(n / 2)} → … → 0`,
        `${checks} middle values at most`,
      ],
    };
  } else {
    const path = trace.rounds.map((r) => r.value).join(" → ");
    const result =
      trace.index < 0
        ? `The range becomes empty, so the key is absent and the function returns -1.`
        : `The key matches a[${trace.index}], so the function returns index ${trace.index}, not the value ${target}.`;
    step =
      kind === "result"
        ? {
            kind: "input",
            prompt: `What index does the search for ${target} return?`,
            answer: String(trace.index),
            hint: "Trace the middle value in each remaining range. If low passes high, return -1.",
            explanation: `The middle values checked are ${path}. ${result}`,
            illustration: trace.rounds
              .map((r) => `index ${r.mid}: ${r.value}`)
              .slice(-4),
          }
        : {
            kind: "input",
            prompt: `How many middle values are checked for ${target}?`,
            answer: String(trace.rounds.length),
            hint: "Count loop iterations, including a successful match. An empty range makes no further check.",
            explanation: `The search checks ${path}: ${trace.rounds.length} middle values in total. Count each loop iteration once, rather than counting the individual if comparisons.`,
            illustration: [
              `Checked: ${path}`,
              trace.index < 0
                ? "Empty range → stop"
                : `Match at index ${trace.index} → stop`,
            ],
          };
  }
  return {
    type: "trace",
    code,
    visual: visual(
      array,
      `Sorted array · searchKey = ${target} · indices start at 0`,
    ),
    meta: { kind, array, target, ...round },
    reviewSteps: searchReview(kind, array, target, trace, round),
    steps: [step],
  };
}
function searchReview(kind, values, target, trace, selected) {
  const row = (title, detail, math) => ({ title, detail, math });
  const midpoint = (r) =>
    `${r.low} + floor((${r.high} − ${r.low}) / 2) = ${r.mid}`;
  if (kind === "worst-checks") {
    const steps = [];
    let size = values.length;
    while (size > 0) {
      const next = Math.floor(size / 2);
      steps.push(
        row(
          `Check ${steps.length + 1}`,
          "Keep the largest possible half after excluding mid.",
          `${size} candidates → ${next}`,
        ),
      );
      size = next;
    }
    return [
      ...steps,
      row(
        "Maximum checks",
        "No candidate means no further array read.",
        `${steps.length} checks`,
      ),
    ];
  }
  if (["mid", "probe-value"].includes(kind))
    return [
      row(
        "Find the midpoint index",
        "C integer division drops the fraction.",
        midpoint(selected),
      ),
      row(
        "Read the value at that index",
        "Use the index to access the array.",
        `a[${selected.mid}] = ${selected.value}`,
      ),
      row(
        "Answer what was asked",
        kind === "mid"
          ? "This question asks for the index."
          : "This question asks for the stored value.",
        kind === "mid" ? String(selected.mid) : String(selected.value),
      ),
    ];
  if (["bounds", "direction", "next-mid", "remaining"].includes(kind)) {
    const left = target < selected.value,
      low = left ? selected.low : selected.mid + 1,
      high = left ? selected.mid - 1 : selected.high;
    const count = Math.max(0, high - low + 1);
    return [
      row(
        "Read the middle value",
        "Compare the key with the value, not with mid.",
        `a[${selected.mid}] = ${selected.value}`,
      ),
      row(
        "Choose the possible half",
        left
          ? "A smaller key can only be to the left."
          : "A larger key can only be to the right.",
        `${target} ${left ? "<" : ">"} ${selected.value}`,
      ),
      row(
        "Exclude mid and update one bound",
        "The other bound stays unchanged.",
        `${left ? "high" : "low"} = ${selected.mid} ${left ? "−" : "+"} 1 = ${left ? high : low}; range ${low}…${high}`,
      ),
      row(
        count
          ? "Use the remaining inclusive range"
          : "Stop: the range is empty",
        count
          ? "Count both endpoints; use the new bounds for the next midpoint."
          : "low > high, so there is no next midpoint.",
        count
          ? `${high} − ${low} + 1 = ${count} candidates; next mid = ${low} + floor((${high} − ${low}) / 2) = ${low + Math.floor((high - low) / 2)}`
          : "0 candidates; next index = -1",
      ),
    ];
  }
  return [
    ...trace.rounds.map((r, i) => {
      const found = target === r.value,
        left = target < r.value;
      return row(
        `Check ${i + 1}: indices ${r.low}…${r.high}`,
        found
          ? "The key matches: stop."
          : left
            ? `Key ${target} is smaller; keep indices ${r.low}…${r.mid - 1}.`
            : `Key ${target} is larger; keep indices ${r.mid + 1}…${r.high}.`,
        `mid = ${midpoint(r)}; a[${r.mid}] = ${r.value}`,
      );
    }),
    row(
      "Search result",
      trace.index < 0
        ? "The final range is empty; return -1."
        : "Return the matching index, not the key.",
      kind === "comparisons"
        ? `${trace.rounds.length} checks; return ${trace.index}`
        : `return ${trace.index}`,
    ),
  ];
}

const lessonStep = (caption, array, code, result) => ({
  type: "trace",
  caption,
  code,
  result,
  visual: visual(array, "Sorted array · indices start at 0"),
});
const sample = [4, 8, 12, 16, 20, 24, 28];
export const searchLessons = [
  {
    id: "search-left",
    title: "Keep the left half",
    summary: "Search for 8 in a sorted array.",
    steps: [
      lessonStep(
        "Start with indices 0 through 6. The middle index is 3.",
        sample,
        "mid = 0 + (6 - 0) / 2; // 3",
        "a[3] = 16",
      ),
      lessonStep(
        "8 is smaller than 16. The match cannot be at mid or to its right.",
        sample,
        "high = mid - 1; // 2",
        "Keep indices 0…2",
      ),
      lessonStep(
        "The new mid is 1, where the value is 8. Return index 1.",
        sample,
        "mid = 0 + (2 - 0) / 2; // 1\nreturn mid;",
        "Found: index 1, after two checks",
      ),
    ],
  },
  {
    id: "search-right",
    title: "Keep the right half",
    summary: "Search for 24; change low instead of high.",
    steps: [
      lessonStep(
        "The initial middle value is 16 at index 3.",
        sample,
        "low = 0; high = 6; mid = 3;",
        "Compare 24 with 16",
      ),
      lessonStep(
        "24 is larger. Discard indices 0 through 3.",
        sample,
        "low = mid + 1; // 4",
        "Keep indices 4…6",
      ),
      lessonStep(
        "The new middle index is 5, containing 24.",
        sample,
        "mid = 4 + (6 - 4) / 2; // 5",
        "Return 5; high stayed at 6",
      ),
    ],
  },
  {
    id: "absent-key",
    title: "Know when to stop",
    summary: "A key can fall between two stored values.",
    steps: [
      lessonStep(
        "Search for 10. First compare with 16, then with 8.",
        sample,
        "// 10 < 16: high = 2\n// 10 > 8:  low = 2",
        "One candidate remains: index 2",
      ),
      lessonStep(
        "At index 2, 12 is too large. Move high to 1.",
        sample,
        "high = mid - 1; // 1",
        "low = 2; high = 1",
      ),
      lessonStep(
        "low is now greater than high: there is no candidate left.",
        sample,
        "while (low <= high) { /* ... */ }\nreturn -1;",
        "Absent; three middle values checked",
      ),
    ],
  },
];
export const searchTutorial = searchLessons[0].steps;
