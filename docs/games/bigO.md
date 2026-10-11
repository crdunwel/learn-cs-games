# Big-O Afterglow

Identify the tightest runtime for thirteen C-style source families, or calculate growth from an explicitly exact work/time model. Level 1 retains constant, linear, and square loops. Levels 2 and 3 include halving, n-log-n, triangular and sequential loops, three nested loops, iterative/recursive binary search, linear search, independent m/n loops, and sequential logarithmic plus quadratic work.

## What the code assumes

Positive input sizes, constant-time `work()`, and no arithmetic overflow. `work()` is one O(1) operation; hover/focus/tap explains the placeholder. Search questions ask for the **worst case**. Binary search receives a sorted array; the recursive version starts at bounds `0` and `n - 1`. Only one recursive branch runs after each comparison.

| Source family                     | Exact work count / worst-case comparisons | Tight bound |
| --------------------------------- | ----------------------------------------- | ----------- |
| Fixed loop, K=3…20                | K                                         | O(1)        |
| Fixed stride, s=2…5               | ceil(n/s)                                 | O(n)        |
| Two fully nested loops            | n²                                        | O(n²)       |
| Halving until 1                   | floor(log₂ n)                             | O(log n)    |
| n outer turns, halving inner loop | n floor(log₂ n)                           | O(n log n)  |
| Triangular inner limit i          | n(n−1)/2                                  | O(n²)       |
| Two separate n loops              | 2n                                        | O(n)        |
| Three fully nested loops          | n³                                        | O(n³)       |
| Iterative binary search           | floor(log₂ n)+1 in the worst case         | O(log n)    |
| Recursive binary search           | floor(log₂ n)+1 in the worst case         | O(log n)    |
| Linear search                     | n in the worst case                       | O(n)        |
| Independent outer m / inner n     | mn                                        | O(mn)       |
| Halving then two nested loops     | floor(log₂ n)+n²                          | O(n²)       |

The first seven source bodies retain their established contracts. Search code is a complete C function rather than a loop body. Consumers compiling/translating snippets must account for that distinction and the independent `m` input.

## Scaling and milliseconds

A Big-O bound alone does not determine an exact time multiplier. These questions supply the exact work model **W(n)=nᵖ**, p=0…3, with input factor=2…4. Concrete original sizes are 10, 20, 50, 100, or 200 items. The larger input size is the original size multiplied by the factor. Compute both exact work amounts and divide:

`W(new size) / W(original size) = factorᵖ`.

Work questions ask “How many times as much work is required?” Time questions give an original measurement of 2, 5, 10, 20, 40, or 80 milliseconds. Under the explicit exact timing assumption T(n)=c·nᵖ on the same machine with fixed c, multiply that measurement by the work ratio. The model is an exercise assumption; the app does not infer measured runtimes from code or a Big-O class.

`question.scale` contains `{power, factor, initialSize, mode, timeMs, oldWork, newWork}`. `mode` is `work` or `time`; `timeMs` is null for work questions. Both remain choice exercises. Timing choices include `ms`; work choices include `×`. There are 420 finite scaling combinations: 4 powers × 3 factors × 5 sizes × (1 work mode + 6 timing measurements).

## Learning from an error

Every generated question carries matching `question.reviewSteps` and `steps[0].reviewSteps`: ordered `{title, detail, math}` objects, at most five. Code questions count loops/branches before naming the growth class. Scaling questions show original work, larger work, division, and—when applicable—milliseconds multiplication. The independent guard checks every displayed math line against its own derivation; renderers should present this order instead of disconnected pills.

Learn includes seven walkthroughs, including cubic nesting, binary-search branching, and an exact milliseconds example. Static lessons remain reviewed examples; their generated-question guard does not claim to prove arbitrary prose.

## Independent validation and evidence

[bigOValidation.js](../../src/engine/bigOValidation.js) imports no generator/solver. It checks source token boundaries, positive/sorted preconditions, worst-case wording, scalar domains, objective answers, choice integrity, scaling totals, and worked math. `validateBigOQuestion(q)` returns q or throws. `countBigOWork(q,n,m)` counts through independently defined source contracts; supported count inputs are 1…4096, while code questions discuss positive sizes generally under the no-overflow assumption. Legacy seven-family/scaling shapes are accepted.

[bigO-expanded.test.js](../../tests/bigO-expanded.test.js) enumerates all 33 scalar/source variants and all 420 scaling combinations, checks counts through n=128, and corrupts source, answers, choices, assumptions/inputs and worked arithmetic. [bigO-expanded-native.test.js](../../tests/bigO-expanded-native.test.js) compiles the actual six new C bodies/functions with strict C11 warnings and AddressSanitizer/UndefinedBehaviorSanitizer. It executes cubic/sequential counts for every n=1…64, independent loops for all m/n=1…64, and iterative/recursive/linear searches for all present and absent keys in each representative sorted array. The original seven families retain their existing native coverage.

For the count argument, each fully nested n loop adds one factor n; sequential phases add; each binary-search branch leaves at most floor(size/2) candidates and performs only O(1) work. A rightmost absent target attains the maximum floor(log₂ n)+1 comparisons. These structural arguments cover all positive inputs satisfying the assumptions; the finite executions support them without claiming a machine-checked proof of every C implementation or runtime.

Source and lessons: [bigO.js](../../src/games/bigO.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [grading](../grading.md), [practice guard](../../src/engine/practiceValidation.js), [practice correctness](../practice-correctness.md).
