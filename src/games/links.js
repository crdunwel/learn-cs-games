import { integer, pick, shuffle } from "../engine/random.js";

const chain = (values) => `${values.join(" → ")} → NULL`;
const visual = (values, label = "Starting list · head →") => ({
  kind: "list",
  label,
  items: values.map(String),
});
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
  options: shuffle(rng, [...new Set([answer, ...alternatives])]),
  hint: `${hint} A node has int data and node *next. Any shown allocation succeeds.`,
  explanation,
  illustration,
});
const insertCode = (x, p) =>
  `// Positions start at 1; past the end means append.\n// head is non-NULL; malloc succeeds.\nnode *prev = head;\nfor (int pos = 1; pos < ${p} - 1 && prev->next; pos++)\n  prev = prev->next;\nnode *tmp = malloc(sizeof *tmp);\ntmp->data = ${x};\ntmp->next = prev->next;\nprev->next = tmp;`;

export function generateLinks(rng, level = 1) {
  const kind = pick(
    rng,
    level === 1
      ? ["insert", "mutation"]
      : ["insert", "mutation", "pointer-order", "free"],
  );
  const values = Array.from(
    { length: integer(rng, 3, 5) },
    (_, i) => integer(rng, 1, 8) + i * 10,
  );
  const x = integer(rng, 51, 89);
  const meta = { kind, values, x };
  let code, steps;
  if (kind === "insert") {
    const p = integer(rng, 2, values.length + 3);
    const index = Math.min(p - 1, values.length);
    const result = values.toSpliced(index, 0, x);
    Object.assign(meta, { p });
    code = insertCode(x, p);
    steps = [
      choice(
        rng,
        `Insert ${x} at position ${p}. Which list results?`,
        chain(result),
        [
          chain(values.toSpliced(Math.min(p, values.length), 0, x)),
          chain([x, ...values]),
          chain(values.toSpliced(index === values.length ? 0 : index, 1, x)),
        ],
        "Positions count from 1. A position beyond the list appends one node.",
        index === values.length
          ? `Position ${p} is beyond the original ${values.length} nodes, so ${x} is appended. Insertion keeps every original node.`
          : `Position ${p} is just after node ${values[index - 1]}. Link ${x} to ${values[index]}, then link ${values[index - 1]} to ${x}; no old value is replaced.`,
        [`Before: ${chain(values)}`, `After: ${chain(result)}`],
      ),
    ];
  } else if (kind === "mutation") {
    const offset = pick(rng, [3, 5, 7]);
    const parity = integer(rng, 0, 1);
    const matches = (v) => v % 2 === parity;
    const result = values.flatMap((v) => (matches(v) ? [v, v + offset] : [v]));
    Object.assign(meta, { offset, parity });
    code = `// Every malloc succeeds.\nwhile (front != NULL) {\n  if (front->data % 2 == ${parity}) {\n    node *tmp = malloc(sizeof *tmp);\n    tmp->data = front->data + ${offset};\n    tmp->next = front->next;\n    front->next = tmp;\n    front = tmp;\n  }\n  front = front->next;\n}`;
    steps = [
      choice(
        rng,
        "What is the list after this code?",
        chain(result),
        [
          chain(values.map((v) => (matches(v) ? v + offset : v))),
          chain(values.flatMap((v) => (matches(v) ? [v + offset, v] : [v]))),
          chain(values.flatMap((v) => (!matches(v) ? [v, v + offset] : [v]))),
        ],
        `Insert after each original ${parity ? "odd" : "even"} node. The two front assignments skip the new node.`,
        `Each original ${parity ? "odd" : "even"} value gets a new node containing that value + ${offset}. Setting front = tmp before advancing skips the inserted node, so it is not processed again.`,
        values.filter(matches).length
          ? values
              .filter(matches)
              .slice(0, 4)
              .map((v) => `${v} → ${v + offset} (new)`)
          : ["No original node meets the condition; the list stays unchanged."],
      ),
    ];
  } else if (kind === "pointer-order") {
    const index = integer(rng, 0, values.length - 2);
    Object.assign(meta, { index });
    const answer = "tmp->next = current->next;\ncurrent->next = tmp;";
    code = `// current points to ${values[index]}.\n// tmp is a separate, allocated node.\ntmp->data = ${x};\n// Insert tmp immediately after current.`;
    steps = [
      choice(
        rng,
        `Which assignments insert ${x} without losing the rest?`,
        answer,
        [
          "current->next = tmp;\ntmp->next = current->next;",
          "tmp->next = current;\ncurrent->next = tmp;",
          "tmp->next = NULL;\ncurrent->next = tmp;",
        ],
        "Save the link to the following node before overwriting current->next.",
        `First let ${x} point to the old next node, ${values[index + 1]}. Then redirect ${values[index]} to ${x}; reversing those assignments makes tmp point to itself.`,
        [
          `Save: ${x} → ${values[index + 1]}`,
          `Connect: ${values[index]} → ${x}`,
        ],
      ),
    ];
  } else {
    code = `void byeList(node *head) {\n  if (head == NULL) return;\n  // Choose the next two lines.\n}`;
    steps = [
      choice(
        rng,
        "Which order safely frees this entire list?",
        "byeList(head->next);\nfree(head);",
        [
          "free(head);\nbyeList(head->next);",
          "free(head->next);\nfree(head);",
          "byeList(head);\nfree(head);",
        ],
        "Read head->next while head still exists. The NULL check stops the recursion.",
        `Recurse through the next pointer before freeing the current node. Freeing head first would make the later read of head->next use freed memory.`,
        [
          `Calls: ${values.join(" → ")} → NULL`,
          `Frees: ${[...values].reverse().join(" → ")}`,
        ],
      ),
    ];
  }
  return { type: "trace", code, visual: visual(values), meta, steps };
}
const step = (caption, values, code, result) => ({
  type: "trace",
  caption,
  visual: visual(values, "List · head →"),
  code,
  result,
});
export const linksLessons = [
  {
    id: "insert-position",
    title: "Insert without replacing",
    summary: "Positions start at 1, just like the sample exam.",
    steps: [
      step(
        "Insert 9 at position 3. Stop at position 2: node 20.",
        [10, 20, 30, 7],
        "// current points to 20\n// tmp holds 9",
        "Position 3 is before 30",
      ),
      step(
        "Save the old next link in the new node first.",
        [10, 20, 30, 7],
        "tmp->next = current->next;",
        "New node: 9 → 30",
      ),
      step(
        "Now point 20 at 9. The original nodes remain in order.",
        [10, 20, 9, 30, 7],
        "current->next = tmp;",
        "Four old nodes + one new node = five",
      ),
    ],
  },
  {
    id: "skip-new-node",
    title: "Trace a changing list",
    summary: "Insert after even values, then skip the inserted node.",
    steps: [
      step(
        "3 is odd, so advance without inserting.",
        [3, 2, 6],
        "if (front->data % 2 == 0) { /* insert */ }",
        "front: 3 → 2",
      ),
      step(
        "2 is even. Insert 2 + 5 = 7 after it.",
        [3, 2, 7, 6],
        "tmp->next = front->next;\nfront->next = tmp;",
        "2 → 7 → 6",
      ),
      step(
        "Move to tmp, then to its next node. That skips 7 and reaches 6.",
        [3, 2, 7, 6],
        "front = tmp;\nfront = front->next;",
        "Only original nodes are processed",
      ),
      step(
        "6 is even too, so insert 11. NULL ends the loop.",
        [3, 2, 7, 6, 11],
        "tmp->data = front->data + 5;",
        "3 → 2 → 7 → 6 → 11 → NULL",
      ),
    ],
  },
  {
    id: "free-list",
    title: "Free from the end",
    summary: "Use the next pointer before freeing its node.",
    steps: [
      step(
        "Follow next pointers until the base case: NULL.",
        [10, 20, 30],
        "if (head == NULL) return;\nbyeList(head->next);",
        "10 → 20 → 30 → NULL",
      ),
      step(
        "The last call returns. Free node 30 first.",
        [10, 20],
        "byeList(head->next);\nfree(head);",
        "30 is freed",
      ),
      step(
        "Return through the earlier calls, freeing 20, then 10.",
        [],
        "// Never read head->next after free(head).",
        "Every node freed once; none read after free",
      ),
    ],
  },
];
export const linksTutorial = linksLessons[0].steps;
