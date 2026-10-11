# Pen-and-paper practice

Every topic and THE EXAM exposes Print / PDF at the top right. The same control is an icon on narrow screens. The browser's print dialog saves PDF or prints paper; there is no PDF server.

[worksheet.js](../src/engine/worksheet.js) accepts `{ gameId, seed, count, level, exam }`. Topic sets use 3, 5, or 10 questions and levels 1–3, generated through the validated registry. A bounded uniqueness loop prevents duplicate paper questions; exhaustion throws rather than returning an incomplete set. A supplied exam is returned unchanged. The same object powers questions and the separate answer key.

[PrintPractice.jsx](../src/components/PrintPractice.jsx) keeps a topic set while preview is closed/reopened. New set or settings regenerate it. The exam has no independent worksheet count/new-set controls: changing the paper belongs to the exam screen. While an exam is running, the answer-key option is disabled and the renderer is forced to question mode; printing questions remains available. Keys are available before starting and after submission/expiry. Paper IDs retain seed/topic/level so question and key stay paired.

## Academic presentation

[print.css](../src/print.css) makes the document monochrome with plain type, code, neutral diagrams, and writing space. At print time the app root and preview controls are hidden; only the portal worksheet prints. Printable questions must not inherit colored gameplay cues, worked traces, hints, or answers. Answer-key mode removes blank writing areas.

Postfix papers add three between-token checkpoints A/B/C, top/bottom labels, eight-row blank vertical stacks, and one postfix box per non-parenthesis token. Diagram checkpoint `stop` is the zero-based token **before** the marker; the solver state is `states[stop + 1]`. This differs from interactive `question.stop`, which counts processed tokens. Preserve this conversion.

Grid strokes must be actual inset SVG outlines and dividers. `PaperGrid` uses a complete rectangle and uniform 2px non-scaling strokes (1.5pt in PDF). Do not replace these with thin CSS borders or draw strokes on the SVG viewport edge: actual PDFs previously lost the first stack's left border. Both vector structure and raster continuity matter.

Queue papers show the initial cells, operations, and blank final layout. Blank cells denote inactive queue entries, not a claim that C dequeuing must erase memory. Other adapters preserve code, prompts, choices and explanations without requiring the interactive visual to solve the question.

## Verification

[worksheet.test.js](../tests/worksheet.test.js) checks all topic adapters, settings, determinism, checkpoint answers and paper/key relationships. [printing.spec.js](../tests/browser/printing.spec.js) checks all nine previews, paper isolation, 320px fit, SVG grid structure, and exports PDFs when `SCREENSHOT_DIR` is set.

After export run [check-pdf-grids.py](../tests/check-pdf-grids.py) on the actual postfix and exam PDFs. It inspects vector paths and rasterizes at 72, 96, and 144 DPI. See the script header for Python/Poppler dependencies and CLI arguments. Browser DOM assertions alone cannot establish that exported borders are visible. Visually inspect at least the stack pages, code-heavy pages, and answer key after changing paper layout.
