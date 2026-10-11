# Basecamp

Convert a nonnegative integer among binary, octal, decimal and hexadecimal. Level 1 uses bases 2/8/10 and values 0…127; level 2 adds hex and values through 1023; level 3 reaches 4095. Source and destination bases always differ. Conversion changes representation, never the numeric value.

A source digit sequence is interpreted by place values or Horner's recurrence value←base×value+digit. For output, each destination digit counts how many copies of its place value fit in the remaining total. Repeated division is also taught in Learn. Zero still produces one zero digit. Hex digits A–F represent 10–15. Explanations and ten tutorials illustrate both directions and grouping through binary.

Each answer carries its target `radix`; the parser checks digits against that base before comparing. It accepts letter case, spacing, leading zeros, matching prefixes and conventional base labels. A mismatched base marker must not be accepted. The literal hex `0B` means eleven; valid raw digits take precedence over guessing a binary prefix.

The independent guard uses digit accumulation rather than JavaScript's number-to-string conversion. Every value 0…4095 and ordered pair of distinct supported bases is checked: 49,152 conversions. Preserve this small exhaustive domain or replace its argument deliberately if adding negative values, fractions or larger integers.

Six focused walkthroughs cover binary↔octal grouping, binary↔hex grouping, and octal/hex place values. Group bits from the right (three for octal, four for hex), pad only the leftmost partial group, and retain internal zero groups. Conversion metadata and final results are checked independently in [memory-variety.test.js](../../tests/memory-variety.test.js). Mobile walkthrough checks verify every new final step.

## Read and verify

Source and lessons: [bases.js](../../src/games/bases.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [recursion-bases.test.js](../../tests/recursion-bases.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [answer-formats.test.js](../../tests/answer-formats.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js).

## Guided place-value practice

The default practice interaction is a worksheet of aligned equations, implemented by [BaseWork](../../src/components/BaseWork.jsx). Students fill every source digit's decimal product, a decimal total, and (unless the destination is decimal) each destination digit. Powers are shown explicitly, descending to exponent 0; `base^0 = 1`. Destination rows subtract each chosen digit's product from the student's remaining total. The final numeral is assembled top-to-bottom from the filled positions. No division/remainder pills appear in practice feedback.

[baseWork.js](../../src/engine/baseWork.js) supplies the bounded row model and exact grading. Source products and totals accept the shared arithmetic grammar; target hex slots accept A–F (case-insensitive) or decimal values 10–15. Each target slot must represent one digit in range. Zero is one actual zero slot, not a blank. A guided draft is `{products: string[], total: string, digits: string[]}`. All fields must be correct to earn the round's 10 XP. Check locks all fields once; Reveal supplies the complete worked values and earns none. Incorrect fields retain their input with the correct calculation directly beneath. Plain-string final answers remain accepted by the non-UI evaluation API and worksheet/exam parsers.

The independent validator derives weights by repeated multiplication from right to left, verifies each digit/exponent/weight/product and both sums, and imports no scaffold helper. [base-work.test.js](../../tests/base-work.test.js) enumerates all 49,152 conversions and tests mutated rows, blank zero, equivalent arithmetic, hex digits, and score locking. [Browser checks](../../tests/browser/base-work.spec.js) cover phone/desktop entry, feedback, assembled answers, reset, reveal and fixed check-button position. Topic paper questions remain unguided academic practice; the screen-only scaffold is not copied into exam papers.
