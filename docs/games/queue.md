# Poolside Queue

Mixed FIFO and circular-array exercises ask for the final front index, rear index, size, or last operation's result after 1–3 operations. Generated circular arrays have capacity 4–6, any occupancy from empty through full, and a possibly wrapped starting front.

The course convention is **rear = last occupied item**, not next insertion slot. `front` is the first occupied item; `QSize` is the count. In every representation:

```text
0 <= count <= capacity
rear = (front + count - 1 + capacity) % capacity
occupied indices = (front + i) % capacity, for 0 <= i < count
```

A successful ENQUEUE advances rear then stores and increments count. A successful DEQUEUE removes at front, advances front and decrements count. Full enqueue and empty dequeue return Full/Empty and preserve state. Empty queues retain front with the corresponding rear formula; neither index then names an item. Blank visual cells mean inactive entries, not a requirement that C clear removed array memory.

Before checking, the student sees the starting array and operation list. Index questions are answered by selecting a slot. After checking, the starting state stays visible. Next operation advances one operation with explicit before/action/after arithmetic; previous/replay never grade again. Keep the requested value distinct from the operation controls. Result options label whether a value is enqueued or dequeued.

The queue lessons include the supplied Lab 6 Q3 convention and wrap/full/empty examples. This game practices dequeue (removal); it does not implement a double-ended deque. The exam also includes a linked queue; its `back` pointer refers to a tail node, not an array insertion index.

## Read and verify

Source and lessons: [queue.js](../../src/games/queue.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [generators.test.js](../../tests/generators.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js), [worksheet.test.js](../../tests/worksheet.test.js).

## Ordinary queues

Thirty percent of generated rounds use an ordinary FIFO list (`variant: fifo`). They ask for the next item out, last item in, size, or final operation result. Initial length is 0…4; 1…3 operations may grow it to 7. ENQUEUE appends and cannot be full in this unbounded model; DEQUEUE removes the first or returns Empty without changing state. These questions deliberately have no physical front/rear indices and no wraparound. Printable ordinary questions preserve item order and operations as plain text. [queue-learning.test.js](../../tests/queue-learning.test.js) exhausts all 1,400 operation/target/starting-domain combinations and rejects corrupted final states.

The circular review shows `(index + 1) % capacity` and explains `%` as remainder; it identifies the value removed/stored and updates QSize separately. rear still means last occupied item in the circular course model. See [UI](../ui.md) for review and stable-layout behavior.

Front/rear badges remain visible throughout Learn and operation review, including empty circular states. Empty badges use dashed outlines and identify **stored indices**, not occupied items. Phone diagrams spell out FRONT and REAR. Ordinary empty queues explicitly say FRONT/REAR have no item; both names remain in every before/after explanation.
