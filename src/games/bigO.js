import { integer, pick } from "../engine/random.js";
export const complexities = [
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n²)",
  "O(n³)",
  "O(mn)",
  "O(2ⁿ)",
];

const powers = ["1", "n", "n²", "n³"];
const superscripts = ["⁰", "¹", "²", "³"];
const analysis = (title, detail, math) => ({ title, detail, math });

export function generateBigO(rng, level) {
  const scale = level > 1 && rng() < 0.4;
  // Keep the original seven families first: the source contracts stay stable.
  const kind = pick(
    rng,
    level === 1
      ? ["constant", "linear", "square"]
      : [
          "constant",
          "linear",
          "square",
          "log",
          "nlog",
          "triangle",
          "sequential",
          "cube",
          "binary-search",
          "recursive-binary-search",
          "linear-search",
          "independent-inputs",
          "sequential-log-square",
        ],
  );
  const stride = integer(rng, 2, 5);
  const fixed = integer(rng, 3, 20);
  if (scale) {
    const power = pick(rng, [0, 1, 2, 3]);
    const factor = integer(rng, 2, 4);
    const initialSize = pick(rng, [10, 20, 50, 100, 200]);
    const mode = rng() < 0.5 ? "work" : "time";
    const timeMs = mode === "time" ? pick(rng, [2, 5, 10, 20, 40, 80]) : null;
    const newSize = initialSize * factor;
    const oldWork = initialSize ** power;
    const newWork = newSize ** power;
    const ratio = factor ** power;
    const reviewSteps = [
      analysis(
        "Original input",
        `Use the exact model W(n) = ${powers[power]}.`,
        `W(${initialSize}) = ${initialSize}${superscripts[power]} = ${oldWork}`,
      ),
      analysis(
        "Larger input",
        `The input contains ${factor} times as many items.`,
        `W(${newSize}) = ${newSize}${superscripts[power]} = ${newWork}`,
      ),
      analysis(
        "Compare the work",
        `Divide the larger amount of work by the original amount.`,
        `${newWork} ÷ ${oldWork} = ${ratio}×`,
      ),
    ];
    if (mode === "time")
      reviewSteps.push(
        analysis(
          "Convert work into time",
          "On the same machine, this exact model makes time grow by the same multiplier.",
          `${timeMs} ms × ${ratio} = ${timeMs * ratio} ms`,
        ),
      );
    const options = [...new Set([1, factor, factor ** 2, factor ** 3])].map(
      (x) => (mode === "time" ? `${timeMs * x} ms` : `${x}×`),
    );
    const answer = mode === "time" ? `${timeMs * ratio} ms` : `${ratio}×`;
    return {
      type: "bigO",
      code: null,
      scale: { power, factor, initialSize, mode, timeMs, oldWork, newWork },
      reviewSteps,
      steps: [
        {
          kind: "choice",
          prompt:
            mode === "time"
              ? `At ${initialSize} items, the algorithm takes ${timeMs} ms. How long will ${newSize} items take?`
              : `Input grows from ${initialSize} items to ${newSize} items. How many times as much work is required?`,
          answer,
          options,
          hint: "Use the exact model shown. Calculate the work for each input, then divide larger work by original work.",
          explanation:
            mode === "time"
              ? `${newWork} ÷ ${oldWork} = ${ratio}. Multiply the original ${timeMs} ms by ${ratio}: ${timeMs * ratio} ms.`
              : `${initialSize} → ${newSize} items multiplies the input by ${factor}. Work grows by ${factor}${superscripts[power]} = ${ratio}, so ${ratio}× as much work is needed.`,
          reviewSteps,
        },
      ],
    };
  }
  const templates = {
    constant: {
      code: `for (int i = 0; i < ${fixed}; i++) {\n  work();\n}`,
      answer: "O(1)",
      explanation: `The loop makes ${fixed} calls regardless of n. A fixed call count is O(1).`,
      reviewSteps: [
        analysis(
          "Count the calls",
          "The loop limit is fixed, not n.",
          `${fixed} calls for every n`,
        ),
        analysis(
          "Name the growth",
          "Changing the input does not change this count.",
          "W(n) = constant → O(1)",
        ),
      ],
    },
    linear: {
      code: `for (int i = 0; i < n; i += ${stride}) {\n  work();\n}`,
      answer: "O(n)",
      explanation: `There are ceil(n/${stride}) calls. Dividing n by a fixed ${stride} keeps growth linear.`,
      reviewSteps: [
        analysis(
          "Follow the index",
          `Each pass increases i by ${stride}.`,
          `0, ${stride}, ${2 * stride}, … < n`,
        ),
        analysis(
          "Count and simplify",
          "The fixed stride reduces the count, not the growth class.",
          `ceil(n/${stride}) → O(n)`,
        ),
      ],
    },
    square: {
      code: "for (int i = 0; i < n; i++) {\n  for (int j = 0; j < n; j++) {\n    work();\n  }\n}",
      answer: "O(n²)",
      explanation:
        "For every outer turn, the inner loop starts over: n × n = n² calls.",
      reviewSteps: [
        analysis(
          "Outer loop",
          "The outer index visits n values.",
          "n outer turns",
        ),
        analysis(
          "Inner loop",
          "Each outer turn runs the entire inner loop.",
          "n calls per outer turn",
        ),
        analysis(
          "Multiply",
          "Nested loops multiply; this is polynomial, not exponential.",
          "n × n = n² → O(n²)",
        ),
      ],
    },
    log: {
      code: "for (int i = n; i > 1; i /= 2) {\n  work();\n}",
      answer: "O(log n)",
      explanation:
        "Each pass halves i. At n = 16: 16, 8, 4, 2, then stop; four calls.",
      reviewSteps: [
        analysis(
          "Follow the halving",
          "Integer division halves the remaining value.",
          "16 → 8 → 4 → 2 → stop at 1",
        ),
        analysis(
          "Count the calls",
          "Each doubling adds only one pass.",
          "floor(log₂ n) → O(log n)",
        ),
      ],
    },
    nlog: {
      code: "for (int i = 0; i < n; i++) {\n  for (int j = n; j > 1; j /= 2) {\n    work();\n  }\n}",
      answer: "O(n log n)",
      explanation:
        "The outer loop runs n times; each turn runs a halving loop. Multiply n by log₂ n.",
      reviewSteps: [
        analysis("Outer loop", "The outer loop runs n times.", "n outer turns"),
        analysis(
          "Inner loop",
          "j halves until it reaches 1.",
          "floor(log₂ n) calls per turn",
        ),
        analysis(
          "Multiply",
          "The inner loop starts over on every outer turn.",
          "n × floor(log₂ n) → O(n log n)",
        ),
      ],
    },
    triangle: {
      code: "for (int i = 0; i < n; i++) {\n  for (int j = 0; j < i; j++) {\n    work();\n  }\n}",
      answer: "O(n²)",
      explanation:
        "The inner counts are 0, 1, 2, …, n − 1. Their sum is n(n − 1)/2, whose leading term is n².",
      reviewSteps: [
        analysis(
          "List the inner counts",
          "The inner loop limit is i, so its length increases.",
          "0 + 1 + 2 + … + (n − 1)",
        ),
        analysis(
          "Add them",
          "This arithmetic series grows quadratically.",
          "n(n − 1)/2 = (n² − n)/2 → O(n²)",
        ),
      ],
    },
    sequential: {
      code: "for (int i = 0; i < n; i++) work();\nfor (int j = 0; j < n; j++) work();",
      answer: "O(n)",
      explanation:
        "The loops run one after the other. Add n + n = 2n, then drop the fixed factor 2.",
      reviewSteps: [
        analysis(
          "First loop",
          "The first loop finishes before the next starts.",
          "n calls",
        ),
        analysis(
          "Second loop",
          "The second loop adds another n calls.",
          "n + n = 2n → O(n)",
        ),
      ],
    },
    cube: {
      code: "for (int i = 0; i < n; i++) {\n  for (int j = 0; j < n; j++) {\n    for (int k = 0; k < n; k++) {\n      work();\n    }\n  }\n}",
      answer: "O(n³)",
      explanation:
        "Three fully nested loops each run n times: n × n × n = n³ calls.",
      reviewSteps: [
        analysis("Outside", "The outer loop runs n times.", "n turns"),
        analysis(
          "Middle",
          "For every outer turn, j runs n times.",
          "n × n turns",
        ),
        analysis(
          "Inside",
          "For each (i, j) pair, k runs n times.",
          "n × n × n = n³ → O(n³)",
        ),
      ],
    },
    "binary-search": {
      code: "int binarySearch(const int a[], int n, int key) {\n  int low = 0, high = n - 1;\n  while (low <= high) {\n    int mid = low + (high - low) / 2;\n    work();\n    if (a[mid] == key) return mid;\n    if (a[mid] < key) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}",
      answer: "O(log n)",
      explanation:
        "Each comparison keeps at most half the sorted array. Only one half is searched next, so the worst case is logarithmic.",
      reviewSteps: [
        analysis(
          "Inspect the middle",
          "A comparison chooses which half can contain key.",
          "n candidates → at most floor(n/2)",
        ),
        analysis(
          "Keep halving",
          "The loop follows just one half each time.",
          "16 → 8 → 4 → 2 → 1 candidates",
        ),
        analysis(
          "Count comparisons",
          "For n = 16, at most five comparisons are needed.",
          "floor(log₂ n) + 1 → O(log n)",
        ),
      ],
    },
    "recursive-binary-search": {
      code: "int binarySearch(const int a[], int low, int high, int key) {\n  if (low > high) return -1;\n  int mid = low + (high - low) / 2;\n  work();\n  if (a[mid] == key) return mid;\n  if (a[mid] < key) return binarySearch(a, mid + 1, high, key);\n  return binarySearch(a, low, mid - 1, key);\n}",
      answer: "O(log n)",
      explanation:
        "Each call recurses into one half, never both halves. The range halves until key is found or the range is empty.",
      reviewSteps: [
        analysis(
          "Start with n elements",
          "Call binarySearch(a, 0, n − 1, key) on a sorted array.",
          "n candidates",
        ),
        analysis(
          "Choose one recursive call",
          "The two return statements are alternative branches.",
          "T(n) = T(floor(n/2)) + O(1)",
        ),
        analysis(
          "Count the levels",
          "Halving gives logarithmically many comparisons.",
          "floor(log₂ n) + 1 → O(log n)",
        ),
      ],
    },
    "linear-search": {
      code: "int linearSearch(const int a[], int n, int key) {\n  for (int i = 0; i < n; i++) {\n    work();\n    if (a[i] == key) return i;\n  }\n  return -1;\n}",
      answer: "O(n)",
      explanation:
        "In the worst case, key is missing or last. Every one of the n elements must be checked.",
      reviewSteps: [
        analysis(
          "Choose the worst case",
          "An early match is possible, but the question asks for the worst case.",
          "key missing or at index n − 1",
        ),
        analysis(
          "Count comparisons",
          "The loop then visits every element.",
          "n comparisons → O(n)",
        ),
      ],
    },
    "independent-inputs": {
      code: "for (int i = 0; i < m; i++) {\n  for (int j = 0; j < n; j++) {\n    work();\n  }\n}",
      answer: "O(mn)",
      explanation:
        "m and n are independent sizes. There are m outer turns with n calls each: m × n, not n².",
      reviewSteps: [
        analysis(
          "Keep both sizes",
          "The outer limit is m; the inner limit is n.",
          "m outer turns; n calls per turn",
        ),
        analysis(
          "Multiply",
          "There is no assumption that m equals n.",
          "m × n → O(mn)",
        ),
      ],
    },
    "sequential-log-square": {
      code: "for (int i = n; i > 1; i /= 2) work();\nfor (int j = 0; j < n; j++) {\n  for (int k = 0; k < n; k++) work();\n}",
      answer: "O(n²)",
      explanation:
        "Add the separate phases: log₂ n + n². Quadratic growth dominates the logarithmic term.",
      reviewSteps: [
        analysis(
          "Halving phase",
          "The first loop halves its index.",
          "floor(log₂ n) calls",
        ),
        analysis(
          "Nested phase",
          "The second phase has two fully nested loops.",
          "n × n = n² calls",
        ),
        analysis(
          "Add and keep the dominant term",
          "Separate phases add rather than multiply.",
          "floor(log₂ n) + n² → O(n²)",
        ),
      ],
    },
  };
  const template = templates[kind];
  const search = [
    "binary-search",
    "recursive-binary-search",
    "linear-search",
  ].includes(kind);
  const assumptions =
    kind === "independent-inputs"
      ? "// Assume m > 0 and n > 0; arithmetic does not overflow."
      : "// Assume n > 0; arithmetic does not overflow.";
  const searchNote =
    kind === "recursive-binary-search"
      ? "\n// a is sorted; call binarySearch(a, 0, n - 1, key)."
      : kind === "binary-search"
        ? "\n// a has n sorted elements."
        : "";
  return {
    type: "bigO",
    kind,
    code: `${assumptions}${searchNote}\n${template.code}`,
    reviewSteps: template.reviewSteps,
    steps: [
      {
        kind: "choice",
        prompt: search
          ? "What is the tightest worst-case Big-O run-time?"
          : "What is the tightest Big-O run-time?",
        answer: template.answer,
        options: level === 1 ? ["O(1)", "O(n)", "O(n²)"] : complexities,
        hint: "work() is one O(1) operation. Count iterations, multiply nested loops, and add separate phases. Binary search follows one half at a time.",
        explanation: template.explanation,
        reviewSteps: template.reviewSteps,
      },
    ],
  };
}
const linearCode = "for (int i = 0; i < n; i++) work();";
const nestedCode =
  "for (int i = 0; i < n; i++)\n  for (int j = 0; j < n; j++) work();";
const separateCode =
  "for (int i = 0; i < n; i++) work();\nfor (int j = 0; j < n; j++) work();";
const halvingCode = "for (int i = n; i > 1; i /= 2) work();";
const example = (caption, code, answer, bars, movement) => ({
  type: "bigO",
  caption,
  code,
  answer,
  bars,
  movement,
});
export const bigOLessons = [
  {
    id: "count-the-work",
    title: "Count the work",
    summary: "One loop, one growing input.",
    steps: [
      example(
        "With n = 4, i visits 0, 1, 2, 3: four calls.",
        linearCode,
        "4 calls",
        [1, 2, 3, 4],
        "Try n = 4",
      ),
      example(
        "With n = 8, the same loop makes eight calls.",
        linearCode,
        "8 calls",
        [1, 2, 3, 4],
        "Double n",
      ),
      example(
        "The call count grows with n, so this is linear.",
        linearCode,
        "O(n)",
        [1, 2, 3, 4],
        "Find the pattern",
      ),
      example(
        "A fixed limit always makes four calls, regardless of n.",
        "for (int i = 0; i < 4; i++) work();",
        "O(1)",
        [1, 1, 1, 1],
        "Compare a fixed limit",
      ),
    ],
  },
  {
    id: "nested-separate",
    title: "Multiply or add?",
    summary: "Nested loops versus separate loops.",
    steps: [
      example(
        "At n = 3, the outer loop runs three times.",
        nestedCode,
        "3 outer turns",
        [1, 4, 9, 16],
        "Look outside",
      ),
      example(
        "Each outer turn runs the inner loop three times.",
        nestedCode,
        "3 × 3 = 9 calls",
        [1, 4, 9, 16],
        "Look inside",
      ),
      example(
        "For any n: n turns × n calls per turn = n².",
        nestedCode,
        "O(n²)",
        [1, 4, 9, 16],
        "Generalize",
      ),
      example(
        "Separate loops add: n + n = 2n. Drop the fixed factor 2.",
        separateCode,
        "O(n)",
        [1, 2, 3, 4],
        "Now put them side by side",
      ),
    ],
  },
  {
    id: "halving",
    title: "Halve your way down",
    summary: "Why doubling adds just one step.",
    steps: [
      example(
        "Start at 8: work runs at 8, 4, 2. At 1, stop.",
        halvingCode,
        "3 calls",
        [3, 4, 4, 5],
        "Try n = 8",
      ),
      example(
        "Start at 16: 16 → 8 → 4 → 2 → stop. One extra call.",
        halvingCode,
        "4 calls",
        [3, 4, 4, 5],
        "Double n",
      ),
      example(
        "Each doubling adds one call: the count grows as log₂ n.",
        halvingCode,
        "O(log n)",
        [3, 4, 4, 5],
        "Find the pattern",
      ),
    ],
  },
  {
    id: "growth-scaling",
    title: "Double the input",
    summary: "Turn an exact model into a multiplier.",
    steps: [
      example(
        "Use the exact model W(n) = n². At n = 3, work is 9.",
        "W(n) = n²\nW(3) = 3² = 9",
        "9 units",
        [1, 4, 9, 16],
        "Start small",
      ),
      example(
        "Double the input to 6: work becomes 6² = 36.",
        "W(n) = n²\nW(6) = 6² = 36",
        "36 units",
        [1, 4, 9, 16],
        "Double n",
      ),
      example(
        "36 ÷ 9 = 4. Doubling n quadruples quadratic work.",
        "W(2n) / W(n) = (2n)² / n² = 4",
        "4× the work",
        [1, 4, 9, 16],
        "Compare",
      ),
    ],
  },
  {
    id: "three-loops",
    title: "Three nested loops",
    summary: "One factor of n for each full loop.",
    steps: [
      example(
        "At n = 2, i has two turns; each turn gives j two turns.",
        "for (int i = 0; i < n; i++)\n  for (int j = 0; j < n; j++)\n    for (int k = 0; k < n; k++) work();",
        "2 × 2 pairs",
        [1, 8, 27, 64],
        "Look at i and j",
      ),
      example(
        "For each pair, k runs twice: eight calls total.",
        "2 outer × 2 middle × 2 inner = 8 calls",
        "2³ = 8",
        [1, 8, 27, 64],
        "Include k",
      ),
      example(
        "Each fully nested loop contributes one factor of n.",
        "n × n × n = n³",
        "O(n³)",
        [1, 8, 27, 64],
        "Generalize",
      ),
    ],
  },
  {
    id: "binary-search-runtime",
    title: "Binary search runtime",
    summary: "One half survives each comparison.",
    steps: [
      example(
        "Start with 16 sorted elements. One comparison keeps at most eight.",
        "16 candidates → at most 8 candidates",
        "One comparison",
        [1, 2, 3, 4],
        "Check the middle",
      ),
      example(
        "Keep one half: 16 → 8 → 4 → 2 → 1. Up to five comparisons.",
        "16 → 8 → 4 → 2 → 1 → empty",
        "At most 5 comparisons",
        [1, 2, 3, 4],
        "Keep halving",
      ),
      example(
        "A loop or a recursive call can do the same halving. Neither searches both halves.",
        "T(n) = T(floor(n/2)) + O(1)",
        "O(log n)",
        [1, 2, 3, 4],
        "Recognize either version",
      ),
    ],
  },
  {
    id: "milliseconds-scaling",
    title: "From size to milliseconds",
    summary: "Use an exact timing model, then scale.",
    steps: [
      example(
        "Assume exact T(n) = c·n² on the same machine. At 100 items, time is 20 ms.",
        "T(n) = c·n²\nT(100) = 20 ms",
        "100 items · 20 ms",
        [1, 4, 9, 16],
        "Given measurement",
      ),
      example(
        "At 200 items, the input has doubled. Square the input multiplier.",
        "(200 / 100)² = 2² = 4",
        "4× as much work",
        [1, 4, 9, 16],
        "Scale the work",
      ),
      example(
        "Multiply the measured time by four.",
        "20 ms × 4 = 80 ms",
        "200 items · 80 ms",
        [1, 4, 9, 16],
        "Scale the time",
      ),
      example(
        "A Big-O label alone cannot promise an exact time. Here the exact model supplies that assumption.",
        "Exact T(n) = c·n²\nT(200) / T(100) = 4",
        "Exact model → exact multiplier",
        [1, 4, 9, 16],
        "Check the assumption",
      ),
    ],
  },
];
export const bigOTutorial = bigOLessons[0].steps;
