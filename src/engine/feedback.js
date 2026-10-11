import { explainToken } from "../games/postfix.js";
import { explainQueueTarget } from "../games/queue.js";
import { normalize, normalizePostfix } from "./session.js";
import { equalPostfix } from "./answerFormats.js";

const answerTokens = (draft) =>
  Array.isArray(draft)
    ? draft
    : String(draft)
        .toUpperCase()
        .match(/[A-Z]|\d+|[()+*/-]/g) || [];
const same = (a, b) =>
  a.length === b.length && a.every((token, index) => token === b[index]);

// Track occurrences, not operator values: an outer + can survive an inner +.
function stackSourceIndices(tokens, stop, solution) {
  const sources = [];
  for (let index = 0; index < stop; index++) {
    const pushes = ["+", "-", "*", "/", "("].includes(tokens[index]);
    sources.length = solution.states[index + 1].stack.length - Number(pushes);
    if (pushes) sources.push(index);
  }
  return sources;
}

function stackMistake(question, draft) {
  const { tokens, stop, solution } = question;
  const actual = answerTokens(draft);
  const expected = [...solution.states[stop].stack].reverse();
  if (actual.some((value) => /^[A-Z]|\d/.test(value)))
    return "Operands go straight to postfix. Only operators and opening parentheses belong in this stack.";
  if (actual.includes(")"))
    return "A closing ) is never pushed. It pops operators through the matching (, then both parentheses disappear.";
  if (actual.length > 1 && same([...actual].reverse(), expected))
    return "Your stack is upside down. The newest remaining operator belongs at the top; the oldest is at the bottom.";
  if (!actual.length && expected.length && stop === tokens.length)
    return "This checkpoint is before the final pop. Operators still waiting on the stack leave only when you finish the postfix step.";
  if (expected.includes("(") && !actual.includes("("))
    return "Keep the opening ( on the stack until its matching ) is processed. It protects the operators below it.";
  const excess = actual.find(
    (value) =>
      actual.filter((x) => x === value).length >
      expected.filter((x) => x === value).length,
  );
  if (excess) {
    if (excess === "(") {
      const unmatched = expected.filter((value) => value === "(").length;
      if (unmatched)
        return `Only ${unmatched} opening ${unmatched === 1 ? "parenthesis is" : "parentheses are"} still unmatched. Push each ( once and discard it when its matching ) is processed.`;
      return tokens.slice(0, stop).includes("(")
        ? "The matching ) has already been processed, so discard (. Parentheses never remain after their group closes."
        : "No opening ( has been read at this checkpoint. Push a parenthesis only when it appears in the input.";
    }
    for (let index = stop - 1; index >= 0; index--) {
      const emitted = solution.states[index + 1].output.slice(
        solution.states[index].output.length,
      );
      if (emitted.includes(excess))
        return `The extra ${excess} has already moved to postfix. ${explainToken(tokens, index, solution)}`;
    }
  }
  const mismatch = expected.findIndex(
    (value, index) => actual[index] !== value,
  );
  const required = expected[mismatch];
  if (required) {
    const pushedAt = stackSourceIndices(tokens, stop, solution)[
      expected.length - 1 - mismatch
    ];
    const cause = explainToken(tokens, pushedAt, solution);
    return excess && !tokens.slice(0, stop).includes(excess)
      ? `${excess} has not been read at this checkpoint. ${cause}`
      : `${required} is still waiting ${mismatch === 0 ? "at the top" : `below ${expected[mismatch - 1]}`}. ${cause}`;
  }
  if (excess)
    return !tokens.slice(0, stop).includes(excess)
      ? `${excess} has not been read at this checkpoint. Keep only operators that have been processed and are still waiting.`
      : `Your stack has an extra ${excess}. Push each input operator once; a repeated click adds a second copy.`;
  return `No operators are waiting at this checkpoint. ${explainToken(tokens, stop - 1, solution)}`;
}

function postfixMistake(question, draft) {
  const entry = String(Array.isArray(draft) ? draft.join(" ") : draft).replace(
    /[;,]/g,
    " ",
  );
  const text = normalizePostfix(entry);
  if (
    text === normalizePostfix(question.solution.postfix.join(" ")) &&
    !equalPostfix(entry, question.solution.postfix.join(" "))
  )
    return `Keep each number intact: the operands are ${question.tokens.filter((token) => /^\d+$/.test(token)).join(" → ")}. Separating digits differently changes the numbers.`;
  const unsupported = text.match(/[^A-Z0-9()+*/-]/u)?.[0];
  if (unsupported)
    return `${unsupported} is not a supported token. Use operands and +, -, *, / for postfix.`;
  const { tokens, solution } = question;
  const knownOperands = tokens.filter((token) => /^[A-Z]$|^\d+$/.test(token));
  let operandIndex = 0;
  // Recover compact numbers from the operand order supplied by the infix input.
  const actual = (text.match(/[A-Z]|\d+|[()+*/-]/g) || []).flatMap((token) => {
    if (!/^\d+$/.test(token)) {
      if (/^[A-Z]$/.test(token)) operandIndex++;
      return [token];
    }
    const recovered = [];
    let remaining = token;
    while (
      remaining &&
      knownOperands[operandIndex] &&
      remaining.startsWith(knownOperands[operandIndex])
    ) {
      const operand = knownOperands[operandIndex++];
      recovered.push(operand);
      remaining = remaining.slice(operand.length);
    }
    return remaining ? [...recovered, remaining] : recovered;
  });
  if (actual.some((token) => token === "(" || token === ")"))
    return "Parentheses control grouping but never appear in postfix. Output only operands and operators.";
  const unexpected = actual.find(
    (token) => ["+", "-", "*", "/"].includes(token) && !tokens.includes(token),
  );
  if (unexpected)
    return `The expression has no ${unexpected} operator. Use each input operator exactly once.`;
  const operands = tokens.filter((token) => /^[A-Z]$|^\d+$/.test(token));
  const actualOperands = actual.filter((token) => /^[A-Z]$|^\d+$/.test(token));
  if (!same(operands, actualOperands))
    return `Operands keep their left-to-right order: ${operands.join(" → ")}. Each operand must appear exactly once; changing the operator order never changes the operand order.`;
  let mismatch = 0;
  while (
    actual[mismatch] === solution.postfix[mismatch] &&
    mismatch < solution.postfix.length
  )
    mismatch++;
  if (mismatch === solution.postfix.length)
    return "Every input operator appears exactly once in postfix. Your answer has extra tokens at the end.";
  const expected = solution.postfix[mismatch];
  if (/^[A-Z]$|^\d+$/.test(expected))
    return `Output ${expected} before ${actual[mismatch] || "the next operator"}; a postfix operator comes after both of its operands.`;
  const emittedAt = solution.states.findIndex(
    (state) => state.output.length > mismatch,
  );
  if (emittedAt > 0) return explainToken(tokens, emittedAt - 1, solution);
  const remaining = [...solution.states.at(-1).stack].reverse();
  return `At the end, pop the remaining stack from top to bottom: ${remaining.join(" then ")}. These operators still need to follow their operands.`;
}

function queueMistake(question, draft) {
  const { target, final } = question;
  const explanation = explainQueueTarget(question);
  if (
    target === "rear" &&
    final.count > 0 &&
    Number(draft) === (final.rear + 1) % final.capacity
  )
    return `rear marks the last item, at index ${final.rear}. ${(final.rear + 1) % final.capacity} is the next insertion index.`;
  if (target === "result") {
    const last = question.trace.at(-1);
    if (
      last.operation.kind === "dequeue" &&
      !["Full", "Empty"].includes(last.result)
    )
      return `${last.result} entered first, so it leaves from front slot ${last.before.front}. A queue removes the oldest item.`;
  }
  return explanation;
}

// Keep mistakes causal and short; the UI separately displays the user's/correct answer.
export function explainMistake(question, stepIndex, draft) {
  const step = question.steps[stepIndex];
  if (question.type === "postfix")
    return step.kind === "stack"
      ? stackMistake(question, draft)
      : postfixMistake(question, draft);
  if (question.type === "queue") return queueMistake(question, draft);
  if (question.scale) {
    const { power, factor } = question.scale;
    return power === 0
      ? "W(n) = 1 stays fixed as n grows, so the work stays the same."
      : `The input multiplier is raised to the model's power: ${factor}^${power} = ${factor ** power}. Divide the new work by the old work, not by the new input.`;
  }
  if (question.kind === "square" && normalize(draft) === "O(2ⁿ)".toUpperCase())
    return "The inner loop repeats n times for each of n outer turns: n × n, not 2 raised to n. At n = 3 that is 9 calls; at n = 6 it is 36.";
  if (question.kind === "square" && normalize(draft) === "O(N)")
    return "The inner loop restarts for every outer turn. That makes n × n calls.";
  if (question.kind === "sequential" && normalize(draft) === "O(N²)")
    return "These loops run one after the other, so add their work: n + n = 2n. The fixed factor 2 drops out.";
  if (question.kind === "nlog" && normalize(draft) === "O(N²)")
    return "The inner loop halves j, so it takes log₂ n turns. Repeat it n times to get n log n.";
  return step.explanation;
}

// Concrete before/after examples accompany the causal explanation, without a wall of text.
export function workedExample(question, stepIndex) {
  const step = question.steps[stepIndex];
  if (step.illustration) return step.illustration;
  if (question.type === "queue")
    return [
      `front: ${question.initial.front} → ${question.final.front}`,
      `rear: ${question.initial.rear} → ${question.final.rear}`,
      `QSize: ${question.initial.count} → ${question.final.count}`,
    ];
  if (question.type === "postfix") {
    if (step.kind === "stack") {
      const before = question.solution.states[question.stop - 1].stack;
      const after = question.solution.states[question.stop].stack;
      return [
        `Before: ${[...before].reverse().join(" ") || "empty"}`,
        `Read ${question.tokens[question.stop - 1]}`,
        `After: ${[...after].reverse().join(" ") || "empty"}`,
      ];
    }
    const remaining = [...question.solution.states.at(-1).stack].reverse();
    return remaining.length
      ? [
          `Final stack: ${remaining.join(" ")}`,
          `Append ${remaining.join(" → ")}`,
        ]
      : ["The final ) emptied the stack", "Nothing left to append"];
  }
  if (question.scale) {
    const { factor, power } = question.scale;
    return [
      `Input × ${factor}`,
      `Work × ${factor}^${power}`,
      `= ${factor ** power}×`,
    ];
  }
  const examples = {
    constant: [
      "n changes",
      "The loop limit stays fixed",
      "Same number of calls",
    ],
    linear: [
      "Input n",
      "About n / step calls",
      "Input 2n → about twice the calls",
    ],
    square: ["n = 3: 3 × 3 = 9", "n = 6: 6 × 6 = 36", "Double n → 4× work"],
    log: [
      "n = 8: 8 → 4 → 2",
      "n = 16: 16 → 8 → 4 → 2",
      "Double n → one extra call",
    ],
    nlog: [
      "n = 8: 8 × 3 = 24",
      "n = 16: 16 × 4 = 64",
      "n outer × log₂ n inner",
    ],
    triangle: ["n = 4: 0 + 1 + 2 + 3 = 6", "n(n − 1)/2", "Leading term: n²"],
    sequential: ["n = 3: 3 + 3 = 6", "n = 6: 6 + 6 = 12", "Double n → 2× work"],
  };
  return examples[question.kind] || [];
}
