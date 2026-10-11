import test from "node:test";
import assert from "node:assert/strict";
import { seeded } from "../src/engine/random.js";
import { explainMistake } from "../src/engine/feedback.js";
import { practiceGames as games } from "../src/games/index.js";
import { convert, postfixLessons } from "../src/games/postfix.js";
import {
  emptyQueue,
  queueMove,
  generateCircularQueue as generateQueue,
  queueLessons,
} from "../src/games/queue.js";

function postfixQuestion(expression, stop) {
  const tokens = expression.split(" ");
  return {
    type: "postfix",
    tokens,
    stop,
    solution: convert(tokens),
    steps: [{ kind: "stack" }, { kind: "postfix" }],
  };
}

test("stack feedback diagnoses direction, barriers, operands, pop timing, and precedence", () => {
  const question = postfixQuestion("A + B * C", 5);
  assert.match(explainMistake(question, 0, ["+", "*"]), /upside down/);
  assert.match(
    explainMistake(question, 0, ["/", "+"]),
    /\/ has not been read.*Push \* above \+/,
  );
  assert.match(
    explainMistake(question, 0, ["*"]),
    /\+ is still waiting below \*/,
  );
  assert.match(
    explainMistake(question, 0, ["*", "+", "/"]),
    /\/ has not been read/,
  );
  assert.match(explainMistake(question, 0, ["*", "+", "+"]), /extra \+/);
  assert.match(
    explainMistake(postfixQuestion("A * ( B + C )", 6), 0, [
      "+",
      "(",
      "*",
      "(",
    ]),
    /Only 1 opening parenthesis is still unmatched/,
  );
  assert.match(explainMistake(question, 0, []), /before the final pop/);
  assert.match(explainMistake(question, 0, ["A"]), /Operands go straight/);
  assert.match(explainMistake(question, 0, [")"]), /never pushed/);
  assert.match(
    explainMistake(question, 0, ["("]),
    /No opening \( has been read/,
  );
  assert.match(
    explainMistake(postfixQuestion("A * ( B + C )", 6), 0, ["+", "*"]),
    /matching \)/,
  );
  assert.match(
    explainMistake(postfixQuestion("A * B + C", 4), 0, ["+", "*"]),
    /already moved.*higher precedence/,
  );
  assert.match(
    explainMistake(postfixQuestion("A - B - C", 4), 0, ["-", "-"]),
    /equal precedence/,
  );
});

test("postfix feedback explains the first causal error and final flush", () => {
  const question = postfixQuestion("A + B * C", 5);
  assert.match(explainMistake(question, 1, "A B + C *"), /Output C before \+/);
  assert.match(explainMistake(question, 1, "A C B * +"), /left-to-right order/);
  assert.match(
    explainMistake(question, 1, "A B C"),
    /top to bottom: \* then \+/,
  );
  assert.match(explainMistake(question, 1, "A B C * + +"), /extra tokens/);
  assert.match(explainMistake(question, 1, "A ( B C * ) +"), /never appear/);
  assert.match(
    explainMistake(postfixQuestion("A - B - C", 5), 1, "A B C - -"),
    /equal precedence/,
  );
  assert.throws(() => convert(["A", "toString", "B"]), /Unknown token/);
});

test("feedback tracks surviving operator occurrences and names unsupported input", () => {
  const expression = "A + ( B + C ) * D";
  const question = postfixQuestion(expression, expression.split(" ").length);
  const feedback = explainMistake(question, 0, ["*"]);
  assert.match(feedback, /\+ is still waiting below \*/);
  assert.match(feedback, /Push \+ onto the empty stack/);
  assert.doesNotMatch(feedback, /barrier/);
  for (const symbol of ["!", "^", "?"]) {
    const invalid = explainMistake(
      postfixQuestion("A + B", 3),
      1,
      `A ${symbol} B +`,
    );
    assert(invalid.startsWith(`${symbol} is not a supported token.`));
    assert.doesNotMatch(invalid, /at the end/);
  }
  assert.match(
    explainMistake(postfixQuestion("A + B * C", 5), 1, "A B / C *"),
    /expression has no \/ operator/,
  );
  assert.match(
    explainMistake(postfixQuestion("A + B * C", 5), 1, "A,B,+,C,*"),
    /Output C before \+/,
  );
  assert.match(
    explainMistake(postfixQuestion("12 + 3", 3), 1, "1 23 +"),
    /Keep each number intact/,
  );
});

test("each queue replay matches an independent FIFO oracle, including all blocked and wrapped moves", () => {
  const seen = new Set();
  for (let level = 1; level <= 3; level++) {
    for (let seed = 0; seed < 500; seed++) {
      const question = generateQueue(seeded(seed), level);
      const initialSnapshot = structuredClone(question.initial);
      const { capacity } = question.initial;
      const list = Array.from(
        { length: question.initial.count },
        (_, index) =>
          question.initial.cells[(question.initial.front + index) % capacity],
      );
      let front = question.initial.front;
      let rear = question.initial.rear;
      assert.equal(question.trace.length, question.operations.length);
      question.trace.forEach((entry, index) => {
        assert.deepEqual(
          entry.before,
          index ? question.trace[index - 1].state : question.initial,
        );
        assert.deepEqual(entry.operation, question.operations[index]);
        const { operation } = entry;
        let result;
        if (operation.kind === "enqueue") {
          if (list.length === capacity) result = "Full";
          else {
            result = operation.value;
            list.push(result);
            rear = (rear + 1) % capacity;
            if (rear === 0) seen.add("rear-wrap");
          }
        } else if (!list.length) result = "Empty";
        else {
          result = list.shift();
          front = (front + 1) % capacity;
          if (front === 0) seen.add("front-wrap");
        }
        seen.add(result);
        const cells = Array(capacity).fill(null);
        list.forEach((value, at) => {
          cells[(front + at) % capacity] = value;
        });
        assert.deepEqual(entry.state, {
          capacity,
          cells,
          count: list.length,
          front,
          rear,
        });
        assert.equal(entry.result, result);
        assert(entry.explanation.length < 150);
        assert(!entry.explanation.includes("return"));
      });
      assert.deepEqual(question.initial, initialSnapshot);
      assert.deepEqual(question.final, question.trace.at(-1).state);
      const step = question.steps[0];
      if (question.target === "result") {
        const label = step.optionLabels[step.answer];
        assert.match(label, /enqueued|dequeued|Fails/);
        assert(!step.prompt.includes("return"));
      }
      assert.match(step.hint, /back \(last\) item/);
      assert.match(step.hint, /neither points to an item/);
      assert(explainMistake(question, 0, "wrong").length < 300);
    }
  }
  for (const event of ["Full", "Empty", "front-wrap", "rear-wrap"])
    assert(seen.has(event));
});

test("queue feedback distinguishes rear from next insertion and explains FIFO removal", () => {
  let rearQuestion, removeQuestion, fullQuestion, emptyQuestion;
  for (let seed = 0; seed < 300; seed++) {
    const question = generateQueue(seeded(seed), 3);
    const last = question.trace.at(-1);
    if (question.target === "rear" && question.final.count > 0)
      rearQuestion ??= question;
    if (question.target === "result") {
      if (last.result === "Full") fullQuestion ??= question;
      else if (last.result === "Empty") emptyQuestion ??= question;
      else if (last.operation.kind === "dequeue") removeQuestion ??= question;
    }
  }
  assert(rearQuestion && removeQuestion && fullQuestion && emptyQuestion);
  const previous = (rearQuestion.final.rear + 1) % rearQuestion.final.capacity;
  assert.match(
    explainMistake(rearQuestion, 0, String(previous)),
    /rear marks the last item/,
  );
  assert.match(explainMistake(removeQuestion, 0, "wrong"), /oldest item/);
  assert.match(
    explainMistake(fullQuestion, 0, "wrong"),
    /QSize = capacity.*fails/,
  );
  assert.match(explainMistake(emptyQuestion, 0, "wrong"), /QSize = 0.*fails/);
});

test("all stack lessons process every token then visibly flush one operator at a time", () => {
  for (const lesson of postfixLessons) {
    if (lesson.id === "push-pop-rules") {
      const expected = convert(lesson.steps[0].tokens);
      assert.deepEqual(lesson.steps.at(-1).stack, []);
      assert.deepEqual(lesson.steps.at(-1).output, expected.postfix);
      continue;
    }
    const { tokens } = lesson.steps[0];
    const expected = convert(tokens);
    const tokenSteps = lesson.steps.slice(0, tokens.length + 1);
    tokenSteps.forEach((step, index) => {
      assert.equal(step.stop, index);
      assert.deepEqual(
        { stack: step.stack, output: step.output },
        expected.states[index],
      );
    });
    let previous = tokenSteps.at(-1);
    for (const step of lesson.steps.slice(tokens.length + 1)) {
      assert.deepEqual(step.stack, previous.stack.slice(0, -1));
      assert.deepEqual(step.output, [
        ...previous.output,
        previous.stack.at(-1),
      ]);
      assert.match(step.movement, /Finish/);
      previous = step;
    }
    assert.deepEqual(previous.stack, []);
    assert.deepEqual(previous.output, expected.postfix);
  }
});

test("queue lessons cover FIFO, wrap, full and empty without mutating previous scenes", () => {
  const results = new Set();
  for (const lesson of queueLessons) {
    if (lesson.id === "ordinary-fifo") {
      assert.deepEqual(
        lesson.steps.map((step) => step.state.items),
        [["10", "20"], ["10", "20", "30"], ["20", "30"], ["30"]],
      );
      continue;
    }
    for (let index = 1; index < lesson.steps.length; index++) {
      const step = lesson.steps[index];
      const previous = lesson.steps[index - 1].state;
      const snapshot = structuredClone(previous);
      assert.deepEqual(step.before, previous);
      const moved = queueMove(previous, step.operation);
      assert.deepEqual(step.state, moved.state);
      assert.equal(step.result, moved.result);
      assert.deepEqual(previous, snapshot);
      results.add(step.result);
    }
  }
  assert(results.has("Full") && results.has("Empty"));
  const wrap = queueLessons.find((lesson) => lesson.id === "wraparound");
  assert.equal(wrap.steps[2].state.rear, 0);
  assert.equal(wrap.steps[3].state.front, 0);
  assert.deepEqual(
    queueLessons.find((lesson) => lesson.id === "full-empty").steps.at(-1)
      .state,
    emptyQueue(3),
  );
});

test("every game has several individually selectable, short, complete lessons", () => {
  for (const game of games) {
    assert(game.lessons.length >= 3);
    assert.equal(
      new Set(game.lessons.map((lesson) => lesson.id)).size,
      game.lessons.length,
    );
    assert.equal(game.tutorial, game.lessons[0].steps);
    for (const lesson of game.lessons) {
      assert(lesson.title && lesson.summary && lesson.steps.length >= 3);
      for (const step of lesson.steps) {
        assert.equal(step.type, game.generate(() => 0.4, 1).type);
        assert(step.caption && step.caption.length < 160);
        assert(step.movement || step.result || step.visual);
      }
    }
  }
});

test("Big-O feedback corrects nested/sequential confusion and fixed growth models", () => {
  const base = { type: "bigO", steps: [{ explanation: "Fallback" }] };
  assert.match(explainMistake({ ...base, kind: "square" }, 0, "O(n)"), /n × n/);
  assert.match(
    explainMistake({ ...base, kind: "sequential" }, 0, "O(n²)"),
    /add their work/,
  );
  assert.match(
    explainMistake({ ...base, kind: "nlog" }, 0, "O(n²)"),
    /halves j/,
  );
  assert.match(
    explainMistake({ ...base, scale: { factor: 2, power: 0 } }, 0, "2×"),
    /stays fixed/,
  );
  assert.match(
    explainMistake({ ...base, scale: { factor: 3, power: 2 } }, 0, "3×"),
    /3\^2 = 9/,
  );
});

test("compact postfix mistakes get a conceptual explanation, not a spacing penalty", () => {
  const tokens = ["1", "+", "23"];
  const q = {
    type: "postfix",
    tokens,
    solution: convert(tokens),
    stop: 2,
    steps: [{ kind: "postfix", answer: "1 23 +" }],
  };
  assert.match(explainMistake(q, 0, "123-"), /no - operator/);
  assert.match(explainMistake(q, 0, "132+"), /left-to-right order/);
  assert.doesNotMatch(explainMistake(q, 0, "132+"), /space/);
});
