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
export function validateRecursionQuestion(q) {
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
  } else if (["fibonacci", "fibonacci-calls"].includes(q.topic)) {
    need(integer(d.n, 0, 10), "Fibonacci domain");
    const counts = q.topic === "fibonacci-calls";
    need(
      q.steps[0].prompt ===
        (counts
          ? `How many fib calls run for fib(${d.n}), including the first call and base cases?`
          : `What does fib(${d.n}) return?`),
      "displayed Fibonacci call",
    );
    const values = counts ? [1, 1] : [0, 1];
    for (let i = 2; i <= d.n; i++)
      values[i] = (counts ? 1 : 0) + values[i - 1] + values[i - 2];
    expected = values[d.n];
    codeIs(
      q,
      "int fib(int n) { if (n <= 1) return n; return fib(n - 1) + fib(n - 2); }",
    );
  } else if (q.topic === "permutations") {
    need(
      integer(d.size, 2, 5) && d.word === "ABCDE".slice(0, d.size),
      "distinct permutation domain",
    );
    need(
      q.steps[0].prompt ===
        `For word = "${d.word}" in a writable char array, how many lines does permute(word, 0, ${d.size}) print?`,
      "displayed permutation call",
    );
    // Enumerate complete arrangements independently of the factorial generator.
    const arrange = (remaining) =>
      remaining.length
        ? remaining.flatMap((letter, i) =>
            arrange(remaining.filter((_, j) => j !== i)).map(
              (suffix) => letter + suffix,
            ),
          )
        : [""];
    expected = new Set(arrange([...d.word])).size;
    codeIs(
      q,
      `void swap(char *a, char *b) { char saved = *a; *a = *b; *b = saved; }
      void permute(char word[], int pos, int size) {
        if (pos == size) { printf("%s\\n", word); return; }
        for (int i = pos; i < size; i++) { swap(&word[pos], &word[i]); permute(word, pos + 1, size); swap(&word[pos], &word[i]); }
      }`,
    );
  } else if (q.topic === "recursive-search") {
    need(
      integer(d.values?.length, 5, 10) &&
        integer(d.low, 0, 0) &&
        d.high === d.values.length - 1,
      "recursive search bounds",
    );
    need(integer(d.values[0], 1, 20), "recursive search first value");
    const gap = d.values[1] - d.values[0];
    need(
      integer(gap, 2, 8) &&
        d.values.every((value, i) => value === d.values[0] + i * gap),
      "recursive search sorted distinct array",
    );
    need(
      d.values.includes(d.key) ||
        [d.values[0] - 1, d.values.at(-1) + 1].includes(d.key),
      "recursive search key domain",
    );
    need(
      same(q.visual.items, d.values.map(String)),
      "recursive search displayed array",
    );
    need(
      q.steps[0].prompt ===
        `What does find(arr, 0, ${d.high}, ${d.key}) return?`,
      "displayed recursive search call",
    );
    const rounds = [];
    let lo = d.low,
      hi = d.high;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      rounds.push({ low: lo, high: hi, mid, value: d.values[mid] });
      if (d.values[mid] === d.key) break;
      if (d.values[mid] < d.key) lo = mid + 1;
      else hi = mid - 1;
    }
    need(same(d.trace, rounds), "recursive search trace");
    expected = d.values.indexOf(d.key);
    codeIs(
      q,
      `int find(int a[], int low, int high, int key) {
      if (low > high) return -1;
      int mid = low + (high - low) / 2;
      if (a[mid] == key) return mid;
      if (key < a[mid]) return find(a, low, mid - 1, key);
      return find(a, mid + 1, high, key);
    }`,
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
  return q;
}
