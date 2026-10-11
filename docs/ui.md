# UI, tutorials, mobile, and accessibility

The product is intentionally short: one action at a time, visible format examples, immediate causal feedback, detailed help behind `?`. Avoid filling the main exercise with instructional prose. Each game has its own theme; THE EXAM has an inverted dark shell and **explicit dark text** inside light review answer panels.

## Components and ownership

- [Practice.jsx](../src/components/Practice.jsx): shared inputs, answer dock, feedback and next step; queue playback is local to its scene.
- [Tutorial.jsx](../src/components/Tutorial.jsx): lesson selector, previous/next steps, completion. Data comes from each game's lesson exports, not hard-coded examples in the component.
- [Visuals.jsx](../src/components/Visuals.jsx): vertical stack, token checkpoints, queue array, growth art and cards.
- [TraceVisual.jsx](../src/components/TraceVisual.jsx): arrays, linked lists, flow/worked traces.
- [Tooltip.jsx](../src/components/Tooltip.jsx) and [Help.jsx](../src/components/Help.jsx): shared accessible help. [CodeBlock.jsx](../src/components/CodeBlock.jsx) turns literal `work()` into a focusable explanation of a constant-time placeholder.

## Geometry invariants

Within one question or lesson, pushing/popping stack items, checking/revealing, opening help, and replaying a queue must not move primary controls unexpectedly. Reserve capacity for stack slots and the answer dock before input. A different new question may need different height. Do not animate layout height or create a help panel in normal flow. Current stack rendering reserves at least eight slots and uses top-first display data.

Motion is subtle feedback, not a requirement to understand correctness. Respect `prefers-reduced-motion`; do not introduce celebration effects, flashing, or delays before answering. Maintain readable type and usable controls at 320px width without page overflow. Long C may have a local scroll area without widening the page. Do not shrink the whole desktop page to simulate mobile support.

Tooltips are portaled to the document body, clamped to the visual viewport, and repositioned on scrolling/resizing. Hover/focus shows help; click/tap pins it. Escape and outside click dismiss. Opening another tooltip dismisses the previous one. Retain accessible names, focus visibility, answer descriptions, keyboard access, dialog focus restoration, and polite result announcements. Never rely on color alone to communicate correctness.

Styles: [shared themes](../src/styles.css), [exam](../src/exam.css), [print](../src/print.css). Test actual computed contrast after changes; inherited code color caused an unreadable review regression before.

Checks: [layout stability](../tests/browser/stability.spec.js), [tooltips](../tests/browser/tooltips.spec.js), [phone/tablet review](../tests/browser/mobile-review.spec.js), [refinements](../tests/browser/refinements.spec.js), [answer contrast](../tests/browser/answer-formats.spec.js), [arcade](../tests/browser/arcade.spec.js). See [printing](printing.md) for the distinct academic paper presentation.

## Preserve teaching notation

C source uses preserved lines in a focusable horizontal scroll region. Never break an identifier, numeric literal, pointer expression, base-conversion result, or diagram label in the middle just to fit a phone. Long diagrams and infix/postfix notation scroll locally; ordinary explanatory prose wraps at word boundaries. Code/sequence choices use full-width rows and local scrolling. `step.optionFormat` is `code` or `sequence` for these options; omit it for normal prose. Print remains word-boundary wrapped on paper rather than depending on a scroll region. See `tests/browser/wrapping-variety.spec.js` for 320/768/1440px checks, alongside the existing stability and printing suites.
