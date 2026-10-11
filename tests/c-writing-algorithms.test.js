import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { algorithmExercises } from "../src/data/cWritingAlgorithms.js";

const fixtures = {
  "rec-print-sequence": {
    main: "printSeq(1); putchar('\\n'); printSeq(4); putchar('\\n'); printSeq(20); putchar('\\n');",
    output: [1, 4, 20]
      .map((n) => Array.from({ length: n }, (_, i) => i + 1).join(" ") + "\n")
      .join(""),
  },
  "rec-print-triangle": {
    main: 'printTriangle(0); printTriangle(1); puts("END"); printTriangle(6);',
    output:
      "1\nEND\n" +
      Array.from(
        { length: 6 },
        (_, row) =>
          Array.from({ length: row + 1 }, (_, i) => i + 1).join(" ") + "\n",
      ).join(""),
  },
  "rec-even-range": {
    main: `
    int a[] = {-4, -3, 0, 1, 2, 7, 8};
    for (int low = 0; low <= 7; low++) for (int high = low - 1; high < 7; high++) {
      int expected = 0;
      for (int i = low; i <= high; i++) if (a[i] % 2 == 0) expected++;
      assert(evens(a, 7, low, high) == expected);
    }`,
  },
  "rec-digit-array": {
    main: `
    int a[] = {0, 9, 2, 0, 7, 1}; int suffix[] = {19, 19, 10, 8, 8, 1, 0};
    for (int i = 0; i <= 6; i++) assert(sumOfDigits(a, 6, i) == suffix[i]);
    assert(sumOfDigits(NULL, 0, 0) == 0);`,
  },
  "rec-power": {
    main: `
    for (int a = 0; a <= 6; a++) { int product = 1;
      for (int b = 0; b <= 6; b++) { assert(power(a, b) == product); product *= a; }
    }`,
  },
  "rec-crazy-sum": {
    main: `
    const int sums[] = {0, 1, 5, 32, 288, 3413, 50069};
    for (int n = 1; n <= 6; n++) assert(crazySum(n) == sums[n]);`,
  },
  "rec-free-list": {
    before: `static int freeCount;
static void recordFree(void *p) { assert(p != NULL); freeCount++; free(p); }
#define free recordFree`,
    after: "#undef free",
    main: `
    for (int n = 0; n <= 100; n++) {
      node *head = NULL;
      for (int i = 0; i < n; i++) { node *p = malloc(sizeof *p); assert(p); p->data = i; p->next = head; head = p; }
      freeCount = 0; byeList(head); assert(freeCount == n);
    }`,
  },
  "rec-fibonacci": {
    main: `
    const int expected[] = {0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765};
    for (int n = 0; n <= 20; n++) assert(fibonacci(n) == expected[n]);`,
  },
  "rec-factorial": {
    main: `
    const int expected[] = {1,1,2,6,24,120,720,5040,40320,362880,3628800};
    for (int n = 0; n <= 10; n++) assert(factorial(n) == expected[n]);`,
  },
  "rec-permutations": {
    main: `
    for (int n = 2; n <= 5; n++) {
      int perm[5] = {0}, used[5] = {0}; printf("N=%d\\n", n);
      makePerm(perm, used, 0, n);
      for (int i = 0; i < n; i++) assert(used[i] == 0);
    }`,
    output: "",
  },
  "rec-adjacent-difference": {
    main: `
    assert(check(NULL, 0) == 0);
    int a[6];
    for (int size = 1; size <= 6; size++) {
      int possibilities = 1; for (int i = 0; i < size; i++) possibilities *= 4;
      for (int code = 0; code < possibilities; code++) {
        int v = code; for (int i = 0; i < size; i++) { a[i] = v % 4; v /= 4; }
        int expected = 0;
        for (int i = 1; i < size; i++) if (a[i] == a[i - 1] + 1 || a[i - 1] == a[i] + 1) expected = 1;
        assert(check(a, size) == expected);
      }
    }`,
  },
  "rec-binary-search": {
    main: `
    int a[100]; for (int i = 0; i < 100; i++) a[i] = 3 * i - 30;
    for (int n = 0; n <= 100; n++) for (int key = -35; key <= 275; key++) {
      int expected = -1; for (int i = 0; i < n; i++) if (a[i] == key) expected = i;
      assert(binarySearchRecursive(a, 0, n - 1, key) == expected);
    }`,
  },
  "rec-string-length": {
    main: `
    char s[101]; memset(s, 'x', sizeof s);
    for (int n = 100; n >= 0; n--) { s[n] = '\\0'; assert(stringLength(s) == n); }
    assert(stringLength("two words") == 9);`,
  },
  "rec-palindrome": {
    main: `
    char s[11];
    for (int n = 0; n <= 10; n++) for (int mask = 0; mask < (1 << n); mask++) {
      for (int i = 0; i < n; i++) s[i] = (mask & (1 << i)) ? 'A' : 'b';
      s[n] = '\\0'; int expected = 1;
      for (int i = 0; i < n; i++) if (s[i] != s[n - 1 - i]) expected = 0;
      assert(palindrome(s, 0, n - 1) == expected);
    }`,
  },
  "rec-gcd": {
    main: `
    for (int a = 0; a <= 100; a++) for (int b = 0; b <= 100; b++) if (a || b) {
      int expected = 1; for (int d = 1; d <= (a > b ? a : b); d++) if (a % d == 0 && b % d == 0) expected = d;
      assert(gcd(a, b) == expected);
    }
    assert(gcd(10000, 9999) == 1); assert(gcd(10000, 0) == 10000);`,
  },
  "rec-hanoi-count": {
    main: `
    for (int n = 0; n <= 15; n++) assert(hanoiMoves(n) == (1 << n) - 1);`,
  },
  "search-binary-iterative": {
    main: `
    int a[100]; for (int i = 0; i < 100; i++) a[i] = i * 3 - 30;
    for (int n = 0; n <= 100; n++) for (int key = -35; key <= 275; key++) {
      int expected = -1; for (int i = 0; i < n; i++) if (a[i] == key) expected = i;
      assert(binarySearch(a, n, key) == expected);
    }`,
  },
  "search-lower-bound": {
    main: `
    int a[100]; for (int i = 0; i < 100; i++) a[i] = i / 3 - 5;
    for (int n = 0; n <= 100; n++) for (int key = -8; key <= 30; key++) {
      int expected = 0; while (expected < n && a[expected] < key) expected++;
      assert(lowerBound(a, n, key) == expected);
    }`,
  },
  "search-first-occurrence": {
    main: `
    int a[100]; for (int i = 0; i < 100; i++) a[i] = i / 3 - 5;
    for (int n = 0; n <= 100; n++) for (int key = -8; key <= 30; key++) {
      int expected = -1; for (int i = n - 1; i >= 0; i--) if (a[i] == key) expected = i;
      assert(firstOccurrence(a, n, key) == expected);
    }`,
  },
  "search-last-occurrence": {
    main: `
    int a[100]; for (int i = 0; i < 100; i++) a[i] = i / 3 - 5;
    for (int n = 0; n <= 100; n++) for (int key = -8; key <= 30; key++) {
      int expected = -1; for (int i = 0; i < n; i++) if (a[i] == key) expected = i;
      assert(lastOccurrence(a, n, key) == expected);
    }`,
  },
  "search-linear": {
    main: `
    int a[100]; for (int i = 0; i < 100; i++) a[i] = (i * 7) % 11 - 5;
    for (int n = 0; n <= 100; n++) for (int key = -8; key <= 8; key++) {
      int expected = -1; for (int i = n - 1; i >= 0; i--) if (a[i] == key) expected = i;
      assert(linearSearch(a, n, key) == expected);
    }`,
  },
  "search-sorted-insert": {
    main: `
    for (int n = 0; n <= 99; n++) for (int x = -8; x <= 35; x++) {
      int a[100], expected[100]; for (int i = 0; i < n; i++) a[i] = expected[i] = i / 3 - 5;
      expected[n] = x; qsort(expected, n + 1, sizeof(int), compareInts);
      assert(insertSorted(a, n, x) == n + 1);
      for (int i = 0; i <= n; i++) assert(a[i] == expected[i]);
    }`,
  },
  "search-merge-sorted": {
    main: `
    int a[50], b[50]; for (int i = 0; i < 50; i++) { a[i] = i * 2 - 7; b[i] = i * 3 - 9; }
    for (int m = 0; m <= 50; m++) for (int n = 0; n <= 50; n++) {
      int out[100], expected[100];
      for (int i = 0; i < m; i++) expected[i] = a[i];
      for (int i = 0; i < n; i++) expected[m + i] = b[i];
      qsort(expected, m + n, sizeof(int), compareInts);
      mergeSorted(a, m, b, n, out);
      for (int i = 0; i < m + n; i++) assert(out[i] == expected[i]);
    }`,
  },
  "loop-pair-matches": {
    main: `
    int a[100], b[100]; for (int i = 0; i < 100; i++) { a[i] = i % 5; b[i] = (i + 1) % 5; }
    for (int m = 0; m <= 100; m++) for (int n = 0; n <= 100; n++) {
      int ac[5] = {0}, bc[5] = {0};
      for (int i = 0; i < m; i++) ac[a[i]]++;
      for (int i = 0; i < n; i++) bc[b[i]]++;
      int expected = 0; for (int v = 0; v < 5; v++) expected += ac[v] * bc[v];
      assert(countMatches(a, m, b, n) == expected);
    }`,
  },
  "loop-sentinel-sum": {
    main: `
    for (int n = 0; n <= 100; n++) for (int stop = 0; stop <= n; stop++) {
      int a[100]; for (int i = 0; i < n; i++) a[i] = i + 1;
      if (stop < n) a[stop] = -1;
      assert(sumUntilSentinel(a, n) == stop * (stop + 1) / 2);
    }`,
  },
  "loop-reverse-array": {
    main: `
    for (int n = 0; n <= 100; n++) {
      int a[100]; for (int i = 0; i < n; i++) a[i] = i - 50;
      reverseArray(a, n); for (int i = 0; i < n; i++) assert(a[i] == n - 1 - i - 50);
      reverseArray(a, n); for (int i = 0; i < n; i++) assert(a[i] == i - 50);
    }`,
  },
  "loop-parse-base": {
    main: `
    for (int n = 0; n <= 4095; n++) {
      char s[20]; snprintf(s, sizeof s, "%X", n); assert(parseBase(s, 16) == n);
      snprintf(s, sizeof s, "%o", n); assert(parseBase(s, 8) == n);
      for (int bit = 11; bit >= 0; bit--) s[11 - bit] = ((n >> bit) & 1) + '0';
      s[12] = '\\0'; assert(parseBase(s, 2) == n);
    }`,
  },
  "loop-write-base": {
    main: `
    const int bases[] = {2, 8, 16};
    for (int n = 0; n <= 4095; n++) for (int j = 0; j < 3; j++) {
      char out[13]; memset(out, '?', sizeof out); writeBase(n, bases[j], out);
      assert(memchr(out, '\\0', sizeof out) != NULL);
      assert(out[0] != '\\0'); assert(n == 0 ? strcmp(out, "0") == 0 : out[0] != '0');
      char *end; assert(strtol(out, &end, bases[j]) == n); assert(*end == '\\0');
      for (int i = 0; out[i]; i++) assert((out[i] >= '0' && out[i] <= '9') || (out[i] >= 'A' && out[i] <= 'F'));
    }`,
  },
  "loop-copy-string": {
    main: `
    char src[101], dst[103]; memset(src, 'x', sizeof src);
    for (int n = 100; n >= 0; n--) {
      src[n] = '\\0'; memset(dst, '?', sizeof dst); copyString(dst + 1, src);
      assert(strcmp(dst + 1, src) == 0); assert(dst[0] == '?'); assert(dst[n + 2] == '?');
    }`,
  },
  "loop-count-vowels": {
    main: `
    assert(countVowels("") == 0); assert(countVowels("recursion") == 4);
    assert(countVowels("AEIOU xyz 123") == 0); assert(countVowels("aaeeiioouu") == 10);
    for (int c = 1; c < 127; c++) {
      char s[] = {(char)c, '\\0'}; assert(countVowels(s) == (strchr("aeiou", c) != NULL));
    }`,
  },
};

function permutations(values) {
  if (!values.length) return [[]];
  return values.flatMap((value, i) =>
    permutations(values.filter((_, j) => j !== i)).map((tail) => [
      value,
      ...tail,
    ]),
  );
}
fixtures["rec-permutations"].output = [2, 3, 4, 5]
  .map(
    (n) =>
      `N=${n}\n` +
      permutations(Array.from({ length: n }, (_, i) => i))
        .filter((p) =>
          p.some((value, i) => i > 0 && Math.abs(value - p[i - 1]) === 1),
        )
        .map((p) => p.join(" ") + "\n")
        .join(""),
  )
  .join("");

const canonical = (exercise) =>
  exercise.signature +
  "\n" +
  exercise.lines.map((line) => line.code).join("\n") +
  "\n}";

test("30 authored algorithms have distinct identities, complete guidance, and native fixtures", () => {
  assert.equal(algorithmExercises.length, 30);
  assert.equal(new Set(algorithmExercises.map((e) => e.id)).size, 30);
  assert.equal(new Set(algorithmExercises.map((e) => e.signature)).size, 30);
  assert.equal(
    algorithmExercises.filter((e) => e.topic === "recursion").length,
    16,
  );
  for (const exercise of algorithmExercises) {
    assert(
      exercise.prompt &&
        exercise.assumptions &&
        exercise.example &&
        exercise.setup,
    );
    assert(exercise.rubric.length >= 3);
    assert(fixtures[exercise.id], exercise.id);
    for (const line of exercise.lines) {
      assert(line.code && line.hint && line.why, exercise.id);
      if (line.fixed) assert.equal(line.code, "}");
    }
  }
  assert.deepEqual(
    Object.keys(fixtures).sort(),
    algorithmExercises.map((e) => e.id).sort(),
  );
});

test(
  "all 30 displayed C solutions compile and pass independent native cases",
  { timeout: 180000 },
  (t) => {
    const directory = mkdtempSync(join(tmpdir(), "cs-writing-algorithms-"));
    try {
      for (const exercise of algorithmExercises) {
        const fixture = fixtures[exercise.id];
        const source = join(directory, exercise.id + ".c");
        const executable = join(directory, exercise.id);
        // The canonical student-facing function is included verbatim. No student
        // input is ever compiled; only these checked-in authored answers are.
        const comparison = [
          "search-sorted-insert",
          "search-merge-sorted",
        ].includes(exercise.id)
          ? "int compareInts(const void *a, const void *b) { int x = *(const int *)a, y = *(const int *)b; return (x > y) - (x < y); }"
          : "";
        writeFileSync(
          source,
          `#include <assert.h>\n${exercise.setup}\n${fixture.before || ""}\n${canonical(exercise)}\n${fixture.after || ""}\n${comparison}\nint main(void) {\n${fixture.main}\nreturn 0;\n}\n`,
        );
        const compile = spawnSync(
          process.env.CC || "clang",
          [
            "-std=c11",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-fsanitize=address,undefined",
            "-fno-sanitize-recover=all",
            source,
            "-o",
            executable,
          ],
          { encoding: "utf8", timeout: 30000 },
        );
        assert.equal(
          compile.status,
          0,
          `${exercise.id}: ${compile.stderr || "compiler unavailable"}`,
        );
        const run = spawnSync(executable, [], {
          encoding: "utf8",
          timeout: 15000,
          env: {
            ...process.env,
            ASAN_OPTIONS: `detect_leaks=${process.platform === "linux" ? 1 : 0}:halt_on_error=1`,
            UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=1",
          },
        });
        assert.equal(run.status, 0, `${exercise.id}: ${run.stderr}`);
        assert.equal(
          run.stdout,
          fixture.output || "",
          `${exercise.id}: printed output`,
        );
      }
      t.diagnostic(
        "30 exact canonical C functions: strict C11 + ASan/UBSan; full bounded power/Fibonacci/factorial/Hanoi/base domains; independent search, range, recursion, output, backtracking and allocation checks. This validates authored answers, not arbitrary student C.",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
