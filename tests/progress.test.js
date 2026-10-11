import test from "node:test";
import assert from "node:assert/strict";
import {
  startSession,
  sessionReducer,
  evaluate,
} from "../src/engine/session.js";
import {
  STORAGE_KEY,
  freshProgress,
  loadProgress,
  saveProgress,
  recordRound,
  finishTutorial,
  suggestedLevel,
} from "../src/engine/progress.js";
const question = {
  steps: [
    { kind: "stack", answer: "* +" },
    { kind: "postfix", answer: "A B C * +" },
  ],
};
test("scoring is awarded once per step, final state is locked, navigation is guarded", () => {
  let state = startSession(question);
  assert.equal(sessionReducer(state, { type: "next" }), state);
  state = sessionReducer(state, { type: "draft", value: ["*", "+"] });
  state = sessionReducer(state, { type: "check" });
  assert.equal(state.earned, 10);
  assert.equal(state.status, "correct");
  for (const action of [
    { type: "check" },
    { type: "reveal" },
    { type: "draft", value: [] },
  ])
    assert.equal(sessionReducer(state, action), state);
  state = sessionReducer(state, { type: "next" });
  assert.equal(state.step, 1);
  assert.equal(state.draft, "");
  state = sessionReducer(state, { type: "draft", value: "abc*+" });
  state = sessionReducer(state, { type: "check" });
  assert.equal(state.earned, 20);
  assert.equal(state.allCorrect, true);
  assert.equal(sessionReducer(state, { type: "next" }), state);
  state = sessionReducer(state, { type: "new", question });
  assert.equal(state.earned, 0);
  assert.equal(state.step, 0);
});
test("incorrect and revealed steps cannot become perfect rounds", () => {
  for (const type of ["check", "reveal"]) {
    let state = sessionReducer(startSession(question), { type });
    assert.equal(state.allCorrect, false);
    assert.equal(state.earned, 0);
    state = sessionReducer(state, { type: "next" });
    state = sessionReducer(state, { type: "draft", value: "A B C * +" });
    state = sessionReducer(state, { type: "check" });
    assert.equal(state.earned, 10);
    assert.equal(state.allCorrect, false);
  }
  assert(evaluate({ kind: "stack", answer: "" }, []));
  assert(!evaluate({ answer: "A B - C -" }, "AB-C+"));
  assert(evaluate({ answer: "A B +" }, " a b + "));
});
test("progress and tutorial persistence, streak resets, levels", () => {
  const storage = {
    value: null,
    getItem() {
      return this.value;
    },
    setItem(k, v) {
      assert.equal(k, STORAGE_KEY);
      this.value = v;
    },
  };
  let p = freshProgress();
  p = finishTutorial(p, "queue");
  for (let i = 0; i < 8; i++) p = recordRound(p, "queue", true);
  assert.equal(p.games.queue.streak, 8);
  assert.equal(suggestedLevel(p.games.queue), 3);
  p = recordRound(p, "queue", false);
  assert.equal(p.games.queue.streak, 0);
  assert.equal(p.games.queue.best, 8);
  assert(saveProgress(storage, p));
  assert.deepEqual(loadProgress(storage), p);
});
test("missing, malformed, future-version, and denied browser storage fail safely", () => {
  for (const value of [
    null,
    "bad",
    "[]",
    "null",
    '{"version":9}',
    '{"version":1,"xp":-3,"games":{"queue":{"wins":99,"rounds":2,"streak":"oops"}}}',
  ]) {
    const p = loadProgress({ getItem: () => value });
    assert(p.xp >= 0);
    assert((p.games.queue?.wins || 0) <= 2);
  }
  assert.deepEqual(loadProgress(null), freshProgress());
  assert.equal(saveProgress(null, freshProgress()), false);
});

test("postfix grading ignores spacing and equivalent operator glyphs, but checks content", () => {
  const step = { kind: "postfix", answer: "1 23 +" };
  for (const draft of ["1 23 +", "  1   23+  ", "1\n23 +", "123+"])
    assert(evaluate(step, draft));
  for (const draft of [
    "12 3 +",
    "1 2 3 +",
    "123-",
    "123+!",
    "123(+)",
    "123++",
    "132+",
  ])
    assert(!evaluate(step, draft), draft);
  assert(evaluate({ kind: "postfix", answer: "4 2 3 * +" }, "423×+"));
  assert(evaluate({ kind: "postfix", answer: "4 2 / 3 -" }, "42÷3−"));
  assert(evaluate({ kind: "input", answer: "33" }, " 033 "));
  assert(!evaluate({ kind: "input", answer: "33" }, "3.3"));
});

test("new games preserve saved progress without dropping the existing games", () => {
  let p = freshProgress();
  for (const id of [
    "postfix",
    "queue",
    "bigO",
    "recursion",
    "links",
    "search",
    "memory",
    "bases",
  ])
    p = recordRound(finishTutorial(p, id), id, true);
  p.xp = 260;
  assert.deepEqual(loadProgress({ getItem: () => JSON.stringify(p) }), p);
});

test("base answers accept harmless prefixes, spacing, case and leading zeros", () => {
  for (const [radix, answer, entries] of [
    [16, "BF", ["bf", "0xBF", "00BF", "B F"]],
    [2, "101", ["0b101", "00101", "1 0 1"]],
    [8, "17", ["0o17", "017"]],
    [10, "10", ["010", "+10"]],
  ]) {
    for (const value of entries)
      assert(evaluate({ kind: "input", radix, answer }, value), value);
    assert(!evaluate({ kind: "input", radix, answer }, "999Z"));
  }
});
