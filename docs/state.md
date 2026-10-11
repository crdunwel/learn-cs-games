# State and persistence

## Practice

[session.js](../src/engine/session.js) is a pure reducer. A session tracks question, step, round, draft, status, `allCorrect`, and earned XP. Legal statuses are answering → correct / incorrect / revealed. Only an answering state accepts a check or reveal; repeated events cannot award XP twice. Correct checks earn 10 XP per step. Incorrect checks and reveals earn none and permanently make this round imperfect. Next advances a checked step or generates a fresh round.

[Practice.jsx](../src/components/Practice.jsx) keeps a ref to the latest session so rapid events cannot use stale state. It applies only the change in earned XP and records a round once at its final checked/revealed step. [progress.js](../src/engine/progress.js) increments rounds, wins for perfect rounds, current streak, and best streak. The suggested level is `min(3, 1 + floor(wins / 4))`; levels remain manually selectable. Completing a tutorial marks the game's tutorial flag, not every individual lesson.

[App.jsx](../src/App.jsx) keeps the practice component mounted while Learn is selected, preserving question/draft across mode toggles. Leaving the game, reloading, changing level, or starting a new session loses an unfinished practice question. These drafts are not persisted.

## Local storage

| Key                   | Owner                                          | Data                                                                                   |
| --------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `cs-club-progress-v1` | [progress.js](../src/engine/progress.js) / App | Version 1, XP, known game statistics, tutorial flags                                   |
| `cs-club-exam-v1`     | [Exam.jsx](../src/components/Exam.jsx)         | Version 1, paper seed/identity, attempt, position, flags, written answers, self-scores |

Storage is origin-specific: local preview and GitHub Pages do not share progress. Unknown progress games are discarded by an explicit allowlist; adding a game requires updating it. Malformed or unavailable storage falls back safely. Failed writes show a temporary-progress notice. There is no sync, account, or server backup.

## Exam

[engine/exam.js](../src/engine/exam.js) creates an **absolute deadline** from start time plus duration. Remaining time is computed from that deadline; backgrounding or reload cannot add time. Any reducer action at or after the deadline expires and locks the attempt before accepting another draft. Submission also locks answers. Only rubric scores may change after closing, only on manual parts, and within each part's point range.

On load, Exam regenerates a validated paper from its saved seed and checks its identity. It filters answer IDs, score ranges, question position and flags, validates timestamps/status, and re-applies expiry. Invalid saved attempts fall back to a fresh paper. The current paper ID is seed-based, not a semantic content hash. A change to template semantics or RNG call order therefore requires an explicit saved-paper migration or storage-version bump; otherwise old answers could be silently matched to different regenerated questions. Do not migrate by trusting stored model-answer keys.

The timer is a practice aid, not an anti-cheating clock: changing the device clock or localStorage is outside the guarantee. Exam points never modify arcade XP. Automatic and manual score subtotals remain separate; pending self-review is clearly labeled.

Tests: [progress](../tests/progress.test.js), [exam reducers and papers](../tests/mock-exam.test.js), [browser exam persistence](../tests/browser/mock-exam.spec.js), [arcade](../tests/browser/arcade.spec.js), [refinements](../tests/browser/refinements.spec.js).
