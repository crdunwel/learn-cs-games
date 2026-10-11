# Grading and input notation

[answerFormats.js](../src/engine/answerFormats.js) is the notation equivalence entrypoint for practice and objective exam parts. [session.js](../src/engine/session.js) and [engine/exam.js](../src/engine/exam.js) call it; UI and feedback do not reimplement correctness. Inputs show `answerFormatHint(part)` and associate that text using `aria-describedby`.

| Metadata/type             | Accepted forms                                                      | Meaning preserved                      |
| ------------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| `number`, numeric `input` | Decimal, scientific notation, fraction, bounded arithmetic          | Exact value; no fuzzy tolerance        |
| `unit: seconds`           | Bare seconds, `s`, seconds, or milliseconds                         | Units convert before comparison        |
| `unit: bytes`             | Numeric expression, optional bytes/B                                | Other units do not silently pass       |
| `format: bigO`            | `O(n²)`, `n^2`, `n*n`; `nlog(n)`, `n*log(n)`                        | Independent variables and growth class |
| `format: sequence`        | Spaces, commas, semicolons, arrows, brackets, optional head/NULL    | Values and order                       |
| `stack`                   | Top-to-bottom symbols, delimiters, `empty`, `[]`, ∅                 | Stack order and operators              |
| `postfix`                 | Compact or separated tokens, equivalent operator glyphs             | Supplied operands and operator order   |
| `radix`                   | Matching base labels/prefixes, grouped digits, case, leading zeroes | Digits valid in requested base         |

Numeric arithmetic uses bounded exact BigInt rational parsing, never `eval`. Unsupported expressions return no match. [growthNotation.js](../src/engine/growthNotation.js) handles a deliberately bounded positive-growth grammar; it is not a computer algebra system. It removes harmless positive constants and dominated positive terms. Numeric-base exponentials support a bare variable exponent, not arbitrary rewrites such as `2^(2*n)`. Keep this boundary explicit rather than accepting a wrong equivalence.

`m` is not an alternative spelling of `n`. Likewise `1 23 +` differs from `12 3 +`; compact `123+` is allowed using the question's given operands, but an explicitly split operand must remain intact. An untouched blank exam stack is unanswered; an intentional empty array from the practice builder is an empty-stack answer. In hexadecimal, `0B` is a valid spelling of eleven and is not automatically mistaken for a binary prefix.

Choice answers use their stored values. The bounded `format: malloc` practice parser accepts one equivalent allocation assignment, never executing it. Correct missing-semicolon answers remain correct and earn 9/10 XP with a reminder; other correct lines earn 10. Its allocation metadata travels to worksheet parts. Free-form written exam C and reasoning return `null` from automatic evaluation and use model answers plus rubrics. There is no student-code execution. [feedback.js](../src/engine/feedback.js) gives short causal explanations and optional illustrations; it must not contradict the parser or award points.

Tests: [answer formats](../tests/answer-formats.test.js), [feedback and lessons](../tests/feedback-lessons.test.js), [progress transitions](../tests/progress.test.js), [exam model](../tests/mock-exam.test.js), [browser format and contrast](../tests/browser/answer-formats.spec.js). Extend positive **and negative** examples when accepting another notation.

Malloc grading tests: [accepted and rejected syntax](../tests/malloc-answer.test.js), [generated contracts](../tests/malloc-contract.test.js), [native model lines](../tests/malloc-native.test.js), [session points and locking](../tests/malloc-session.test.js). The bounded grammar supports stated type/count/size semantics; it does not grade arbitrary C programs.
