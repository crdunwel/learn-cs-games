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

export const fibonacciCode = `int fib(int n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}`;
export const permutationCode = `// All letters are distinct. size excludes the terminating '\\0'.
void swap(char *a, char *b) {
  char saved = *a;
  *a = *b;
  *b = saved;
}
void permute(char word[], int pos, int size) {
  if (pos == size) {
    printf("%s\\n", word);
    return;
  }
  for (int i = pos; i < size; i++) {
    swap(&word[pos], &word[i]);
    permute(word, pos + 1, size);
    swap(&word[pos], &word[i]);
  }
}`;
export const recursiveSearchCode = `// Sorted, distinct integers; low/high are inclusive, indices start at 0.
int find(int a[], int low, int high, int key) {
  if (low > high) return -1;
  int mid = low + (high - low) / 2;
  if (a[mid] == key) return mid;
  if (key < a[mid]) return find(a, low, mid - 1, key);
  return find(a, mid + 1, high, key);
}`;

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
function fibonacciCalls(n) {
  if (n <= 1) return 1;
  return 1 + fibonacciCalls(n - 1) + fibonacciCalls(n - 2);
}
function recursiveSearch(values, key, low = 0, high = values.length - 1) {
  if (low > high) return { index: -1, rounds: [] };
  const mid = low + Math.floor((high - low) / 2);
  const round = { low, high, mid, value: values[mid] };
  if (values[mid] === key) return { index: mid, rounds: [round] };
  const child =
    key < values[mid]
      ? recursiveSearch(values, key, low, mid - 1)
      : recursiveSearch(values, key, mid + 1, high);
  return { index: child.index, rounds: [round, ...child.rounds] };
}

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
      ? ["sum", "print", "array-sum", "base-case", "fibonacci"]
      : [
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
  } else if (topic === "fibonacci" || topic === "fibonacci-calls") {
    const n = integer(rng, 0, level === 1 ? 6 : 10);
    const calls = topic === "fibonacci-calls";
    const answer = calls ? fibonacciCalls(n) : fibonacci(n);
    code = fibonacciCode;
    data = { n };
    visual = flow("Two smaller calls", [
      `fib(${n})`,
      calls ? "calls?" : "return?",
    ]);
    step = {
      kind: "input",
      prompt: calls
        ? `How many fib calls run for fib(${n}), including the first call and base cases?`
        : `What does fib(${n}) return?`,
      answer: String(answer),
      hint: calls
        ? "A base call counts as 1. A larger call counts itself and both child calls."
        : "fib(0) = 0 and fib(1) = 1. Add the two preceding values.",
      explanation: calls
        ? "Repeated calls still run separately: fib does not store previous answers. Count 1 for this call, then count both branches."
        : "The returned value is the sum of two smaller returns. The number of calls is a different question.",
      illustration:
        n <= 1
          ? [`${calls ? "Calls" : "Return"}: ${answer} (base case)`]
          : [
              calls
                ? `1 + ${fibonacciCalls(n - 1)} + ${fibonacciCalls(n - 2)} = ${answer} calls`
                : `fib(${n}) = ${fibonacci(n - 1)} + ${fibonacci(n - 2)} = ${answer}`,
            ],
    };
  } else if (topic === "permutations") {
    const size = integer(rng, 2, 5);
    const word = "ABCDE".slice(0, size);
    let answer = 1;
    for (let n = 2; n <= size; n++) answer *= n;
    code = permutationCode;
    data = { size, word };
    visual = flow("Fix one position per call", [word, "printed lines?"]);
    step = {
      kind: "input",
      prompt: `For word = "${word}" in a writable char array, how many lines does permute(word, 0, ${size}) print?`,
      answer: String(answer),
      hint: "All letters differ. There are size choices for position 0, one fewer for position 1, and so on.",
      explanation:
        "Each base call prints one complete permutation. Swapping back restores the word before trying the next choice; no permutation is lost or counted twice.",
      illustration: [
        `${Array.from({ length: size }, (_, i) => size - i).join(" × ")} = ${answer} printed lines`,
        "Swap → recurse → swap back",
      ],
    };
  } else if (topic === "recursive-search") {
    const size = integer(rng, 5, 10),
      start = integer(rng, 1, 20),
      gap = integer(rng, 2, 8);
    const values = Array.from({ length: size }, (_, i) => start + gap * i);
    const present = rng() < 0.65;
    const key = present
      ? pick(rng, values)
      : pick(rng, [start - 1, values.at(-1) + 1]);
    const trace = recursiveSearch(values, key);
    code = recursiveSearchCode;
    data = { values, key, low: 0, high: size - 1, trace: trace.rounds };
    visual = array(values);
    step = {
      kind: "input",
      prompt: `What does find(arr, 0, ${size - 1}, ${key}) return?`,
      answer: String(trace.index),
      hint: "Return an index, not the stored value. An empty inclusive range returns -1.",
      explanation:
        "Each recursive call keeps the half that can contain the key. The original call returns the child's result unchanged.",
      illustration: [
        trace.rounds.map((r) => `a[${r.mid}] = ${r.value}`).join(" → "),
        trace.index < 0
          ? "Empty range: return -1"
          : `Match: return index ${trace.index}`,
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
  const question = { type: "trace", topic, code, visual, data, steps: [step] };
  question.reviewSteps = recursionReview(question);
  return question;
}

function recursionReview(q) {
  const d = q.data,
    answer = q.steps[0].answer;
  const row = (title, detail, math) => ({ title, detail, math });
  if (["fibonacci", "fibonacci-calls"].includes(q.topic)) {
    const calls = q.topic === "fibonacci-calls",
      label = calls ? "C" : "fib";
    const values = calls ? [1, 1] : [0, 1];
    for (let n = 2; n <= d.n; n++)
      values[n] = (calls ? 1 : 0) + values[n - 1] + values[n - 2];
    const worked = [
      row(
        "Start at the base cases",
        calls
          ? "C(n) counts fib calls. Each base call counts 1."
          : "These return directly.",
        `${label}(0) = ${values[0]}; ${label}(1) = ${values[1]}`,
      ),
    ];
    for (let n = 2; n <= d.n; n += 2) {
      const indices = n + 1 <= d.n ? [n, n + 1] : [n];
      worked.push(
        row(
          `Build ${label}(${n})${indices.length === 2 ? ` and ${label}(${n + 1})` : ""}`,
          calls
            ? "Include this call and both child branches; repeated calls still count."
            : "Reuse the two preceding returns.",
          indices
            .map(
              (i) =>
                `${label}(${i}) = ${calls ? "1 + " : ""}${values[i - 1]} + ${values[i - 2]} = ${values[i]}`,
            )
            .join("; "),
        ),
      );
    }
    if (d.n <= 1)
      worked.push(
        row(
          "Answer this question",
          calls
            ? "Count this one base call."
            : "This argument is already a base case.",
          `${answer}${calls ? " calls" : ""}`,
        ),
      );
    return worked;
  }
  if (q.topic === "permutations")
    return [
      ...Array.from({ length: d.size }, (_, pos) =>
        row(
          `Choose position ${pos}`,
          "Fix this letter; recursively arrange the remaining letters.",
          `${d.size - pos} ${d.size - pos === 1 ? "choice" : "choices"}`,
        ),
      ),
      row(
        "Count the leaves",
        "Every complete word prints once. Undo the swap before the next branch.",
        `${Array.from({ length: d.size }, (_, i) => d.size - i).join(" × ")} = ${answer}`,
      ),
    ];
  if (q.topic === "recursive-search")
    return [
      ...d.trace.map((r, i) =>
        row(
          `Call ${i + 1}: indices ${r.low}…${r.high}`,
          d.key === r.value
            ? "The key matches; return this index."
            : d.key < r.value
              ? "The key is smaller; call the left half."
              : "The key is larger; call the right half.",
          `mid = ${r.low} + floor((${r.high} − ${r.low}) / 2) = ${r.mid}; a[${r.mid}] = ${r.value}`,
        ),
      ),
      row(
        "Return through the calls",
        Number(answer) < 0
          ? "The remaining range is empty; each waiting call returns -1."
          : "Every waiting call returns the same found index.",
        `return ${answer}`,
      ),
    ];
  if (q.topic === "sum") {
    const terms = [];
    for (let n = d.n; n > 0; n -= d.decrement) terms.push(n);
    return [
      row(
        "Follow smaller calls",
        `Subtract ${d.decrement} until n <= 0.`,
        [...terms, d.n - terms.length * d.decrement].join(" → "),
      ),
      row(
        "Stop at the base case",
        "The stopping call does not add its n.",
        `return ${d.base}`,
      ),
      row(
        "Add while returning",
        "Each positive call adds its own n exactly once.",
        `${[...terms, d.base].join(" + ")} = ${answer}`,
      ),
    ];
  }
  if (q.topic === "print")
    return [
      row(
        "Calls move down",
        "The call with 0 prints nothing.",
        `${d.n} → ${d.n - 1} → … → 0`,
      ),
      row(
        d.before ? "Print before calling" : "Print after returning",
        d.before
          ? "Larger values print immediately."
          : "The smallest waiting call prints first.",
        answer,
      ),
    ];
  if (["array-sum", "evens"].includes(q.topic)) {
    const visited = d.values.slice(d.low, d.high + 1);
    return [
      row(
        "Read the bounds",
        d.low > d.high
          ? "The range is empty; read no elements."
          : "Include both ends; skip earlier indices.",
        `indices ${d.low}…${d.high}`,
      ),
      row(
        "Combine one contribution per item",
        q.topic === "evens"
          ? "Even adds 1; odd adds 0."
          : "Add each visited value.",
        `${visited
          .map((n) => (q.topic === "evens" ? Number(n % 2 === 0) : n))
          .concat(0)
          .join(" + ")} = ${answer}`,
      ),
    ];
  }
  if (q.topic === "power")
    return [
      row(
        "Decrease the exponent",
        "a stays the same; b moves toward 0.",
        `b: ${d.b} → 0`,
      ),
      row(
        "Return 1 at b = 0",
        "Then each waiting call multiplies by a.",
        `${[...Array(d.b).fill(d.a), 1].join(" × ")} = ${answer}`,
      ),
    ];
  if (q.topic === "recurrence") {
    const values = [1, 1, 3];
    for (let n = 3; n <= d.n; n++)
      values[n] = 2 * values[n - 1] + values[n - 2] - 1;
    return [
      row(
        "Use the given base cases",
        "Do not recurse for n <= 2.",
        "f(0) = f(1) = 1; f(2) = 3",
      ),
      ...Array.from(
        { length: Math.min(4, Math.max(0, d.n - 2)) },
        (_, i) => Math.max(3, d.n - 3) + i,
      ).map((n) =>
        row(
          `Compute f(${n})`,
          "Double only the first preceding value.",
          `2 × ${values[n - 1]} + ${values[n - 2]} − 1 = ${values[n]}`,
        ),
      ),
      row(
        "Return the requested value",
        "Read the result for this argument.",
        `f(${d.n}) = ${answer}`,
      ),
    ];
  }
  return [
    row(
      "Move toward the base case",
      "Every non-base call subtracts a positive amount.",
      `n − ${d.decrement}`,
    ),
    row(
      "Stop at zero or below",
      "A decrement may skip over zero; <= catches both cases.",
      "n <= 0",
    ),
    row(
      "Fill the missing part",
      "Preserve the given recursive algorithm.",
      answer,
    ),
  ];
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
  {
    id: "fibonacci-branches",
    title: "Fibonacci has two branches",
    summary: "Returned values and call counts differ.",
    steps: [
      lessonStep(
        "fib(0) returns 0; fib(1) returns 1. Neither makes another call.",
        fibonacciCode,
        "fib(0) = 0; fib(1) = 1",
      ),
      lessonStep(
        "fib(2) waits for both smaller calls and adds their returns.",
        fibonacciCode,
        "fib(2) = 1 + 0 = 1",
      ),
      lessonStep(
        "Build values upward: fib(3) = 2, then fib(4) = 3.",
        fibonacciCode,
        "fib(4) = fib(3) + fib(2) = 2 + 1 = 3",
      ),
      lessonStep(
        "Counting calls instead: base calls count 1; every other call counts itself plus both branches.",
        fibonacciCode,
        "C(2) = 3; C(3) = 5; C(4) = 1 + 5 + 3 = 9 calls",
      ),
    ],
  },
  {
    id: "permutation-backtracking",
    title: "Permutations: choose, recurse, undo",
    summary: "Every leaf is one arrangement of distinct letters.",
    steps: [
      lessonStep(
        "For ABC, position 0 has three choices: A, B or C.",
        permutationCode,
        "3 first-letter choices",
        flow("First position", ["A__", "B__", "C__"]),
      ),
      lessonStep(
        "Fix A. Position 1 has two choices, and the last position has one.",
        permutationCode,
        "ABC and ACB: 2 × 1 leaves",
        flow("A branch", ["A__", "AB_ / AC_", "ABC / ACB"]),
      ),
      lessonStep(
        "Swap back after each child call so the next branch starts from the same word.",
        permutationCode,
        "3 × 2 × 1 = 6 printed permutations",
      ),
    ],
  },
  {
    id: "recursive-binary-search",
    title: "Binary search through smaller calls",
    summary: "The child result comes back unchanged.",
    steps: [
      lessonStep(
        "Search for 24 in [4, 8, 12, 16, 20, 24, 28]. mid is 3, containing 16.",
        recursiveSearchCode,
        "find(arr, 0, 6, 24): mid = 3",
        array([4, 8, 12, 16, 20, 24, 28]),
      ),
      lessonStep(
        "24 is larger than 16. Exclude index 3 and call indices 4 through 6.",
        recursiveSearchCode,
        "find(arr, 4, 6, 24): mid = 5",
      ),
      lessonStep(
        "a[5] matches. The child returns 5; the first call returns 5 too.",
        recursiveSearchCode,
        "Found index 5",
      ),
      lessonStep(
        "If low ever passes high, return -1 before reading the array.",
        recursiveSearchCode,
        "Empty range → -1",
      ),
    ],
  },
];
export const recursionTutorial = recursionLessons[0].steps;
