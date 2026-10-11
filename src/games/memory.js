import { integer, pick, shuffle } from "../engine/random.js";

const flow = (label, items) => ({ kind: "flow", label, items });
const choice = (
  rng,
  prompt,
  answer,
  alternatives,
  hint,
  explanation,
  illustration,
) => ({
  kind: "choice",
  prompt,
  answer,
  options: shuffle(rng, [answer, ...alternatives]),
  hint,
  explanation,
  illustration,
});

export function generateMemory(rng, level = 1) {
  const kind = pick(
    rng,
    level === 1
      ? ["calloc", "bytes", "string"]
      : ["calloc", "bytes", "string", "realloc", "free-order", "resize"],
  );
  const count = integer(rng, 12, 240);
  let code, visual, step;
  const meta = { kind, count };
  if (kind === "calloc") {
    const answer = `int *scores = calloc(${count}, sizeof *scores);`;
    code = `// Allocate ${count} ints, each initially 0.\n// Use the pointed-to type for the element size.\n// Assume the allocation succeeds.`;
    visual = flow("Array to create", [`${count} ints`, "All initially 0"]);
    step = choice(
      rng,
      "Which allocation meets both requirements?",
      answer,
      [
        `int *scores = malloc(${count} * sizeof *scores);`,
        `int *scores = calloc(1, sizeof *scores);`,
        `int *scores = calloc(${count - 1}, sizeof *scores);`,
      ],
      "calloc takes an element count and the size of one element. malloc does not initialize the array.",
      `calloc reserves space for all ${count} integers and sets the allocated bytes to zero, giving integer zeros. malloc alone leaves the integer values uninitialized.`,
      [
        `Count: ${count}`,
        "Size of each: sizeof *scores",
        "Initial values: 0, 0, 0, …",
      ],
    );
  } else if (kind === "bytes") {
    const [type, bytes] = pick(rng, [
      ["int", 4],
      ["double", 8],
      ["Book", 64],
      ["float", 4],
    ]);
    Object.assign(meta, { valueType: type, bytes });
    code = `// Assume sizeof(${type}) = ${bytes} bytes.\n// sizeof(${type} *) = 8 bytes.\n${type} *items = malloc(${count} * sizeof *items);`;
    visual = flow("Allocation", [`${count} elements`, `${bytes} bytes each`]);
    step = {
      kind: "input",
      prompt: "How many bytes does this request?",
      unit: "bytes",
      answer: String(count * bytes),
      hint: "*items has the element type. items itself is a pointer, whose size is different from the element size in general.",
      explanation: `sizeof *items measures one ${type}, so multiply ${count} by ${bytes}. sizeof items would measure the pointer, not the array or its elements.`,
      illustration: [
        `${count} elements × ${bytes} bytes = ${count * bytes} bytes`,
        "sizeof *items → element size",
      ],
    };
  } else if (kind === "string") {
    const length = integer(rng, 2, 96);
    Object.assign(meta, { length });
    code = `// strlen(name) is ${length}.\nchar *copy = malloc(/* bytes */);\n// If copy != NULL: strcpy(copy, name);`;
    visual = flow("Copy a C string", [
      `${length} visible characters`,
      "One final '\\0'",
    ]);
    step = {
      kind: "input",
      prompt: "What is the minimum number of bytes for copy?",
      unit: "bytes",
      answer: String(length + 1),
      hint: "strlen excludes the terminating null character. A char occupies one byte in C.",
      explanation: `The ${length} characters need ${length} bytes, and the terminating '\\0' needs one more. Allocating only strlen(name) leaves no room for that last byte.`,
      illustration: [
        `${length} character bytes + 1 terminator = ${length + 1} bytes`,
        "malloc(strlen(name) + 1)",
      ],
    };
  } else if (kind === "realloc") {
    const nextCount = count * pick(rng, [2, 3, 4]);
    Object.assign(meta, { nextCount });
    code = `// scores owns ${count} allocated ints.\n// Required policy on failure: free the old array,\n// set scores to NULL, and print "failed".\nint *tmp = realloc(scores, ${nextCount} * sizeof *scores);\nif (tmp == NULL) {\n  /* choose this branch */\n} else {\n  scores = tmp;\n  printf("success");\n}`;
    visual = flow("realloc failed", [
      "tmp = NULL",
      "Old array still belongs to scores",
    ]);
    step = choice(
      rng,
      "Which failure branch follows the stated policy?",
      'free(scores);\nscores = NULL;\nprintf("failed");',
      [
        'scores = NULL;\nfree(scores);\nprintf("failed");',
        'free(tmp);\nscores = NULL;\nprintf("failed");',
        'scores = tmp;\nprintf("failed");',
      ],
      "For this positive size, realloc failure leaves the original block allocated. Free it before discarding its pointer.",
      "A failed realloc leaves scores pointing to the original allocation; only tmp is NULL. This question's policy requires freeing that original block before setting scores to NULL, otherwise its address is lost and the block leaks.",
      [
        "tmp == NULL → scores still owns old memory",
        "free(scores) → release old memory",
        "scores = NULL → clear the pointer",
      ],
    );
  } else if (kind === "free-order") {
    const authors = integer(rng, 1, 12);
    const titleLength = integer(rng, 5, 45);
    Object.assign(meta, { authors, titleLength });
    code = `typedef struct Book {\n  char title[${titleLength + 1}]; // stored inside Book\n  char **authors; // allocated pointer array\n  int nAuth;\n} Book;\n// book, authors, and each author string are\n// separate successful allocations. nAuth = ${authors}.`;
    visual = flow("Owned allocations", [
      "book",
      `authors: ${authors} pointers`,
      `${authors} author strings`,
    ]);
    step = choice(
      rng,
      "Which order releases all owned memory safely?",
      "Free each authors[i] → free authors → free book",
      [
        "Free book → free authors → free each authors[i]",
        "Free authors → free each authors[i] → free book",
        "Free each authors[i] → free title → free book",
      ],
      "Free children before the allocation holding their pointers. title is part of Book, not a separate allocation.",
      `Free all ${authors} author strings first, then the authors pointer array, then book. Freeing a parent first loses access to its child pointers; title needs no separate free because it lives inside Book.`,
      [
        `${authors} × free(book->authors[i])`,
        "free(book->authors)",
        "free(book)",
      ],
    );
  } else {
    const oldValues = Array.from({ length: integer(rng, 3, 5) }, () =>
      integer(rng, 1, 40),
    );
    const nextCount = oldValues.length * integer(rng, 2, 4);
    const index = integer(rng, 0, oldValues.length - 1);
    Object.assign(meta, { oldValues, nextCount, index });
    code = `// scores initially contains: ${oldValues.join(", ")}\nint *tmp = realloc(scores, ${nextCount} * sizeof *scores);\n// Assume tmp != NULL.\nscores = tmp;\n// What is scores[${index}] now?`;
    visual = flow("Successful growth", [
      `${oldValues.length} old ints`,
      `${nextCount} total slots`,
    ]);
    step = {
      kind: "input",
      prompt: `What value remains at scores[${index}]?`,
      answer: String(oldValues[index]),
      hint: "A successful realloc preserves the existing contents up to the smaller old/new size. Added bytes are not initialized.",
      explanation: `Growing the allocation preserves the original entries, so index ${index} still contains ${oldValues[index]}. The added slots are uninitialized, even if the original allocation came from calloc.`,
      illustration: [
        `Kept: ${oldValues.join(", ")}`,
        `Added ${nextCount - oldValues.length} slots: uninitialized`,
      ],
    };
  }
  return { type: "trace", code, visual, meta, steps: [step] };
}
const lessonStep = (caption, code, items, result) => ({
  type: "trace",
  caption,
  code,
  result,
  visual: flow("Memory map", items),
});
export const memoryLessons = [
  {
    id: "allocate-exactly",
    title: "Count bytes, then allocate",
    summary: "Elements, bytes, and the string terminator.",
    steps: [
      lessonStep(
        "An array needs a count and the size of one element.",
        "int *scores = calloc(5, sizeof *scores);",
        ["5 integers", "sizeof *scores per integer"],
        "calloc initializes the integers to 0",
      ),
      lessonStep(
        "A pointer's size is not the size of the object it points to.",
        "// Assume sizeof(int) = 4 and sizeof(int *) = 8.\n// Five ints need 5 × 4 = 20 bytes.",
        ["scores: pointer", "*scores: int"],
        "Use sizeof *scores for an element",
      ),
      lessonStep(
        "A C string has an extra null character after its visible letters.",
        'char *name = malloc(strlen("Mia") + 1);\n// If name != NULL: strcpy(name, "Mia");',
        ["M", "i", "a", "\\0"],
        "3 visible characters + 1 = 4 bytes",
      ),
    ],
  },
  {
    id: "safe-realloc",
    title: "Keep the old address",
    summary: "Follow the exam's free-on-failure policy.",
    steps: [
      lessonStep(
        "Save realloc's result in a temporary pointer.",
        "int *tmp = realloc(scores, 20 * sizeof *scores);",
        ["scores → old block", "tmp → result"],
        "Do not overwrite scores yet",
      ),
      lessonStep(
        "On failure, tmp is NULL but scores still owns the old block.",
        'if (tmp == NULL) {\n  free(scores);\n  scores = NULL;\n  printf("failed");\n}',
        ["Release original block", "Clear scores"],
        "This policy intentionally frees on failure",
      ),
      lessonStep(
        "On success, use the returned pointer. Old entries are preserved.",
        'else {\n  scores = tmp;\n  printf("success");\n}',
        ["scores → resized block", "New slots: uninitialized"],
        "Do not free the old pointer after success",
      ),
    ],
  },
  {
    id: "nested-ownership",
    title: "Free children first",
    summary: "A Book owns an array of author-name pointers.",
    steps: [
      lessonStep(
        "Free each separately allocated author string while its pointer exists.",
        "for (int i = 0; i < book->nAuth; i++)\n  free(book->authors[i]);",
        ["book → authors → strings"],
        "Strings freed; pointer array still exists",
      ),
      lessonStep(
        "Now the pointer array has no remaining children. Free it.",
        "free(book->authors);",
        ["book → authors (freed)"],
        "Do not access authors[i] afterward",
      ),
      lessonStep(
        "Finally free the Book itself. Its inline title array is included.",
        "free(book);\n// title was char title[50], not a separate malloc.",
        ["Book freed"],
        "Strings → pointer array → Book",
      ),
    ],
  },
];
export const memoryTutorial = memoryLessons[0].steps;
