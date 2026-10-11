# Architecture

The app is entirely client-side. There are no API requests for questions, accounts, analytics, or grading. Generated content is bounded JavaScript templates, not model-generated text. C shown to students is inert text. Native C execution happens only in developer verification.

## Read path

[index.html](../index.html) → [main.jsx](../src/main.jsx) → [App.jsx](../src/App.jsx). App owns hash navigation and arcade progress. A known game ID maps to a registry entry; an unknown hash shows the homepage. The [registry](../src/games/index.js) defines order, theme metadata, lesson sets, and generation wrappers. The ninth entry is THE EXAM, a separate flow.

| Layer                   | Owns                                                       | Must not own                     |
| ----------------------- | ---------------------------------------------------------- | -------------------------------- |
| `src/games/`            | Template generation, domain models, lessons, explanations  | Storage, browser events, network |
| `src/engine/`           | Parsing, reducers, independent guards, worksheet adapters  | React rendering or DOM geometry  |
| `src/components/`       | Shared interaction, diagrams, dialogs, focus               | A second grading implementation  |
| Stylesheets             | Theme, responsive layout, motion, print isolation          | Question semantics               |
| `tests/` and `scripts/` | Independent checks, native C harnesses, context navigation | Production answer generation     |

Practice reads `game.generate(rng, level)` through the registry wrapper, which calls [practiceValidation.js](../src/engine/practiceValidation.js). [Practice.jsx](../src/components/Practice.jsx) holds the current session; [session.js](../src/engine/session.js) owns legal transitions; [answerFormats.js](../src/engine/answerFormats.js) owns equivalence. [feedback.js](../src/engine/feedback.js) explains mistakes without deciding points.

[Exam.jsx](../src/components/Exam.jsx) owns the timed-paper UI and browser persistence. [games/exam.js](../src/games/exam.js) constructs a deterministic paper and calls [examValidation.js](../src/engine/examValidation.js); [examContracts.js](../src/engine/examContracts.js) supplies independent source contracts. [engine/exam.js](../src/engine/exam.js) handles deadline transitions and grading.

[worksheet.js](../src/engine/worksheet.js) adapts the same validated sources into neutral paper data. [PrintPractice.jsx](../src/components/PrintPractice.jsx) renders it independently of the game visuals. See [contracts](contracts.md) before moving fields between these layers.

## Files to localize visual changes

[styles.css](../src/styles.css) contains shared and topic styles. [exam.css](../src/exam.css) contains the dark exam shell and light review panels. [print.css](../src/print.css) isolates the portal document for print. [Visuals.jsx](../src/components/Visuals.jsx) handles stacks, circular arrays and growth art; [TraceVisual.jsx](../src/components/TraceVisual.jsx) handles array/list/flow traces. Inspect computed styles as well as selectors when changing cross-theme code colors.

Random helpers in [random.js](../src/engine/random.js) accept an injected RNG. Tests, worksheets, and exams use seeds; interactive practice uses `Math.random`. Determinism requires preserving RNG call order as well as template text. Exam IDs are a saved-paper compatibility boundary; see [state](state.md).

## Standalone C writing and tutorial routes

[Hash routing](../src/engine/routes.js) supports every tutorial example and the standalone `#code` module; [route contracts](tutorial-links.md) preserve old game links. [C Writing Studio](c-writing.md) has its own finite authored catalog, bounded checker, draft store and print view. It is outside the generated practice registry, so THE EXAM stays ninth and existing generation guards remain unchanged.
