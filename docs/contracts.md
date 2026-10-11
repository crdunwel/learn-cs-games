# Data contracts

These are current JavaScript shapes, not a generated schema. The actual guards are [practiceValidation.js](../src/engine/practiceValidation.js) and [examValidation.js](../src/engine/examValidation.js). Extend those guards with any new template.

## Game and practice question

A [registry entry](../src/games/index.js) has `id`, `title`, `topic`, `tagline`, `label`, `symbol`, `generate(rng, level)`, and `lessons`. `tutorial` remains a fallback alias for the first lesson. `level` is 1, 2, or 3. The exam entry has `kind: "exam"` and no practice generator.

A generated practice question has `type` (`postfix`, `queue`, `bigO`, or shared `trace`), domain-specific source data, and nonempty `steps`. A step contains `kind`, `prompt`, `answer`, `hint`, and `explanation`; optional fields include `options`, `optionLabels`, `illustration`, `format`, `radix`, and `unit`.

- `stack`: draft is an array **top first**; answer is a top-to-bottom string. Domain solver stacks may be bottom first; reverse only at the display/answer boundary.
- `postfix`: draft is free text, graded with token-boundary-aware equivalence.
- `choice`: options contain exactly one intended answer with no equivalent distractor. Option labels may differ from stored values.
- `input`: free text, interpreted according to `radix`, `format`, `unit`, and answer metadata. Do not guess format from UI labels.

Practice `trace` questions carry `code`, a `visual` (`kind`, items/labels), and metadata such as `topic`, `data`, or `meta` used by the independent guard. Domain details belong in [game pages](README.md), not renderer conditionals.

## Lessons

Each lesson is `{ id, title, summary, steps }`. Each step supplies `type`, `caption`, and the matching diagram/code state. [Tutorial.jsx](../src/components/Tutorial.jsx) selects and walks steps; lesson changes reset its index. Stack lessons carry a common `stackCapacity` so their geometry does not grow as items are pushed. Lessons are static reviewed examples; the generated-question guard does not automatically prove every caption.

Queue-only lesson type `linkedQueue` carries `title`, `why`, `activeLines`, `change`, and the immutable pointer snapshot described in [linked dequeue](games/linked-dequeue.md). `activeLines` refers to the shared exact C source; the renderer never derives a new answer or mutates a snapshot. This tutorial type does not extend the generated-question or paper contract. The final action replays the lesson without awarding progress.

## Exam and worksheet

A paper has `id`, `seed`, `title`, `questions`, and for exams `durationMinutes`, `totalPoints`, and `sections`. Exam questions carry `id`, `section`, `label`, `title`, `prompt`, `points`, optional `code`/`diagram`, and `parts`. Parts have stable IDs, `kind`, `prompt`, `points`, `answer`, `auto`, and optional `format`, `unit`, choices, explanation or rubric.

`auto: true` means objective grading with the shared parser. `auto: false` means self-review; missing manual scores remain pending, not assessed zero. The total includes zero provisional earned points until a pending rubric is marked. Never compare free-form C strings for correctness.

[worksheet.js](../src/engine/worksheet.js) adapts practice to the paper shape, including three stack checkpoints and final queue state. Topic worksheet IDs combine game, seed, and level. An exam worksheet is the exact supplied exam object. Questions and answer keys must retain the same paper ID and source values. See [printing](printing.md).

## Independence boundary

Generators can reuse domain models. Validators must independently derive answers and reject unsupported domains/source, not call the generator's solver. Runtime guards are fail-closed. Tests must include intentional corruption so a guard that simply accepts everything cannot pass.

Optional choice `optionFormat: "code" | "sequence"` requests a single wide column and preserves notation inside each option. Omit for prose. This is presentation metadata only; evaluation still uses the shared answer parser. Base lesson `conversion` metadata records source/from/answer/to for independent tutorial value checks.

Basecamp input steps additionally carry `work: {from, to, source, target}`. Rows contain `{digit, value, exponent, weight, product}` and are checked independently against the source and answer numerals. Its interactive draft is `{products, total, digits}`; products and digits are fixed-length string arrays (digits is empty for decimal output). `session.evaluate` grades this structured draft with `checkBaseWork`; a plain-text final answer still uses the common parser. See [Basecamp](games/bases.md) for grading and presentation invariants.

Optional `reviewSteps: [{title, detail?, math?}]` describes an ordered, display-only solution on the question or current step. Big-O and expanded recursion/search validators bind its numeric math to independently derived values. Review navigation must never dispatch grading actions. `format: malloc` input steps carry `allocation: {type, name, count, elementBytes}` and use the bounded single-assignment parser. Queue `variant: fifo` uses `{items: string[]}` states and value targets; circular states retain their existing array/index contract.
