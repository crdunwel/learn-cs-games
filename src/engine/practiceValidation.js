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
function queue(q) {
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

export function bigOWorkCount(question, n) {
  const tokens = cTokens(question.code);
  const templates = {
    square: "for(int i=0;i<n;i++){for(int j=0;j<n;j++){work();}}",
    log: "for(int i=n;i>1;i/=2){work();}",
    nlog: "for(int i=0;i<n;i++){for(int j=n;j>1;j/=2){work();}}",
    triangle: "for(int i=0;i<n;i++){for(int j=0;j<i;j++){work();}}",
    sequential: "for(int i=0;i<n;i++)work();for(int j=0;j<n;j++)work();",
  };
  if (question.kind === "constant") {
    const fixed = Number(tokens[9]);
    need(integer(fixed, 3, 20), "constant loop source");
    codeIs(question, `for (int i=0;i<${fixed};i++) {work();}`);
    return fixed;
  }
  if (question.kind === "linear") {
    const step = Number(tokens[13]);
    need(integer(step, 2, 5), "linear loop source");
    codeIs(question, `for (int i=0;i<n;i+=${step}) {work();}`);
    return Math.ceil(n / step);
  }
  need(Object.hasOwn(templates, question.kind), "unrecognized loop template");
  codeIs(question, templates[question.kind]);
  return {
    square: n * n,
    log: Math.floor(Math.log2(n)),
    nlog: n * Math.floor(Math.log2(n)),
    triangle: (n * (n - 1)) / 2,
    sequential: 2 * n,
  }[question.kind];
}
function bigO(q) {
  if (q.scale) {
    need(
      integer(q.scale.power, 0, 3) && integer(q.scale.factor, 2, 4),
      "growth model domain",
    );
    let ratio = 1;
    for (let i = 0; i < q.scale.power; i++) ratio *= q.scale.factor;
    answerIs(q, `${ratio}×`);
  } else {
    bigOWorkCount(q, 17); // Also verifies the displayed source, not just its kind label.
    answerIs(
      q,
      {
        constant: "O(1)",
        linear: "O(n)",
        square: "O(n²)",
        log: "O(log n)",
        nlog: "O(n log n)",
        triangle: "O(n²)",
        sequential: "O(n)",
      }[q.kind],
    );
  }
}

function recursion(q) {
  const d = q.data;
  let expected;
  if (q.topic === "sum") {
    need(
      integer(d.n, 0, 18) &&
        integer(d.decrement, 1, 4) &&
        integer(d.base, 0, 4),
      "recursive sum domain",
    );
    need(
      q.steps[0].prompt === `What does total(${d.n}) return?`,
      "displayed recursive call",
    );
    const terms = Math.ceil(d.n / d.decrement);
    expected = terms * d.n - (d.decrement * terms * (terms - 1)) / 2 + d.base;
    codeIs(
      q,
      `int total(int n) { if (n <= 0) return ${d.base}; return n + total(n - ${d.decrement}); }`,
    );
  } else if (q.topic === "print") {
    need(
      integer(d.n, 2, 8) && typeof d.before === "boolean",
      "recursive print domain",
    );
    need(
      q.steps[0].prompt === `What does printSeq(${d.n}) print?`,
      "displayed print call",
    );
    expected = Array.from({ length: d.n }, (_, i) =>
      d.before ? d.n - i : i + 1,
    ).join(" ");
    codeIs(
      q,
      `void printSeq(int n) { if (n == 0) return; ${d.before ? 'printf("%d ", n); printSeq(n - 1);' : 'printSeq(n - 1); printf("%d ", n);'} }`,
    );
  } else if (["array-sum", "evens"].includes(q.topic)) {
    need(
      integer(d.values.length, 3, 7) &&
        d.values.every((n) => integer(n, 0, q.topic === "evens" ? 19 : 9)),
      "array domain",
    );
    need(
      integer(d.high, 0, d.values.length - 1) && integer(d.low, 0, d.high + 1),
      "recursive array range",
    );
    need(same(q.visual.items, d.values.map(String)), "displayed array values");
    const call =
      q.topic === "evens"
        ? `evens(arr, ${d.low}, ${d.high})`
        : `sumOfDigits(arr, ${d.values.length}, ${d.low})`;
    need(
      q.steps[0].prompt === `What does ${call} return?`,
      "displayed array call",
    );
    let sum = 0;
    for (let i = d.low; i <= d.high; i++)
      sum +=
        q.topic === "evens"
          ? Number(Number.isInteger(d.values[i] / 2))
          : d.values[i];
    expected = sum;
    if (q.topic === "array-sum") {
      need(d.high === d.values.length - 1, "array sum must finish at size");
      codeIs(
        q,
        "int sumOfDigits(int arr[], int size, int index) { if (index == size) return 0; return arr[index] + sumOfDigits(arr, size, index + 1); }",
      );
    } else
      codeIs(
        q,
        "int evens(int arr[], int lowInd, int highInd) { if (lowInd > highInd) return 0; return (arr[lowInd] % 2 == 0) + evens(arr, lowInd + 1, highInd); }",
      );
  } else if (q.topic === "power") {
    need(integer(d.a, 2, 9) && integer(d.b, 0, 4), "power domain");
    need(
      q.steps[0].prompt === `What does power(${d.a}, ${d.b}) return?`,
      "displayed power call",
    );
    expected = 1;
    for (let i = 0; i < d.b; i++) expected *= d.a;
    codeIs(
      q,
      "int power(int a, int b) { if (b == 0) return 1; return a * power(a, b - 1); }",
    );
  } else if (q.topic === "recurrence") {
    need(integer(d.n, 0, 7), "recurrence domain");
    need(
      q.steps[0].prompt === `What does f(${d.n}) return?`,
      "displayed recurrence call",
    );
    const table = [1, 1, 3];
    for (let n = 3; n <= d.n; n++)
      table[n] = 2 * table[n - 1] + table[n - 2] - 1;
    expected = table[d.n];
    codeIs(
      q,
      "int f(int n) { if (n <= 1) return 1; if (n == 2) return 3; return 2 * f(n - 1) + f(n - 2) - 1; }",
    );
  } else {
    need(
      ["base-case", "recursive-step"].includes(q.topic),
      "unknown recursive template",
    );
    need(
      integer(d.n, 3, 20) && integer(d.decrement, 1, 5),
      "countCalls domain",
    );
    expected = q.topic === "base-case" ? "n <= 0" : `n - ${d.decrement}`;
    codeIs(
      q,
      `int countCalls(int n) { if (${q.topic === "base-case" ? "/* fill here */" : "n <= 0"}) return 0; return 1 + countCalls(${q.topic === "base-case" ? `n - ${d.decrement}` : "/* fill here */"}); }`,
    );
  }
  answerIs(q, expected);
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
  const m = q.meta;
  need(
    integer(m.array.length, 5, 10) &&
      m.array.every(
        (v, i) => Number.isInteger(v) && (!i || v > m.array[i - 1]),
      ),
    "search requires sorted distinct integers",
  );
  need(
    same(q.visual.items, m.array.map(String)) &&
      q.visual.label.includes(`searchKey = ${m.target}`),
    "displayed search inputs",
  );
  const rounds = searchByPartition(m.array, m.target);
  need(
    rounds.some((r) =>
      ["low", "high", "mid", "value"].every((key) => r[key] === m[key]),
    ),
    "displayed search round was never reached",
  );
  let expected;
  if (m.kind === "mid") {
    expected = Math.floor((m.low + m.high) / 2);
    codeIs(
      q,
      `int low = ${m.low}, high = ${m.high}; int mid = low + (high - low) / 2;`,
    );
  } else if (m.kind === "bounds") {
    need(m.target !== m.value, "matching key must return, not update bounds");
    expected =
      m.target < m.value ? `high = ${m.mid - 1}` : `low = ${m.mid + 1}`;
    codeIs(q, `int low = ${m.low}, high = ${m.high}; int mid = ${m.mid};`);
  } else {
    need(["result", "comparisons"].includes(m.kind), "unknown search question");
    expected = m.kind === "result" ? m.array.indexOf(m.target) : rounds.length;
    codeIs(
      q,
      `int low = 0, high = n - 1; while (low <= high) { int mid = low + (high - low) / 2; if (a[mid] == ${m.target}) return mid; if (${m.target} < a[mid]) high = mid - 1; else low = mid + 1; } return -1;`,
    );
  }
  answerIs(q, expected);
}

function memory(q) {
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
