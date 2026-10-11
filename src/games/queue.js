import { integer, pick, shuffle } from "../engine/random.js";
import { linkedDequeueLessons } from "../engine/linkedDequeue.js";

// Lab 6 Q3 convention: rear is the BACK item, not the next insertion slot.
// In every state: rear = (front + count - 1 + capacity) % capacity.
// For an empty queue, indices are retained but neither points to an item.
export const emptyQueue = (capacity, front = 0) => ({
  capacity,
  cells: Array(capacity).fill(null),
  front,
  rear: (front - 1 + capacity) % capacity,
  count: 0,
});
export function queueMove(state, operation) {
  const next = { ...state, cells: [...state.cells] };
  if (operation.kind === "enqueue") {
    if (state.count === state.capacity) return { state: next, result: "Full" };
    next.rear = (next.rear + 1) % next.capacity;
    next.cells[next.rear] = operation.value;
    next.count++;
    return { state: next, result: operation.value };
  }
  if (operation.kind !== "dequeue") throw new Error("Unknown queue operation");
  if (!state.count) return { state: next, result: "Empty" };
  const result = next.cells[next.front];
  next.cells[next.front] = null;
  next.front = (next.front + 1) % next.capacity;
  next.count--;
  return { state: next, result };
}
export const operationLabel = (op) =>
  op.kind === "enqueue" ? `ENQUEUE(${op.value})` : "DEQUEUE()";

export function explainQueueMove(before, operation, after, result) {
  if (result === "Full")
    return `QSize = capacity (${before.capacity}), so ENQUEUE(${operation.value}) fails. The queue stays unchanged.`;
  if (result === "Empty")
    return "QSize = 0, so DEQUEUE() fails. The queue stays unchanged.";
  if (operation.kind === "enqueue")
    return `rear moves ${before.rear} → ${after.rear}${after.rear < before.rear ? " (wraps)" : ""}; store ${operation.value} at index ${after.rear}. QSize becomes ${after.count}.`;
  return `Remove ${result} from index ${before.front}; front moves to ${after.front}${after.front < before.front ? " (wraps)" : ""}. rear stays ${after.rear}.`;
}

export function explainQueueTarget(question) {
  const { initial, final, target, trace } = question;
  const successful = trace.filter(
    (entry) => !["Full", "Empty"].includes(entry.result),
  );
  const added = successful.filter(
    (entry) => entry.operation.kind === "enqueue",
  );
  const removed = successful.filter(
    (entry) => entry.operation.kind === "dequeue",
  );
  if (target === "result") return trace.at(-1).explanation;
  if (target === "count")
    return `QSize: ${initial.count} + ${added.length} enqueued − ${removed.length} dequeued = ${final.count}${successful.length < trace.length ? ". Failed operations change nothing" : ""}.`;
  const changes = target === "front" ? removed : added;
  const action = target === "front" ? "DEQUEUE()" : "ENQUEUE()";
  if (!changes.length)
    return `${target} stays ${initial[target]}; only a successful ${action} advances it.`;
  const route = [
    initial[target],
    ...changes.map((entry) => entry.state[target]),
  ];
  const wrapped = route.some(
    (value, index) => index && value < route[index - 1],
  );
  return `${target}: ${route.join(" → ")}. Each successful ${action} advances it one index${wrapped ? `; ${initial.capacity - 1} wraps to 0` : ""}.`;
}

export function generateCircularQueue(rng, level) {
  const capacity = integer(rng, 4, 6);
  let initial = emptyQueue(
    capacity,
    level === 1 ? 0 : integer(rng, 0, capacity - 1),
  );
  const count = integer(rng, 0, capacity);
  let serial = integer(rng, 1, 5) * 10;
  const nextValue = () => String((serial += 10));
  for (let i = 0; i < count; i++)
    initial = queueMove(initial, { kind: "enqueue", value: nextValue() }).state;
  let final = initial,
    result;
  const trace = [];
  const operations = Array.from({ length: level }, () => {
    const op =
      rng() < 0.5
        ? { kind: "enqueue", value: nextValue() }
        : { kind: "dequeue" };
    const before = final;
    ({ state: final, result } = queueMove(before, op));
    trace.push({
      before,
      state: final,
      operation: op,
      result,
      explanation: explainQueueMove(before, op, final, result),
    });
    return op;
  });
  const target = pick(rng, ["front", "rear", "count", "result"]);
  const answer = target === "result" ? result : String(final[target]);
  const last = trace.at(-1);
  const adding = last.operation.kind === "enqueue";
  // Prefer values seen in the trace as distractors; use 0 only for an always-empty queue.
  const priorValues = [
    ...new Set([
      ...last.before.cells.filter((value) => value !== null),
      ...initial.cells.filter((value) => value !== null),
      ...operations.filter((op) => op.kind === "enqueue").map((op) => op.value),
    ]),
  ];
  const resultChoices = adding
    ? [last.operation.value, "Full"]
    : [
        ...new Set([
          result,
          "Empty",
          ...(priorValues.length ? shuffle(rng, priorValues) : ["0"]),
        ]),
      ].slice(0, 4);
  const options =
    target === "result"
      ? shuffle(rng, resultChoices)
      : Array.from(
          { length: target === "count" ? capacity + 1 : capacity },
          (_, i) => String(i),
        );
  const after =
    operations.length === 1 ? operationLabel(operations[0]) : "all operations";
  const prompt = {
    front: `After ${after}, what is the value of front?`,
    rear: `After ${after}, what is the value of rear?`,
    count: `After ${after}, what is QSize?`,
    result: `What is the result of ${operations.length > 1 ? "the final " : ""}${operationLabel(operations.at(-1))}?`,
  }[target];
  const question = {
    type: "queue",
    initial,
    final,
    operations,
    trace,
    target,
    steps: [
      {
        kind: "choice",
        prompt,
        answer,
        options,
        optionLabels:
          target === "result"
            ? Object.fromEntries(
                options.map((value) => [
                  value,
                  value === "Full"
                    ? "Fails · queue full"
                    : value === "Empty"
                      ? "Fails · queue empty"
                      : `${value} ${adding ? "enqueued" : "dequeued"}`,
                ]),
              )
            : undefined,
        hint: "front = index of the first item; rear = index of the back (last) item. ENQUEUE(x) advances rear, then stores x. DEQUEUE() removes the front item, then advances front. QSize counts items. Indices wrap to 0. When empty, we retain front and rear = (front − 1 + capacity) % capacity; neither points to an item.",
      },
    ],
  };
  question.steps[0].explanation = explainQueueTarget(question);
  return question;
}

function queueLesson(id, title, summary, initial, operations, caption) {
  let state = initial;
  const steps = [{ type: "queue", state, caption, movement: "Start" }];
  for (const operation of operations) {
    const before = state;
    const moved = queueMove(before, operation);
    state = moved.state;
    steps.push({
      type: "queue",
      before,
      state,
      operation,
      result: moved.result,
      movement: operationLabel(operation),
      caption: explainQueueMove(before, operation, state, moved.result),
    });
  }
  return { id, title, summary, steps };
}
const add = (value) => ({ kind: "enqueue", value });
const remove = { kind: "dequeue" };
export const queueLabExample = {
  initial: {
    capacity: 5,
    cells: ["20", null, null, "40", "10"],
    front: 3,
    rear: 0,
    count: 3,
  },
  operations: [add("50"), remove, add("60"), add("70"), add("80")],
};
export const queueLessons = [
  queueLesson(
    "fifo",
    "First in, first out",
    "ENQUEUE adds. DEQUEUE removes.",
    emptyQueue(4),
    [add("10"), add("20"), add("30"), remove, remove],
    "Empty queue: QSize = 0. ENQUEUE(10) will store 10 at index 0.",
  ),
  queueLesson(
    "wraparound",
    "Wrap around",
    "After the last index, return to 0.",
    emptyQueue(4, 3),
    [add("10"), add("20"), remove, add("30"), remove],
    "Empty queue: ENQUEUE(10) will store 10 at index 3. The next item wraps to index 0.",
  ),
  queueLesson(
    "full-empty",
    "Full or empty?",
    "Check QSize before each operation.",
    emptyQueue(3),
    [
      add("10"),
      add("20"),
      add("30"),
      add("40"),
      remove,
      remove,
      remove,
      remove,
    ],
    "QSize = 0 means empty. QSize = capacity means full. Failed operations change nothing.",
  ),
  queueLesson(
    "lab-trace",
    "Lab 6 · circular queue",
    "The exact Question 3 trace.",
    queueLabExample.initial,
    queueLabExample.operations,
    "front = 3 holds 40; rear = 0 holds 20. In FIFO order: 40, 10, 20. QSize = 3.",
  ),
];
export const queueTutorial = queueLessons[0].steps;

// Ordinary FIFO questions use values, never physical array indices or wraparound.
export function generateFifoQueue(rng, level) {
  const count = integer(rng, 0, 4),
    start = integer(rng, 1, 5) * 10;
  let serial = start + count * 10;
  const initial = {
    items: Array.from({ length: count }, (_, i) => String(start + i * 10)),
  };
  let items = [...initial.items];
  const trace = [],
    operations = [];
  for (let i = 0; i < level; i++) {
    const before = { items: [...items] };
    const operation =
      rng() < 0.5
        ? { kind: "enqueue", value: String((serial += 10)) }
        : { kind: "dequeue" };
    let result;
    if (operation.kind === "enqueue") {
      items.push(operation.value);
      result = operation.value;
    } else result = items.length ? items.shift() : "Empty";
    const state = { items: [...items] };
    const explanation =
      operation.kind === "enqueue"
        ? `Add ${operation.value} after the last item. The oldest item stays at the front.`
        : result === "Empty"
          ? "There is no first item, so DEQUEUE fails and changes nothing."
          : `Remove ${result}, the first (oldest) item. The next item becomes the front.`;
    trace.push({ before, state, operation, result, explanation });
    operations.push(operation);
  }
  const target = pick(rng, ["first", "last", "count", "result"]),
    final = { items };
  const answer =
    target === "count"
      ? String(items.length)
      : target === "first"
        ? (items[0] ?? "Empty")
        : target === "last"
          ? (items.at(-1) ?? "Empty")
          : trace.at(-1).result;
  const pool =
    target === "count"
      ? Array.from({ length: 8 }, (_, i) => String(i))
      : [
          answer,
          "Empty",
          ...initial.items,
          ...operations
            .filter((op) => op.kind === "enqueue")
            .map((op) => op.value),
          "0",
        ];
  const options = shuffle(rng, [...new Set(pool)]).slice(0, 4);
  if (!options.includes(answer)) options[0] = answer;
  const prompt = {
    first: "After the operations, which item is next to leave?",
    last: "After the operations, which item is last in line?",
    count: "After the operations, how many items remain?",
    result: `Which item does the final ${operationLabel(operations.at(-1))} ${operations.at(-1).kind === "enqueue" ? "add" : "remove"}?`,
  }[target];
  return {
    type: "queue",
    variant: "fifo",
    initial,
    final,
    trace,
    operations,
    target,
    steps: [
      {
        kind: "choice",
        prompt,
        answer,
        options,
        hint: "This is an ordinary FIFO queue. ENQUEUE joins the end; DEQUEUE removes the first item. There are no array indices or wraparound.",
        explanation: `Follow the line from front to rear. Final order: ${items.join(", ") || "empty"}. ${target === "count" ? `${items.length} items remain.` : `The requested item is ${answer}.`}`,
      },
    ],
  };
}
export function generateQueue(rng, level) {
  return rng() < 0.3
    ? generateFifoQueue(rng, level)
    : generateCircularQueue(rng, level);
}

queueLessons.push({
  id: "ordinary-fifo",
  title: "Ordinary queue · no wrapping",
  summary: "Follow the item order, front to rear.",
  steps: [
    {
      type: "queue",
      state: { items: ["10", "20"] },
      caption:
        "10 arrived first, so it is at the front. 20 is last, at the rear.",
      movement: "Start",
    },
    {
      type: "queue",
      state: { items: ["10", "20", "30"] },
      caption: "ENQUEUE(30) joins the rear. Existing items keep their order.",
      movement: "ENQUEUE(30)",
    },
    {
      type: "queue",
      state: { items: ["20", "30"] },
      caption: "DEQUEUE() removes 10 from the front. 20 is now next to leave.",
      movement: "DEQUEUE()",
    },
    {
      type: "queue",
      state: { items: ["30"] },
      caption:
        "DEQUEUE() removes 20. Only 30 remains; it is both front and rear.",
      movement: "DEQUEUE()",
    },
  ],
});
queueLessons.push(...linkedDequeueLessons);
