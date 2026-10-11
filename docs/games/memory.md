# Memory Garden

Practice calloc selection, requested allocation bytes, string terminators, realloc preservation/failure and nested cleanup. Type sizes are stated when a numeric byte count is required: never silently assume a platform's sizeof(int). String lengths exclude the terminating null byte, so allocation needs length+1.

`malloc` leaves bytes uninitialized; `calloc` zeroes them. `sizeof *ptr` measures one pointed-to element without depending on the pointer's name or type spelling. Numeric size answers carry `unit: bytes` and accept equivalent arithmetic plus an optional bytes/B suffix.

Successful growth preserves the old entries; generated questions read only that preserved region. A positive-size realloc failure leaves the original allocation owned by the caller. These exercises explicitly ask to **free the old block on failure** and clear the pointer, which is a task-specific policy rather than a general rule that realloc frees it. Save the result in a temporary pointer to retain access to the original block.

Nested Book ownership is author strings → authors pointer array → Book. The inline title array is part of Book and must not be separately freed. Every pointer that needs freeing must remain reachable until its last use. The native suite instruments allocation ownership and injects realloc failure deterministically.

For changed allocation formulas, widen before multiplication and state size bounds. The exam previously needed `factor * (size_t) N` to avoid overflowing an int intermediate. Written solutions remain self-reviewed; see [exam](../exam.md).

## Read and verify

Source and lessons: [memory.js](../../src/games/memory.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [exam-games.test.js](../../tests/exam-games.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [practice-native-c.test.js](../../tests/practice-native-c.test.js), [answer-formats.test.js](../../tests/answer-formats.test.js).
