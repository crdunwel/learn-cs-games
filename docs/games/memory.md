# Memory Garden

Twelve families cover calloc selection and reading initialized integers, requested allocation bytes, string terminators, realloc growth/shrink/failure, nested cleanup, true-array length, pointer aliases, pointer offsets, and separately allocated rows. Level 1 uses five introductory families; later levels use all twelve. Type sizes are stated when a numeric byte count is required: never silently assume a platform's sizeof(int). String lengths exclude the terminating null byte, so allocation needs length+1.

`malloc` leaves bytes uninitialized; `calloc` zeroes them. `sizeof *ptr` measures one pointed-to element without depending on the pointer's name or type spelling. Numeric size answers carry `unit: bytes` and accept equivalent arithmetic plus an optional bytes/B suffix.

Successful growth preserves the old entries; generated questions read only that preserved region. A positive-size realloc failure leaves the original allocation owned by the caller. These exercises explicitly ask to **free the old block on failure** and clear the pointer, which is a task-specific policy rather than a general rule that realloc frees it. Save the result in a temporary pointer to retain access to the original block.

Nested Book ownership is author strings → authors pointer array → Book. The inline title array is part of Book and must not be separately freed. Every pointer that needs freeing must remain reachable until its last use. The native suite instruments allocation ownership and injects realloc failure deterministically.

For changed allocation formulas, widen before multiplication and state size bounds. The exam previously needed `factor * (size_t) N` to avoid overflowing an int intermediate. Written solutions remain self-reviewed; see [exam](../exam.md).

## Added template invariants

- True-array length is `sizeof values / sizeof values[0]`; the displayed object is an array, never a pointer parameter.
- Alias writes use one allocation: copying its address does not copy its elements. Only the initialized element is read, and the allocation is freed once.
- Offset reads use a five-element initialized array; offset 1…3 plus index 0…4−offset never exceeds index 4.
- Shrinking six integers to 1…5 preserves only that prefix. Reads stay strictly inside the new bound. Both allocations are explicitly assumed successful.
- A grid has one pointer-array allocation plus one allocation per row. Columns change each row's size, not the number of frees. Rows must be freed before the pointer array.

[Memory variety tests](../../tests/memory-variety.test.js) exhaust all added semantic parameter combinations. The native C suite executes each displayed template with boundary literals, every pointer/index branch, and sanitizers.

## Read and verify

Source and lessons: [memory.js](../../src/games/memory.js). Shared contracts: [game data](../contracts.md), [UI](../ui.md), [independent practice validator](../../src/engine/practiceValidation.js). The detailed correctness argument is in [practice correctness](../practice-correctness.md).

Tests: [exam-games.test.js](../../tests/exam-games.test.js), [practice-validation.test.js](../../tests/practice-validation.test.js), [practice-native-c.test.js](../../tests/practice-native-c.test.js), [answer-formats.test.js](../../tests/answer-formats.test.js).
