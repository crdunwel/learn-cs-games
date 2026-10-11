# Agent entrypoint

CS Club is a small, local-first React/Vite study arcade: eight generated practice games, a timed mock exam, and printable question papers. It has no backend and never executes student C.

## Hydrate only what the task needs

1. Read [README.md](README.md) for setup and product scope.
2. Run `./scripts/context "the task you are doing"`. It returns a bounded list of relevant docs, source files, and tests. Read the routed docs before changing their domain.
3. Follow [docs/README.md](docs/README.md) only if the task crosses domains. Read [architecture](docs/architecture.md) for cross-cutting work and [extension guide](docs/extending.md) before adding a template or game.
4. Treat source and tests as current behavior. Correct stale documentation when behavior changes; do not load the whole repository or every correctness table by default.

## Boundaries that must survive changes

- Preserve user work and existing browser progress. Never clear localStorage to make a test pass in a user's tab.
- Every generated practice question and exam must pass its independent validator before delivery. Do not bypass guards, import the generator's solver into its validator, or retry around validation failures. See [correctness](docs/correctness.md).
- Grade meaning, not cosmetic formatting. Practice and exam share [answerFormats.js](src/engine/answerFormats.js). Short malloc practice uses the bounded [malloc parser](src/engine/mallocAnswer.js); a correct allocation missing only a semicolon earns 9/10 XP. Free-form exam C stays rubric/self-reviewed. Never execute student C or imply arbitrary C was automatically proven.
- Preserve [stack conventions](docs/games/postfix.md), [queue conventions](docs/games/queue.md), absolute exam deadlines, answer locking, and once-only XP. The relevant invariants are documented under [state](docs/state.md) and [game contracts](docs/contracts.md).
- Keep controls stable within a question, support keyboard/touch and 320px screens, respect reduced motion, and keep printed papers monochrome. See [UI](docs/ui.md) and [printing](docs/printing.md).
- Publishing is a push-triggered action. Read [deployment](docs/deployment.md) before changing release behavior; only push or change repository settings within the user's authorization.

## Finish the change

Run the smallest meaningful checks first, then required release checks from [validation](docs/validation.md). `./scripts/context --check` validates the navigation graph and routed file references; it does not validate pedagogical claims. Update the owning domain doc when its contract changes. Report actual checks, limits, and any failed or unavailable checks without claiming a formal proof from sampled tests.
