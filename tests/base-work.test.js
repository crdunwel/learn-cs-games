import test from "node:test";
import assert from "node:assert/strict";
import { baseCase } from "./support/practice-cases.js";
import { validatePracticeQuestion } from "../src/engine/practiceValidation.js";
import {
  emptyBaseWork,
  solvedBaseWork,
  checkBaseWork,
  baseWorkResult,
  placeDigit,
  baseWorkFeedback,
} from "../src/engine/baseWork.js";
import { startSession, sessionReducer } from "../src/engine/session.js";

test("all 49152 base conversions have correct positions, sums, and guided grading", () => {
  for (const from of [2, 8, 10, 16])
    for (const to of [2, 8, 10, 16])
      if (from !== to)
        for (let value = 0; value <= 4095; value++) {
          const q = baseCase(from, to, value);
          validatePracticeQuestion("bases", q);
          const w = q.steps[0].work,
            draft = solvedBaseWork(w);
          assert.equal(checkBaseWork(w, draft).correct, true);
          assert.equal(baseWorkResult(w, draft), q.steps[0].answer);
          assert.equal(w.source.at(-1).exponent, 0);
          assert.equal(
            w.source.reduce((n, r) => n + r.product, 0),
            value,
          );
          assert.equal(
            w.target.reduce((n, r) => n + r.product, 0),
            value,
          );
          assert.equal(checkBaseWork(w, emptyBaseWork(w)).correct, false);
        }
});
test("guided slots accept arithmetic and hex equivalents but reject wrong or missing places", () => {
  const q = baseCase(2, 16, 175),
    w = q.steps[0].work;
  const draft = solvedBaseWork(w);
  draft.products = w.source.map((r) => `${r.value} * ${w.from}^${r.exponent}`);
  draft.total = "128 + 32 + 8 + 4 + 2 + 1";
  draft.digits = ["10", " f "];
  assert.equal(checkBaseWork(w, draft).correct, true);
  assert.equal(baseWorkResult(w, draft), "AF");
  assert.equal(placeDigit("2", 2), null);
  assert.equal(placeDigit("8", 8), null);
  assert.equal(placeDigit("16", 16), null);
  assert.equal(placeDigit("1/2", 16), null);
  for (const key of ["products", "digits"]) {
    const bad = structuredClone(draft);
    bad[key][0] = "999";
    assert.equal(checkBaseWork(w, bad).correct, false);
  }
  const zero = baseCase(8, 2, 0).steps[0].work;
  assert.equal(checkBaseWork(zero, emptyBaseWork(zero)).correct, false);
  assert.equal(checkBaseWork(zero, solvedBaseWork(zero)).correct, true);
  const bad = structuredClone(draft);
  bad.total = "174";
  assert.equal(checkBaseWork(w, bad).correct, false);
  assert.match(
    baseWorkFeedback(w, { ...draft, products: ["0"] }),
    /Position 7/,
  );
});
test("source, target, exponents and products are bound to the independent question guard", () => {
  for (const side of ["source", "target"])
    for (const key of ["exponent", "weight", "value", "product"]) {
      const q = baseCase(2, 8, 51);
      q.steps[0].work[side][0][key]++;
      assert.throws(() => validatePracticeQuestion("bases", q));
    }
});
test("guided round locks on check, awards once, reveals no points and resets all slots", () => {
  const q = baseCase(2, 8, 51);
  let state = startSession(q);
  state = sessionReducer(state, {
    type: "draft",
    value: solvedBaseWork(q.steps[0].work),
  });
  state = sessionReducer(state, { type: "check" });
  assert.equal(state.status, "correct");
  assert.equal(state.earned, 10);
  assert.equal(sessionReducer(state, { type: "check" }), state);
  assert.equal(sessionReducer(state, { type: "draft", value: {} }), state);
  const next = sessionReducer(state, { type: "new", question: q });
  assert.deepEqual(next.draft, emptyBaseWork(q.steps[0].work));
  const reveal = sessionReducer(next, { type: "reveal" });
  assert.equal(reveal.earned, 0);
  assert.equal(reveal.allCorrect, false);
  const wrong = sessionReducer(next, { type: "check" });
  assert.equal(wrong.status, "incorrect");
  assert.equal(wrong.earned, 0);
});

test("decimal sources skip redundant decimal products and begin at destination places", () => {
  const q = baseCase(10, 2, 17),
    w = q.steps[0].work,
    d = emptyBaseWork(w);
  assert.deepEqual(d.products, []);
  assert.equal(d.total, "17");
  assert.deepEqual(d.digits, ["", "", "", "", ""]);
  d.digits = ["1", "0", "0", "0", "1"];
  assert.equal(checkBaseWork(w, d).correct, true);
  assert.equal(baseWorkResult(w, d), "10001");
});
