import test from "node:test";
import assert from "node:assert/strict";
import {
  convert,
  explainToken,
  explainTokenActions,
  postfixLessons,
  postfixRules,
} from "../src/games/postfix.js";

function actions(expression, index) {
  const tokens = expression.split(" ");
  const solution = convert(tokens);
  return {
    tokens,
    solution,
    rows: explainTokenActions(tokens, index, solution),
  };
}

test("incoming lower operator visibly pops every higher/equal top before its push", () => {
  const { rows, tokens, solution } = actions("2 + 3 * 4 - 5", 5);
  assert.deepEqual(
    rows.map(({ stack, output }) => ({ stack, output })),
    [
      { stack: ["+"], output: ["2", "3", "4", "*"] },
      { stack: [], output: ["2", "3", "4", "*", "+"] },
      { stack: ["-"], output: ["2", "3", "4", "*", "+"] },
    ],
  );
  assert.match(rows[0].detail, /Incoming - vs top \*.*higher precedence/);
  assert.match(rows[1].detail, /Incoming - vs top \+.*equal precedence/);
  assert.match(rows[1].detail, /earlier operator goes first/);
  assert.match(
    explainToken(tokens, 5, solution),
    /\* \(higher precedence\).*\+ \(equal precedence\).*into postfix.*push -/,
  );
});

test("higher incoming precedence retains the lower top; equal precedence pops it", () => {
  const higher = actions("2 + 3 * 4", 3);
  assert.deepEqual(higher.rows[0].stack, ["+", "*"]);
  assert.deepEqual(higher.rows[0].output, ["2", "3"]);
  assert.match(higher.rows[0].detail, /top \+.*lower precedence.*Keep \+/);
  const equal = actions("9 - 4 - 2", 3);
  assert.deepEqual(equal.rows[0].stack, []);
  assert.deepEqual(equal.rows[0].output, ["9", "4", "-"]);
  assert.deepEqual(equal.rows[1].stack, ["-"]);
  assert.deepEqual(equal.solution.postfix, ["9", "4", "-", "2", "-"]);
});

test("parentheses stop comparisons and closing parentheses pop then discard only the barrier", () => {
  const incoming = actions("2 * ( 3 * 4 + 5 )", 6);
  assert.deepEqual(incoming.rows[0].stack, ["*", "("]);
  assert.deepEqual(incoming.rows[1].stack, ["*", "(", "+"]);
  assert.match(incoming.rows[1].detail, /Stop at \(.*Do not pop across/);
  const closing = actions("2 * ( 3 + 4 * 5 )", 8);
  assert.deepEqual(
    closing.rows.map(({ stack, output }) => ({ stack, output })),
    [
      { stack: ["*", "(", "+"], output: ["2", "3", "4", "5", "*"] },
      { stack: ["*", "("], output: ["2", "3", "4", "5", "*", "+"] },
      { stack: ["*"], output: ["2", "3", "4", "5", "*", "+"] },
    ],
  );
  assert.match(
    closing.rows.at(-1).detail,
    /Discard.*Do not push \).*neither parenthesis/,
  );
  assert.deepEqual(closing.solution.postfix, [
    "2",
    "3",
    "4",
    "5",
    "*",
    "+",
    "*",
  ]);
});

test("each elementary action changes only one stack/output item and ends at the whole-token state", () => {
  for (const lesson of postfixLessons) {
    const tokens = lesson.steps[0].tokens;
    const solution = convert(tokens);
    for (let index = 0; index < tokens.length; index++) {
      const rows = explainTokenActions(tokens, index, solution);
      const snapshot = structuredClone(solution);
      let before = solution.states[index];
      for (const row of rows) {
        assert(row.title && row.detail);
        const stackDelta = row.stack.length - before.stack.length;
        const outputDelta = row.output.length - before.output.length;
        assert(
          (stackDelta === 1 && outputDelta === 0) ||
            (stackDelta === 0 && outputDelta === 1) ||
            (stackDelta === -1 && [0, 1].includes(outputDelta)),
        );
        if (outputDelta === 1) {
          assert.deepEqual(row.output.slice(0, -1), before.output);
          assert.equal(
            row.output.at(-1),
            stackDelta === -1 ? before.stack.at(-1) : tokens[index],
          );
        }
        if (stackDelta === -1 && !outputDelta)
          assert.equal(before.stack.at(-1), "(");
        before = row;
      }
      assert.deepEqual(
        { stack: rows.at(-1).stack, output: rows.at(-1).output },
        solution.states[index + 1],
      );
      rows[0].stack.push("test");
      rows[0].output.push("test");
      assert.deepEqual(solution, snapshot);
    }
  }
});

test("rule tour covers every push/pop case, keeps short captions, and flushes to a known postfix", () => {
  const lesson = postfixLessons.find(({ id }) => id === "push-pop-rules");
  assert(lesson);
  assert.deepEqual(lesson.steps.at(-1).stack, []);
  assert.deepEqual(lesson.steps.at(-1).output, [
    "2",
    "3",
    "4",
    "*",
    "+",
    "5",
    "1",
    "-",
    "-",
  ]);
  const details = lesson.steps
    .flatMap((step) => step.actionSteps.map(({ detail }) => detail))
    .join(" ");
  for (const rule of [
    /higher precedence/,
    /equal precedence/,
    /lower precedence/,
    /blocks access/,
    /Discard/,
    /No input remains/,
  ])
    assert.match(details, rule);
  for (const step of lesson.steps) assert(step.caption.length < 160);
  assert.equal(postfixRules.length, 5);
  assert.match(postfixRules[0].instruction, /directly to postfix.*Do not push/);
  assert.match(
    postfixRules[2].instruction,
    /While.*higher or equal.*compare again.*then push/,
  );
});

test("rule tour splits the two pops before incoming minus into separate visible states", () => {
  const lesson = postfixLessons.find((l) => l.id === "push-pop-rules");
  const first = lesson.steps.findIndex(
    (s) => s.movement === "Incoming - · pop *",
  );
  assert.ok(first >= 0);
  assert.deepEqual(lesson.steps[first].stack, ["+"]);
  assert.deepEqual(lesson.steps[first].output, ["2", "3", "4", "*"]);
  assert.deepEqual(lesson.steps[first + 1].stack, []);
  assert.deepEqual(lesson.steps[first + 1].output, ["2", "3", "4", "*", "+"]);
  assert.deepEqual(lesson.steps[first + 2].stack, ["-"]);
});
