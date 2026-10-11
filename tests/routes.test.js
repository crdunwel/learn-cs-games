import test from "node:test";
import assert from "node:assert/strict";
import { games } from "../src/games/index.js";
import {
  parseHashRoute,
  tutorialHash,
  practiceHash,
  codingHash,
} from "../src/engine/routes.js";

test("every lesson has a distinct, round-trippable route; old game links remain valid", () => {
  const seen = new Set();
  for (const game of games) {
    assert.deepEqual(parseHashRoute(`#${game.id}`, games), {
      kind: "game",
      gameId: game.id,
      mode: null,
      lessonId: null,
    });
    if (game.kind === "exam") continue;
    const lessons = game.lessons || [{ id: "basics" }];
    for (const lesson of lessons) {
      const hash = tutorialHash(game.id, lesson.id);
      assert.ok(!seen.has(hash));
      seen.add(hash);
      assert.deepEqual(parseHashRoute(hash, games), {
        kind: "game",
        gameId: game.id,
        mode: "tutorial",
        lessonId: lesson.id,
      });
    }
    assert.equal(
      parseHashRoute(`#${game.id}/learn`, games).lessonId,
      lessons[0].id,
    );
    assert.equal(parseHashRoute(practiceHash(game.id), games).mode, "practice");
  }
  assert.ok(seen.size >= 30);
  assert.equal(
    parseHashRoute("#queue/learn/linked-dequeue-three", games).lessonId,
    "linked-dequeue-three",
  );
});

test("malformed, overlong, ambiguous, and unknown routes safely resolve home", () => {
  for (const hash of [
    "",
    "#",
    "#unknown",
    "#queue/learn/unknown",
    "#queue/learn/one/more",
    "#queue/",
    "#queue//learn",
    "#queue/play/extra",
    "#queue/%",
    "#queue/%F0%80",
    "#queue%2Flearn",
    "#queue/learn/%2e%2e",
    "#queue/learn/%3Cscript%3E",
    "#exam/learn",
    "#exam/play",
    "#code/",
    "#code/one/two",
    "#code/a?b=c",
    `#${"a".repeat(1025)}`,
    null,
    undefined,
    42,
  ])
    assert.deepEqual(
      parseHashRoute(hash, games),
      { kind: "home" },
      String(hash),
    );
  assert.equal(
    parseHashRoute("#%71ueue/learn/linked-dequeue-three", games).gameId,
    "queue",
  );
});

test("C-writing routes remain separate from the nine game routes", () => {
  assert.equal(games.length, 9);
  assert.equal(games[8].id, "exam");
  assert.deepEqual(parseHashRoute(codingHash(), games), {
    kind: "code",
    exerciseId: null,
  });
  assert.deepEqual(parseHashRoute(codingHash("queue-dequeue"), games), {
    kind: "code",
    exerciseId: "queue-dequeue",
  });
});
