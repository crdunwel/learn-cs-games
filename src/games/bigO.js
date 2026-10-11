import { integer, pick } from "../engine/random.js";
export const complexities = [
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n²)",
  "O(2ⁿ)",
];
export function generateBigO(rng, level) {
  const scale = level > 1 && rng() < 0.4;
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
        ],
  );
  const step = integer(rng, 2, 5);
  const templates = {
    constant: [
      `for (int i = 0; i < ${integer(rng, 3, 20)}; i++) {\n  work();\n}`,
      "O(1)",
      "The loop limit is a fixed number, so increasing n adds no iterations. That makes the run-time O(1).",
    ],
    linear: [
      `for (int i = 0; i < n; i += ${step}) {\n  work();\n}`,
      "O(n)",
      `Each pass advances i by ${step}, so there are about n/${step} calls. Doubling n roughly doubles the calls; dividing by a fixed ${step} does not change O(n).`,
    ],
    square: [
      "for (int i = 0; i < n; i++) {\n  for (int j = 0; j < n; j++) {\n    work();\n  }\n}",
      "O(n²)",
      "The inner loop starts over for every outer turn. There are n outer turns, each with n calls: n × n = n².",
    ],
    log: [
      "for (int i = n; i > 1; i /= 2) {\n  work();\n}",
      "O(log n)",
      "Each pass halves i instead of subtracting one. Doubling the input adds only one more halving, so the call count grows as log₂ n.",
    ],
    nlog: [
      "for (int i = 0; i < n; i++) {\n  for (int j = n; j > 1; j /= 2) {\n    work();\n  }\n}",
      "O(n log n)",
      "For each of n outer turns, the inner loop halves j down to 1. Multiply n turns by about log₂ n calls per turn.",
    ],
    triangle: [
      "for (int i = 0; i < n; i++) {\n  for (int j = 0; j < i; j++) {\n    work();\n  }\n}",
      "O(n²)",
      "The inner loop runs 0, then 1, then 2 times, up to n − 1. Their sum is n(n − 1)/2; its leading term is n².",
    ],
    sequential: [
      "for (int i = 0; i < n; i++) work();\nfor (int j = 0; j < n; j++) work();",
      "O(n)",
      "The second loop runs after the first finishes, so add their calls: n + n = 2n. A fixed factor of 2 still gives linear O(n) growth.",
    ],
  };
  if (scale) {
    const power = pick(rng, [0, 1, 2, 3]),
      factor = integer(rng, 2, 4);
    return {
      type: "bigO",
      scale: { power, factor },
      code: null,
      steps: [
        {
          kind: "choice",
          prompt: "What is the new work divided by the original work?",
          answer: `${factor ** power}×`,
          options: [...new Set([1, factor, factor ** 2, factor ** 3])].map(
            (x) => `${x}×`,
          ),
          hint: "Use the exact work model shown. Replace n with the new input size, then divide by the original work.",
          explanation: `(${factor}n)^${power} / n^${power} = ${factor ** power}. The work is ${factor ** power}× as large.`,
        },
      ],
    };
  }
  const [code, answer, explanation] = templates[kind];
  return {
    type: "bigO",
    code: `// Assume n > 0; arithmetic does not overflow.\n${code}`,
    kind,
    steps: [
      {
        kind: "choice",
        prompt: "What is the tightest Big-O run-time?",
        answer,
        options: level === 1 ? ["O(1)", "O(n)", "O(n²)"] : complexities,
        hint: "Assume n is positive, arithmetic does not overflow, and work() is constant time. Multiply nested loops; add separate loops. Ignore constants.",
        explanation,
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
];
export const bigOTutorial = bigOLessons[0].steps;
