# Memory Garden

Thirteen families cover short malloc assignments, calloc selection and reading initialized integers, requested allocation bytes, string terminators, realloc growth/shrink/failure, nested cleanup, true-array length, pointer aliases, pointer offsets, and separately allocated rows. Level 1 uses six introductory families; later levels use all thirteen. Type sizes are stated when a numeric byte count is required: never silently assume a platform's sizeof(int). String lengths exclude the terminating null byte, so allocation needs length+1.

`malloc` leaves bytes uninitialized; `calloc` zeroes them. `sizeof *ptr` measures one pointed-to element without depending on the pointer's name or type spelling. Numeric size answers carry `unit: bytes` and accept equivalent arithmetic plus an optional bytes/B suffix.

Successful growth preserves the old entries; generated questions read only that preserved region. A positive-size realloc failure leaves the original allocation owned by the caller. These exercises explicitly ask to **free the old block on failure** and clear the pointer, which is a task-specific policy rather than a general rule that realloc frees it. Save the result in a temporary pointer to retain access to the original block.

Nested Book ownership is author strings → authors pointer array → Book. The inline title array is part of Book and must not be separately freed. Every pointer that needs freeing must remain reachable until its last use. The native suite instruments allocation ownership and injects realloc failure deterministically.

For changed allocation formulas, widen before multiplication and state size bounds. The exam previously needed `factor * (size_t) N` to avoid overflowing an int intermediate. Free-form written exam solutions remain self-reviewed; see [exam](../exam.md). The narrow practice malloc assignment below is a separately bounded automatic check, not arbitrary C grading.

## Write one malloc line

The malloc-writing family asks for an int, double, or float array; C-string storage including its null character; one typedef Book; or a Book array. Counts are 12…240, string lengths are 2…96, and one Book is always one element. Type sizes are explicitly stated, including the supplied Book definition, so an equivalent numeric byte expression has a defined meaning. The displayed model requests `count * sizeof *pointer` and stores malloc's result in the named pointer. Allocations have no required zero-initialization.

[Generated contract](../../src/engine/mallocValidation.js) independently derives the allocation, source comments, struct definition, model line, diagram, and three worked review calculations from metadata. [Grading](../../src/engine/mallocAnswer.js) parses a single assignment instead of comparing its spelling. It accepts an existing pointer or its declaration, optional matching/void pointer cast, `sizeof(Type)`, `sizeof *pointer`, `sizeof(pointer[0])`, numeric bytes, reordered multiplication, and bounded nonnegative integer arithmetic (every literal and intermediate is at most 32,767, C's guaranteed minimum INT_MAX). C leading-zero literals are treated as octal and integer division truncates. Whitespace and comments are cosmetic. A correct line with its semicolon earns 10 XP; omitting only the semicolon earns 9 XP and a specific reminder. Wrong target/type, pointer-sized sizeof, wrong byte count, extra statements, other allocation calls, unsupported expressions, overflow-sized arithmetic, and negative intermediate sizes fail without running code.

The accepted grammar is intentionally small: it does not understand arbitrary C, local variable expressions, macros, function calls, or multi-statement algorithms. Free-form C in THE EXAM still uses a rubric and self-review. Student text is never evaluated, compiled, or executed. The practice parser's symbolic intent is checked using the question's explicit element sizes; those platform assumptions are not universal sizeof facts.

[Malloc contract tests](../../tests/malloc-contract.test.js) enumerate all generated count/template/string-length combinations and reject changed metadata, code, model answers, and worked arithmetic. [Answer tests](../../tests/malloc-answer.test.js) cover equivalents, the one-point semicolon rule, and near-correct/unsafe input. [Native tests](../../tests/malloc-native.test.js) compile and execute every distinct model scalar size plus representative equivalent forms as C11 with strict warnings, requested-byte assertions, AddressSanitizer, and UndefinedBehaviorSanitizer. Native execution validates these authored model/examples; it does not execute user input in the application.

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
