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

## Learning after a mistake

[StepReview](../src/components/StepReview.jsx) presents one calculation/action at a time from validated question metadata. [learningSteps.js](../src/engine/learningSteps.js) adapts postfix token processing and older illustrations. Changing review position never changes the draft, correctness or XP. Queue review remains in its diagram: checking starts at the **original** state; Next operation applies one whole operation and displays the item action, modulo arithmetic, size change, and unchanged pointer. Replay restarts at the original state. Ordinary FIFO questions use item order and no array indices.

Full-postfix entry shows the whole expression without a checkpoint marker or partial operator stack. The scene reserves the first stack phase's measured height so advancing does not move the Check button. Source/answer regions and the feedback dock stay fixed within the question.

Tutorials measure the largest actual scene and caption **within the selected lesson**, then align current content at the top. Different lessons may need different height; navigation must remain stable through that lesson. Hidden Learn panels skip zero-width measurements. Observers reattach when lessons change; measurement nodes are clipped, inert and removed after sizing. Do not restore a global 720px centered region to achieve stability: that creates empty space before short C examples.

Queue pointer labels are permanent orientation cues. Never hide them on empty states or replace them with single letters on phones; state notes and dashed empty-index badges distinguish retained indices from actual items. Ordinary review math names FRONT/REAR in both before and after lines.

## Code-to-pointer walkthrough

Poolside Queue Learn includes [linked dequeue](games/linked-dequeue.md), reached with **Dequeue in C** or the Example selector. [LinkedDequeue.jsx](../src/components/LinkedDequeue.jsx) shows only the current source action, its reason, and one pointer snapshot. Full C stays behind the example help. Three-node, empty, and singleton inputs expose both branches; the ending replays rather than suggesting unrelated circular-array practice.

[dequeue.css](../src/dequeue.css) reserves the current lesson's explanation height, code space and original node slots. Nodes stay in place through head changes and freeing; pointer paths interpolate between targets. Saved data moves into `retval`, and changed fields get a small pulse. Back/Replay cancel old motion, reduced motion displays the final state immediately, and initial diagrams do not animate. SVG uses the actual container width, horizontal links on wider screens and vertical links on phones. head/front and tail/end stay named when NULL; freed fields disappear and the saved `temp` is visibly dangling until return. Source wraps only at assignment boundaries. [Browser checks](../tests/browser/linked-dequeue.spec.js) cover every code/state binding, mobile geometry, Back, Replay, storage preservation and real pointer motion.
