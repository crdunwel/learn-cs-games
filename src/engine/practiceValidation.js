import { validateBigOQuestion, countBigOWork } from "./bigOValidation.js";
import { validateRecursionQuestion } from "./recursionValidation.js";
import { validateSearchQuestion } from "./searchValidation.js";
import { validateMallocQuestion } from "./mallocValidation.js";
// Independent, deterministic checks run before a practice question is shown or printed.
// This module deliberately imports neither generators nor their solution helpers.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const need = (condition, message) => {
  if (!condition) throw new Error(`Invalid practice question: ${message}`);
};
const integer = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;
// Token boundaries and string contents matter: `re turn` must not become `return`.
// Comments are trivia; placeholders are intentionally comments in fill-in questions.
const cTokens = (code) =>
  (
    code.match(
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_]\w*|\d+|\+\+|--|->|<=|>=|==|!=|\+=|-=|\*=|\/=|&&|\|\||[^\s]/g,
    ) || []
  ).filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
const canonical = (code) => JSON.stringify(cTokens(code));
const codeIs = (q, expected) =>
  need(
    canonical(q.code) === canonical(expected),
    "displayed C does not match its model",
  );
const answerIs = (q, value, at = 0) =>
  need(
    q.steps[at].answer === String(value),
    "answer disagrees with independent model",
  );
const chain = (values) => `${values.join(" → ")} → NULL`;

// Recursive grammar / postorder traversal, rather than the generator's shunting yard.
export function postfixByGrammar(tokens) {
  let at = 0;
  function atom() {
    const token = tokens[at++];
    if (token === "(") {
      const inside = sum();
      need(tokens[at++] === ")", "unbalanced parentheses");
      return inside;
    }
    need(
      typeof token === "string" && /^(\d+|[A-Z])$/.test(token),
      "invalid operand",
    );
    return [token];
  }
  function product() {
    let out = atom();
    while (["*", "/"].includes(tokens[at])) {
      const operator = tokens[at++];
      out = [...out, ...atom(), operator];
    }
    return out;
  }
  function sum() {
    let out = product();
    while (["+", "-"].includes(tokens[at])) {
      const operator = tokens[at++];
      out = [...out, ...product(), operator];
    }
    return out;
  }
  const result = sum();
  need(at === tokens.length, "unconsumed infix tokens");
  return result;
}

// Each open parenthesis has one pending sum and one pending product.
// This makes intermediate checkpoints independent of the production operator stack.
export function postfixPrefixStates(tokens) {
  const frames = [{ low: null, high: null }],
    output = [],
    states = [];
  const capture = () =>
    states.push({
      stack: frames.flatMap((frame, i) => [
        ...(i ? ["("] : []),
        ...[frame.low, frame.high].filter(Boolean),
      ]),
      output: [...output],
    });
  const finish = (frame) => {
    if (frame.high) output.push(frame.high);
    if (frame.low) output.push(frame.low);
  };
  capture();
  for (const token of tokens) {
    const frame = frames.at(-1);
    if (/^(\d+|[A-Z])$/.test(token)) output.push(token);
    else if (token === "(") frames.push({ low: null, high: null });
    else if (token === ")") {
      need(frames.length > 1, "unmatched close");
      finish(frames.pop());
    } else if (["+", "-"].includes(token)) {
      finish(frame);
      frame.high = null;
      frame.low = token;
    } else if (["*", "/"].includes(token)) {
      if (frame.high) output.push(frame.high);
      frame.high = token;
    } else need(false, "unknown operator");
    capture();
  }
  return states;
}

function postfix(q) {
  const expected = postfixByGrammar(q.tokens);
  const states = postfixPrefixStates(q.tokens);
  need(same(q.solution.postfix, expected), "postfix conversion");
  need(same(q.solution.states, states), "intermediate stack/output");
  need(integer(q.stop, 1, q.tokens.length), "checkpoint outside expression");
  need(q.checkpoint.after === q.stop, "checkpoint marker off by one");
  need(
    q.stackCapacity >= Math.max(...states.map((state) => state.stack.length)),
    "stack capacity clips contents",
  );
  answerIs(q, [...states[q.stop].stack].reverse().join(" "));
  answerIs(q, expected.join(" "), 1);
}

export function queueStateIsValid(state) {
  const { capacity, cells, front, rear, count } = state;
  if (
    !integer(capacity, 1, 6) ||
    !integer(front, 0, capacity - 1) ||
    !integer(count, 0, capacity)
  )
    return false;
  if (
    rear !== (front + count + capacity - 1) % capacity ||
    cells.length !== capacity
  )
    return false;
  const occupied = new Set(
    Array.from({ length: count }, (_, i) => (front + i) % capacity),
  );
  return cells.every((value, index) =>
    occupied.has(index) ? value !== null : value === null,
  );
}
function ordinaryQueue(q) {
  need(
    Array.isArray(q.initial.items) &&
      q.initial.items.length <= 4 &&
      q.initial.items.every((v) => /^\d+$/.test(v)),
    "ordinary FIFO initial state",
  );
  need(
    q.operations.length >= 1 &&
      q.operations.length <= 3 &&
      q.operations.length === q.trace.length,
    "ordinary trace length",
  );
  const list = [...q.initial.items];
  let before = q.initial,
    result;
  q.operations.forEach((op, i) => {
    need(
      same(q.trace[i].before, before) && same(q.trace[i].operation, op),
      "ordinary trace input",
    );
    if (op.kind === "enqueue") {
      need(
        typeof op.value === "string" && /^\d+$/.test(op.value),
        "FIFO payload",
      );
      list.push(op.value);
      result = op.value;
    } else {
      need(op.kind === "dequeue", "ordinary operation");
      result = list.length ? list.splice(0, 1)[0] : "Empty";
    }
    before = { items: [...list] };
    need(
      same(q.trace[i].state, before) && q.trace[i].result === result,
      "ordinary FIFO transition",
    );
  });
  need(same(q.final, before), "ordinary final state");
  need(
    ["first", "last", "count", "result"].includes(q.target),
    "ordinary target",
  );
  answerIs(
    q,
    q.target === "first"
      ? (list[0] ?? "Empty")
      : q.target === "last"
        ? (list.at(-1) ?? "Empty")
        : q.target === "count"
          ? list.length
          : result,
  );
}
function queue(q) {
  if (q.variant === "fifo") return ordinaryQueue(q);
  need(queueStateIsValid(q.initial), "initial circular queue");
  const { capacity } = q.initial;
  let front = q.initial.front,
    rear = q.initial.rear,
    result;
  const fifo = Array.from(
    { length: q.initial.count },
    (_, i) => q.initial.cells[(front + i) % capacity],
  );
  let before = q.initial;
  need(q.operations.length === q.trace.length, "queue trace length");
  q.operations.forEach((operation, i) => {
    need(
      same(q.trace[i].before, before) && same(q.trace[i].operation, operation),
      "queue trace input",
    );
    if (operation.kind === "enqueue") {
      if (fifo.length === capacity) result = "Full";
      else {
        fifo.push(operation.value);
        rear = (front + fifo.length - 1) % capacity;
        result = operation.value;
      }
    } else {
      need(operation.kind === "dequeue", "unknown queue operation");
      if (!fifo.length) result = "Empty";
      else {
        result = fifo.shift();
        front = (front + 1) % capacity;
      }
    }
    const cells = Array(capacity).fill(null);
    fifo.forEach((value, offset) => {
      cells[(front + offset) % capacity] = value;
    });
    const expected = { capacity, cells, front, rear, count: fifo.length };
    need(
      same(expected, q.trace[i].state) && q.trace[i].result === result,
      "FIFO transition",
    );
    need(queueStateIsValid(expected), "circular queue invariant");
    before = expected;
  });
  need(same(q.final, before), "queue final state");
  need(
    ["front", "rear", "count", "result"].includes(q.target),
    "unknown queue target",
  );
  answerIs(q, q.target === "result" ? result : before[q.target]);
}

export function bigOWorkCount(question, n, m = n) {
  return countBigOWork(question, n, m);
}

function bigO(q) {
  return validateBigOQuestion(q);
}

function recursion(q) {
  return validateRecursionQuestion(q);
}

function links(q) {
  const m = q.meta;
  need(
    integer(m.values.length, 3, 5) &&
      m.values.every((v, i) => integer(v, i * 10 + 1, i * 10 + 8)) &&
      integer(m.x, 51, 89),
    "linked-list domain",
  );
  need(same(q.visual.items, m.values.map(String)), "displayed starting list");
  let expected;
  if (m.kind === "insert") {
    need(integer(m.p, 2, m.values.length + 3), "insertion position");
    const result = [...m.values];
    result.splice(Math.min(m.p - 1, result.length), 0, m.x);
    expected = chain(result);
    codeIs(
      q,
      `node *prev = head; for (int pos = 1; pos < ${m.p} - 1 && prev->next; pos++) prev = prev->next; node *tmp = malloc(sizeof *tmp); tmp->data = ${m.x}; tmp->next = prev->next; prev->next = tmp;`,
    );
  } else if (m.kind === "mutation") {
    need(
      [3, 5, 7].includes(m.offset) && [0, 1].includes(m.parity),
      "list mutation domain",
    );
    const result = [];
    for (const value of m.values) {
      result.push(value);
      if (value % 2 === m.parity) result.push(value + m.offset);
    }
    expected = chain(result);
    codeIs(
      q,
      `while (front != NULL) { if (front->data % 2 == ${m.parity}) { node *tmp = malloc(sizeof *tmp); tmp->data = front->data + ${m.offset}; tmp->next = front->next; front->next = tmp; front = tmp; } front = front->next; }`,
    );
  } else if (m.kind === "pointer-order") {
    need(
      integer(m.index, 0, m.values.length - 2),
      "pointer-order current node",
    );
    expected = "tmp->next = current->next;\ncurrent->next = tmp;";
    codeIs(q, `tmp->data = ${m.x};`);
  } else {
    need(m.kind === "free", "unknown list operation");
    expected = "byeList(head->next);\nfree(head);";
    codeIs(q, "void byeList(node *head) { if (head == NULL) return; }");
  }
  answerIs(q, expected);
}

// Recursive interval partitioning: independent of the iterative production trace.
export function searchByPartition(
  values,
  target,
  low = 0,
  high = values.length - 1,
) {
  if (low > high) return [];
  const mid = Math.floor((low + high) / 2);
  const round = { low, high, mid, value: values[mid] };
  if (values[mid] === target) return [round];
  return [
    round,
    ...searchByPartition(
      values,
      target,
      target > values[mid] ? mid + 1 : low,
      target < values[mid] ? mid - 1 : high,
    ),
  ];
}
function search(q) {
  return validateSearchQuestion(q);
}

function memory(q) {
  if (q.meta.kind === "malloc-write") return validateMallocQuestion(q);
  const m = q.meta;
  need(integer(m.count, 12, 240), "allocation count");
  let expected;
  if (m.kind === "calloc") {
    need(
      q.code.includes(`Allocate ${m.count} ints, each initially 0`),
      "displayed allocation count",
    );
    expected = `int *scores = calloc(${m.count}, sizeof *scores);`;
    codeIs(q, "");
  } else if (m.kind === "bytes") {
    need(
      { int: 4, double: 8, Book: 64, float: 4 }[m.valueType] === m.bytes,
      "declared type size",
    );
    expected = m.count * m.bytes;
    codeIs(q, `${m.valueType} *items = malloc(${m.count} * sizeof *items);`);
    need(
      q.code.includes(`sizeof(${m.valueType}) = ${m.bytes} bytes`),
      "byte-size assumption missing",
    );
  } else if (m.kind === "string") {
    need(integer(m.length, 2, 96), "string length");
    expected = m.length + 1;
    need(
      q.code.includes(`strlen(name) is ${m.length}`),
      "string length assumption",
    );
    codeIs(q, "char *copy = malloc(/* bytes */);");
  } else if (m.kind === "realloc") {
    need([2, 3, 4].includes(m.nextCount / m.count), "resize domain");
    expected = 'free(scores);\nscores = NULL;\nprintf("failed");';
    codeIs(
      q,
      `int *tmp = realloc(scores, ${m.nextCount} * sizeof *scores); if (tmp == NULL) { /* choose this branch */ } else { scores = tmp; printf("success"); }`,
    );
    need(
      q.code.includes("Required policy on failure: free the old array"),
      "failure policy missing",
    );
  } else if (m.kind === "free-order") {
    need(
      integer(m.authors, 1, 12) && integer(m.titleLength, 5, 45),
      "Book domain",
    );
    need(q.code.includes(`nAuth = ${m.authors}.`), "displayed author count");
    expected = "Free each authors[i] → free authors → free book";
    codeIs(
      q,
      `typedef struct Book { char title[${m.titleLength + 1}]; char **authors; int nAuth; } Book;`,
    );
  } else if (m.kind === "array-length") {
    expected = m.count;
    codeIs(
      q,
      `int values[${m.count}] = {0}; size_t length = sizeof values / sizeof values[0];`,
    );
  } else if (m.kind === "zero-read") {
    need(integer(m.index, 0, m.count - 1), "calloc read index");
    need(
      q.code.includes("Assume calloc succeeds"),
      "calloc success assumption",
    );
    expected = 0;
    codeIs(
      q,
      `int *values = calloc(${m.count}, sizeof *values); int result = values[${m.index}];`,
    );
  } else if (m.kind === "alias-write") {
    need(
      integer(m.value, 1, 40) &&
        integer(m.delta, 1, 9) &&
        integer(m.index, 0, 2),
      "alias domain",
    );
    need(
      q.code.includes("Assume malloc succeeds"),
      "alias allocation assumption",
    );
    // Both pointers designate one slot; model the write, not a copy of the array.
    const block = [null, null, null];
    block[m.index] = m.value;
    block[m.index] += m.delta;
    expected = block[m.index];
    codeIs(
      q,
      `int *p = malloc(3 * sizeof *p); p[${m.index}] = ${m.value}; int *q = p; q[${m.index}] += ${m.delta}; int result = p[${m.index}];`,
    );
  } else if (m.kind === "pointer-offset") {
    need(
      integer(m.start, 1, 20) &&
        integer(m.offset, 1, 3) &&
        integer(m.index, 0, 4 - m.offset),
      "pointer offset domain",
    );
    const values = [
      m.start,
      m.start + 3,
      m.start + 6,
      m.start + 9,
      m.start + 12,
    ];
    expected = values.slice(m.offset)[m.index];
    need(same(q.visual.items, values.map(String)), "pointer array diagram");
    codeIs(
      q,
      `int values[5] = {${values.join(", ")}}; int *p = values + ${m.offset}; int result = p[${m.index}];`,
    );
  } else if (m.kind === "shrink") {
    need(
      integer(m.start, 1, 20) &&
        integer(m.nextCount, 1, 5) &&
        integer(m.index, 0, m.nextCount - 1),
      "shrink retained prefix",
    );
    need(
      q.code.includes("Assume both allocations succeed"),
      "shrink allocation assumption",
    );
    const original = Array.from({ length: 6 }, (_, i) => m.start + i);
    expected = original.slice(0, m.nextCount)[m.index];
    codeIs(
      q,
      `int *values = malloc(6 * sizeof *values); for (int i = 0; i < 6; i++) values[i] = ${m.start} + i; int *tmp = realloc(values, ${m.nextCount} * sizeof *values); values = tmp; int result = values[${m.index}];`,
    );
  } else if (m.kind === "row-allocations") {
    need(
      integer(m.rows, 1, 8) && integer(m.columns, 2, 10),
      "matrix allocation domain",
    );
    need(
      q.code.includes("Assume every allocation succeeds"),
      "matrix success assumption",
    );
    const blocks = ["pointer array"];
    for (let row = 0; row < m.rows; row++) blocks.push(`row ${row}`);
    expected = blocks.length;
    codeIs(
      q,
      `int **grid = malloc(${m.rows} * sizeof *grid); for (int r = 0; r < ${m.rows}; r++) grid[r] = malloc(${m.columns} * sizeof *grid[r]);`,
    );
  } else {
    need(
      m.kind === "resize" &&
        integer(m.oldValues.length, 3, 5) &&
        m.oldValues.every((n) => integer(n, 1, 40)),
      "resize contents",
    );
    need(
      integer(m.index, 0, m.oldValues.length - 1) &&
        [2, 3, 4].includes(m.nextCount / m.oldValues.length),
      "preserved index",
    );
    expected = m.oldValues[m.index];
    codeIs(
      q,
      `int *tmp = realloc(scores, ${m.nextCount} * sizeof *scores); scores = tmp;`,
    );
    need(
      q.code.includes(`scores initially contains: ${m.oldValues.join(", ")}`),
      "old contents assumption",
    );
  }
  answerIs(q, expected);
}

export function numeralValue(text, base) {
  let result = 0;
  for (const digit of text) {
    const value = "0123456789ABCDEF".indexOf(digit);
    need(value >= 0 && value < base, "digit outside base");
    result = result * base + value;
  }
  return result;
}
function bases(q) {
  const { value, from, to, source } = q.data;
  need(
    integer(value, 0, 4095) &&
      [2, 8, 10, 16].includes(from) &&
      [2, 8, 10, 16].includes(to) &&
      from !== to,
    "base-conversion domain",
  );
  need(
    q.steps[0].prompt === `Convert ${source} from base ${from} to base ${to}.`,
    "displayed radix conversion",
  );
  need(source.length > 0 && q.steps[0].answer.length > 0, "empty numeral");
  need(
    numeralValue(source, from) === value &&
      numeralValue(q.steps[0].answer, to) === value,
    "base conversion changed value",
  );
  need(q.steps[0].radix === to, "answer radix");
  // Derive positions from right to left by repeated multiplication, independently
  // of the generator's power/exponent helper. Bind every displayed row to digits.
  const work = q.steps[0].work;
  need(work?.from === from && work?.to === to, "place-value bases");
  for (const [text, base, rows] of [
    [source, from, work.source],
    [q.steps[0].answer, to, work.target],
  ]) {
    need(
      Array.isArray(rows) && rows.length === text.length,
      "place-value row count",
    );
    let weight = 1,
      sum = 0;
    for (let i = text.length - 1, power = 0; i >= 0; i--, power++) {
      const digit = "0123456789ABCDEF".indexOf(text[i]),
        row = rows[i];
      need(
        row.digit === text[i] &&
          row.value === digit &&
          row.exponent === power &&
          row.weight === weight &&
          row.product === digit * weight,
        "place-value row",
      );
      sum += row.product;
      weight *= base;
    }
    need(sum === value, "place-value sum");
  }
}
const validators = {
  postfix,
  queue,
  bigO,
  recursion,
  links,
  search,
  memory,
  bases,
};
export function validatePracticeQuestion(gameId, question) {
  need(Object.hasOwn(validators, gameId), "unknown game");
  need(
    Array.isArray(question.steps) && question.steps.length > 0,
    "missing question steps",
  );
  validators[gameId](question);
  for (const step of question.steps) {
    need(typeof step.answer === "string", "non-text answer");
    if (step.kind === "choice") {
      need(
        Array.isArray(step.options) &&
          step.options.length >= 2 &&
          new Set(step.options).size === step.options.length,
        "duplicate or missing choices",
      );
      need(
        step.options.filter((value) => value === step.answer).length === 1,
        "correct option missing or repeated",
      );
    }
  }
  return question;
}
