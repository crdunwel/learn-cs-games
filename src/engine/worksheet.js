import { practiceGames } from "../games/index.js";
import { generateExam } from "../games/exam.js";
import { seeded, shuffle } from "./random.js";
import { explainToken } from "../games/postfix.js";

const practiceById = (id) => practiceGames.find((game) => game.id === id);

// The paper uses the same solvers as the games, but omits hints, worked traces,
// colored state, and answers. A seeded set is reproducible from its printed ID.
export function generateWorksheet({
  gameId,
  seed = Date.now(),
  count = 3,
  level = 3,
  exam,
} = {}) {
  if (gameId === "exam") return exam || generateExam(seed);
  const game = practiceById(gameId);
  if (!game) throw new Error("Unknown worksheet game");
  if (![3, 5, 10].includes(count) || ![1, 2, 3].includes(level))
    throw new Error("Invalid worksheet settings");
  const rng = seeded(seed);
  const seen = new Set();
  const questions = [];
  for (
    let tries = 0;
    questions.length < count && tries < count * 100;
    tries++
  ) {
    const source = game.generate(rng, level);
    const question = paperQuestion(gameId, source, rng);
    const signature = JSON.stringify(question);
    if (seen.has(signature)) continue;
    seen.add(signature);
    questions.push({
      ...question,
      id: `q${questions.length + 1}`,
      label: String(questions.length + 1),
    });
  }
  if (questions.length !== count)
    throw new Error("Could not generate a fresh worksheet");
  return {
    id: `${gameId}-${Number(seed) >>> 0}-L${level}`,
    seed,
    title: `${game.topic} — Practice`,
    gameId,
    level,
    questions,
  };
}

export function paperQuestion(gameId, source, rng) {
  if (gameId === "postfix") {
    const candidates = Array.from(
      { length: source.tokens.length - 1 },
      (_, i) => i,
    ).filter((index) => source.solution.states[index + 1].stack.length <= 8);
    const stops = shuffle(rng, candidates)
      .slice(0, 3)
      .sort((a, b) => a - b);
    const checkpoints = stops.map((stop, index) => ({
      label: "ABC"[index],
      stop,
    }));
    return {
      title: "Infix to postfix",
      prompt:
        "Convert the infix expression to postfix using a stack. Show the operator stack at points A, B, and C. Each letter marks a position between tokens: process everything before the letter, but nothing after it.",
      diagram: { type: "postfix", tokens: source.tokens, checkpoints },
      parts: [
        ...checkpoints.map(({ label, stop }) => ({
          id: label,
          kind: "stack",
          prompt: `Stack at ${label} (top to bottom)`,
          answer:
            [...source.solution.states[stop + 1].stack].reverse().join(" ") ||
            "empty",
          explanation: explainToken(source.tokens, stop, source.solution),
          auto: true,
        })),
        {
          id: "postfix",
          kind: "postfix",
          prompt: "Resulting postfix expression",
          answer: source.solution.postfix.join(" "),
          explanation:
            "Write operands immediately. Pop higher or equal precedence operators before pushing; at the end, pop the remaining stack.",
          auto: true,
        },
      ],
    };
  }
  if (gameId === "queue") {
    const { initial, final, operations } = source;
    const last = source.trace.at(-1);
    return {
      title: "Circular-array queue",
      prompt:
        "Apply the operations in order. front is the index of the first item; rear is the index of the last item. ENQUEUE advances rear before storing; DEQUEUE advances front after removing. Indices wrap. A failed operation leaves the queue unchanged. Retain indices when empty; blank cells are unused.",
      diagram: {
        type: "queue",
        ...initial,
        operations,
        rearMeaning: "last item",
        showFinal: true,
      },
      parts: [
        {
          id: "cells",
          kind: "text",
          prompt: "Final array (index order; use a dash for an unused cell)",
          answer: final.cells.map((v) => v ?? "—").join(", "),
          explanation: source.trace.map((entry) => entry.explanation).join(" "),
          auto: true,
        },
        ...["front", "rear", "count"].map((key) => ({
          id: key,
          kind: "number",
          prompt: key === "count" ? "Final QSize" : `Final ${key}`,
          answer: String(final[key]),
          explanation:
            key === "count"
              ? "QSize counts only items still in the queue."
              : `Only successful ${key === "front" ? "DEQUEUE" : "ENQUEUE"} operations advance ${key}.`,
          auto: true,
        })),
        {
          id: "result",
          kind: "text",
          prompt:
            "Value enqueued/dequeued by the final operation, or Full/Empty if it fails",
          answer: String(last.result),
          explanation: last.explanation,
          auto: true,
        },
      ],
    };
  }
  let prompt = "Show your work.";
  let code = source.code;
  let diagram;
  if (gameId === "bigO") {
    prompt = source.scale
      ? `The exact work model is W(n) = n^${source.scale.power}. The input changes from n to ${source.scale.factor}n, where n > 0.`
      : "Assume n > 0, arithmetic does not overflow, and work() performs one constant-time O(1) operation.";
  }
  if (gameId === "links") {
    prompt =
      "Each node has int data and node *next. All shown allocations succeed. The starting list is shown below.";
    diagram = { type: "list", values: source.visual.items };
  } else if (source.visual?.kind === "array") {
    diagram = {
      type: "array",
      values: source.visual.items,
      label: source.visual.label,
    };
  }
  return {
    title: practiceById(gameId).topic,
    prompt,
    code,
    diagram,
    parts: source.steps.map((step, index) => ({
      id: String(index + 1),
      prompt: step.prompt,
      kind: step.kind === "input" ? "text" : step.kind,
      options: step.options,
      answer: step.answer,
      explanation: step.explanation,
      auto: true,
    })),
  };
}
