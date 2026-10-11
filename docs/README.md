# Context map

Read [the agent entrypoint](../AGENTS.md) first. Use `./scripts/context "task"` to select a few pages; this index is a map, not a mandatory reading list.

## System and contracts

| Need                                                               | Read                              |
| ------------------------------------------------------------------ | --------------------------------- |
| Entry points, ownership, dependencies, directory structure         | [Architecture](architecture.md)   |
| Generator, question, answer, lesson, and paper data shapes         | [Contracts](contracts.md)         |
| Input notation and meaningful versus cosmetic differences          | [Grading](grading.md)             |
| XP, practice transitions, saved data, timer and answer locking     | [State and persistence](state.md) |
| Tutorial flow, stable layout, animations, mobile and accessibility | [UI](ui.md)                       |
| Timed exam, paper composition, automatic versus manual marking     | [THE EXAM](exam.md)               |
| Worksheet adapters, print layout, SVG grid invariants              | [Printing](printing.md)           |
| Commands, independent checks, browser and native C verification    | [Validation](validation.md)       |
| Add a question family, lesson, or entire game safely               | [Extension guide](extending.md)   |
| CI, publishing, Pages configuration, rollback                      | [Deployment](deployment.md)       |

## Learning modules

- [C Writing Studio](c-writing.md) — 60 distinct guided C implementations, raw writing and paper practice
- [Shareable tutorial links](tutorial-links.md) — stable links for every example and coding problem

## Topic games

- [Stack & Slay](games/postfix.md)
- [Poolside Queue](games/queue.md)
- [Linked dequeue walkthrough](games/linked-dequeue.md) — code-bound pointer lessons inside Poolside Queue Learn
- [Big-O Afterglow](games/bigO.md)
- [Recursion Reverie](games/recursion.md)
- [Link & Bloom](games/links.md)
- [Golden Search](games/search.md)
- [Memory Garden](games/memory.md)
- [Basecamp](games/bases.md)

## Deeper correctness arguments

[Correctness overview](correctness.md) links [practice template proofs and finite domains](practice-correctness.md) and [all sixteen exam contracts](exam-correctness.md). Read the relevant row and tests when changing semantics. These are scoped arguments and independent checks, not a claim to formally verify arbitrary JavaScript or C.

The [context router](../scripts/context.mjs) owns task keywords and bounded route lists. Its [tests](../tests/context.test.js) check routing and broken-reference detection. Add a route when adding a major domain; do not turn the entrypoint into a second copy of these pages.
