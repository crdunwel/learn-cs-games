# What this audit establishes

Every question shown by the eight practice games, their worksheets, and THE EXAM passes a deterministic validation gate. The gate independently derives its objective answer and checks its input domain, displayed C template, and applicable state transitions. A mismatch stops the question from being returned; it is not silently retried or taught with an unchecked key.

This is a correctness argument for the current bounded question families, supported by independent instance checks, exhaustive finite-domain tests, and native C execution. It is not a machine-checked proof of the JavaScript engine, browser, C compiler, or arbitrary student-written C. Sampling seeds alone is not treated as proof.

- [Eight practice games: invariants, full finite domains, C checks](practice-correctness.md)
- [Mock exam: all sixteen templates, domains, C contracts](exam-correctness.md)

## Grading without formatting penalties

Practice and exam answers share the same parsing functions. Visible examples describe allowed notation without revealing the generated answer.

| Answer type | Accepted variations                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Big-O       | `O(n²)`, `n^2`, `n*n`, `n ** 2`; `nlog(n)`, `n log n`, `n*log_2(n)`; common log bases; harmless positive constant factors and dominated positive terms |
| Numbers     | Integers, decimals, scientific notation, fractions, or bounded arithmetic, e.g. `12`, `12.0`, `24/2`, `3*4`                                            |
| Time        | Seconds by default; explicit seconds or milliseconds are converted, e.g. `1.6`, `8/5`, `1.6 s`, `1600 ms`                                              |
| Bytes       | Numeric expressions with optional `bytes` or `B`, including conventional thousands separators                                                          |
| Lists       | Spaces, commas, semicolons, arrows, parentheses/brackets, optional head/NULL; order remains significant                                                |
| Stacks      | Top-to-bottom symbols, spaces/commas/arrows/brackets, explicit `empty`/`[]`/`∅`                                                                        |
| Postfix     | Compact or separated tokens; common operator glyphs; explicit number boundaries remain significant                                                     |
| Bases       | Matching prefixes/base labels, grouped digits, leading zeros, and letter case                                                                          |
| Written C   | Self-reviewed against a rubric; never rejected by literal string comparison                                                                            |

This is a bounded notation parser, not a computer algebra system. Exponential exponents must use a bare variable (`2^n` or `2^(n)`); arbitrary rewrites such as `2^(2*n)` are not simplified. Unsupported syntax is not executed. The parser never uses JavaScript eval or compiles student input.

Meaningful distinctions are retained: `m` and `n` are independent input sizes, list order matters, and `1 23 +` differs from `12 3 +`. Compact `123+` uses the operands supplied by the question. Numeric comparison uses exact rational arithmetic, so a nearby but incorrect decimal does not receive credit through an arbitrary tolerance.

## Defects corrected

- An exam realloc model evaluated `factor * N` as int before widening it. It now converts N to `size_t` before multiplication; native tests exercise the large-N boundary and both allocation outcomes.
- Postfix grading formerly erased explicit operand boundaries, incorrectly accepting a different number sequence. It now preserves those boundaries while allowing compact input.
- Exam review code inherited pale practice-code text on pale backgrounds. Review answers now have explicit dark text; browser tests check contrast for every submitted/model answer at desktop and mobile sizes.
- PDF diagrams relied on thin CSS borders that disappeared in some PDF renderings. Complete inset SVG outlines and dividers now use uniform 1.5-point strokes. Tests inspect actual PDF vector paths and raster line continuity at 72, 96, and 144 DPI.

## Reproduce

```
npm test
npm run test:exam-c
npm run test:browser
npm run build
```

The native suites require Clang (or CC for the practice suite) and fail explicitly if it is unavailable. After exporting stack and exam PDFs with the printing browser tests, `tests/check-pdf-grids.py` checks the actual PDF diagrams; its header documents the arguments and dependencies.

New question families must extend the source contracts, independent validator, domain argument, tests, and C harness where applicable. Do not disable a guard or retry around its failure.
