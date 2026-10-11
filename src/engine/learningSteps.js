import { explainTokenActions } from "../games/postfix.js";
import { workedExample } from "./feedback.js";

// These traces are presentation of already independently validated state models.
export function reviewSteps(question, at) {
  const step = question.steps[at];
  if (step.reviewSteps || question.reviewSteps)
    return step.reviewSteps || question.reviewSteps;
  if (question.type === "postfix") {
    const end = step.kind === "stack" ? question.stop : question.tokens.length;
    const entries = question.tokens
      .slice(0, end)
      .flatMap((token, i) =>
        explainTokenActions(question.tokens, i, question.solution).map(
          (action) => ({
            title: action.title,
            detail: action.detail,
            math: `Stack top → bottom: ${[...action.stack].reverse().join(" ") || "empty"}\nPostfix so far: ${action.output.join(" ") || "empty"}`,
          }),
        ),
      );
    if (step.kind === "postfix") {
      const stack = [...question.solution.states.at(-1).stack],
        output = [...question.solution.states.at(-1).output];
      while (stack.length) {
        const operator = stack.pop();
        output.push(operator);
        entries.push({
          title: `End of input · pop ${operator}`,
          detail: `Append ${operator} from the stack top to postfix. ${stack.length ? "Keep popping the remaining operators." : "The stack is now empty."}`,
          math: `Stack top → bottom: ${[...stack].reverse().join(" ") || "empty"}\nPostfix: ${output.join(" ")}`,
        });
      }
    }
    return entries;
  }
  const examples = workedExample(question, at);
  return [
    { title: "Read the rule", detail: step.explanation },
    ...examples.map((math, i) => ({
      title: `Work it through · ${i + 1}`,
      math,
    })),
  ];
}
const fifoLabels = (items) =>
  items.length === 0
    ? "FRONT: no item · REAR: no item"
    : items.length === 1
      ? `FRONT + REAR: ${items[0]}`
      : `FRONT → ${items.join(" → ")} ← REAR`;
export function queueMoveSteps(entry) {
  const { before, state: after, operation: op, result } = entry;
  if (!before.cells)
    return [
      {
        title: op.kind === "enqueue" ? "Join the rear" : "Leave the front",
        detail: entry.explanation,
        math: `Before: ${fifoLabels(before.items)}\nAfter: ${fifoLabels(after.items)}`,
      },
    ];
  if (result === "Full" || result === "Empty")
    return [
      {
        title: "Check the size",
        detail:
          result === "Full"
            ? "All slots are occupied, so enqueue fails."
            : "There is no item to remove, so dequeue fails.",
        math: `QSize = ${before.count}; capacity = ${before.capacity}.\nFRONT = ${before.front}; REAR = ${before.rear}: unchanged.`,
      },
    ];
  return op.kind === "enqueue"
    ? [
        {
          title: "Advance rear",
          detail:
            "rear names the last occupied item. Move one slot before storing the new item.",
          math: `rear = (${before.rear} + 1) % ${before.capacity} = ${after.rear}${after.rear === 0 ? " · wraps to index 0" : ""}\nFRONT = ${after.front}; REAR = ${after.rear}`,
        },
        {
          title: `Store ${op.value}`,
          detail: `Put the new item in slot ${after.rear}. front stays ${after.front}.`,
          math: `Q[${after.rear}] = ${op.value}; QSize = ${before.count} + 1 = ${after.count}`,
        },
      ]
    : [
        {
          title: `Remove ${result}`,
          detail: `Take the first item from front slot ${before.front}.`,
          math: `FRONT = ${before.front}; REAR = ${before.rear}\nDEQUEUE returns Q[${before.front}] = ${result}`,
        },
        {
          title: "Advance front",
          detail: `rear stays ${after.rear}; removing an item does not move rear.`,
          math: `front = (${before.front} + 1) % ${before.capacity} = ${after.front}${after.front === 0 ? " · wraps to index 0" : ""}\nFRONT = ${after.front}; REAR = ${after.rear}\nQSize = ${before.count} − 1 = ${after.count}`,
        },
      ];
}
