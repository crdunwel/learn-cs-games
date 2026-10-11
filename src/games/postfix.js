import { integer, pick } from "../engine/random.js";
const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };

// States are AFTER each whole token, BEFORE the final flush; stacks are bottom-first internally.
export function convert(tokens) {
  const stack = [],
    output = [],
    states = [{ stack: [], output: [] }];
  let operandExpected = true;
  for (const token of tokens) {
    if (/^[A-Z]$|^\d+$/.test(token)) {
      if (!operandExpected) throw new Error("Expected operator");
      output.push(token);
      operandExpected = false;
    } else if (token === "(") {
      if (!operandExpected)
        throw new Error("Expected operator before parenthesis");
      stack.push(token);
    } else if (token === ")") {
      if (operandExpected || !stack.includes("("))
        throw new Error("Invalid closing parenthesis");
      while (stack.at(-1) !== "(") output.push(stack.pop());
      stack.pop();
    } else if (Object.hasOwn(precedence, token)) {
      if (operandExpected) throw new Error("Expected operand");
      while (stack.length && precedence[stack.at(-1)] >= precedence[token])
        output.push(stack.pop());
      stack.push(token);
      operandExpected = true;
    } else throw new Error("Unknown token");
    states.push({ stack: [...stack], output: [...output] });
  }
  if (operandExpected || stack.includes("("))
    throw new Error("Incomplete expression");
  while (stack.length) output.push(stack.pop());
  return { states, postfix: output };
}

// One causal sentence per processed token; shared by lessons and answer feedback.
export function explainToken(tokens, index, solution) {
  const token = tokens[index];
  const before = solution.states[index];
  const after = solution.states[index + 1];
  if (/^[A-Z]$|^\d+$/.test(token))
    return `${token} goes straight to postfix; operands never enter the operator stack.`;
  if (token === "(")
    return "Push (; it blocks operators below it from being popped.";
  const popped = after.output.slice(before.output.length);
  if (token === ")")
    return `Pop ${popped.length ? popped.join(" then ") : "nothing"} to postfix, then discard (; parentheses never enter postfix.`;
  if (popped.length) {
    const equal = precedence[popped.at(-1)] === precedence[token];
    return `Pop ${popped.join(" then ")} before pushing ${token}: ${equal ? "equal precedence runs left to right" : "higher precedence goes first"}.`;
  }
  return before.stack.length && before.stack.at(-1) !== "("
    ? `Push ${token} above ${before.stack.at(-1)} because it has higher precedence.`
    : `Push ${token}${before.stack.at(-1) === "(" ? " above the ( barrier" : " onto the empty stack"}.`;
}

export function generatePostfix(rng, level) {
  const count = integer(rng, level + 2, level * 2 + 3);
  function expression(size) {
    if (size === 1) return [String(integer(rng, 1, level === 1 ? 9 : 25))];
    const leftSize = integer(rng, 1, size - 1);
    const body = [
      ...expression(leftSize),
      pick(rng, ["+", "-", "*", "/"]),
      ...expression(size - leftSize),
    ];
    return rng() < 0.42 ? ["(", ...body, ")"] : body;
  }
  const tokens = expression(count),
    solution = convert(tokens);
  const stop = integer(rng, 1, tokens.length); // Always a genuinely processed checkpoint.
  const topFirst = [...solution.states[stop].stack].reverse();
  return {
    type: "postfix",
    tokens,
    stop,
    solution,
    checkpoint: {
      label: "A",
      after: stop,
      note:
        stop < tokens.length
          ? `After ${tokens[stop - 1]}, before ${tokens[stop]}.`
          : `After ${tokens[stop - 1]}, before the final stack is popped.`,
    },
    stackCapacity: Math.max(
      6,
      ...solution.states.map((state) => state.stack.length),
    ),
    steps: [
      {
        kind: "stack",
        prompt: "Show the stack at point A.",
        answer: topFirst.join(" "),
        hint: "Stop at point A, between the two tokens. The stack holds operators and opening parentheses. Numbers go straight to postfix. Pop equal or higher precedence before pushing an operator.",
        explanation: `${explainToken(tokens, stop - 1, solution)} Stack, top → bottom: ${topFirst.join(" ") || "empty"}.`,
      },
      {
        kind: "postfix",
        prompt: "Write the final postfix expression.",
        answer: solution.postfix.join(" "),
        hint: "Use the whole infix expression. Spaces are optional. Keep operands in order. At the end, pop every remaining operator into postfix.",
        explanation: `Operators follow their operands; pop the remaining stack from top to bottom at the end. Postfix: ${solution.postfix.join(" ")}.`,
      },
    ],
  };
}

function stackLesson(id, title, summary, expression) {
  const tokens = expression.split(" ");
  const solution = convert(tokens);
  const steps = solution.states.map((state, index) => ({
    type: "postfix",
    tokens,
    stop: index,
    stack: state.stack,
    output: state.output,
    movement: index ? `Read ${tokens[index - 1]}` : "Start",
    caption: index
      ? explainToken(tokens, index - 1, solution)
      : "Read left to right. The stack starts empty.",
  }));
  const stack = [...solution.states.at(-1).stack];
  const output = [...solution.states.at(-1).output];
  while (stack.length) {
    const operator = stack.pop();
    output.push(operator);
    steps.push({
      type: "postfix",
      tokens,
      stop: tokens.length,
      stack: [...stack],
      output: [...output],
      movement: `Finish · pop ${operator}`,
      caption: `Input is finished. Pop ${operator} from the top into postfix${stack.length ? "; keep going" : "; the stack is now empty"}.`,
    });
  }
  const stackCapacity = Math.max(6, ...steps.map((step) => step.stack.length));
  steps.forEach((step) => {
    step.stackCapacity = stackCapacity;
  });
  return { id, title, summary, steps };
}
export const postfixLessons = [
  stackLesson(
    "parentheses",
    "Parentheses first",
    "Follow 2 * (3 + 4).",
    "2 * ( 3 + 4 )",
  ),
  stackLesson(
    "precedence",
    "Multiply before adding",
    "See why * sits above +.",
    "2 + 3 * 4",
  ),
  stackLesson(
    "equal-precedence",
    "Ties go left to right",
    "Pop an equal operator, then finish.",
    "9 - 4 - 2",
  ),
  stackLesson(
    "sample-checkpoint",
    "Exam-style checkpoint",
    "Point A is after +, before 6.",
    "1 * ( 7 - 4 ) / ( 5 + 6 )",
  ),
];
// The sample marks A between + and 6; it is not an operand to read.
const checkpointLesson = postfixLessons.at(-1);
checkpointLesson.steps.forEach((step) => {
  step.checkpoint = { label: "A", after: 11, note: "After +, before 6." };
  if (step.stop === 11) {
    step.movement = "Point A";
    step.caption =
      "Stop before 6. Stack, top → bottom: + ( /. The + has been pushed; 6 has not been read.";
  }
});
export const postfixTutorial = postfixLessons[0].steps;
