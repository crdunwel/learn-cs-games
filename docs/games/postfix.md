# Stack & Slay

Convert an infix expression to postfix and reconstruct its operator stack at one intermediate checkpoint. The generator recursively combines 3–9 numeric operands with binary `+ - * /` and balanced parentheses. Both operator tiers are left-associative. This is syntax conversion, not arithmetic evaluation; a syntactically valid expression may contain a numeric division by zero without invalidating the conversion exercise.

The solver's `states[k]` is the state **after k whole tokens**, before the final stack flush. A checkpoint at the input's end is still before that flush. Internal stacks are bottom first; answers and the vertical UI are top first. Point A is between tokens, not an operand. Do not accidentally pop the final stack before checking A.

The two steps are stack checkpoint, then full postfix entry. Operands go directly to output; `(` blocks popping; `)` pops through its matching `(` and discards the pair. A new operator pops higher **or equal** precedence first. The final flush is top to bottom. Lesson data explicitly walks each final pop.

The stack builder pushes at the visual top and reserves enough fixed slots for all states. Do not grow the panel per push. The shared parser accepts compact/spaced/comma-separated postfix and equivalent operator glyphs, while retaining explicit operand boundaries. See [grading](../grading.md).

Printing adds three checkpoints. Its `stop` is a zero-based token index and becomes solver `states[stop + 1]`; see [printing](../printing.md).

## Read and verify

Source and lessons: [postfix.js](../../src/games/postfix.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [generators.test.js](../../tests/generators.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js), [worksheet.test.js](../../tests/worksheet.test.js).
