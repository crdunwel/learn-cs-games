# C Writing Studio

Start from [AGENTS](../AGENTS.md) and [architecture](architecture.md). This is a standalone learning module at `#code`, alongside the nine existing games. THE EXAM stays game 9. Each authored problem also has a stable `#code/<problem-id>` route; see [tutorial links](tutorial-links.md).

## Scope and source boundaries

The finite catalog has **60 distinct problems**, not random renamings: 10 memory/ownership, 10 linked-list, 5 stack, 5 queue/deque, 16 recursion, 7 search/array, and 7 loop/string/base algorithms. The last three categories span nine topic filters in the UI. [Structures](../src/data/cWritingStructures.js) and [algorithms](../src/data/cWritingAlgorithms.js) own the catalog. They are original guided exercises informed by the supplied CS1 Midterm, Lab 6 queue answer key, and Lab 4 answers. Personal PDF attachments are not bundled.

Coverage includes nested Book allocation and cleanup, both explicit realloc failure policies, insertion at a position, recursive list destruction, ordinary and circular queues, linked doubly dequeue, stack operations, recursive sequence/triangle printing, even counts, digit arrays, powers, Fibonacci, permutation backtracking and adjacent-difference checks, binary search and bounds, arrays, strings, and base conversion. The queue reference's `this->size` typo is corrected to the declared queue pointer. Structures use complete C declarations and semicolons.

## Catalog contract

An exercise has stable `id`, `topic`, `title`, `prompt`, explicit bounded `assumptions`, provided `setup` C, a `signature` ending with `{`, `lines`, an `example`, and a `rubric`. Lines are **body only**; the component and native tests supply the final function brace. Each editable line has canonical `code`, English `hint`, causal `why`, and optional explicitly supported `accept` spellings. Brace-only structural lines may be `fixed`.

The English hint must name any new variable needed by the taught approach. Supplied types/helpers belong in `setup`; students enter only the requested function. Every allocation either handles failure or explicitly assumes success, matching the question's scope. Numeric and recursion domains must avoid undefined behavior and unbounded work. The catalog is fixed and deterministic; adding a new problem requires its independent native fixture.

## Checking and feedback

[engine/cWriting.js](../src/engine/cWriting.js) owns lexical comparison, catalog validation, completion and persistence. It never compiles or executes student input. Tokens preserve identifiers, operators, numeric spelling and string/character contents; whitespace, indentation and comments do not affect comparison. Listed alternatives work in both modes, independent of physical line layout.

- `matched`: the answer matches a supported taught solution.
- `minor`: the same supported solution with missing statement semicolons. Feedback explicitly says the logic matches and names the small syntax fix. This does not apply to required separators inside `for (...)`.
- `syntax`: an identifiable lexical error such as an unclosed quote/comment.
- `review`: unrecognized code. This is **not an automatic wrong grade**. The student can compare the sample solution and checklist; other correct algorithms remain valid.
- `empty`: no submitted text.

The parser is intentionally bounded. It does not prove arbitrary C equivalence, accept every equivalent arithmetic expression, or silently erase meaningful punctuation. No arbitrary student-C correctness claim or XP award is made. Tests compile actual authored canonical answers; they do not validate arbitrary submissions. The runtime catalog guard rejects incomplete metadata and malformed taught tokens; semantic evidence comes from independent native tests, not this structural guard.

## Interaction and state

[CodingStudio](../src/components/CodingStudio.jsx) offers Line by line and Whole function modes. Guided mode shows the function so far, one English action, and one code entry. Helpers can be hidden. Correct/minor answers permit Next; other answers can be edited and rechecked. One approach is available on demand, followed by a causal explanation. Whole-function mode retains a separate draft and offers a rubric for unrecognized implementations.

The current example determines the cursor before render, avoiding stale positions when moving from a long problem to a short one. Function-so-far scrolls within a reserved height. Helper and feedback slots measure the largest actual text for this problem; checking and changing lines do not displace the controls. Keyboard/touch, narrow screens, literal code boundaries and reduced-motion conventions still apply.

`cs-club-c-writing-v1` stores drafts by known exercise ID and a content fingerprint, separate from arcade XP and the timed exam. Accepted lines and raw text are persisted, not a trusted score flag. Completion is recomputed from recognized solutions; self-review is distinct. Corrupt/unknown records are filtered. Helper wording and indentation changes preserve drafts. When the supplied code contract changes, earlier writing is retained in a visible read-only recovery panel and excluded from current completion. Storage failures display a notice. Guided and raw drafts are kept separately when toggling modes.

## Printing

[CodingPrint](../src/components/CodingPrint.jsx) has a top-right Print / PDF button. Print 1, 3, 5 or 10 problems from the current topic, starting at the current problem without duplicates. Papers contain the prompt, assumptions, supplied declarations/helpers, signature, and blank writing lines. **No English line helpers, current answers, or visual coaching appears on question papers.** Sample solutions are a separately selected paper with a rubric. Existing print isolation and monochrome styling apply; [coding.css](../src/coding.css) adds paper spacing. Dialog focus is trapped, Escape closes and launch focus restores.

## Verification and extension

- [Engine tests](../tests/c-writing.test.js): all 60 canonical solutions and accepted spellings, significant-token mutations, optional semicolons, malformed catalog, persistence.
- [Structure native checks](../tests/c-writing-structures.test.js): actual C, allocation failure policies, tracked frees, list/stack/queue edge states.
- [Algorithm native checks](../tests/c-writing-algorithms.test.js): actual C, independent expected values/output, permutation restoration and recursive free behavior.
- [Browser checks](../tests/browser/c-writing.spec.js): guided/raw flows, feedback, saved work, print isolation and mobile geometry.

Use strict C11 warnings plus AddressSanitizer/UndefinedBehaviorSanitizer as the existing harnesses do. Extend fixtures for each new algorithm, supplied helper and accepted spelling. Passing finite cases is evidence for the documented domain, not a formal proof of all C or all possible inputs. Follow [validation](validation.md) for release gates.
