import { integer, pick } from "../engine/random.js";
const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };

// In this conversion, the stack holds pending operators, never operand values.
export const postfixRules = [
  {
    symbol: "Number or variable",
    instruction:
      "Append it directly to postfix. Do not push it onto this stack.",
  },
  {
    symbol: "(",
    instruction: "Push it. It is a barrier: operators below it must wait.",
  },
  {
    symbol: "+ − × ÷",
    instruction:
      "Compare the incoming operator with the stack top. While the top has higher or equal precedence, pop it into postfix and compare again. Stop at ( or a lower-precedence operator, then push the incoming operator.",
  },
  {
    symbol: ")",
    instruction:
      "Pop operators into postfix until (. Discard the matching (. Never push ) or put either parenthesis in postfix.",
  },
  {
    symbol: "End of input",
    instruction:
      "Pop every remaining operator into postfix, from top to bottom.",
  },
];

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

// One short causal caption per token; expanded actions show every repeated comparison.
export function explainToken(tokens, index, solution) {
  const token = tokens[index];
  const before = solution.states[index];
  const after = solution.states[index + 1];
  if (/^[A-Z]$|^\d+$/.test(token))
    return `${token} goes straight to postfix; operands never enter the operator stack.`;
  if (token === "(")
    return "Push (; it is a barrier. Operators below it must wait until its matching ).";
  const popped = after.output.slice(before.output.length);
  if (token === ")")
    return `Read ): pop ${popped.length ? popped.join(" then ") : "nothing"} into postfix until (; discard (. Never push ) or output parentheses.`;
  if (popped.length) {
    const comparisons = popped.map(
      (operator) =>
        `${operator} (${precedence[operator] === precedence[token] ? "equal" : "higher"} precedence)`,
    );
    const remaining = before.stack.slice(0, -popped.length);
    const stop = remaining.at(-1) === "(" ? "; stop at (" : "";
    return `Incoming ${token}: pop ${comparisons.join(" then ")} into postfix${stop}, then push ${token}.`;
  }
  return before.stack.length && before.stack.at(-1) !== "("
    ? `Incoming ${token} vs top ${before.stack.at(-1)}: ${token} has higher precedence. Push ${token} above ${before.stack.at(-1)}; keep the lower operator.`
    : `Push ${token}${before.stack.at(-1) === "(" ? " above the ( barrier" : " onto the empty stack"}.`;
}

export function explainTokenActions(tokens, index, solution) {
  const token = tokens[index];
  const before = solution.states[index];
  const after = solution.states[index + 1];
  const stack = [...before.stack];
  const output = [...before.output];
  const actions = [];
  const record = (title, detail) =>
    actions.push({ title, detail, stack: [...stack], output: [...output] });
  if (/^[A-Z]$|^\d+$/.test(token)) {
    output.push(token);
    record(
      `Read ${token} · append to postfix`,
      `Append ${token} directly to postfix. The operator stack does not change.`,
    );
    return actions;
  }
  if (token === "(") {
    stack.push(token);
    record(
      "Read ( · push",
      "Push (. It blocks access to the operators below it.",
    );
    return actions;
  }
  const popped = after.output.slice(before.output.length);
  if (token === ")") {
    for (const operator of popped) {
      stack.pop();
      output.push(operator);
      record(
        `Read ) · pop ${operator}`,
        `Pop ${operator} from the top into postfix. Keep popping until the matching (.`,
      );
    }
    stack.pop();
    record(
      "Read ) · discard (",
      "The top is now (. Discard it. Do not push ); neither parenthesis belongs in postfix.",
    );
    return actions;
  }
  for (const operator of popped) {
    const comparison =
      precedence[operator] === precedence[token]
        ? "equal precedence, so the earlier operator goes first"
        : "higher precedence";
    stack.pop();
    output.push(operator);
    record(
      `Incoming ${token} · pop ${operator}`,
      `Incoming ${token} vs top ${operator}: the top has ${comparison}. Pop ${operator} into postfix, then compare again.`,
    );
  }
  const top = stack.at(-1);
  const reason =
    top === "("
      ? "Stop at (. Do not pop across this barrier."
      : top
        ? `Incoming ${token} vs top ${top}: the top has lower precedence. Keep ${top} on the stack.`
        : "The stack is empty; there is nothing else to pop.";
  stack.push(token);
  record(
    `Incoming ${token} · push`,
    `${reason} Push the incoming ${token}; it waits for a later operator, closing parenthesis, or the end.`,
  );
  return actions;
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
    actionSteps: index
      ? explainTokenActions(tokens, index - 1, solution)
      : [
          {
            title: "Start with an empty stack and output",
            detail:
              "Read one token at a time, from left to right. Postfix is the output being built; the stack temporarily holds waiting operators.",
            stack: [],
            output: [],
          },
        ],
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
      activeIndex: -1,
      caption: `Input is finished. Pop ${operator} from the top into postfix${stack.length ? "; keep going" : "; the stack is now empty"}.`,
      actionSteps: [
        {
          title: `End of input · pop ${operator}`,
          detail: `No input remains. Pop ${operator} from the stack top and append it to postfix. ${stack.length ? "Repeat until the stack is empty." : "The stack is empty; the postfix expression is complete."}`,
          stack: [...stack],
          output: [...output],
        },
      ],
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
    "push-pop-rules",
    "When to push and pop",
    "Compare operators, respect parentheses, and finish the stack.",
    "2 + 3 * 4 - ( 5 - 1 )",
  ),
  stackLesson(
    "sample-checkpoint",
    "Exam-style checkpoint",
    "Point A is after +, before 6.",
    "1 * ( 7 - 4 ) / ( 5 + 6 )",
  ),
];
// The rule tour pauses on each elementary action, including repeated pops.
const rulesLesson = postfixLessons.find(
  (lesson) => lesson.id === "push-pop-rules",
);
rulesLesson.steps = rulesLesson.steps.flatMap((step) =>
  step.actionSteps.map((action, i) => ({
    ...step,
    caption: action.detail,
    movement: action.title,
    activeIndex: step.movement.startsWith("Finish")
      ? -1
      : step.stop
        ? step.stop - 1
        : undefined,
    stop:
      i === step.actionSteps.length - 1
        ? step.stop
        : Math.max(0, step.stop - 1),
    stack: [...action.stack],
    output: [...action.output],
    actionSteps: [action],
  })),
);
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
