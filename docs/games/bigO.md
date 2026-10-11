# Big-O Afterglow

Identify the tightest bound for one of seven C-style loop families, or derive an exact work-scaling multiplier. Level 1 uses constant, linear and square loops; higher levels add halving, n-log-n, triangular, sequential, and scaling questions.

Assumptions are positive n, constant-time `work()`, and no integer overflow. `work()` is a placeholder for one O(1) operation, explained by hover/focus/tap in the code renderer. Loop counts determine the answer: fixed K is constant; stride s gives ceil(n/s); nested square gives n²; halving gives floor(log₂n); nested halving gives n floor(log₂n); triangle gives n(n−1)/2; sequential linear loops give 2n.

Do not infer an exact time multiplier from a Big-O bound alone. Scaling questions explicitly state the **exact** model W(n)=nᵖ with p=0…3 and factor=2…4, so W(fn)/W(n)=fᵖ. The distinction is part of the exercise contract.

The exam's runtime questions include independent m/n inputs and sequential log + n² loops; do not reuse a superficial “two loops means n²” rule. The shared Big-O parser handles common notation while preserving variables and exponential distinctions. See [grading](../grading.md).

## Read and verify

Source and lessons: [bigO.js](../../src/games/bigO.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [generators.test.js](../../tests/generators.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [practice-native-c.test.js](../../tests/practice-native-c.test.js), [answer-formats.test.js](../../tests/answer-formats.test.js).
