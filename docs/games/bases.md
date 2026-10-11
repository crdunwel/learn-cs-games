# Basecamp

Convert a nonnegative integer among binary, octal, decimal and hexadecimal. Level 1 uses bases 2/8/10 and values 0…127; level 2 adds hex and values through 1023; level 3 reaches 4095. Source and destination bases always differ. Conversion changes representation, never the numeric value.

A source digit sequence is interpreted by place values or Horner's recurrence value←base×value+digit. For output, repeated division gives remainders read from last to first. Zero still produces one zero digit. Hex digits A–F represent 10–15. Explanations and four tutorials illustrate both directions and grouping through binary.

Each answer carries its target `radix`; the parser checks digits against that base before comparing. It accepts letter case, spacing, leading zeros, matching prefixes and conventional base labels. A mismatched base marker must not be accepted. The literal hex `0B` means eleven; valid raw digits take precedence over guessing a binary prefix.

The independent guard uses digit accumulation rather than JavaScript's number-to-string conversion. Every value 0…4095 and ordered pair of distinct supported bases is checked: 49,152 conversions. Preserve this small exhaustive domain or replace its argument deliberately if adding negative values, fractions or larger integers.

## Read and verify

Source and lessons: [bases.js](../../src/games/bases.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [recursion-bases.test.js](../../tests/recursion-bases.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [answer-formats.test.js](../../tests/answer-formats.test.js), [feedback-lessons.test.js](../../tests/feedback-lessons.test.js).
