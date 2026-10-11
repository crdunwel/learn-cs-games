# THE EXAM

The ninth registry item is a full mock midterm, not a shuffled list of one-step arcade questions. [games/exam.js](../src/games/exam.js) generates 16 questions, 120 minutes, 100 points from a seed. Its five sections are dynamic memory (20), recursion (20), linked lists (18), stacks/queues (20), and algorithm analysis (22).

Questions include allocation/resize and nested ownership; recursion tracing and permutation completion; insertion, mutation and cleanup of lists; three infix stack checkpoints and full postfix; linked/circular queues; exact exponential time scaling; C runtime analysis; search/data-structure costs; and recurrence/growth reasoning. The exact per-question assumptions and proof obligations are in [exam correctness](exam-correctness.md).

[Exam.jsx](../src/components/Exam.jsx) owns the ready screen, new-paper action, start/resume, question navigation, flags, answer drafts, submit confirmation, and review. Answers and model solutions are hidden until submission or expiry. New-paper generation before starting does not start the timer. [engine/exam.js](../src/engine/exam.js) owns the deadline/answer-lock rules and grading. Read [state](state.md) before touching either persistence or timer behavior.

## Marking boundary

Each part explicitly chooses automatic or manual assessment. Objective answers use [the same parsers as practice](grading.md). Free C and reasoning have model solutions, concise explanations, and point rubrics. Alternate correct solutions count; the application does not compile student responses. The final combined score is a self-assessment estimate and must not be presented as fully automatic grading. Review distinguishes missing answers, objective correctness, pending rubrics, and entered manual scores.

## Generation boundary

`generateExam(seed)` calls `assertValidExam` before returning. [examValidation.js](../src/engine/examValidation.js) independently derives objective keys and checks domains and code. [examContracts.js](../src/engine/examContracts.js) fixes reviewed C template structure. Keep generator and contract changes explicit and independent. Reproduction depends on both seed and generator semantics. The current ID contains only the seed: a semantic or RNG-order change needs an explicit storage migration/version bump, not just an ID comparison.

Print uses this exact current paper, with a separate answer key and matching identity. During a running attempt, question printing remains available but the answer key is locked; it unlocks on submission/expiry. Do not regenerate from a new seed when opening print preview. See [printing](printing.md).

Checks: [model/state tests](../tests/mock-exam.test.js), [browser exam](../tests/browser/mock-exam.spec.js), [input/review contrast](../tests/browser/answer-formats.spec.js), [printing](../tests/browser/printing.spec.js), [native generated C harness](../scripts/native-exam-validation.mjs). See [validation](validation.md) for prerequisites and commands.
