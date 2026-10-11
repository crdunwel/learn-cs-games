// Static code-bound walkthroughs. This model is deliberately separate from the
// circular-array and ordinary FIFO practice models: head/tail are node pointers.

export const linkedDequeueCode = Object.freeze([
  "int dequeue(queue *thisQ) {",
  "    if(thisQ == NULL)",
  "        return 0;",
  "    if(thisQ->size == 0)",
  "        return 0;",
  "    int retval = thisQ->head->data;",
  "    node *temp = thisQ->head;",
  "    thisQ->head = thisQ->head->next;",
  "    if(thisQ->size > 1)",
  "        thisQ->head->prev = NULL;",
  "    else",
  "        thisQ->tail = NULL;",
  "    free(temp);",
  "    thisQ->size--;",
  "    return retval;",
  "}",
]);

function freeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Build one dequeue call for a valid, finite doubly linked queue of 0–6 ints. */
export function buildLinkedDequeueLesson(values) {
  if (
    !Array.isArray(values) ||
    values.length > 6 ||
    Array.from(values).some(
      (value) =>
        !Number.isInteger(value) || value < -2147483648 || value > 2147483647,
    )
  )
    throw new TypeError("A linked dequeue example needs 0–6 C int values.");

  const ids = values.map((_, index) => String.fromCharCode(65 + index));
  const state = {
    queueExists: true,
    head: ids[0] ?? null,
    tail: ids.at(-1) ?? null,
    size: values.length,
    nodes: values.map((value, index) => ({
      id: ids[index],
      value,
      next: ids[index + 1] ?? null,
      prev: ids[index - 1] ?? null,
      freed: false,
    })),
    temp: null,
    retval: null,
    returned: null,
    finished: false,
  };
  const steps = [];
  function add(title, caption, why, activeLines, change) {
    steps.push({
      type: "linkedQueue",
      title,
      caption,
      why,
      activeLines,
      change,
      state: structuredClone(state),
    });
  }

  add(
    "Meet the queue",
    values.length
      ? "head points to the first node; tail points to the last. next goes forward; prev goes backward."
      : "The queue exists, but has no nodes. head and tail are NULL; size is 0.",
    "A pointer stores a node’s address. Moving an arrow does not move a node.",
    [],
    "start",
  );
  add(
    "Does the queue exist?",
    "thisQ is not NULL, so the function continues. Nothing changes yet.",
    "This guard prevents accessing fields through a NULL queue pointer.",
    [1],
    "guard",
  );
  add(
    "Is the queue empty?",
    values.length
      ? `size is ${values.length}, not 0. There is a front node to remove.`
      : "size is 0. The queue is empty, so take the return-0 branch.",
    "An empty queue has no head node whose data or next field can be read.",
    [3],
    "guard",
  );
  if (!values.length) {
    state.returned = 0;
    state.finished = true;
    add(
      "Return without changing anything",
      "Return 0 immediately. head, tail and size stay exactly as they were.",
      "No node is read or freed. The later lines do not run.",
      [4],
      "return",
    );
    return freeze({
      id: "linked-dequeue-0",
      title: "Dequeue an empty queue",
      summary: "An empty queue returns immediately.",
      steps,
    });
  }

  state.retval = values[0];
  add(
    "Save the number",
    `Follow head to node A, then read its data: ${values[0]}. Copy that number into retval.`,
    "Save the value before removing its node. retval is a number, not a pointer.",
    [5],
    "retval",
  );
  state.temp = "A";
  add(
    "Remember the old node",
    "Copy head into temp. Both pointers now point to node A; no second node is created.",
    "After head changes, temp lets us free the old front node.",
    [6],
    "temp",
  );
  state.head = ids[1] ?? null;
  add(
    "Move the head arrow",
    values.length > 1
      ? "Follow old head to A, then A.next to B. Set head to B. A and B stay in place."
      : "A.next is NULL, so head becomes NULL. The node stays in place until it is freed.",
    values.length > 1
      ? "temp still points to A. tail and size stay unchanged; B.prev still points to A for now."
      : "temp still points to A. tail still points to A and size is still 1 for now.",
    [7],
    "head",
  );
  add(
    "Will any nodes remain?",
    values.length > 1
      ? `size is still ${values.length}, so size > 1 is true. Another node remains after A.`
      : "size is still 1, so size > 1 is false. Removing A leaves no nodes.",
    "The code checks the original count: size-- has not run yet.",
    [8],
    "guard",
  );
  if (values.length > 1) {
    state.nodes[1].prev = null;
    add(
      "Clear the backward link",
      "Follow head to B and set B.prev to NULL. B is now the front; it has no previous node.",
      "B must not point backward to A, which will be freed. tail stays at the last node.",
      [9],
      "prev",
    );
  } else {
    state.tail = null;
    add(
      "Clear the tail arrow",
      "Take the else branch: set tail to NULL. Both head and tail now point to nothing.",
      "A was the only node. An empty queue cannot keep a tail pointer to it.",
      [10, 11],
      "tail",
    );
  }

  state.nodes[0].freed = true;
  add(
    "Free the old front node",
    "free(temp) releases node A’s memory. Its data, next and prev fields can no longer be used.",
    "temp is now a dangling pointer. The code never follows it again; retval keeps the saved number.",
    [12],
    "free",
  );
  state.size--;
  add(
    "Update the count",
    `size-- subtracts 1: ${values.length} − 1 = ${state.size}. The queue now contains ${state.size} ${state.size === 1 ? "node" : "nodes"}.`,
    "The pointer changes happened first. Now the stored count matches the remaining nodes.",
    [13],
    "size",
  );
  state.returned = state.retval;
  state.retval = null;
  state.temp = null;
  state.finished = true;
  add(
    "Return the saved number",
    `Return ${values[0]}, the original front value. The function ends; its local variables disappear.`,
    values.length > 1
      ? `The remaining queue starts at B and still ends at ${ids.at(-1)}. Its nodes were not moved.`
      : "The queue is now empty: head = NULL, tail = NULL, size = 0.",
    [14],
    "return",
  );
  return freeze({
    id: `linked-dequeue-${values.length}`,
    title: `Dequeue from a ${values.length}-node queue`,
    summary: "Remove the front node, one C line at a time.",
    steps,
  });
}

function sample(values, id, title) {
  return freeze({ ...buildLinkedDequeueLesson(values), id, title });
}

export const linkedDequeueLessons = freeze([
  sample([10, 20, 30], "linked-dequeue-three", "Linked dequeue: 3 nodes"),
  sample([], "linked-dequeue-empty", "Linked dequeue: empty queue"),
  sample([10], "linked-dequeue-single", "Linked dequeue: 1 node"),
]);
