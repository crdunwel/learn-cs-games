# Validation and release evidence

Choose checks based on changed behavior; do not confuse build success with correctness or a deployment with a verified live app. The release pipeline is specified in [deployment](deployment.md).

## Reproducible commands

```sh
./scripts/context --check
npm test
npm run test:exam-c
npm run build
npx playwright install chromium
npm run test:browser
npm run test:release
```

`npm run test:release` builds the production app for the GitHub Pages subdirectory and checks all nine routes there; see [deployment](deployment.md). `npm run docs:check` is the package-script alias of `./scripts/context --check` and is a CI gate.

`npm test` uses Node's test runner for `tests/*.test.js`, including actual C compilation and execution. The practice native suite accepts `CC`; the exam harness needs Clang. Native checks use strict C11 warnings plus AddressSanitizer and UndefinedBehaviorSanitizer and fail rather than silently skip if tooling is absent. Run on a machine with those tools. Temporary C/binaries are cleaned up by the harnesses.

If Chrome is installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:browser` avoids installing a separate browser. `PLAYWRIGHT_PORT` selects a test server port. The configuration may reuse an existing server; confirm it serves the checkout you intend to test. Browser tests use isolated contexts; do not clear the user's active tab's localStorage.

To export paper evidence, set `SCREENSHOT_DIR` to a scratch/artifact directory and run `npm run test:browser -- tests/browser/printing.spec.js`. That suite exports all eight topic papers, the exam, and its answer key. Then run [the PDF grid checker](../tests/check-pdf-grids.py) on the actual postfix/exam PDFs. See [printing](printing.md).

## Test map

| Concern                                                | Canonical checks                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Shared parsing and false positives                     | [answer-formats](../tests/answer-formats.test.js)                                                                                         |
| Reducer, scoring, progress storage                     | [progress](../tests/progress.test.js)                                                                                                     |
| General generation and state models                    | [generators](../tests/generators.test.js), [exam-games](../tests/exam-games.test.js), [recursion-bases](../tests/recursion-bases.test.js) |
| Independent practice guard, corruption, finite domains | [practice-validation](../tests/practice-validation.test.js)                                                                               |
| Displayed practice C and sanitizers                    | [practice-native-c](../tests/practice-native-c.test.js), [case builder](../tests/support/practice-cases.js)                               |
| Exam papers, guard, deadline and grading               | [mock-exam](../tests/mock-exam.test.js), [native exam harness](../scripts/native-exam-validation.mjs)                                     |
| Causal explanations and all lesson sequences           | [feedback-lessons](../tests/feedback-lessons.test.js)                                                                                     |
| Worksheet transforms and seeds                         | [worksheet](../tests/worksheet.test.js)                                                                                                   |
| Actual UI flows, responsive layouts, focus, motion     | [browser suites](../tests/browser)                                                                                                        |
| Context routes and documentation links                 | [context tests](../tests/context.test.js), [context router](../scripts/context.mjs)                                                       |

## What the correctness evidence means

[Correctness](correctness.md) gives the current scoped claim. Independent instance guards, exact local-domain enumeration, mathematical template invariants, corruption tests, and execution of actual generated C support it together. Random seed counts are regression coverage, not a proof for all possible output. Native sanitizers cover executed paths, not arbitrary C. Student-written C is never compiled by the app.

When changing a semantic template: update its proof/domain, independent contract, mutation tests, boundary cases and native execution coverage. When changing input acceptance: add accepted equivalent forms and nearby wrong forms. When changing UI: verify the affected interaction plus phone width, keyboard/focus, reduced motion, and stable control positions. When changing printing: inspect the exported document, not just its screen preview.

Record commands and outcomes for the current revision. Avoid putting transient pass counts in entrypoint docs; the suite is expected to grow.
