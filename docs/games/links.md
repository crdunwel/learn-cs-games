# Link & Bloom

Trace finite acyclic singly linked lists, insert a node, predict mutation while walking, choose safe pointer assignments, or free recursively. Shown allocations are assumed to succeed. Node positions are 1-based where stated; array conventions must not leak into these prompts.

Insertion walks at most position−2 links to a predecessor, stopping at the last node if the requested position extends past the end. Save the old next link before overwriting it so every original node remains reachable and ordered. Pointer-order distractors require an existing successor; otherwise two sequences could appear equivalent accidentally.

The mutation example inserts after qualifying original nodes. Its extra advance skips the new node, so each original node is visited once and each match contributes exactly one inserted node. Removing that skip changes the algorithm and may not terminate on the same domain.

Safe cleanup obtains or recursively visits `next` before freeing its owner; there is no dereference after free. Tests include NULL lists in the native cleanup harness. Sequence answers retain head-to-tail order and accept whitespace, commas, arrows, brackets and optional head/NULL. See [grading](../grading.md).

The exam has longer insert/free/trace tasks with written rubrics; the quick game should still ask one concrete action at a time.

## Read and verify

Source and lessons: [links.js](../../src/games/links.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [exam-games.test.js](../../tests/exam-games.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [practice-native-c.test.js](../../tests/practice-native-c.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js).
