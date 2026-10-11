import test from "node:test";
import assert from "node:assert/strict";
import { generateExam } from "../src/games/exam.js";
import {
  validateExam,
  assertValidExam,
  examPostfixOracle,
} from "../src/engine/examValidation.js";
import { reviewedExamC } from "../src/engine/examContracts.js";
import {
  createExamAttempt,
  examReducer,
  remainingSeconds,
  gradeExam,
  evaluateExamPart,
} from "../src/engine/exam.js";

const partsOf = (exam) => exam.questions.flatMap((question) => question.parts);

// Independent shunting-yard oracle: checkpoint snapshots are captured before
// reading the next token, matching the handwritten exam's between-token marks.
function postfixOracle(tokens) {
  const output = [],
    operators = [],
    snapshots = [];
  const rank = { "+": 1, "-": 1, "*": 2, "/": 2 };
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (/^\d+$/.test(token)) output.push(token);
    else if (token === "(") operators.unshift(token);
    else if (token === ")") {
      while (operators[0] !== "(") output.push(operators.shift());
      operators.shift();
    } else {
      while (
        operators.length &&
        operators[0] !== "(" &&
        rank[operators[0]] >= rank[token]
      )
        output.push(operators.shift());
      operators.unshift(token);
    }
    snapshots.push([...operators]);
  }
  output.push(...operators);
  return { output, snapshots };
}

test("every generated exam preserves the sample's length, 120 minutes, and 100-point section balance", () => {
  const versions = new Set();
  for (let seed = 0; seed < 500; seed++) {
    const exam = generateExam(seed);
    assert.equal(exam.durationMinutes, 120);
    assert.equal(exam.totalPoints, 100);
    assert.equal(exam.questions.length, 16);
    assert.deepEqual(
      exam.sections.map((section) => section.points),
      [20, 20, 18, 20, 22],
    );
    const parts = partsOf(exam);
    assert.equal(new Set(parts.map((part) => part.id)).size, parts.length);
    assert.equal(
      parts.reduce((sum, part) => sum + part.points, 0),
      100,
    );
    for (const section of exam.sections) {
      assert.equal(
        exam.questions
          .filter((question) => question.section === section.id)
          .reduce((sum, question) => sum + question.points, 0),
        section.points,
      );
    }
    for (const part of parts) {
      assert.ok(part.points > 0);
      assert.ok(part.answer.length && part.explanation.length);
      if (!part.auto) assert.ok(part.rubric?.length);
      if (part.kind === "code") assert.equal(part.auto, false);
      if (part.auto)
        assert.equal(evaluateExamPart(part, part.answer), true, part.id);
    }
    const attempt = createExamAttempt(exam, 0);
    const grading = gradeExam(attempt);
    assert.equal(grading.totalPossible, 100);
    assert.equal(grading.totalEarned, 0);
    assert.ok(
      grading.manualPossible > 50,
      "most exam credit requires substantial written work",
    );
    versions.add(JSON.stringify(exam.questions));
  }
  assert.equal(versions.size, 500);
  assert.deepEqual(
    generateExam(407),
    generateExam(407),
    "same seed reproduces the exact paper and key",
  );
});

test("500 exam variants have independently verified stack checkpoints, postfix, recursion, queue, list, and scaling answers", () => {
  for (let seed = 0; seed < 500; seed++) {
    const exam = generateExam(seed);
    const recursion = exam.questions[3];
    const [, first, second, multiplier, subtract] = recursion.code
      .match(
        /if \(n <= 1\) return (\d+);\s*if \(n == 2\) return (\d+);\s*return (\d+) \* f\(n - 1\) \+ f\(n - 2\) - (\d+)/,
      )
      .map(Number);
    const arg = Number(recursion.parts[0].prompt.match(/f\((\d+)\)/)[1]);
    const f = (n) =>
      n <= 1
        ? first
        : n === 2
          ? second
          : multiplier * f(n - 1) + f(n - 2) - subtract;
    assert.equal(Number(recursion.parts[0].answer), f(arg));

    const list = exam.questions[7];
    const parity = Number(list.code.match(/% 2 == (\d)/)[1]);
    const increment = Number(list.code.match(/cur->data \+ (\d+)/)[1]);
    const expected = [];
    for (const value of list.diagram.values) {
      expected.push(value);
      if (value % 2 === parity) expected.push(value + increment);
    }
    assert.equal(
      evaluateExamPart(list.parts[0], expected.join(" -> ") + " -> NULL"),
      true,
    );

    const stack = exam.questions[8];
    const oracle = postfixOracle(stack.diagram.tokens);
    stack.diagram.checkpoints.forEach((checkpoint, index) => {
      assert.ok(
        checkpoint.stop >= 0 &&
          checkpoint.stop < stack.diagram.tokens.length - 1,
      );
      assert.equal(
        stack.parts[index].answer,
        oracle.snapshots[checkpoint.stop].join(" ") || "empty",
      );
    });
    assert.equal(stack.parts[3].answer, oracle.output.join(" "));
    const queue = exam.questions[11];
    assert.equal(
      queue.diagram.cells.filter((value) => value !== null).length,
      queue.diagram.count,
    );
    assert.equal(
      queue.diagram.rear,
      undefined,
      "sample queue does not define rear",
    );
    assert.equal(
      Number(queue.parts[1].answer),
      queue.diagram.cells[queue.diagram.front],
    );
    assert.equal(
      Number(queue.parts[2].answer),
      (queue.diagram.front + 1) % queue.diagram.capacity,
    );

    const scaling = exam.questions[12];
    const base = Number(scaling.prompt.match(/proportional to (\d+)ⁿ/)[1]);
    const [, n1, ms, n2] = scaling.prompt
      .match(/At n = (\d+), it takes (\d+) milliseconds.*at n = (\d+)/)
      .map(Number);
    let predicted = ms;
    for (let n = n1; n < n2; n++) predicted *= base;
    assert.equal(Number(scaling.parts[0].answer), predicted / 1000);
  }
});

test("the original sample recurrence and exponential scale are represented accurately", () => {
  let recurrenceFound = false,
    scalingFound = false;
  for (
    let seed = 0;
    seed < 5000 && (!recurrenceFound || !scalingFound);
    seed++
  ) {
    const exam = generateExam(seed);
    const recursion = exam.questions[3];
    if (
      /n <= 1\) return 1/.test(recursion.code) &&
      /n == 2\) return 3/.test(recursion.code) &&
      /return 2 \*.*- 1;/.test(recursion.code) &&
      /f\(5\)/.test(recursion.parts[0].prompt)
    ) {
      assert.equal(recursion.parts[0].answer, "33");
      recurrenceFound = true;
    }
    const scaling = exam.questions[12];
    if (
      /proportional to 4ⁿ/.test(scaling.prompt) &&
      /takes 100 milliseconds/.test(scaling.prompt) &&
      /At n = 10/.test(scaling.prompt) &&
      /at n = 12/.test(scaling.prompt)
    ) {
      assert.equal(scaling.parts[0].answer, "1.6");
      scalingFound = true;
    }
  }
  assert.ok(recurrenceFound && scalingFound);
});

test("objective marking accepts harmless notation but rejects wrong values and does not judge free C", () => {
  const number = { auto: true, kind: "number", answer: "1.6" };
  for (const draft of ["1.60", " +1.6000 ", "16e-1", "1+0.6"])
    assert.equal(evaluateExamPart(number, draft), true);
  for (const draft of ["", "16", "1.6 seconds", "Infinity"])
    assert.equal(evaluateExamPart(number, draft), false);
  const stack = { auto: true, kind: "stack", answer: "+ ( /" };
  for (const draft of ["+(/", "+, (, /", "+ → ( → ÷"])
    assert.equal(evaluateExamPart(stack, draft), true);
  assert.equal(evaluateExamPart(stack, "/ ( +"), false);
  assert.equal(evaluateExamPart({ ...stack, answer: "empty" }, "[]"), true);
  assert.equal(evaluateExamPart({ ...stack, answer: "empty" }, ""), false);
  const postfix = { auto: true, kind: "postfix", answer: "12 3 + 4 *" };
  for (const draft of ["123+4*", "12 3+4×", "12\n3 + 4 *"])
    assert.equal(evaluateExamPart(postfix, draft), true);
  assert.equal(evaluateExamPart(postfix, "12 3 4 + *"), false);
  const bigO = {
    auto: true,
    kind: "text",
    format: "bigO",
    answer: "O(m log n)",
  };
  for (const draft of [
    "O(m*log(n))",
    "m log_2 n",
    "O(log(n) m)",
    "o( m log n )",
  ])
    assert.equal(evaluateExamPart(bigO, draft), true, draft);
  assert.equal(evaluateExamPart(bigO, "O(n log m)"), false);
  for (const draft of ["O(n²)", "n^2", "O(n * n)"])
    assert.equal(evaluateExamPart({ ...bigO, answer: "O(n^2)" }, draft), true);
  const list = {
    auto: true,
    format: "sequence",
    kind: "text",
    answer: "2 → 7 → 5",
  };
  for (const draft of ["2,7,5", "[2 7 5]", "2 -> 7 -> 5 -> NULL", "02 +7 5"])
    assert.equal(evaluateExamPart(list, draft), true);
  assert.equal(evaluateExamPart(list, "275"), false);
  assert.equal(evaluateExamPart(list, "2 7 5 0"), false);
  assert.equal(
    evaluateExamPart(
      { auto: false, kind: "code", answer: "free(head);" },
      "free(head);",
    ),
    null,
  );
});

test("the absolute deadline survives reloads, background time, and locks late input", () => {
  const exam = generateExam(42);
  let attempt = createExamAttempt(exam, 1000);
  assert.equal(attempt.deadline, 7_201_000);
  assert.equal(remainingSeconds(attempt, 1000), 7200);
  assert.equal(remainingSeconds(attempt, 2001), 7199);
  assert.equal(remainingSeconds(attempt, attempt.deadline - 1), 1);
  const partId = exam.questions[0].parts[0].id;
  attempt = examReducer(attempt, {
    type: "draft",
    partId,
    value: "my code",
    now: 2000,
  });
  attempt = JSON.parse(JSON.stringify(attempt));
  const stillRunning = examReducer(attempt, {
    type: "expire",
    now: attempt.deadline - 1,
  });
  assert.equal(stillRunning.status, "running");
  const late = examReducer(stillRunning, {
    type: "draft",
    partId,
    value: "too late",
    now: attempt.deadline,
  });
  assert.equal(late.status, "expired");
  assert.equal(late.submittedAt, late.deadline);
  assert.equal(late.answers[partId], "my code");
  assert.equal(remainingSeconds(late, late.deadline + 60000), 0);
  assert.deepEqual(
    examReducer(late, {
      type: "draft",
      partId,
      value: "later",
      now: late.deadline + 1,
    }),
    late,
  );
  assert.deepEqual(
    examReducer(late, { type: "submit", now: late.deadline + 1 }),
    late,
  );
  const restored = JSON.parse(JSON.stringify(attempt));
  assert.equal(
    examReducer(restored, { type: "expire", now: restored.deadline + 900000 })
      .status,
    "expired",
  );
});

test("submission is idempotent and manual grading is bounded, explicit, and reversible", () => {
  const exam = generateExam(3),
    parts = partsOf(exam);
  let attempt = createExamAttempt(exam, 100);
  const manual = parts.find((part) => !part.auto),
    automatic = parts.find((part) => part.auto);
  assert.equal(
    examReducer(attempt, {
      type: "score",
      partId: manual.id,
      value: manual.points,
      now: 200,
    }),
    attempt,
  );
  assert.equal(
    examReducer(attempt, {
      type: "draft",
      partId: "invented",
      value: "x",
      now: 200,
    }),
    attempt,
  );
  for (const part of parts)
    attempt = examReducer(attempt, {
      type: "draft",
      partId: part.id,
      value: part.answer,
      now: 200,
    });
  attempt = examReducer(attempt, { type: "submit", now: 10000 });
  assert.equal(attempt.status, "submitted");
  assert.equal(attempt.submittedAt, 10000);
  assert.equal(examReducer(attempt, { type: "submit", now: 12000 }), attempt);
  assert.equal(
    examReducer(attempt, {
      type: "draft",
      partId: manual.id,
      value: "edited",
      now: 11000,
    }),
    attempt,
  );
  let grade = gradeExam(attempt);
  assert.equal(grade.automaticEarned, grade.automaticPossible);
  assert.equal(grade.manualEarned, 0);
  assert.equal(grade.pendingManual, parts.filter((part) => !part.auto).length);
  assert.equal(
    examReducer(attempt, { type: "score", partId: automatic.id, value: 100 }),
    attempt,
  );
  assert.equal(
    examReducer(attempt, { type: "score", partId: manual.id, value: NaN }),
    attempt,
  );
  attempt = examReducer(attempt, {
    type: "score",
    partId: manual.id,
    value: -10,
  });
  assert.equal(attempt.manualScores[manual.id], 0);
  attempt = examReducer(attempt, {
    type: "score",
    partId: manual.id,
    value: 100,
  });
  assert.equal(attempt.manualScores[manual.id], manual.points);
  attempt = examReducer(attempt, {
    type: "score",
    partId: manual.id,
    value: "",
  });
  assert.equal(Object.hasOwn(attempt.manualScores, manual.id), false);
  for (const part of parts.filter((part) => !part.auto))
    attempt = examReducer(attempt, {
      type: "score",
      partId: part.id,
      value: part.points,
    });
  grade = gradeExam(attempt);
  assert.equal(grade.totalEarned, 100);
  assert.equal(grade.pendingManual, 0);
  assert.equal(grade.totalPossible, 100);
  assert.ok(
    parts
      .filter((part) => !part.auto)
      .every((part) => grade.parts[part.id].correct === null),
    "manual points are not represented as machine-verified correctness",
  );
});

// The runtime gate is exercised directly: sampling seeds alone is not the proof.
// Exhaustive parameter families below cover each independent finite domain;
// docs/exam-correctness.md gives the compositional arguments for their products.
const replaceContract = (id, parameters) =>
  reviewedExamC[id].replace(/\{\{(\w+)\}\}/g, (_, key) => parameters[key]);
const assertValid = (exam) => {
  const result = validateExam(exam);
  assert.ok(result.valid, result.errors.join("; "));
};

test("runtime gate rejects every changed objective key and every unreviewed C template before delivery", () => {
  const original = generateExam(808);
  for (const part of partsOf(original).filter((part) => part.auto)) {
    const altered = structuredClone(original);
    partsOf(altered).find((p) => p.id === part.id).answer += "999";
    assert.equal(validateExam(altered).valid, false, part.id);
    assert.throws(() => assertValidExam(altered), /Exam validation failed/);
  }
  for (const id of Object.keys(reviewedExamC)) {
    const altered = structuredClone(original);
    const question = altered.questions.find((q) => q.id === id);
    if (question) question.code += "\n/* unreviewed alteration */";
    else
      partsOf(altered).find((p) => p.id === id).answer +=
        "\n/* unreviewed alteration */";
    assert.equal(validateExam(altered).valid, false, id);
  }
  const changedQueue = structuredClone(original);
  changedQueue.questions[11].diagram.count++;
  assert.equal(validateExam(changedQueue).valid, false);
  const changedCode = structuredClone(original);
  changedCode.questions[13].code = changedCode.questions[13].code.replace(
    "i <= m",
    "i <= n",
  );
  assert.equal(validateExam(changedCode).valid, false);
  const splitToken = structuredClone(original);
  splitToken.questions[3].code = splitToken.questions[3].code.replace(
    "return",
    "re turn",
  );
  assert.equal(
    validateExam(splitToken).valid,
    false,
    "C token boundaries are preserved",
  );
  const changedLiteral = structuredClone(original);
  changedLiteral.questions[13].code = changedLiteral.questions[13].code.replace(
    "%d ",
    "%d\n",
  );
  assert.equal(
    validateExam(changedLiteral).valid,
    false,
    "Whitespace inside a C literal is not normalized",
  );
  const changedMarking = structuredClone(original);
  changedMarking.questions[0].parts[0].auto = true;
  assert.equal(
    validateExam(changedMarking).valid,
    false,
    "Written C cannot silently become string-marked",
  );
  assertValid(original);
});

test("all 72 recurrence parameter/argument combinations agree with recursive semantics", () => {
  const paper = generateExam(91),
    q = paper.questions[3];
  let checked = 0;
  for (let base1 = 1; base1 <= 2; base1++)
    for (let base2 = 3; base2 <= 5; base2++)
      for (let multiplier = 2; multiplier <= 3; multiplier++)
        for (let subtract = 1; subtract <= 2; subtract++)
          for (let argument = 4; argument <= 6; argument++) {
            const parameters = { base1, base2, multiplier, subtract };
            q.code = replaceContract("q4", parameters);
            q.parts[0].prompt = `What does f(${argument}) return?`;
            // Bottom-up oracle here; runtime gate independently expands recursive calls.
            const f = [base1, base1, base2];
            for (let n = 3; n <= argument; n++)
              f[n] = multiplier * f[n - 1] + f[n - 2] - subtract;
            q.parts[0].answer = String(f[argument]);
            q.parts[1].answer =
              `f(0) = f(1) = ${base1}; f(2) = ${base2}\n` +
              Array.from({ length: argument - 2 }, (_, i) => {
                const n = i + 3;
                return `f(${n}) = ${multiplier} * ${f[n - 1]} + ${f[n - 2]} - ${subtract} = ${f[n]}`;
              }).join("\n");
            assertValid(paper);
            checked++;
          }
  assert.equal(checked, 72);
});

test("all 27 checkpoint triples and every operand position/value preserve syntax-tree postfix", () => {
  const paper = generateExam(53),
    q = paper.questions[8],
    operands = q.diagram.tokens
      .map((t, i) => (/^\d+$/.test(t) ? i : -1))
      .filter((i) => i >= 0);
  let checked = 0;
  for (const a of [9, 10, 11])
    for (const b of [20, 21, 22])
      for (const c of [26, 27, 28])
        for (const position of operands)
          for (let value = 1; value <= 9; value++) {
            q.diagram.tokens[position] = String(value);
            q.diagram.checkpoints = [a, b, c].map((stop, i) => ({
              label: "ABC"[i],
              stop,
            }));
            const result = postfixOracle(q.diagram.tokens);
            for (let i = 0; i < 3; i++)
              q.parts[i].answer =
                result.snapshots[q.diagram.checkpoints[i].stop].join(" ") ||
                "empty";
            q.parts[3].answer = result.output.join(" ");
            assert.deepEqual(
              examPostfixOracle(q.diagram.tokens),
              result.output,
            );
            assertValid(paper);
            checked++;
          }
  assert.equal(checked, 2916);
});

test("all generated queue shapes and each occupied value satisfy the circular occupancy invariant", () => {
  const paper = generateExam(31),
    q = paper.questions[11];
  let checked = 0;
  for (let capacity = 5; capacity <= 8; capacity++)
    for (let count = 2; count < capacity; count++)
      for (let position = 0; position < count; position++)
        for (let value = 10; value <= 70; value++) {
          const front = capacity - 1,
            cells = Array(capacity).fill(null);
          for (let i = 0; i < count; i++) cells[(front + i) % capacity] = 20;
          cells[(front + position) % capacity] = value;
          q.diagram = {
            type: "queue",
            capacity,
            cells,
            front,
            showRear: false,
            count,
            operations: ["dequeue(qPtr)"],
          };
          q.parts[1].answer = String(cells[front]);
          q.parts[2].answer = "0";
          assertValid(paper);
          checked++;
        }
  assert.equal(checked, 4270);
});

test("all scaling combinations and pointer-trace local domains are checked independently", () => {
  const paper = generateExam(72),
    scale = paper.questions[12],
    trace = paper.questions[7];
  let scaling = 0,
    links = 0;
  for (let base = 2; base <= 4; base++)
    for (let start = 7; start <= 12; start++)
      for (let delta = 2; delta <= 3; delta++)
        for (const ms of [100, 125, 200, 250]) {
          scale.prompt = `Assume runtime is proportional to ${base}ⁿ. At n = ${start}, it takes ${ms} milliseconds. How long should it take at n = ${start + delta}? Give your answer in seconds. (1 second = 1000 milliseconds.)`;
          const time = (ms * base ** delta) / 1000;
          scale.parts[0].answer = String(time);
          scale.parts[1].answer = `${ms} * ${base}^(${start + delta} - ${start}) / 1000 = ${time} seconds`;
          assertValid(paper);
          scaling++;
        }
  for (let parity = 0; parity <= 1; parity++)
    for (let increment = 3; increment <= 7; increment++)
      for (let position = 0; position < 6; position++)
        for (let half = 1; half <= 7; half++) {
          trace.code = replaceContract("q8", { parity, increment });
          trace.diagram.values[position] = half * 2 + (position % 2);
          trace.parts[0].answer = trace.diagram.values
            .flatMap((v) => (v % 2 === parity ? [v, v + increment] : [v]))
            .join(" → ");
          assertValid(paper);
          links++;
        }
  assert.equal(scaling, 144);
  assert.equal(links, 420);
});

test("every polynomial coefficient and Hanoi disk count lies in the proven positive domain", () => {
  const paper = generateExam(201),
    q = paper.questions[15];
  let checked = 0;
  for (let coefficient = 2; coefficient <= 9; coefficient++)
    for (let linear = 100; linear <= 900; linear++) {
      q.parts[0].prompt = `Tightest Big-O for ${coefficient}n² + ${linear}n log n + 12:`;
      assertValid(paper);
      checked++;
    }
  for (let disks = 4; disks <= 8; disks++) {
    q.parts[3].prompt = `Minimum moves for the three-peg Tower of Hanoi with ${disks} disks:`;
    q.parts[3].answer = String(2 ** disks - 1);
    assertValid(paper);
  }
  assert.equal(checked, 6408);
});
