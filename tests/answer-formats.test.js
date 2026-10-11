import test from "node:test";
import assert from "node:assert/strict";
import {
  equalAnswer,
  numericValue,
  answerFormatHint,
} from "../src/engine/answerFormats.js";
import { growthSignature } from "../src/engine/growthNotation.js";
import {
  evaluate,
  sessionReducer,
  startSession,
} from "../src/engine/session.js";
import { evaluateExamPart } from "../src/engine/exam.js";

const check = (part, accepted, rejected = []) => {
  for (const value of accepted)
    assert.equal(
      equalAnswer(part, value),
      true,
      `accept ${JSON.stringify(value)} for ${part.answer}`,
    );
  for (const value of rejected)
    assert.equal(
      equalAnswer(part, value),
      false,
      `reject ${JSON.stringify(value)} for ${part.answer}`,
    );
};

test("Big-O common mathematical formats, constants and dominated positive terms keep the same growth", () => {
  check(
    { format: "bigO", answer: "O(n^2)" },
    [
      "n^2",
      "N²",
      "O(n*n)",
      "Theta(n ** 2)",
      "θ(n²)",
      "O[n^2]",
      "n squared",
      "n*n*3",
      "(n^2)/4",
      "n^2 + n + 1",
      "O(n^{2})",
      "O(n²+7n)",
    ],
    ["n", "n^3", "2^n", "n^2+m", "n^2+m^2", "O()", "n^-2", "n **", "n2"],
  );
  check(
    { format: "bigO", answer: "O(n log n)" },
    [
      "nlog(n)",
      "n log n",
      "O(n*log_2(n))",
      "log(n)*n",
      "O(n lg n)",
      "n ln(n)",
      "n log4(n)",
      "n log_8 n",
      "O(n log(n,2))",
    ],
    ["O(log(n))", "nlog(m)", "m log n", "log_1(n)*n", "log_0(n)*n"],
  );
  check(
    { format: "bigO", answer: "O(m log n)" },
    ["mlog(n)", "O(log(n) m)", "log_2 n * m"],
    ["nlog(m)", "nlog(n)", "m+n", "n", "m"],
  );
  check(
    { format: "bigO", answer: "O(1)" },
    ["1", "O(20)", "7+2", "O(4/2)"],
    ["0", "O(n)", "O(1/n)"],
  );
  check(
    { format: "bigO", answer: "O(2^n)" },
    ["2^n", "2ⁿ", "O(2^n + n^4)"],
    ["4^n", "O((2/4)^n)", "2^(2*n)", "2^(n+n)", "2^(n/2)"],
  );
});

test("numeric values use exact rational arithmetic, units and conventional thousands groups", () => {
  const seconds = { kind: "number", unit: "seconds", answer: "1.6" };
  check(
    seconds,
    [
      "1.60",
      "+16e-1",
      "8/5",
      "1 + 0.6",
      "1.6 s",
      "1.6 seconds",
      "1600ms",
      "1,600 milliseconds",
      "(8/5) sec",
    ],
    [
      "1.6 ms",
      "1.6000000001",
      "1600",
      "1,6",
      "1/0",
      "Infinity",
      "NaN",
      "1.6 bytes",
    ],
  );
  check(
    { kind: "input", unit: "bytes", answer: "2048" },
    ["2,048", "2048 bytes", "2048 B", "512*4", "2^11", "2**11", "2¹¹"],
    ["2048 s", "20 48", "2048.5"],
  );
  check(
    { kind: "number", answer: "-1" },
    ["−1", "-1.0", "-2 + 1", "-2^0"],
    ["1", "--1", "-1 s"],
  );
  assert.equal(numericValue("0.1 + 0.2"), "3/10");
  assert.equal(numericValue("2^3^2"), "512/1");
  assert.equal(numericValue("2^-2"), "1/4");
  assert.equal(numericValue("1/3 + 2/3"), "1/1");
});

test("numeric parsing rejects executable text, malformed expressions and excessive input", () => {
  for (const value of [
    "alert(1)",
    "globalThis.process",
    "1;console.log(1)",
    "Math.pow(2,2)",
    "0x10",
    "1,00",
    "1e999999",
    "9^99999",
    "(".repeat(200) + "1",
    "2(3)",
    "1 2",
    "[]",
    "",
  ])
    assert.equal(numericValue(value), null, value);
  for (const value of [
    "Math.log(n)",
    "n;alert(1)",
    "O(n) garbage",
    "log()",
    "n".repeat(181),
    "n/(n-n)",
    "log(n+m)",
    "-n",
  ])
    assert.equal(growthSignature(value), null, value);
});

test("postfix ignores optional layout without merging explicitly different operands", () => {
  check(
    { kind: "postfix", answer: "12 3 + 4 *" },
    ["123+4*", "12 3+4×", "12,3,+,4,*", "12\n3 + 4 ·"],
    ["1 23 + 4 *", "12 3 4 + *", "12 3 + 4 * *", "12 3 (+) 4 *", ""],
  );
  check(
    { kind: "postfix", answer: "1 23 +" },
    ["123+", "1 23 +", "1,23,+"],
    ["12 3 +"],
  );
  check(
    { kind: "postfix", answer: "10 20 - 3 /" },
    ["1020−3÷", "10 20 - 3 /"],
    ["1 0 20 - 3 /"],
  );
});

test("stack/list notation accepts multiple layouts, while preserving order and deliberate empty answers", () => {
  check(
    { kind: "stack", answer: "+ ( /" },
    ["+(/", "[+, (, /]", "top: + → ( → ÷ :bottom", ["+", "(", "/"]],
    ["/ ( +", "+ ) /", ""],
  );
  check(
    { kind: "stack", answer: "" },
    [[], "empty", "EMPTY STACK", "[]", "∅"],
    ["", "0", "()"],
  );
  check(
    { format: "sequence", answer: "2 → 7 → 5" },
    [
      "2,7,5",
      "[2 7 5]",
      "(2;7;5)",
      "2 -> 7 -> 5 -> NULL",
      "head → 2 → 7 → 5 → NULL",
      "[2,7,5,NULL]",
      "2\n7\n5",
      "02 +7 5.0",
    ],
    ["275", "2 5 7", "2 7 5 0", "2.5 7 5", ""],
  );
});

test("base conversions accept common labels only when they match the requested base", () => {
  check(
    { kind: "input", radix: 2, answer: "1010" },
    [
      "1010",
      "0b1010",
      "001010",
      "10 10",
      "(1010)₂",
      "1010 (base 2)",
      "1010_2",
      "1010₂",
    ],
    ["10", "0xA", "1010₈", "1010 (base 10)", "1020"],
  );
  check(
    { kind: "input", radix: 16, answer: "AB" },
    ["ab", "0xab", "00AB", "AB₁₆", "(AB)_16"],
    ["171", "AB₂", "0b10101011"],
  );
});

test("zero-padded hexadecimal B is a digit, not a mismatched binary prefix", () => {
  check({ kind: "input", radix: 16, answer: "B" }, ["0B", "000b", "0xB"]);
  check({ kind: "input", radix: 16, answer: "B1" }, ["0B1", "00b1"]);
});

test("practice and exam share flexible grading, with no duplicate points and no automatic free-C grading", () => {
  const part = { kind: "input", answer: "12", auto: true };
  for (const draft of ["12.0", "6*2", "24/2"]) {
    assert.equal(evaluate(part, draft), true);
    assert.equal(evaluateExamPart({ ...part, kind: "number" }, draft), true);
    const state = sessionReducer(
      { ...startSession({ steps: [part] }), draft },
      { type: "check" },
    );
    assert.equal(state.earned, 10);
    assert.equal(sessionReducer(state, { type: "check" }).earned, 10);
  }
  assert.equal(
    evaluateExamPart({ kind: "code", auto: false, answer: "x=1;" }, "x = 1;"),
    null,
  );
  assert.match(answerFormatHint({ format: "bigO" }), /code’s variables/);
  assert.match(answerFormatHint({ kind: "number", unit: "seconds" }), /500 ms/);
});
