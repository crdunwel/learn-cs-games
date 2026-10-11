import { integer, pick, shuffle } from "../engine/random.js";

const flow = (label, items) => ({ kind: "flow", label, items });
const array = (values) => ({
  kind: "array",
  label: "Array · indices start at 0",
  items: values.map(String),
});
const lessonStep = (caption, code, result, visual) => ({
  type: "trace",
  caption,
  code,
  result,
  visual,
});
const seriesCode = (step, base) => `int total(int n) {
  if (n <= 0)
    return ${base};
  return n + total(n - ${step});
}`;
const printCode = (before) => `void printSeq(int n) {
  if (n == 0)
    return;
  ${before ? 'printf("%d ", n);' : "printSeq(n - 1);"}
  ${before ? "printSeq(n - 1);" : 'printf("%d ", n);'}
}`;
const sumCode = `int sumOfDigits(int arr[], int size, int index) {
  if (index == size)
    return 0;
  return arr[index] + sumOfDigits(arr, size, index + 1);
}`;
const evensCode = `int evens(int arr[], int lowInd, int highInd) {
  if (lowInd > highInd)
    return 0;
  return (arr[lowInd] % 2 == 0)
    + evens(arr, lowInd + 1, highInd);
}`;
const powerCode = `int power(int a, int b) {
  if (b == 0)
    return 1;
  return a * power(a, b - 1);
}`;
export const recurrenceCode = `int f(int n) {
  if (n <= 1)
    return 1;
  if (n == 2)
    return 3;
  return 2 * f(n - 1) + f(n - 2) - 1;
}`;

function recurrence(n) {
  if (n <= 1) return 1;
  if (n === 2) return 3;
  return 2 * recurrence(n - 1) + recurrence(n - 2) - 1;
}

// Each template has a bounded, direct solution; no student code is executed.
export function generateRecursion(rng, level = 1) {
  const topic = pick(
    rng,
    level === 1
      ? ["sum", "print", "array-sum", "base-case"]
      : [
          "sum",
          "print",
          "array-sum",
          "base-case",
          "evens",
          "power",
          "recurrence",
          "recursive-step",
        ],
  );
  let code, visual, data, step;
  if (topic === "sum") {
    const n = integer(rng, 0, level === 1 ? 10 : 18);
    const decrement = integer(rng, 1, level === 1 ? 2 : 4);
    const base = level === 1 ? 0 : integer(rng, 0, 4);
    const terms = [];
    for (let k = n; k > 0; k -= decrement) terms.push(k);
    const answer = terms.reduce((a, b) => a + b, base);
    code = seriesCode(decrement, base);
    visual = flow("Trace the call", [`total(${n})`, "?"]);
    data = { n, decrement, base };
    step = {
      kind: "input",
      prompt: `What does total(${n}) return?`,
      answer: String(answer),
      hint: "Follow the calls to the base case, then add as each call returns.",
      explanation:
        n > 0
          ? `Each call adds its own n, then waits for the smaller call. The base case contributes ${base}; it is not another positive n.`
          : `${n} already meets n <= 0, so the function returns ${base} immediately. The recursive line never runs.`,
      illustration: [
        `Calls: ${[...terms.slice(0, 4), ...(terms.length > 4 ? ["…"] : []), n - terms.length * decrement].join(" → ")}`,
        `${[...terms, base].join(" + ")} = ${answer}`,
      ],
    };
  } else if (topic === "print") {
    const n = integer(rng, 2, level === 1 ? 6 : 8);
    const before = rng() < 0.5;
    const ascending = Array.from({ length: n }, (_, i) => i + 1);
    const answer = (before ? [...ascending].reverse() : ascending).join(" ");
    code = printCode(before);
    visual = flow("Trace the call", [`printSeq(${n})`, "output?"]);
    data = { n, before };
    step = {
      kind: "choice",
      prompt: `What does printSeq(${n}) print?`,
      answer,
      options: shuffle(rng, [
        answer,
        (before ? ascending : [...ascending].reverse()).join(" "),
        `0 ${ascending.join(" ")}`,
        String(n),
      ]),
      hint: "Is printf before or after the recursive call? The base case prints nothing.",
      explanation: before
        ? "printf runs before the next call, so larger values print first. Reaching 0 stops without printing 0."
        : "printf waits for the smaller call to finish. The calls return from 1 upward, so smaller values print first.",
      illustration: [
        `Calls go down: ${n} → ${n - 1} → … → 0`,
        `Printed: ${answer}`,
      ],
    };
  } else if (topic === "array-sum" || topic === "evens") {
    const values = Array.from({ length: integer(rng, 3, 7) }, () =>
      integer(rng, 0, topic === "evens" ? 19 : 9),
    );
    const start = integer(rng, 0, values.length - 1);
    const end =
      topic === "array-sum"
        ? values.length - 1
        : integer(rng, start, values.length - 1);
    const empty = level === 3 && rng() < 0.15;
    const low = empty ? end + 1 : start;
    const visited = values.slice(low, end + 1);
    const matching = visited.filter((value) => value % 2 === 0);
    const answer =
      topic === "array-sum"
        ? visited.reduce((a, b) => a + b, 0)
        : matching.length;
    const call =
      topic === "array-sum"
        ? `sumOfDigits(arr, ${values.length}, ${low})`
        : `evens(arr, ${low}, ${end})`;
    code = topic === "array-sum" ? sumCode : evensCode;
    visual = array(values);
    data = { values, low, high: end };
    step = {
      kind: "input",
      prompt: `What does ${call} return?`,
      answer: String(answer),
      hint:
        topic === "array-sum"
          ? "Begin at index, not necessarily at 0. The base case contributes 0."
          : "Both endpoints are included. A true comparison in C contributes 1, false contributes 0.",
      explanation: empty
        ? "The range is already empty, so the base case returns 0. No array element is read."
        : topic === "array-sum"
          ? `Start at index ${low} and add through index ${end}. Earlier elements are never visited by this call.`
          : `Visit indices ${low} through ${end}, including both. Count even values, not their sum; zero is even too.`,
      illustration: empty
        ? [
            topic === "array-sum"
              ? `index == size (${low}): return 0`
              : `${low} > ${end}: return 0`,
          ]
        : [
            `Visited: ${visited.join(", ")}`,
            topic === "array-sum"
              ? `${visited.join(" + ")} + 0 = ${answer}`
              : `${matching.length ? matching.join(", ") : "No values"} ${matching.length === 1 ? "is" : "are"} even → count ${answer}`,
          ],
    };
  } else if (topic === "power") {
    const a = integer(rng, 2, 9),
      b = integer(rng, 0, 4);
    code = powerCode;
    data = { a, b };
    visual = flow("Trace the call", [`power(${a}, ${b})`, "?"]);
    step = {
      kind: "input",
      prompt: `What does power(${a}, ${b}) return?`,
      answer: String(a ** b),
      hint: "Only b decreases. The base case for b = 0 returns 1.",
      explanation:
        b === 0
          ? "The base case returns 1 immediately. Any nonzero number raised to the zeroth power equals 1."
          : `Each of the ${b} non-base calls multiplies by ${a}. The final 1 preserves the product; a base value of 0 would erase it.`,
      illustration: [`${[...Array(b).fill(a), 1].join(" × ")} = ${a ** b}`],
    };
  } else if (topic === "recurrence") {
    const n = integer(rng, 0, level === 2 ? 5 : 7);
    const answer = recurrence(n);
    code = recurrenceCode;
    data = { n };
    visual = flow("Trace the call", [`f(${n})`, "?"]);
    step = {
      kind: "input",
      prompt: `What does f(${n}) return?`,
      answer: String(answer),
      hint: "Use f(1) = 1 and f(2) = 3. Work upward, reusing each value.",
      explanation:
        n <= 2
          ? `The condition for n ${n <= 1 ? "<= 1" : "== 2"} matches, so return ${answer}. Do not apply the recurrence to a base case.`
          : "The 2 multiplies only f(n − 1). Add f(n − 2), then subtract 1 once for this call.",
      illustration:
        n <= 2
          ? [`f(${n}) = ${answer}`]
          : [
              `f(${n - 1}) = ${recurrence(n - 1)}; f(${n - 2}) = ${recurrence(n - 2)}`,
              `f(${n}) = 2 × ${recurrence(n - 1)} + ${recurrence(n - 2)} − 1 = ${answer}`,
            ],
    };
  } else {
    const decrement = integer(rng, 1, 5),
      n = integer(rng, 3, 20);
    const baseCase = topic === "base-case";
    const calls = [n];
    while (calls.at(-1) > 0) calls.push(calls.at(-1) - decrement);
    const callPreview = (
      calls.length <= 5 ? calls : [...calls.slice(0, 3), "…", calls.at(-1)]
    ).map(String);
    code = `int countCalls(int n) {
  if (${baseCase ? "/* fill here */" : "n <= 0"})
    return 0;
  return 1 + countCalls(${baseCase ? `n - ${decrement}` : "/* fill here */"});
}`;
    data = { n, decrement };
    visual = flow(`Start with n = ${n}`, callPreview);
    step = {
      kind: "choice",
      prompt: baseCase
        ? "Which base case stops every call with n ≥ 0?"
        : `Which argument subtracts ${decrement} for every positive n?`,
      answer: baseCase ? "n <= 0" : `n - ${decrement}`,
      options: shuffle(
        rng,
        baseCase
          ? ["n <= 0", "n > 0", `n == ${decrement}`, `n > ${decrement}`]
          : [`n - ${decrement}`, `n + ${decrement}`, "n", "0"],
      ),
      hint: "Every recursive call must get closer to a reachable base case.",
      explanation: baseCase
        ? `Subtracting ${decrement} can reach zero${decrement > 1 ? " or skip below it" : ""}. n <= 0 stops both; the base case also must handle an initial 0.`
        : `n − ${decrement} takes one step toward n <= 0. Passing n never progresses; passing 0 skips all the remaining steps.`,
      illustration: [callPreview.join(" → "), "Stop at the first n <= 0."],
    };
  }
  return { type: "trace", topic, code, visual, data, steps: [step] };
}

export const recursionLessons = [
  {
    id: "unwind",
    title: "Return on the way back",
    summary: "Calls go down. Answers come back up.",
    steps: [
      lessonStep(
        "total(3) waits for total(2), which waits for total(1).",
        seriesCode(1, 0),
        "3 + (2 + (1 + total(0)))",
        flow("Calls", ["3", "2", "1", "0"]),
      ),
      lessonStep(
        "At 0, the base case returns 0 without another call.",
        seriesCode(1, 0),
        "total(0) = 0",
      ),
      lessonStep(
        "Return upward: total(1) = 1; total(2) = 2 + 1.",
        seriesCode(1, 0),
        "total(2) = 3",
      ),
      lessonStep(
        "The first call finally adds its own 3.",
        seriesCode(1, 0),
        "total(3) = 3 + 3 = 6",
      ),
    ],
  },
  {
    id: "print-order",
    title: "Before or after the call?",
    summary: "The position of printf changes the order.",
    steps: [
      lessonStep(
        "printf is after the call, so printSeq(3) waits.",
        printCode(false),
        "Calls: 3 → 2 → 1 → 0",
      ),
      lessonStep(
        "At 0, return. Then 1 prints, followed by 2 and 3.",
        printCode(false),
        "Output: 1 2 3",
      ),
      lessonStep(
        "Move printf before the call: 3 prints immediately.",
        printCode(true),
        "Output begins: 3",
      ),
      lessonStep(
        "Each smaller call prints next; 0 still prints nothing.",
        printCode(true),
        "Output: 3 2 1",
      ),
    ],
  },
  {
    id: "array-recursion",
    title: "One array item at a time",
    summary: "Index boundaries decide what is visited.",
    steps: [
      lessonStep(
        "sumOfDigits(arr, 3, 0) begins at index 0.",
        sumCode,
        "1 + sumOfDigits(arr, 3, 1)",
        array([1, 2, 3]),
      ),
      lessonStep(
        "Advance the index; keep the same array and size.",
        sumCode,
        "1 + 2 + 3 + sumOfDigits(arr, 3, 3)",
        array([1, 2, 3]),
      ),
      lessonStep(
        "index == size ends the scan before reading arr[3].",
        sumCode,
        "1 + 2 + 3 + 0 = 6",
        array([1, 2, 3]),
      ),
      lessonStep(
        "Starting at index 1 would skip the first element.",
        sumCode,
        "sumOfDigits(arr, 3, 1) = 2 + 3 = 5",
        array([1, 2, 3]),
      ),
    ],
  },
  {
    id: "count-evens",
    title: "Count, don’t add",
    summary: "A true C comparison contributes 1.",
    steps: [
      lessonStep(
        "evens(arr, 1, 3) visits indices 1, 2 and 3.",
        evensCode,
        "Visit: 8, 6, 7",
        array([5, 8, 6, 7, 4]),
      ),
      lessonStep(
        "8 and 6 are even; 7 is not. Each true test adds 1.",
        evensCode,
        "1 + 1 + 0",
        array([5, 8, 6, 7, 4]),
      ),
      lessonStep(
        "After index 3, lowInd becomes 4. The base case returns 0.",
        evensCode,
        "evens(arr, 1, 3) = 1 + 1 + 0 + 0 = 2",
        array([5, 8, 6, 7, 4]),
      ),
    ],
  },
  {
    id: "exam-recurrence",
    title: "The exam’s f(5)",
    summary: "Build small answers before the large one.",
    steps: [
      lessonStep(
        "Start with the two base cases given in the code.",
        recurrenceCode,
        "f(1) = 1; f(2) = 3",
      ),
      lessonStep(
        "Substitute n = 3. Double f(2), not the whole sum.",
        recurrenceCode,
        "f(3) = 2 × 3 + 1 − 1 = 6",
      ),
      lessonStep(
        "Reuse f(3) and f(2) to compute f(4).",
        recurrenceCode,
        "f(4) = 2 × 6 + 3 − 1 = 14",
      ),
      lessonStep(
        "Now f(5) uses 14 and 6.",
        recurrenceCode,
        "f(5) = 2 × 14 + 6 − 1 = 33",
      ),
    ],
  },
];
export const recursionTutorial = recursionLessons[0].steps;
