# Extend without weakening the learning model

## Add a template to an existing game

1. Read its [game page](README.md), generator, and [practice correctness row](practice-correctness.md). Specify the bounded input domain and answer derivation before adding random variation.
2. Generate through the supplied RNG; do not use another random source inside a template. Keep metadata sufficient for an independent guard to reconstruct the question.
3. Extend [practiceValidation.js](../src/engine/practiceValidation.js) using a different derivation, not the generator's helper. Check displayed code and assumptions as well as the answer. Add corruptions that must fail.
4. Add exact edge cases and enumerate finite parameter domains where practical. For displayed C, extend [practice-cases.js](../tests/support/practice-cases.js) and the native suite to compile that actual source, including failure branches when relevant.
5. Supply concise hint, causal explanation, and any worked illustration. Add a static Learn example if the new idea needs teaching. Verify its forward/backward steps.
6. Check [worksheet adaptation](../src/engine/worksheet.js), answer format metadata, and mobile presentation. Update the domain proof and documentation links.

## Add a game

Implement a generator and lessons under `src/games/`, add a theme and [registry entry](../src/games/index.js), and add its independent guard. Register the ID in [progress.js](../src/engine/progress.js)'s persisted allowlist. Prefer existing input/visual types; extend shared components only for a new interaction, not a duplicate engine. Add the worksheet adapter and printing tests. Add a page under `docs/games/`, a row in README, and a route in [context.mjs](../scripts/context.mjs). Run `./scripts/context --check`.

New `format`, `radix`, or `unit` metadata must travel with the answer to every consumer that grades it. Extend [answerFormats.js](../src/engine/answerFormats.js) once for both practice and exam. Do not make a more lenient parser by erasing meaningful tokens or conflating variables.

## Change the exam

Read [exam](exam.md), [state](state.md), and the exact [exam correctness contract](exam-correctness.md). Update generator and independent C contracts deliberately, preserve 16-question/100-point/120-minute defaults unless the product request changes them, and make an explicit saved-paper migration or storage-version bump when template semantics or RNG call order changes. A seed-based ID alone does not detect that change. Update [native-exam-validation.mjs](../scripts/native-exam-validation.mjs), model tests, printable paper and review coverage. Rubrics must explicitly allow equivalent correct C.

## Source and documentation discipline

Keep functions small and domain logic separate from rendering. Use comments for invariants and surprising conventions rather than narrating syntax. Do not import project-specific policies from unrelated repositories. Documentation is layered: AGENTS → README/context route → focused page → source/tests → deep proof. Change the owning layer; avoid duplicating all rules in every page.

Keep personal reference PDFs, browser-profile data, generated binaries, and temporary screenshots out of the repository. Commit only intentional product/source/docs/config changes. The release mechanism and required gates live in [deployment](deployment.md).
