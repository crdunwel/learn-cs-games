# Doubly linked queue: dequeue walkthrough

Poolside Queue Learn includes three code-bound examples: `[10, 20, 30]`, empty, and `[10]`. Each screen shows one executed action, its words, and the matching pointer state. The source is the supplied exam's `dequeue(queue *thisQ)` algorithm. `queue` and `node` are assumed typedef names for the provided structures; nodes have `data`, `next`, `prev`, and the queue has `size`, `head`, `tail`. This feature teaches linked node pointers, not circular-array indices.

## Ownership and navigation

[linkedDequeue.js](../../src/engine/linkedDequeue.js) owns the exact C source lines and immutable lesson snapshots. `linkedDequeueLessons` follows the shared `{id, title, summary, steps}` lesson contract. `buildLinkedDequeueLesson(values)` constructs a reviewed walkthrough for 0–6 signed 32-bit integer values. It rejects unsupported inputs rather than silently repairing a queue. These are Learn examples, not scored generated practice or a replacement for the independent practice validator.

Each step is `type: "linkedQueue"` with `title`, short `caption`, short `why`, `change`, zero-based `activeLines`, and `state`. An initial orientation has no active source line. Subsequent snapshots are **after** the highlighted action or condition test. Navigation does not execute student code, mutate the queue, grade answers, or change XP. Moving backward selects an earlier snapshot.

`state` contains `queueExists`, `head`, `tail`, `size`, `nodes`, `temp`, `retval`, `returned`, and `finished`. Nodes retain fixed IDs A/B/C… and `{id, value, next, prev, freed}` metadata. Node identity is independent of its integer value, including duplicate or zero values. Pointer fields hold a node ID or `null`, never a value or array position. Nodes stay physically fixed when pointers move.

## Action and lifetime invariants

1. An existing empty queue returns 0 at its size guard. No node, local pointer, or local return-value variable is created or freed. An actual NULL queue would return at the earlier guard before reading any fields; it is explained in help, not modeled as an empty queue object.
2. Save `head->data` into numeric `retval`, then save the old head pointer into `temp`. Copying a pointer creates another reference, not another node.
3. Set `head` to the old head node's `next`. The removed node still exists; its links remain unchanged. For multiple nodes, the new head temporarily still points backward to the old head. `tail` and `size` are unchanged.
4. `size > 1` tests the **old count**; the decrement occurs later. Multiple nodes clear the new head's `prev` field. A singleton instead clears `tail`; `head` is already NULL. The multiple-node path never executes the tail assignment.
5. `free(temp)` ends the old front node's allocation lifetime. Its retained model metadata is for immutable history and verification only: the display must hide its `value`, `next`, and `prev`, mark it freed, and not depict accessible outgoing links. `temp` is dangling until function return and must be labeled as such. The algorithm never dereferences it after freeing.
6. `size--` reduces the count by one. Intermediate screens intentionally retain the old count until this line: they show instruction boundaries, not only valid function entry/exit states.
7. `return retval` returns the saved number, ends the function, and removes its local `temp` and `retval` variables from the display. `returned` remains for the result. The queue persists. For `[10,20,30]`, final head is B, tail C, size 2. For `[10]`, both pointers are NULL and size 0.

This algorithm also returns 0 when a valid first node contains 0. Therefore the return value alone does not distinguish an empty queue from removal of a zero-valued node; the action trace and size do. The walkthrough faithfully teaches the supplied algorithm rather than adding a new status contract.

## Code binding and visual safety

`activeLines` index the shared 16-line `linkedDequeueCode` export. Keep source lines, highlights, and snapshot changes together. Separate guard tests from assignments. The singleton tail screen highlights the `else` branch and its one executed assignment; `free`, decrement, and return have separate screens. The initial head/tail roles and next/prev direction remain visible on all screens, including NULL and freed states. A pointer relocation animation moves the arrow; it must never rearrange nodes or imply that assignment copies node contents. Reduced motion must preserve the same state and explanation.

## Verification

[linked-dequeue.test.js](../../tests/linked-dequeue.test.js) checks the exact three-node and empty/singleton action sequences, source-line bindings, preserved intermediate fields, independent snapshots, mutation rejection, and all 1,093 lists of lengths 0–6 over `[-3,0,4]`. An independent C harness compiles the **actual displayed function** under strict C11 and AddressSanitizer/UndefinedBehaviorSanitizer, executes those same finite inputs plus a NULL queue and extreme integers, and verifies the removed result, count, endpoints, remaining forward/backward links, and one freed allocation per nonempty call.

The finite tests support these examples and the bounded builder. They are not a machine-checked proof for arbitrary malformed linked structures. The builder establishes a finite, acyclic, internally consistent doubly linked list before every call. Browser checks verify step navigation, labels, mobile layout, reduced motion, and stable controls separately; see [UI](../ui.md) and [validation](../validation.md).
