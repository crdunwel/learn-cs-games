import test from "node:test";
import assert from "node:assert/strict";
import { generateMemory } from "../src/games/memory.js";
import { validateMallocQuestion } from "../src/engine/mallocValidation.js";
import {
  startSession,
  sessionReducer,
  evaluate,
} from "../src/engine/session.js";

function question() {
  const tape = [12.25 / 13, 12.25 / 229, 0.25 / 6];
  return validateMallocQuestion(generateMemory(() => tape.shift() ?? 0.25, 2));
}
function check(draft, q = question()) {
  const started = startSession(q);
  const drafted = sessionReducer(started, { type: "draft", value: draft });
  return sessionReducer(drafted, { type: "check" });
}

test("malloc session awards exact 10/9 XP while treating the allocation as correct", () => {
  const q = question();
  const ordinary = check("scores = malloc(sizeof(int) * (12 + 12));", q);
  assert.equal(ordinary.status, "correct");
  assert.equal(ordinary.earned, 10);
  assert.equal(ordinary.allCorrect, true);
  assert.equal(ordinary.warning, undefined);
  const missing = check("scores = malloc(96)", q);
  assert.equal(missing.status, "correct");
  assert.equal(missing.earned, 9);
  assert.equal(missing.allCorrect, true);
  assert.match(missing.warning, /Add ;/);
  assert.match(missing.warning, /−1 point/);
  assert.equal(evaluate(q.steps[0], "int *scores = malloc(96)"), true);
});

test("malloc session gives zero for wrong semantics, malformed syntax or reveal", () => {
  for (const draft of [
    "scores=malloc(24);",
    "scores=malloc(96", // Missing ) is not the tolerated missing semicolon.
    "scores=malloc(++96);",
    "scores=malloc(96);free(scores);",
    "other=malloc(96);",
    "",
  ]) {
    const result = check(draft);
    assert.equal(result.status, "incorrect", draft);
    assert.equal(result.earned, 0, draft);
    assert.equal(result.allCorrect, false, draft);
    assert.equal(result.warning, undefined, draft);
  }
  let state = startSession(question());
  state = sessionReducer(state, { type: "draft", value: "scores=malloc(96)" });
  state = sessionReducer(state, { type: "reveal" });
  assert.equal(state.status, "revealed");
  assert.equal(state.earned, 0);
  assert.equal(state.allCorrect, false);
  assert.equal(state.warning, undefined);
});

test("malloc scoring and reminder cannot be changed by repeated checks or locked edits", () => {
  for (const draft of [
    "scores=malloc(96)",
    "scores=malloc(96);",
    "scores=malloc(24);",
  ]) {
    const state = check(draft);
    for (const action of [
      { type: "check" },
      { type: "reveal" },
      { type: "draft", value: "scores=malloc(96);" },
      { type: "next" },
    ])
      assert.equal(sessionReducer(state, action), state);
  }
});

test("a new malloc round resets drafts, points and syntax reminders", () => {
  const checked = check("scores=malloc(96)");
  assert.ok(checked.warning);
  const q = question();
  const next = sessionReducer(checked, { type: "new", question: q });
  assert.equal(next.status, "answering");
  assert.equal(next.earned, 0);
  assert.equal(next.draft, "");
  assert.equal(next.warning, undefined);
  assert.equal(next.step, 0);
  assert.equal(next.round, checked.round + 1);
  assert.equal(next.allCorrect, true);
  const answered = sessionReducer(
    sessionReducer(next, { type: "draft", value: "scores=malloc(96);" }),
    { type: "check" },
  );
  assert.equal(answered.earned, 10);
  assert.equal(answered.warning, undefined);
});

test("moving to another step clears the malloc reminder without losing earned XP", () => {
  const q = question();
  // Exercise the generic multi-step transition without adding a generated family.
  q.steps.push({ kind: "input", answer: "4" });
  let state = check("scores=malloc(96)", q);
  state = sessionReducer(state, { type: "next" });
  assert.equal(state.status, "answering");
  assert.equal(state.step, 1);
  assert.equal(state.warning, undefined);
  assert.equal(state.earned, 9);
  assert.equal(state.draft, "");
  state = sessionReducer(sessionReducer(state, { type: "draft", value: "4" }), {
    type: "check",
  });
  assert.equal(state.earned, 19);
  assert.equal(state.warning, undefined);
});
