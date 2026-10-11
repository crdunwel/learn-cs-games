#!/usr/bin/env node
// Purpose: bounded task-to-context routing and local documentation reference checks.
// Entry points: ./scripts/context "task", ./scripts/context --check, imported test helpers.
// Boundary: reads local paths only; never runs commands found in documentation.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const route = (id, title, keywords, docs, source, tests) => ({
  id,
  title,
  keywords,
  docs,
  source,
  tests,
});
export const routes = [
  route(
    "postfix",
    "Stacks and postfix",
    ["stack", "postfix", "infix", "precedence", "checkpoint", "associativ"],
    ["docs/games/postfix.md"],
    ["src/games/postfix.js", "src/components/Visuals.jsx"],
    ["tests/generators.test.js", "tests/practice-validation.test.js"],
  ),
  route(
    "queue",
    "Queues and circular arrays",
    [
      "queue",
      "dequeue",
      "enqueue",
      "fifo",
      "rear",
      "front",
      "qsize",
      "wraparound",
    ],
    ["docs/games/queue.md", "docs/games/linked-dequeue.md"],
    [
      "src/games/queue.js",
      "src/components/Practice.jsx",
      "src/engine/linkedDequeue.js",
      "src/components/LinkedDequeue.jsx",
    ],
    [
      "tests/generators.test.js",
      "tests/practice-validation.test.js",
      "tests/linked-dequeue.test.js",
      "tests/browser/linked-dequeue.spec.js",
    ],
  ),
  route(
    "bigO",
    "Complexity and scaling",
    [
      "big-o",
      "big o",
      "bigo",
      "complexity",
      "runtime",
      "scaling",
      "growth",
      "loop",
      "work()",
    ],
    ["docs/games/bigO.md"],
    [
      "src/games/bigO.js",
      "src/engine/bigOValidation.js",
      "src/engine/growthNotation.js",
    ],
    ["tests/generators.test.js", "tests/answer-formats.test.js"],
  ),
  route(
    "recursion",
    "Recursion",
    ["recurs", "base case", "unwind", "factorial", "permutation", "hanoi"],
    ["docs/games/recursion.md"],
    ["src/games/recursion.js", "src/engine/recursionValidation.js"],
    ["tests/recursion-bases.test.js", "tests/practice-native-c.test.js"],
  ),
  route(
    "links",
    "Linked lists",
    ["linked", "pointer", "insertion", "link & bloom", "list mutation"],
    ["docs/games/links.md"],
    ["src/games/links.js"],
    [
      "tests/exam-games.test.js",
      "tests/practice-native-c.test.js",
      "tests/memory-variety.test.js",
    ],
  ),
  route(
    "search",
    "Binary search",
    ["binary search", "golden search", "midpoint", "mid index", "search bound"],
    ["docs/games/search.md"],
    ["src/games/search.js", "src/engine/searchValidation.js"],
    ["tests/exam-games.test.js", "tests/practice-validation.test.js"],
  ),
  route(
    "memory",
    "C memory and ownership",
    ["memory", "alloc", "ownership", "cleanup", "sizeof", "bytes", "free("],
    ["docs/games/memory.md"],
    [
      "src/games/memory.js",
      "src/engine/mallocAnswer.js",
      "src/engine/mallocValidation.js",
    ],
    [
      "tests/exam-games.test.js",
      "tests/practice-native-c.test.js",
      "tests/memory-variety.test.js",
    ],
  ),
  route(
    "bases",
    "Number bases",
    [
      "basecamp",
      "base conversion",
      "binary conversion",
      "radix",
      "octal",
      "hex",
      "binary digits",
    ],
    ["docs/games/bases.md"],
    [
      "src/games/bases.js",
      "src/engine/baseWork.js",
      "src/components/BaseWork.jsx",
    ],
    [
      "tests/base-work.test.js",
      "tests/browser/base-work.spec.js",
      "tests/recursion-bases.test.js",
      "tests/answer-formats.test.js",
      "tests/memory-variety.test.js",
    ],
  ),
  route(
    "exam",
    "Timed mock exam",
    [
      "exam",
      "midterm",
      "timer",
      "deadline",
      "rubric",
      "self-mark",
      "submission",
      "submit",
    ],
    ["docs/exam.md"],
    ["src/components/Exam.jsx", "src/engine/exam.js", "src/games/exam.js"],
    ["tests/mock-exam.test.js", "tests/browser/mock-exam.spec.js"],
  ),
  route(
    "grading",
    "Answer equivalence and feedback",
    [
      "grading",
      "grade",
      "format",
      "input",
      "answer",
      "feedback",
      "wrong",
      "notation",
      "parser",
      "fraction",
    ],
    ["docs/grading.md"],
    [
      "src/engine/answerFormats.js",
      "src/engine/growthNotation.js",
      "src/engine/feedback.js",
    ],
    ["tests/answer-formats.test.js", "tests/feedback-lessons.test.js"],
  ),
  route(
    "state",
    "Persistence, scoring and transitions",
    [
      "persist",
      "storage",
      "saved",
      "reload",
      "resume",
      "xp",
      "streak",
      "score",
      "scoring",
      "progress",
      "state transition",
      "timer",
      "deadline",
    ],
    ["docs/state.md"],
    ["src/engine/progress.js", "src/engine/session.js", "src/engine/exam.js"],
    ["tests/progress.test.js", "tests/mock-exam.test.js"],
  ),
  route(
    "ui",
    "Interaction and accessibility",
    [
      "mobile",
      "responsive",
      "screen",
      "layout",
      "animation",
      "tooltip",
      "contrast",
      "color",
      "colour",
      "accessib",
      "keyboard",
      "focus",
      "tutorial",
      "lesson",
      "learn",
      "font",
    ],
    ["docs/ui.md"],
    [
      "src/components/Tutorial.jsx",
      "src/components/Tooltip.jsx",
      "src/components/StepReview.jsx",
      "src/engine/learningSteps.js",
      "src/styles.css",
    ],
    [
      "tests/browser/stability.spec.js",
      "tests/browser/tooltips.spec.js",
      "tests/browser/mobile-review.spec.js",
    ],
  ),
  route(
    "printing",
    "Worksheets and PDF",
    ["print", "pdf", "worksheet", "paper", "border", "grid"],
    ["docs/printing.md"],
    [
      "src/engine/worksheet.js",
      "src/components/PrintPractice.jsx",
      "src/print.css",
    ],
    [
      "tests/worksheet.test.js",
      "tests/browser/printing.spec.js",
      "tests/check-pdf-grids.py",
    ],
  ),
  route(
    "correctness",
    "Generation correctness",
    [
      "correctness",
      "proof",
      "prove",
      "invariant",
      "validator",
      "validation",
      "determin",
      "generated question",
      "native c",
      "sanitizer",
    ],
    ["docs/correctness.md", "docs/validation.md"],
    [
      "src/engine/practiceValidation.js",
      "src/engine/examValidation.js",
      "src/engine/examContracts.js",
    ],
    [
      "tests/practice-validation.test.js",
      "tests/mock-exam.test.js",
      "scripts/native-exam-validation.mjs",
    ],
  ),
  route(
    "extension",
    "New games and contracts",
    [
      "add game",
      "new game",
      "new template",
      "extend",
      "extension",
      "contract",
      "schema",
      "data shape",
    ],
    ["docs/extending.md", "docs/contracts.md"],
    ["src/games/index.js", "src/engine/practiceValidation.js"],
    ["tests/practice-validation.test.js", "tests/worksheet.test.js"],
  ),
  route(
    "deployment",
    "Release and GitHub Pages",
    [
      "deploy",
      "release",
      "publish",
      "github",
      "pages",
      "push",
      "workflow",
      "ci",
      "build",
      "production",
    ],
    ["docs/deployment.md", "docs/validation.md"],
    [
      ".github/workflows/pages.yml",
      "package.json",
      "vite.config.js",
      "playwright.release.config.js",
    ],
    ["tests/release/pages.spec.js", "tests/browser/printing.spec.js"],
  ),
  route(
    "architecture",
    "Architecture and context navigation",
    [
      "architecture",
      "context",
      "hydrate",
      "structure",
      "routing",
      "homepage",
      "readme",
      "agent",
      "setup",
    ],
    ["docs/architecture.md", "docs/README.md"],
    ["src/App.jsx", "src/games/index.js", "scripts/context.mjs"],
    ["tests/context.test.js"],
  ),
];

// Substring matching supports stems, but short keywords must be standalone words.
function matches(text, keyword) {
  return keyword.length <= 3
    ? new RegExp(`\\b${keyword}\\b`, "i").test(text)
    : text.includes(keyword);
}
export function selectRoutes(task, limit = 4) {
  const text = String(task).toLowerCase();
  const ranked = routes
    .map((entry, index) => ({
      entry,
      index,
      score: entry.keywords.filter((word) => matches(text, word)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return (
    ranked.length
      ? ranked.map(({ entry }) => entry)
      : [routes.find(({ id }) => id === "architecture")]
  ).slice(0, Math.max(1, limit));
}

function markdownFiles(root) {
  const docs = path.join(root, "docs");
  const files = ["AGENTS.md", "README.md"];
  function visit(directory) {
    for (const name of readdirSync(directory)) {
      const entry = path.join(directory, name);
      if (statSync(entry).isDirectory()) visit(entry);
      else if (name.endsWith(".md")) files.push(path.relative(root, entry));
    }
  }
  if (existsSync(docs)) visit(docs);
  return files;
}

export function checkReferences(
  root = repositoryRoot,
  configuredRoutes = routes,
) {
  const errors = [];
  const seen = new Set();
  function check(file, owner) {
    const resolved = path.resolve(root, file);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      errors.push(`${owner}: reference escapes repository: ${file}`);
    } else if (!existsSync(resolved)) {
      errors.push(`${owner}: missing ${file}`);
    }
    seen.add(file);
  }
  for (const entry of configuredRoutes) {
    for (const file of [...entry.docs, ...entry.source, ...entry.tests])
      check(file, `route ${entry.id}`);
  }
  const docs = markdownFiles(root);
  for (const file of docs) {
    check(file, "documentation entrypoint");
    if (!existsSync(path.join(root, file))) continue;
    const content = readFileSync(path.join(root, file), "utf8");
    // Current docs use inline Markdown links. No document content is executed.
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim().replace(/^<|>$/g, "");
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      target = target.split("#")[0];
      try {
        target = decodeURIComponent(target);
      } catch {
        errors.push(`${file}: malformed link ${target}`);
        continue;
      }
      if (!target) continue;
      if (path.isAbsolute(target)) {
        errors.push(`${file}: use a repository-relative link: ${target}`);
        continue;
      }
      check(path.normalize(path.join(path.dirname(file), target)), file);
    }
  }
  return {
    errors: [...new Set(errors)],
    filesChecked: seen.size,
    documentsChecked: docs.length,
  };
}

export function main(args = process.argv.slice(2)) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      'Usage: ./scripts/context "task description" | --check | --list\nRead AGENTS.md first; results route to focused docs, source, and tests.',
    );
    return 0;
  }
  if (args[0] === "--check") {
    const result = checkReferences();
    if (result.errors.length) {
      console.error(result.errors.join("\n"));
      return 1;
    }
    console.log(
      `Context links OK: ${result.documentsChecked} documents; ${result.filesChecked} referenced paths.`,
    );
    return 0;
  }
  if (args[0] === "--list") {
    console.log(
      routes
        .map(({ id, title, docs }) => `${id}: ${title} → ${docs.join(", ")}`)
        .join("\n"),
    );
    return 0;
  }
  if (args.some((argument) => argument.startsWith("--"))) {
    console.error("Unknown option. Use --help.");
    return 1;
  }
  console.log(
    "Read AGENTS.md first. Focused context (at most four domains):\n",
  );
  for (const entry of selectRoutes(args.join(" "))) {
    console.log(
      `${entry.title}\n  Read: ${entry.docs.join(", ")}\n  Source: ${entry.source.join(", ")}\n  Verify: ${entry.tests.join(", ")}\n`,
    );
  }
  console.log(
    "More domains: docs/README.md. Release requirements: docs/validation.md.",
  );
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = main();
