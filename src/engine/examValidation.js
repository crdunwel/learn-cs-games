import { reviewedExamC, reviewedExamFields } from "./examContracts.js";

// Independent acceptance gate, not a second call to a generator/answer solver.
// C text must match the reviewed template family. Objective keys are derived
// from displayed inputs using separate recurrences, a syntax tree, and invariants.
const weights = [
  [2, 2],
  [12],
  [4],
  [3, 4],
  [6],
  [4, 3],
  [10],
  [8],
  [1, 1, 1, 5],
  [4],
  [3],
  [3, 1, 1],
  [2, 2],
  [2, 2, 2, 2],
  [1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1],
];
const sections = [
  "A",
  "A",
  "A",
  "B",
  "B",
  "B",
  "C",
  "C",
  "D",
  "D",
  "D",
  "D",
  "E",
  "E",
  "E",
  "E",
];
const checkpoints = {
  9: ["(", "/"],
  10: ["+", "(", "/"],
  11: ["+", "(", "/"],
  20: ["(", "/", "-"],
  21: ["(", "/", "-"],
  22: ["*", "(", "/", "-"],
  26: ["-", "(", "*", "(", "/", "-"],
  27: ["*", "(", "/", "-"],
  28: ["/", "-"],
};
const contract = (text, p) =>
  text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(p[name]));
const factorial = (n) => (n < 2 ? 1 : n * factorial(n - 1));

// Recursive-descent grammar and postorder traversal, independent of shunting yard.
export function examPostfixOracle(tokens) {
  let at = 0;
  function atom() {
    const token = tokens[at++];
    if (/^[1-9]$/.test(token)) return [token];
    if (token !== "(") throw new Error("Expected operand");
    const result = add();
    if (tokens[at++] !== ")") throw new Error("Unbalanced expression");
    return result;
  }
  function multiply() {
    let result = atom();
    while (["*", "/"].includes(tokens[at])) {
      const op = tokens[at++];
      result = [...result, ...atom(), op];
    }
    return result;
  }
  function add() {
    let result = multiply();
    while (["+", "-"].includes(tokens[at])) {
      const op = tokens[at++];
      result = [...result, ...multiply(), op];
    }
    return result;
  }
  const result = add();
  if (at !== tokens.length) throw new Error("Unused expression tokens");
  return result;
}

export function validateExam(exam) {
  const errors = [];
  const require = (ok, message) => {
    if (!ok) errors.push(message);
  };
  const number = (text, pattern, index = 1) => {
    const match = String(text).match(pattern);
    if (!match) throw new Error(`Unrecognized exam field: ${pattern}`);
    return Number(match[index]);
  };
  const inRange = (value, low, high) =>
    Number.isInteger(value) && value >= low && value <= high;
  const expected = (part, answer) =>
    require(String(part.answer) ===
      String(answer), `${part.id}: incorrect answer key`);
  try {
    require(exam.durationMinutes === 120 &&
      exam.totalPoints === 100, "Exam duration/points changed");
    require(exam.questions.length ===
      16, "Expected sixteen reviewed question templates");
    const q = exam.questions;
    q.forEach((question, i) => {
      require(question.id === `q${i + 1}` &&
        question.section ===
          sections[i], `Question ${i + 1}: wrong identity/section`);
      require(JSON.stringify(question.parts.map((p) => p.points)) ===
        JSON.stringify(weights[i]), `${question.id}: incorrect part weights`);
      require(question.points ===
        weights[i].reduce(
          (a, b) => a + b,
          0,
        ), `${question.id}: incorrect total`);
      question.parts.forEach((part, j) => {
        require(JSON.stringify({
          kind: part.kind,
          format: part.format ?? null,
          auto: part.auto,
        }) ===
          JSON.stringify(
            reviewedExamFields[i][j],
          ), `${part.id}: unreviewed grading type`);
        require(part.id ===
          `${question.id}${String.fromCharCode(97 + j)}`, `${question.id}: incorrect part id`);
        require(typeof part.answer === "string" &&
          part.answer.length > 0 &&
          part.explanation?.length >
            0, `${part.id}: missing answer/explanation`);
        require(part.kind !== "code" ||
          (part.auto === false &&
            part.rubric?.length >
              0), `${part.id}: C must use a reviewed rubric`);
      });
    });
    require(JSON.stringify(exam.sections.map((s) => [s.id, s.points])) ===
      JSON.stringify([
        ["A", 20],
        ["B", 20],
        ["C", 18],
        ["D", 20],
        ["E", 22],
      ]), "Incorrect section totals");

    const p = {};
    p.count = number(q[0].parts[0].prompt, /with (\d+) elements/);
    p.factor = number(q[0].parts[1].prompt, /Resize it to (\d+) \* N/);
    p.titleSize = number(q[1].code, /title\[(\d+)\]/);
    require([250, 320, 400, 500, 640, 750].includes(p.count) &&
      [2, 3].includes(p.factor) &&
      [40, 50, 60].includes(
        p.titleSize,
      ), "Allocation parameters outside reviewed domain");
    require(q[0].prompt.includes("sizes fit in size_t") &&
      q[1].prompt.includes("allocations succeed") &&
      q[1].prompt.includes("allocation sizes fit in size_t") &&
      q[1].prompt.includes("n > 0") &&
      q[1].prompt.includes(
        "every input string fits",
      ), "Missing allocation preconditions");
    p.base1 = number(q[3].code, /n <= 1\) return (\d+)/);
    p.base2 = number(q[3].code, /n == 2\) return (\d+)/);
    p.multiplier = number(q[3].code, /return (\d+) \* f/);
    p.subtract = number(q[3].code, /f\(n - 2\) - (\d+)/);
    p.argument = number(q[3].parts[0].prompt, /f\((\d+)\)/);
    require(inRange(p.base1, 1, 2) &&
      inRange(p.base2, 3, 5) &&
      inRange(p.multiplier, 2, 3) &&
      inRange(p.subtract, 1, 2) &&
      inRange(p.argument, 4, 6), "Recurrence outside reviewed domain");
    const recurse = (n) =>
      n <= 1
        ? p.base1
        : n === 2
          ? p.base2
          : p.multiplier * recurse(n - 1) + recurse(n - 2) - p.subtract;
    expected(q[3].parts[0], recurse(p.argument));
    const steps = Array.from({ length: p.argument - 2 }, (_, i) => {
      const n = i + 3;
      return `f(${n}) = ${p.multiplier} * ${recurse(n - 1)} + ${recurse(n - 2)} - ${p.subtract} = ${recurse(n)}`;
    }).join("\n");
    expected(
      q[3].parts[1],
      `f(0) = f(1) = ${p.base1}; f(2) = ${p.base2}\n${steps}`,
    );

    p.size = number(q[5].code, /SIZE (\d+)/);
    p.gap = number(q[5].prompt, /absolute difference (\d+)/);
    require(inRange(p.size, 4, 6) &&
      inRange(p.gap, 1, 2), "Permutation outside reviewed domain");
    require(q[5].prompt.includes(`0 through ${p.size - 1}`) &&
      q[5].parts[1].prompt.includes(
        `differs by ${p.gap}`,
      ), "Permutation prompt/code mismatch");
    // Bounds for generated enumeration: at most 6! leaves, no unbounded recursion.
    require(factorial(p.size) <= 720, "Permutation tree too large");

    const position = number(q[6].prompt, /p = (\d+)/),
      inserted = number(q[6].prompt, /x = (\d+)/);
    require(inRange(position, 2, 7) &&
      inRange(inserted, 26, 40) &&
      q[6].diagram.values.length === 5 &&
      q[6].diagram.values.every((v) =>
        inRange(v, 1, 25),
      ), "Insertion example outside reviewed domain");
    require(q[6].prompt.includes("nonempty") &&
      q[6].prompt.includes("p > 1") &&
      q[6].prompt.includes("malloc succeeds") &&
      q[6].prompt.includes(
        "new node count fits in int",
      ), "Missing insertion preconditions");
    p.parity = number(q[7].code, /% 2 == (\d)/);
    p.increment = number(q[7].code, /cur->data \+ (\d+)/);
    require(inRange(p.parity, 0, 1) &&
      inRange(
        p.increment,
        3,
        7,
      ), "Pointer-trace parameter outside reviewed domain");
    require(q[7].diagram.values.length === 6 &&
      q[7].diagram.values.every(
        (v, i) => inRange(v, 2, 15) && v % 2 === i % 2,
      ), "Pointer-trace input outside reviewed domain");
    // Explicit node/pointer execution, not the generator's array flatMap formula.
    const original = q[7].diagram.values.map((value) => ({
      value,
      next: null,
    }));
    original.forEach((node, i) => {
      node.next = original[i + 1] ?? null;
    });
    for (let cur = original[0]; cur; cur = cur.next) {
      if (cur.value % 2 === p.parity) {
        const added = { value: cur.value + p.increment, next: cur.next };
        cur.next = added;
        cur = added;
      }
    }
    const finalList = [];
    for (let cur = original[0]; cur; cur = cur.next) finalList.push(cur.value);
    expected(q[7].parts[0], finalList.join(" → "));

    const d = q[8].diagram;
    require(d.type === "postfix" &&
      d.tokens.map((t) => (/^\d+$/.test(t) ? "#" : t)).join(" ") ===
        "# * ( # - # ) / ( # + # ) + # * # - # / ( # * ( # - # ) ) + #", "Unreviewed expression grammar");
    require(d.tokens
      .filter((t) => /^\d+$/.test(t))
      .every((t) => /^[1-9]$/.test(t)), "Expression operand outside 1..9");
    require(d.checkpoints.length === 3, "Incorrect checkpoint count");
    d.checkpoints.forEach(({ label, stop }, i) => {
      require(label === "ABC"[i] &&
        [
          [9, 10, 11],
          [20, 21, 22],
          [26, 27, 28],
        ][i].includes(stop), "Checkpoint outside reviewed domain");
      expected(q[8].parts[i], checkpoints[stop]?.join(" ") || "empty");
    });
    expected(q[8].parts[3], examPostfixOracle(d.tokens).join(" "));

    expected(
      q[9].parts[0],
      "The queue initially contains exactly one node. Removing it makes front NULL, so back must also become NULL; otherwise back points to freed memory and the empty-queue representation is inconsistent.",
    );
    expected(
      q[10].parts[0],
      "Enqueue is O(n) because it must follow next pointers to find the last node. A back pointer permits O(1) insertion. Dequeue at the front is already O(1).",
    );
    const queue = q[11].diagram;
    require(queue.type === "queue" &&
      inRange(queue.capacity, 5, 8) &&
      queue.front === queue.capacity - 1 &&
      inRange(
        queue.count,
        2,
        queue.capacity - 1,
      ), "Queue parameters outside reviewed domain");
    require(queue.cells.length === queue.capacity &&
      queue.rear === undefined &&
      queue.showRear === false, "Queue representation mismatch");
    for (let i = 0; i < queue.capacity; i++) {
      const occupied =
        (i - queue.front + queue.capacity) % queue.capacity < queue.count;
      require(occupied
        ? inRange(queue.cells[i], 10, 70)
        : queue.cells[i] === null, `Queue slot ${i}: inconsistent occupancy`);
    }
    expected(q[11].parts[1], queue.cells[queue.front]);
    expected(q[11].parts[2], (queue.front + 1) % queue.capacity);

    const base = number(q[12].prompt, /proportional to (\d+)ⁿ/),
      start = number(q[12].prompt, /At n = (\d+)/),
      ms = number(q[12].prompt, /takes (\d+) milliseconds/),
      end = number(q[12].prompt, /at n = (\d+)\?/);
    require(inRange(base, 2, 4) &&
      inRange(start, 7, 12) &&
      [100, 125, 200, 250].includes(ms) &&
      inRange(end - start, 2, 3), "Scaling parameters outside reviewed domain");
    let time = ms;
    for (let n = start; n < end; n++) time *= base;
    expected(q[12].parts[0], time / 1000);
    expected(
      q[12].parts[1],
      `${ms} * ${base}^(${end} - ${start}) / 1000 = ${time / 1000} seconds`,
    );
    require(q[12].parts[0].unit ===
      "seconds", "Scaling input must declare seconds");

    p.breakAt = number(q[13].code, /j == (\d+)/);
    p.logFactor = number(q[13].code, /i \*= (\d+)/);
    require(inRange(p.breakAt, 2, 5) &&
      inRange(p.logFactor, 2, 4) &&
      q[13].prompt.includes("m and n can vary independently") &&
      q[13].prompt.includes("m >= 1, n >= 2") &&
      q[13].prompt.includes(
        "no arithmetic overflow",
      ), "Analysis outside reviewed domain");
    ["O(n^2)", "O(m)", "O(n^2)", "O(m log n)"].forEach((a, i) =>
      expected(q[13].parts[i], a),
    );
    const comparison = q[14].parts[0].prompt.match(
      /searchKey is (less|greater) than A\[mid\]/,
    )?.[1];
    require(Boolean(comparison), "Missing binary-search comparison");
    expected(
      q[14].parts[0],
      comparison === "less" ? "high = mid - 1" : "low = mid + 1",
    );
    ["O(1)", "O(1)", "O(n)", "O(n)", "O(1)"].forEach((a, i) =>
      expected(q[14].parts[i + 1], a),
    );
    const coefficient = number(q[15].parts[0].prompt, /for (\d+)n²/),
      linear = number(q[15].parts[0].prompt, /\+ (\d+)n log n/),
      disks = number(q[15].parts[3].prompt, /with (\d+) disks/);
    require(inRange(coefficient, 2, 9) &&
      inRange(linear, 100, 900) &&
      inRange(disks, 4, 8), "Growth parameters outside reviewed domain");
    ["O(n^2)", "O(n)", "O(n)"].forEach((a, i) => expected(q[15].parts[i], a));
    const hanoi = (n) => (n === 0 ? 0 : hanoi(n - 1) + 1 + hanoi(n - 1));
    expected(q[15].parts[3], hanoi(disks));

    for (const [id, reviewed] of Object.entries(reviewedExamC)) {
      const question = q.find((question) => question.id === id);
      const actual = question
        ? question.code
        : q.flatMap((question) => question.parts).find((part) => part.id === id)
            ?.answer;
      require(typeof actual === "string" &&
        actual ===
          contract(reviewed, p), `${id}: C differs from reviewed template`);
    }
  } catch (error) {
    errors.push(error.message);
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidExam(exam) {
  const result = validateExam(exam);
  if (!result.valid)
    throw new Error(`Exam validation failed: ${result.errors.join("; ")}`);
  return exam;
}
