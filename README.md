# CS Club

[Open CS Club](https://crdunwel.github.io/learn-cs-games/) · [GitHub repository](https://github.com/crdunwel/learn-cs-games)

A local-first CS practice arcade: eight short games, a full timed mock midterm, and fresh pen-and-paper worksheets. Built with React and Vite. No account, backend, analytics, or remote fonts.

## Run locally

Use Node 22.12 or newer within the Node 22 release line; [package.json](package.json) and [.nvmrc](.nvmrc) define the supported toolchain. Release details are in [deployment](docs/deployment.md).

```sh
npm ci
npm run dev
```

Open the URL Vite prints, normally `http://127.0.0.1:5173/`. [index.html](index.html) is the application entrypoint; serve it with Vite rather than opening it as a file. `npm run build` creates `dist/`; `npm run preview` serves the production build. Hash routes and relative asset URLs support GitHub Pages project paths.

## Play and print

| Game              | Practice                                             |
| ----------------- | ---------------------------------------------------- |
| Stack & Slay      | Vertical operator stacks and infix-to-postfix        |
| Poolside Queue    | FIFO operations, circular arrays, front/rear indices |
| Big-O Afterglow   | C loops and exact growth scaling                     |
| Recursion Reverie | Calls, returns, print order, array recursion         |
| Link & Bloom      | Linked-list insertion, pointer order, cleanup        |
| Golden Search     | Binary-search indices, bounds, results               |
| Memory Garden     | Allocation sizes, realloc, ownership                 |
| Basecamp          | Binary, octal, decimal, hexadecimal                  |
| THE EXAM          | 16 questions, 120 minutes, 100 points                |

Topic games have Learn walkthroughs, three selectable levels, quick feedback, hints, and XP. Print / PDF produces fresh monochrome question sheets and a separate answer key. THE EXAM prints the same paper as the current attempt. Written C and reasoning are self-marked against rubrics; objective answers are marked automatically.

Progress is saved in this browser's localStorage. Practice statistics and exam attempts use separate keys. The exam timer continues while away; reload does not grant extra time. Storage-denied mode is temporary and visibly reported. See [state and persistence](docs/state.md).

## Work on the project

Start with [AGENTS.md](AGENTS.md), then ask the local context router for a focused reading list:

```sh
./scripts/context "fix queue feedback"
./scripts/context "exam timer persistence"
./scripts/context --check
```

[Documentation index](docs/README.md) → [architecture](docs/architecture.md) → the relevant feature → exact source and tests. [Correctness](docs/correctness.md) explains the independent generation guards, finite-domain checks, compiled C evidence, and the limits of the guarantee. [Validation](docs/validation.md) lists reproducible checks. [Deployment](docs/deployment.md) covers GitHub Pages and release operations.

```sh
npm test
npm run test:exam-c
npm run build
npm run test:browser
```

Native C checks need a C11 compiler with AddressSanitizer and UndefinedBehaviorSanitizer. Browser tests need Playwright Chromium or installed Chrome; see validation for setup. The reference course PDFs informed notation and exercise scope; they are not application dependencies or bundled assets.
