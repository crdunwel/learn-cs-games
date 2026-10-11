import test from "node:test";
import assert from "node:assert/strict";
import { generateWorksheet } from "../src/engine/worksheet.js";
import { practiceGames } from "../src/games/index.js";
import { generateExam } from "../src/games/exam.js";
import { convert } from "../src/games/postfix.js";
import { queueMove } from "../src/games/queue.js";

test("every practice game generates reproducible, unique paper questions at all levels", () => {
  for (const game of practiceGames)
    for (const level of [1, 2, 3])
      for (let seed = 0; seed < 15; seed++) {
        const options = { gameId: game.id, seed, level, count: 10 };
        const sheet = generateWorksheet(options);
        assert.deepEqual(generateWorksheet(options), sheet);
        assert.equal(sheet.questions.length, 10);
        assert.equal(
          new Set(
            sheet.questions.map(({ id, label, ...question }) =>
              JSON.stringify(question),
            ),
          ).size,
          10,
        );
        assert.equal(sheet.level, level);
        for (const question of sheet.questions) {
          assert.ok(question.prompt);
          assert.ok(question.parts.length);
          assert.equal(question.hint, undefined);
          assert.equal(question.visual, undefined);
          for (const part of question.parts) {
            assert.equal(typeof part.answer, "string");
            assert.ok(part.explanation);
            assert.equal(part.hint, undefined);
            if (part.options) assert.ok(part.options.includes(part.answer));
          }
        }
      }
});

test("paper stacks have three valid checkpoints and independently recomputed answers", () => {
  for (let seed = 0; seed < 120; seed++) {
    const sheet = generateWorksheet({
      gameId: "postfix",
      seed,
      count: 3,
      level: 3,
    });
    for (const question of sheet.questions) {
      const { tokens, checkpoints } = question.diagram;
      const solved = convert(tokens);
      assert.deepEqual(
        checkpoints.map(({ label }) => label),
        ["A", "B", "C"],
      );
      assert.equal(new Set(checkpoints.map(({ stop }) => stop)).size, 3);
      for (const { label, stop } of checkpoints) {
        assert.ok(stop >= 0 && stop < tokens.length - 1);
        assert.ok(solved.states[stop + 1].stack.length <= 8);
        assert.equal(
          question.parts.find((p) => p.id === label).answer,
          [...solved.states[stop + 1].stack].reverse().join(" ") || "empty",
        );
      }
      assert.equal(question.parts.at(-1).answer, solved.postfix.join(" "));
    }
  }
});

test("paper queue states follow the lab convention and preserve empty/full/wrap behavior", () => {
  const cases = { empty: false, full: false, wrap: false };
  for (let seed = 0; seed < 120; seed++) {
    const sheet = generateWorksheet({
      gameId: "queue",
      seed,
      count: 3,
      level: 3,
    });
    for (const question of sheet.questions) {
      if (question.title === "Ordinary FIFO queue") {
        assert.ok(question.parts[0].answer);
        continue;
      }
      const { operations, ...initial } = question.diagram;
      let current = initial,
        result;
      for (const operation of operations) {
        const moved = queueMove(current, operation);
        if (moved.result === "Empty") cases.empty = true;
        if (moved.result === "Full") cases.full = true;
        if (
          moved.state.front < current.front ||
          moved.state.rear < current.rear
        )
          cases.wrap = true;
        current = moved.state;
        result = moved.result;
      }
      const answer = Object.fromEntries(
        question.parts.map((part) => [part.id, part.answer]),
      );
      assert.equal(answer.cells, current.cells.map((v) => v ?? "—").join(", "));
      assert.equal(answer.front, String(current.front));
      assert.equal(answer.rear, String(current.rear));
      assert.equal(answer.count, String(current.count));
      assert.equal(answer.result, String(result));
      assert.equal(initial.rearMeaning, "last item");
    }
  }
  assert.deepEqual(cases, { empty: true, full: true, wrap: true });
});

test("exam printing preserves the exact supplied exam and settings reject unsupported values", () => {
  const exam = generateExam(9173);
  assert.equal(generateWorksheet({ gameId: "exam", exam, seed: 88 }), exam);
  assert.deepEqual(generateWorksheet({ gameId: "exam", seed: 9173 }), exam);
  assert.throws(() => generateWorksheet({ gameId: "unknown" }));
  assert.throws(() => generateWorksheet({ gameId: "queue", count: 0 }));
  assert.throws(() => generateWorksheet({ gameId: "queue", level: 4 }));
});
