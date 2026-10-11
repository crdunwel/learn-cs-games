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
      ? [
          "calloc",
          "bytes",
          "string",
          "array-length",
          "zero-read",
          "malloc-write",
        ]
      : [
          "calloc",
          "bytes",
          "string",
          "realloc",
          "free-order",
          "resize",
          "array-length",
          "zero-read",
          "alias-write",
          "pointer-offset",
          "shrink",
          "row-allocations",
          "malloc-write",
        ],
  );
  const count = integer(rng, 12, 240);
  let code, visual, step;
  const meta = { kind, count };
  if (kind === "malloc-write") {
    const variant = integer(rng, 0, 5);
    const definitions = [
      { type: "int", name: "scores", elementBytes: 4, count },
      { type: "double", name: "measurements", elementBytes: 8, count },
      { type: "float", name: "samples", elementBytes: 4, count },
      { type: "char", name: "copy", elementBytes: 1, count: 0 },
      { type: "Book", name: "book", elementBytes: 44, count: 1 },
      { type: "Book", name: "books", elementBytes: 44, count },
    ];
    const allocation = definitions[variant];
    if (variant === 3) {
      meta.length = integer(rng, 2, 96);
      allocation.count = meta.length + 1;
    }
    meta.variant = variant;
    const structure =
      allocation.type === "Book"
        ? "typedef struct Book { char title[40]; int pages; } Book;\n"
        : "";
    code = `${structure}// Assume sizeof(${allocation.type}) = ${allocation.elementBytes} bytes.\n// ${allocation.name} is a ${allocation.type} pointer; declare it or assume it exists.\n// Write one malloc assignment. No initialization is required.`;
    const request =
      variant === 3
        ? `Allocate space for a ${meta.length}-character C string in copy.`
        : variant === 4
          ? "Allocate one Book in book."
          : `Allocate ${count} ${allocation.type} elements in ${allocation.name}.`;
    visual = flow("What to allocate", [
      variant === 3
        ? `${meta.length} characters + '\\0'`
        : `${allocation.count} ${allocation.type} elements`,
      `${allocation.elementBytes} bytes each`,
    ]);
    const bytes = allocation.count * allocation.elementBytes;
    step = {
      kind: "input",
      format: "malloc",
      allocation,
      prompt: request,
      answer: `${allocation.type} *${allocation.name} = malloc(${allocation.count} * sizeof *${allocation.name});`,
      hint: "Store malloc's returned address in the named pointer. Its size is element count × size of one element. C strings need one extra char for \\0.",
      explanation:
        variant === 3
          ? `Include the final '\\0': ${meta.length} + 1 = ${allocation.count} chars. Each char takes one byte. Store the returned address in copy.`
          : `${allocation.count} ${allocation.type} ${allocation.count === 1 ? "element needs" : "elements need"} ${allocation.count} × ${allocation.elementBytes} = ${bytes} bytes. sizeof *${allocation.name} measures one element; malloc returns the address to store in ${allocation.name}.`,
      illustration: [
        `${allocation.count} × ${allocation.elementBytes} = ${bytes} bytes`,
        `Store address → ${allocation.name}`,
      ],
    };
  } else if (kind === "calloc") {
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
  } else if (kind === "array-length") {
    code = `int values[${count}] = {0};\nsize_t length = sizeof values / sizeof values[0];`;
    visual = flow("A real array", [
      `${count} elements`,
      "sizeof whole array ÷ sizeof element",
    ]);
    step = {
      kind: "input",
      prompt: "What value is stored in length?",
      answer: String(count),
      hint: "Here values is an array, not a pointer parameter. sizeof values includes every element.",
      explanation: `The whole array uses ${count} element sizes. Dividing by one element's size gives ${count}. This formula would not find the length of a malloc pointer.`,
      illustration: [`(${count} × sizeof(int)) / sizeof(int) = ${count}`],
    };
  } else if (kind === "zero-read") {
    const index = integer(rng, 0, count - 1);
    Object.assign(meta, { index });
    code = `// Assume calloc succeeds.\nint *values = calloc(${count}, sizeof *values);\nint result = values[${index}];`;
    visual = flow("Allocated int array", [
      `${count} slots`,
      `Read index ${index}`,
    ]);
    step = {
      kind: "input",
      prompt: "What is result?",
      answer: "0",
      hint: "calloc sets every allocated byte to zero. For int elements, that represents 0.",
      explanation: `All ${count} int elements start at 0, including index ${index}. Nothing has written a different value there. malloc alone would not give this guarantee.`,
      illustration: [
        `values[${index}] = 0`,
        "calloc → initialized; malloc → uninitialized",
      ],
    };
  } else if (kind === "alias-write") {
    const value = integer(rng, 1, 40),
      delta = integer(rng, 1, 9),
      index = integer(rng, 0, 2);
    Object.assign(meta, { value, delta, index });
    code = `// Assume malloc succeeds.\nint *p = malloc(3 * sizeof *p);\np[${index}] = ${value};\nint *q = p;\nq[${index}] += ${delta};\nint result = p[${index}];`;
    visual = flow("Two names, one allocation", ["p → same block ← q"]);
    step = {
      kind: "input",
      prompt: "What is result?",
      answer: String(value + delta),
      hint: "q = p copies the address, not the three integers.",
      explanation: `p and q point to the same block. Writing through q changes the element that p sees: ${value} + ${delta} = ${value + delta}. Free this allocation once, not once per pointer.`,
      illustration: [`q[${index}] and p[${index}] are the same element`],
    };
  } else if (kind === "pointer-offset") {
    const start = integer(rng, 1, 20),
      offset = integer(rng, 1, 3),
      index = integer(rng, 0, 4 - offset);
    const values = Array.from({ length: 5 }, (_, i) => start + 3 * i);
    Object.assign(meta, { start, offset, index });
    code = `int values[5] = {${values.join(", ")}};\nint *p = values + ${offset};\nint result = p[${index}];`;
    visual = {
      kind: "array",
      label: "values · original indices",
      items: values.map(String),
    };
    step = {
      kind: "input",
      prompt: "What is result?",
      answer: String(values[offset + index]),
      hint: "Pointer addition moves in elements. p[0] starts at the offset, not at values[0].",
      explanation: `p starts at values[${offset}]. Move ${index} more elements: p[${index}] is values[${offset + index}], which is ${values[offset + index]}.`,
      illustration: [
        `Original index: ${offset} + ${index} = ${offset + index}`,
      ],
    };
  } else if (kind === "shrink") {
    const start = integer(rng, 1, 20),
      nextCount = integer(rng, 1, 5),
      index = integer(rng, 0, nextCount - 1);
    Object.assign(meta, { start, nextCount, index });
    code = `// Assume both allocations succeed.\nint *values = malloc(6 * sizeof *values);\nfor (int i = 0; i < 6; i++) values[i] = ${start} + i;\nint *tmp = realloc(values, ${nextCount} * sizeof *values);\nvalues = tmp;\nint result = values[${index}];`;
    visual = flow("Shrink the allocation", [
      "6 old elements",
      `${nextCount} retained elements`,
    ]);
    step = {
      kind: "input",
      prompt: "What is result after shrinking?",
      answer: String(start + index),
      hint: "Successful realloc preserves the first min(old size, new size) bytes. The removed tail must not be read.",
      explanation: `Shrinking keeps indices 0 through ${nextCount - 1}. Index ${index} is still inside that prefix, so its value remains ${start} + ${index} = ${start + index}. The discarded elements are no longer accessible.`,
      illustration: [
        `Preserved: ${Array.from({ length: nextCount }, (_, i) => start + i).join(", ")}`,
      ],
    };
  } else if (kind === "row-allocations") {
    const rows = integer(rng, 1, 8),
      columns = integer(rng, 2, 10);
    Object.assign(meta, { rows, columns });
    code = `// Assume every allocation succeeds.\nint **grid = malloc(${rows} * sizeof *grid);\nfor (int r = 0; r < ${rows}; r++)\n  grid[r] = malloc(${columns} * sizeof *grid[r]);`;
    visual = flow("Separate allocations", [
      "One pointer array",
      `${rows} row blocks`,
    ]);
    step = {
      kind: "input",
      prompt: "How many free calls release every block?",
      answer: String(rows + 1),
      hint: "Each successful malloc creates one block. A whole row is freed with one call, regardless of its number of integers.",
      explanation: `There are ${rows} row blocks plus one pointer-array block: ${rows} + 1 = ${rows + 1} frees. Free each grid[r], then grid. The ${columns} integers in a row are not separate allocations.`,
      illustration: [`${rows} × free(grid[r])`, "1 × free(grid)"],
    };
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
  if (["calloc", "realloc"].includes(kind)) step.optionFormat = "code";
  if (kind === "free-order") step.optionFormat = "sequence";
  const reviewSteps =
    kind === "malloc-write"
      ? [
          {
            title: "Count the elements",
            detail:
              meta.variant === 3
                ? "A string also needs its terminating null character."
                : "Allocate every requested element.",
            math:
              meta.variant === 3
                ? `${meta.length} + 1 = ${step.allocation.count}`
                : `Count = ${step.allocation.count}`,
          },
          {
            title: "Calculate the bytes",
            detail: "Multiply the count by the size of one element.",
            math: `${step.allocation.count} × ${step.allocation.elementBytes} = ${step.allocation.count * step.allocation.elementBytes} bytes`,
          },
          {
            title: "Store the address",
            detail: `malloc returns the address. Assign it to ${step.allocation.name}.`,
            math: step.answer,
          },
        ]
      : [
          { title: "Start with the rule", detail: step.hint },
          ...(step.illustration || []).map((math, i) => ({
            title: `Step ${i + 1}`,
            detail:
              i === 0
                ? step.explanation
                : "Follow the allocation or pointer shown here.",
            math,
          })),
        ];
  return { type: "trace", code, visual, meta, steps: [step], reviewSteps };
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
    id: "write-malloc",
    title: "Write a malloc line",
    summary: "Count × element size → pointer.",
    steps: [
      lessonStep(
        "Start with the pointer's type and the number of elements.",
        "int *scores; // space for 5 ints",
        ["5 elements", "int *scores"],
        "The pointer will hold the returned address",
      ),
      lessonStep(
        "Multiply the count by the size of one int. sizeof *scores measures an element.",
        "int *scores = malloc(5 * sizeof *scores);",
        ["5", "× sizeof one int"],
        "sizeof(int) works too; spaces do not change meaning",
      ),
      lessonStep(
        "For a string, add one char for the final null character.",
        "char *name = malloc(3 + 1);",
        ["3 letters", "1 null character"],
        "End a C statement with ;",
      ),
    ],
  },
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
