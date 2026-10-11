# Recursion Reverie

Short displayed C functions ask for returns, print order, call counts, array totals/parity counts, powers, or the course recurrence. The generator uses bounded inputs and explicit base cases. Five Learn examples distinguish descending calls from ascending returns and show one-array-item-at-a-time reasoning.

For a decrement-by-d total, d is positive and the stopping case is n<=0: count ceil(n/d) additions before the base value, including a final recursive argument below zero. Print-before-recursion yields descending order; print-after-recursion yields ascending order. A boolean C comparison contributes 1 or 0, not the tested value. Array recursion advances toward its end bound and does not dereference after that bound.

The source domain keeps answers inside even 16-bit signed-int range. Do not increase bounds without rechecking recursion termination, multiplication/addition overflow, and the native harness. Power recursion uses nonnegative exponents; the special recurrence has its own bounded argument and independent bottom-up oracle.

Numeric results use exact arithmetic input; print sequences use `format: sequence`. Preserve sequence metadata when adapting a question so commas/arrows/brackets do not become formatting penalties. Explanations show the base case and the concrete combining step, not just the final value.

## Read and verify

Source and lessons: [recursion.js](../../src/games/recursion.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [recursion-bases.test.js](../../tests/recursion-bases.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [practice-native-c.test.js](../../tests/practice-native-c.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js).
