# Stack & Slay

Convert an infix expression to postfix and reconstruct its operator stack at one intermediate checkpoint. The generator recursively combines 3–9 numeric operands with binary `+ - * /` and balanced parentheses. Both operator tiers are left-associative. This is syntax conversion, not arithmetic evaluation; a syntactically valid expression may contain a numeric division by zero without invalidating the conversion exercise.

The solver's `states[k]` is the state **after k whole tokens**, before the final stack flush. A checkpoint at the input's end is still before that flush. Internal stacks are bottom first; answers and the vertical UI are top first. Point A is between tokens, not an operand. Do not accidentally pop the final stack before checking A.

The two steps are stack checkpoint, then full postfix entry. Operands go directly to output; `(` blocks popping; `)` pops through its matching `(` and discards the pair. A new operator pops higher **or equal** precedence first. The final flush is top to bottom. Lesson data explicitly walks each final pop.

## Explain the two destinations first

**Postfix is the output being built. The operator stack holds waiting operators.** Push means put an item at the stack top. For conversion, popping an operator removes it from the top and appends it to postfix. Discarding `(` removes it without appending it.

1. A number/variable goes straight to postfix and never enters the operator stack.
2. `(` is pushed as a barrier. Operators below it must wait.
3. On `+ - * /`, compare the incoming operator with the **current top**. While the top has higher or equal precedence, pop it into postfix and compare again. Stop at an empty stack, `(`, or a lower-precedence top; then push the incoming operator. `* /` are higher than `+ -`; each pair is equal and left-associative.
4. On `)`, pop operators into postfix until the matching `(`, then discard `(`. Never push `)` or put parentheses in postfix.
5. At the end, pop every remaining operator into postfix from top to bottom.

The `push-pop-rules` Learn example uses `2 + 3 * 4 - (5 - 1)`. The incoming `-` first pops `*` (higher) and then `+` (equal), before being pushed itself. Its final postfix is `2 3 4 * + 5 1 - -`. The rule tour pauses separately after each push/pop/discard and displays its intermediate stack/output; the active incoming token stays highlighted while comparisons are pending. End-of-input steps have no active token. Existing simpler lessons remain available and the first lesson is unchanged.

`postfixRules` is the canonical copy rendered by [PostfixRules.jsx](../../src/components/PostfixRules.jsx). `explainToken` supplies a short caption naming the incoming operator and the comparisons. `explainTokenActions` expands one whole token into individual append/push/pop/discard actions. Each action contains `{ title, detail, stack, output }` **after** that elementary action; stack order remains bottom first. It uses fresh array snapshots, never mutates solver states, and its last action equals `states[index + 1]`. This separates a multiple-pop token into teachable diagram states without changing checkpoint semantics or the generator's RNG.

The stack builder pushes at the visual top and reserves enough fixed slots for all states. Do not grow the panel per push. The shared parser accepts compact/spaced/comma-separated postfix and equivalent operator glyphs, while retaining explicit operand boundaries. See [grading](../grading.md).

Printing adds three checkpoints. Its `stop` is a zero-based token index and becomes solver `states[stop + 1]`; see [printing](../printing.md).

## Read and verify

Source and lessons: [postfix.js](../../src/games/postfix.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [generators.test.js](../../tests/generators.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js), [postfix-rules.test.js](../../tests/postfix-rules.test.js), [worksheet.test.js](../../tests/worksheet.test.js).

The full-postfix phase removes the checkpoint marker and intermediate stack entirely. It starts from the whole expression; a token-by-token checked/revealed review shows each operand/operator action, stack and accumulated output, followed by the final flush. Navigation never awards additional points.
