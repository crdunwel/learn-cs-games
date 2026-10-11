# Golden Search

Binary-search questions use strictly increasing arrays of 5–10 items, inclusive low/high indices, and `mid = floor((low + high) / 2)`. Prompts ask a midpoint, next bound, return index, or number of middle values checked. Targets include found values and absent values below, above, or between array entries.

Invariant: any possible match remains in inclusive [low, high]. Comparing below mid updates high=mid−1; comparing above mid updates low=mid+1. Mid itself must be excluded after a mismatch, so the interval strictly shrinks. Empty intervals terminate with −1. The counted “checks” are middle values examined, not each individual C comparison operator.

The displayed C uses integer division and sorted input. Do not switch to exclusive high without changing source, diagrams, questions, lessons and independent validation together. The recursive partition oracle checks the iterative trace; linear lookup separately verifies its returned index. All generated array/key combinations are enumerated in the guard tests.

There are three Learn paths: retain the left half, retain the right half, and stop when absent. Diagram highlights are teaching cues; printed problems preserve enough array and code information to solve without them.

## Read and verify

Source and lessons: [search.js](../../src/games/search.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [exam-games.test.js](../../tests/exam-games.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [practice-native-c.test.js](../../tests/practice-native-c.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js).
