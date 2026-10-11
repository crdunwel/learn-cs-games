import { explainToken } from "../games/postfix.js";
import { workedExample } from "./feedback.js";

// These traces are presentation of already independently validated state models.
export function reviewSteps(question, at) {
  const step = question.steps[at];
  if (step.reviewSteps || question.reviewSteps)
    return step.reviewSteps || question.reviewSteps;
  if (question.type === "postfix") {
    const end = step.kind === "stack" ? question.stop : question.tokens.length;
    const entries = question.tokens.slice(0, end).map((token, i) => ({
      title: `Read ${token} · token ${i + 1}`,
      detail: explainToken(question.tokens, i, question.solution),
      math: `Stack top → bottom: ${[...question.solution.states[i + 1].stack].reverse().join(" ") || "empty"}\nPostfix so far: ${question.solution.states[i + 1].output.join(" ") || "empty"}`,
    }));
    if (step.kind === "postfix")
      entries.push({
        title: "Finish the expression",
        detail:
          "Input is done. Pop the remaining operators from top to bottom into postfix.",
        math: question.solution.postfix.join(" "),
      });
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
export function queueMoveSteps(entry) {
  const { before, state: after, operation: op, result } = entry;
  if (!before.cells)
    return [
      {
        title: op.kind === "enqueue" ? "Join the rear" : "Leave the front",
        detail: entry.explanation,
        math: `Before: ${before.items.join(" → ") || "empty"}\nAfter: ${after.items.join(" → ") || "empty"}`,
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
        math: `QSize = ${before.count}; capacity = ${before.capacity}.\nfront ${before.front}, rear ${before.rear}, QSize ${before.count}: all unchanged.`,
      },
    ];
  return op.kind === "enqueue"
    ? [
        {
          title: "Advance rear",
          detail:
            "rear names the last occupied item. Move one slot before storing the new item.",
          math: `rear = (${before.rear} + 1) % ${before.capacity} = ${after.rear}${after.rear === 0 ? " · wraps to index 0" : ""}`,
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
          math: `DEQUEUE returns Q[${before.front}] = ${result}`,
        },
        {
          title: "Advance front",
          detail: `rear stays ${after.rear}; removing an item does not move rear.`,
          math: `front = (${before.front} + 1) % ${before.capacity} = ${after.front}${after.front === 0 ? " · wraps to index 0" : ""}\nQSize = ${before.count} − 1 = ${after.count}`,
        },
      ];
}
