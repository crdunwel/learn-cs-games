// Independent Big-O source contracts and exact-model checks; never import a generator.
const need = (condition, reason) => {
  if (!condition) throw new Error(`Invalid practice question: Big-O ${reason}`);
};
const integer = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;
const tokens = (code) =>
  (
    String(code).match(
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_]\w*|\d+|\+\+|--|<=|>=|==|!=|\+=|\/=|[^\s]/g,
    ) || []
  ).filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sourceIs = (question, source) =>
  need(same(tokens(question.code), tokens(source)), "source contract");
const multiply = (value, power) => {
  let result = 1;
  for (let i = 0; i < power; i++) result *= value;
  return result;
};
const names = [
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n²)",
  "O(n³)",
  "O(mn)",
  "O(2ⁿ)",
];
const exponents = ["⁰", "¹", "²", "³"];

const sources = {
  square: "for(int i=0;i<n;i++){for(int j=0;j<n;j++){work();}}",
  log: "for(int i=n;i>1;i/=2){work();}",
  nlog: "for(int i=0;i<n;i++){for(int j=n;j>1;j/=2){work();}}",
  triangle: "for(int i=0;i<n;i++){for(int j=0;j<i;j++){work();}}",
  sequential: "for(int i=0;i<n;i++)work();for(int j=0;j<n;j++)work();",
  cube: "for(int i=0;i<n;i++){for(int j=0;j<n;j++){for(int k=0;k<n;k++){work();}}}",
  "binary-search":
    "int binarySearch(const int a[],int n,int key){int low=0,high=n-1;while(low<=high){int mid=low+(high-low)/2;work();if(a[mid]==key)return mid;if(a[mid]<key)low=mid+1;else high=mid-1;}return -1;}",
  "recursive-binary-search":
    "int binarySearch(const int a[],int low,int high,int key){if(low>high)return -1;int mid=low+(high-low)/2;work();if(a[mid]==key)return mid;if(a[mid]<key)return binarySearch(a,mid+1,high,key);return binarySearch(a,low,mid-1,key);}",
  "linear-search":
    "int linearSearch(const int a[],int n,int key){for(int i=0;i<n;i++){work();if(a[i]==key)return i;}return -1;}",
  "independent-inputs": "for(int i=0;i<m;i++){for(int j=0;j<n;j++){work();}}",
  "sequential-log-square":
    "for(int i=n;i>1;i/=2)work();for(int j=0;j<n;j++){for(int k=0;k<n;k++)work();}",
};
const answers = {
  constant: "O(1)",
  linear: "O(n)",
  square: "O(n²)",
  log: "O(log n)",
  nlog: "O(n log n)",
  triangle: "O(n²)",
  sequential: "O(n)",
  cube: "O(n³)",
  "binary-search": "O(log n)",
  "recursive-binary-search": "O(log n)",
  "linear-search": "O(n)",
  "independent-inputs": "O(mn)",
  "sequential-log-square": "O(n²)",
};
function sourceParameter(q) {
  if (q.kind === "constant") {
    const value = Number(q.code.match(/\bi\s*<\s*(\d+)/)?.[1]);
    need(integer(value, 3, 20), "fixed loop domain");
    sourceIs(q, `for(int i=0;i<${value};i++){work();}`);
    return value;
  }
  if (q.kind === "linear") {
    const value = Number(q.code.match(/\bi\s*\+=\s*(\d+)/)?.[1]);
    need(integer(value, 2, 5), "stride domain");
    sourceIs(q, `for(int i=0;i<n;i+=${value}){work();}`);
    return value;
  }
  need(Object.hasOwn(sources, q.kind), "unknown family");
  sourceIs(q, sources[q.kind]);
  return null;
}

// Count execution directly from each finite source contract, rather than its label.
// Binary search uses the longest possible path through a nonempty sorted range.
export function countBigOWork(question, n, m = n) {
  need(integer(n, 1, 4096) && integer(m, 1, 4096), "count input domain");
  const parameter = sourceParameter(question);
  let halves = 0;
  for (let size = n; size > 1; size = Math.floor(size / 2)) halves++;
  switch (question.kind) {
    case "constant":
      return parameter;
    case "linear": {
      let count = 0;
      for (let index = 0; index < n; index += parameter) count++;
      return count;
    }
    case "square":
      return n * n;
    case "cube":
      return n * n * n;
    case "log":
      return halves;
    case "nlog":
      return n * halves;
    case "triangle": {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += i;
      return sum;
    }
    case "sequential":
      return n + n;
    case "binary-search":
    case "recursive-binary-search":
      return halves + 1;
    case "linear-search":
      return n;
    case "independent-inputs":
      return m * n;
    case "sequential-log-square":
      return halves + n * n;
    default:
      throw new Error("Unreachable Big-O source family");
  }
}
function checkReviews(q, math) {
  // Legacy questions may omit walkthroughs; new walkthroughs must agree in both locations.
  for (const steps of [q.reviewSteps, q.steps[0].reviewSteps]) {
    if (steps === undefined) continue;
    need(
      Array.isArray(steps) && steps.length === math.length && steps.length <= 5,
      "walkthrough length",
    );
    steps.forEach((step, i) => {
      need(
        typeof step.title === "string" &&
          step.title.trim() &&
          typeof step.detail === "string" &&
          step.detail.trim(),
        "walkthrough labels",
      );
      need(step.math === math[i], "walkthrough arithmetic");
    });
  }
  if (q.reviewSteps && q.steps[0].reviewSteps)
    need(same(q.reviewSteps, q.steps[0].reviewSteps), "walkthrough mismatch");
}
function checkScale(q) {
  const { power, factor } = q.scale;
  need(integer(power, 0, 3) && integer(factor, 2, 4), "exact scaling domain");
  need(q.code === null, "scaling source");
  const ratio = multiply(factor, power);
  // Old generated questions carry only the exact exponent and input factor.
  if (q.scale.initialSize === undefined) {
    need(q.steps[0].answer === `${ratio}×`, "legacy scaling answer");
    need(
      same(
        q.steps[0].options,
        [
          ...new Set([1, factor, factor * factor, factor * factor * factor]),
        ].map((x) => `${x}×`),
      ),
      "legacy scaling choices",
    );
    return;
  }
  const { initialSize, mode, timeMs, oldWork, newWork } = q.scale;
  need(
    [10, 20, 50, 100, 200].includes(initialSize) &&
      ["work", "time"].includes(mode),
    "scaling parameters",
  );
  need(
    mode === "time" ? [2, 5, 10, 20, 40, 80].includes(timeMs) : timeMs === null,
    "timing domain",
  );
  const newSize = initialSize * factor;
  const original = multiply(initialSize, power);
  const larger = multiply(newSize, power);
  need(oldWork === original && newWork === larger, "displayed work totals");
  need(larger / original === ratio, "exact scaling ratio");
  const expected = mode === "time" ? `${timeMs * ratio} ms` : `${ratio}×`;
  need(q.steps[0].answer === expected, "scaling answer");
  const multipliers = [
    ...new Set([1, factor, factor * factor, factor * factor * factor]),
  ];
  const options = multipliers.map((x) =>
    mode === "time" ? `${timeMs * x} ms` : `${x}×`,
  );
  need(same(q.steps[0].options, options), "scaling choices");
  const prompt =
    mode === "time"
      ? `At ${initialSize} items, the algorithm takes ${timeMs} ms. How long will ${newSize} items take?`
      : `Input grows from ${initialSize} items to ${newSize} items. How many times as much work is required?`;
  need(q.steps[0].prompt === prompt, "displayed scaling inputs");
  const math = [
    `W(${initialSize}) = ${initialSize}${exponents[power]} = ${original}`,
    `W(${newSize}) = ${newSize}${exponents[power]} = ${larger}`,
    `${larger} ÷ ${original} = ${ratio}×`,
  ];
  if (mode === "time")
    math.push(`${timeMs} ms × ${ratio} = ${timeMs * ratio} ms`);
  checkReviews(q, math);
}

export function validateBigOQuestion(q) {
  need(
    q?.type === "bigO" && Array.isArray(q.steps) && q.steps.length === 1,
    "question shape",
  );
  const step = q.steps[0];
  need(
    step.kind === "choice" &&
      Array.isArray(step.options) &&
      step.options.length >= 2,
    "choice shape",
  );
  need(
    new Set(step.options).size === step.options.length &&
      step.options.filter((value) => value === step.answer).length === 1,
    "unique intended choice",
  );
  if (q.scale) checkScale(q);
  else {
    need(typeof q.code === "string", "missing C source");
    const parameter = sourceParameter(q);
    need(
      q.kind === "independent-inputs"
        ? q.code.includes(
            "Assume m > 0 and n > 0; arithmetic does not overflow.",
          )
        : q.code.includes("Assume n > 0; arithmetic does not overflow."),
      "source assumptions",
    );
    if (["binary-search", "recursive-binary-search"].includes(q.kind)) {
      need(
        q.code.includes(
          q.kind === "binary-search"
            ? "a has n sorted elements"
            : "a is sorted; call binarySearch(a, 0, n - 1, key)",
        ),
        "sorted search precondition",
      );
      need(
        step.prompt === "What is the tightest worst-case Big-O run-time?",
        "worst-case search ask",
      );
    }
    if (q.kind === "linear-search")
      need(
        step.prompt === "What is the tightest worst-case Big-O run-time?",
        "linear worst-case ask",
      );
    need(
      step.answer === answers[q.kind] &&
        step.options.every((option) => names.includes(option)),
      "complexity answer or distractor",
    );
    const math = {
      constant: [`${parameter} calls for every n`, "W(n) = constant → O(1)"],
      linear: [
        `0, ${parameter}, ${2 * parameter}, … < n`,
        `ceil(n/${parameter}) → O(n)`,
      ],
      square: ["n outer turns", "n calls per outer turn", "n × n = n² → O(n²)"],
      log: ["16 → 8 → 4 → 2 → stop at 1", "floor(log₂ n) → O(log n)"],
      nlog: [
        "n outer turns",
        "floor(log₂ n) calls per turn",
        "n × floor(log₂ n) → O(n log n)",
      ],
      triangle: ["0 + 1 + 2 + … + (n − 1)", "n(n − 1)/2 = (n² − n)/2 → O(n²)"],
      sequential: ["n calls", "n + n = 2n → O(n)"],
      cube: ["n turns", "n × n turns", "n × n × n = n³ → O(n³)"],
      "binary-search": [
        "n candidates → at most floor(n/2)",
        "16 → 8 → 4 → 2 → 1 candidates",
        "floor(log₂ n) + 1 → O(log n)",
      ],
      "recursive-binary-search": [
        "n candidates",
        "T(n) = T(floor(n/2)) + O(1)",
        "floor(log₂ n) + 1 → O(log n)",
      ],
      "linear-search": [
        "key missing or at index n − 1",
        "n comparisons → O(n)",
      ],
      "independent-inputs": [
        "m outer turns; n calls per turn",
        "m × n → O(mn)",
      ],
      "sequential-log-square": [
        "floor(log₂ n) calls",
        "n × n = n² calls",
        "floor(log₂ n) + n² → O(n²)",
      ],
    };
    checkReviews(q, math[q.kind]);
  }
  return q;
}
