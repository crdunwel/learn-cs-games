import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { structureExercises } from "../src/data/cWritingStructures.js";

// Track owned allocations independently of sanitizer leak support (macOS
// cannot run LeakSanitizer), and deterministically exercise failure branches.
const allocationHarness = `
#include <assert.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
void *live[4096];
size_t widths[4096];
int fail_allocation;
int liveCount(void) { int n = 0; for (int i = 0; i < 4096; i++) n += live[i] != NULL; return n; }
int allocationIndex(void *p) { for (int i = 0; i < 4096; i++) if (live[i] == p) return i; assert(0); return -1; }
void remember(void *p, size_t bytes) { if (!p) return; for (int i = 0; i < 4096; i++) if (!live[i]) { live[i] = p; widths[i] = bytes; return; } assert(0); }
size_t allocationBytes(void *p) { return widths[allocationIndex(p)]; }
void *trackedMalloc(size_t n) { if (fail_allocation) return NULL; void *p = malloc(n); assert(p); remember(p, n); return p; }
void *trackedCalloc(size_t n, size_t width) { if (fail_allocation) return NULL; void *p = calloc(n, width); assert(p); remember(p, n * width); return p; }
void *trackedRealloc(void *p, size_t n) {
    if (fail_allocation) return NULL;
    int index = p ? allocationIndex(p) : -1;
    void *replacement = realloc(p, n); assert(replacement);
    if (index >= 0) { live[index] = replacement; widths[index] = n; } else remember(replacement, n);
    return replacement;
}
void trackedFree(void *p) { if (p) { int index = allocationIndex(p); live[index] = NULL; } free(p); }
#define malloc trackedMalloc
#define calloc trackedCalloc
#define realloc trackedRealloc
#define free trackedFree
`;

const listHelpers = `
node *buildList(const int *values, int n) {
    node *head = NULL;
    for (int i = n - 1; i >= 0; i--) { node *p = malloc(sizeof *p); p->data = values[i]; p->next = head; head = p; }
    return head;
}
void expectList(const node *p, const int *values, int n) {
    for (int i = 0; i < n; i++) { assert(p); assert(p->data == values[i]); p = p->next; }
    assert(p == NULL);
}
void disposeList(node *p) { while (p) { node *next = p->next; free(p); p = next; } }
`;

const fixtures = {
  "memory-zero-array": {
    body: String.raw`
    for (size_t n = 1; n <= 1000; n++) {
        int *p = zeroScores(n); assert(p); assert(liveCount() == 1);
        for (size_t i = 0; i < n; i++) assert(p[i] == 0);
        p[n - 1] = 42; free(p);
    }
    fail_allocation = 1; assert(zeroScores(3) == NULL); fail_allocation = 0;
  `,
  },
  "memory-copy-array": {
    body: String.raw`
    int values[1000]; for (int i = 0; i < 1000; i++) values[i] = i - 500;
    for (size_t n = 1; n <= 1000; n++) {
        int *p = copyArray(values, n); assert(p && p != values);
        for (size_t i = 0; i < n; i++) assert(p[i] == values[i]);
        p[0] = 700; assert(values[0] == -500); free(p);
    }
    fail_allocation = 1; assert(copyArray(values, 5) == NULL); fail_allocation = 0;
  `,
  },
  "memory-copy-string": {
    body: String.raw`
    assert(copyText(NULL) == NULL);
    char source[1001]; memset(source, 'x', 1000); source[1000] = '\0';
    for (int n = 1000; n >= 0; n--) {
        source[n] = '\0'; char *p = copyText(source); assert(p && p != source);
        assert(strcmp(p, source) == 0); assert(strlen(p) == (size_t)n); assert(allocationBytes(p) == (size_t)n + 1); free(p);
    }
    fail_allocation = 1; assert(copyText("abc") == NULL); fail_allocation = 0;
  `,
  },
  "memory-realloc-preserve": {
    body: String.raw`
    int *p = malloc(3 * sizeof *p); p[0] = 4; p[1] = 7; p[2] = 2;
    int *original = p;
    fail_allocation = 1; assert(resizeKeep(&p, 8) == 0); fail_allocation = 0;
    assert(p == original && p[0] == 4 && p[2] == 2 && liveCount() == 1);
    assert(resizeKeep(&p, 8) == 1); assert(p[0] == 4 && p[1] == 7 && p[2] == 2);
    p[7] = 90; assert(resizeKeep(&p, 1) == 1); assert(p[0] == 4); free(p);
    p = NULL; assert(resizeKeep(&p, 5) == 1); p[4] = 8; free(p);
  `,
  },
  "memory-realloc-discard": {
    body: String.raw`
    int *p = malloc(3 * sizeof *p); p[0] = 3; p[1] = 4; p[2] = 5;
    assert(doubleScores(&p, 3) == 1); assert(p[0] == 3 && p[2] == 5); p[5] = 9; free(p);
    p = malloc(2 * sizeof *p); p[0] = 9;
    fail_allocation = 1; assert(doubleScores(&p, 2) == 0); fail_allocation = 0;
    assert(p == NULL && liveCount() == 0);
  `,
    output: "success\nfailed\n",
  },
  "memory-create-book": {
    body: String.raw`
    char names[10][50]; for (int i = 0; i < 10; i++) snprintf(names[i], 50, "Author %d", i);
    for (int n = 0; n <= 10; n++) {
        char title[50] = "Pointers";
        Book *b = createBook(title, names, 12.5f, n);
        assert(b && strcmp(b->title, title) == 0 && b->price == 12.5f && b->nAuth == n);
        assert(liveCount() == 1 + (n > 0 ? n + 1 : 0));
        assert((b->authors == NULL) == (n == 0));
        title[0] = 'X'; assert(b->title[0] == 'P');
        for (int i = 0; i < n; i++) {
            assert(b->authors[i] != names[i]); assert(strcmp(b->authors[i], names[i]) == 0); assert(allocationBytes(b->authors[i]) == strlen(names[i]) + 1);
            b->authors[i][0] = 'X'; assert(names[i][0] == 'A'); free(b->authors[i]);
        }
        free(b->authors); free(b);
    }
    char empty[1][50] = {""}; Book *b = createBook("", empty, 0, 1);
    assert(b->title[0] == '\0' && b->authors[0][0] == '\0'); free(b->authors[0]); free(b->authors); free(b);
  `,
  },
  "memory-free-book": {
    body: String.raw`
    freeBook(NULL);
    for (int n = 0; n <= 10; n++) {
        Book *b = malloc(sizeof *b); strcpy(b->title, "Embedded title"); b->nAuth = n;
        b->authors = n ? malloc(n * sizeof *b->authors) : NULL;
        for (int i = 0; i < n; i++) { b->authors[i] = malloc(5); strcpy(b->authors[i], "Name"); }
        freeBook(b); assert(liveCount() == 0);
    }
  `,
  },
  "memory-matrix-create": {
    body: String.raw`
    for (size_t rows = 1; rows <= 20; rows++) for (size_t cols = 1; cols <= 20; cols++) {
        int **m = makeMatrix(rows, cols); assert(m && liveCount() == (int)rows + 1);
        for (size_t r = 0; r < rows; r++) {
            for (size_t c = 0; c < cols; c++) assert(m[r][c] == 0);
            m[r][cols - 1] = (int)r + 1;
        }
        for (size_t r = 0; r < rows; r++) { assert(m[r][cols - 1] == (int)r + 1); free(m[r]); }
        free(m);
    }
  `,
  },
  "memory-matrix-free": {
    body: String.raw`
    freeMatrix(NULL, 0); freeMatrix(NULL, 3);
    for (size_t rows = 0; rows <= 20; rows++) {
        int **m = malloc((rows + 1) * sizeof *m);
        for (size_t r = 0; r < rows; r++) { m[r] = malloc((r + 1) * sizeof *m[r]); m[r][r] = 4; }
        freeMatrix(m, rows); assert(liveCount() == 0);
    }
  `,
  },
  "memory-append-char": {
    body: String.raw`
    char *p = malloc(1); p[0] = '\0';
    for (int i = 0; i < 1000; i++) {
        assert(appendChar(&p, 'a') == 1); assert(strlen(p) == (size_t)i + 1);
        for (int j = 0; j <= i; j++) assert(p[j] == 'a');
    }
    char *old = p; fail_allocation = 1; assert(appendChar(&p, '!') == 0); fail_allocation = 0;
    assert(p == old && strlen(p) == 1000 && p[999] == 'a'); free(p);
  `,
  },
  "list-count": {
    helpers: listHelpers,
    body: String.raw`
    int a[1000]; for (int i = 0; i < 1000; i++) a[i] = i;
    for (int n = 0; n <= 1000; n++) { node *h = buildList(a, n); assert(countNodes(h) == n); expectList(h, a, n); disposeList(h); }
  `,
  },
  "list-sum": {
    helpers: listHelpers,
    body: String.raw`
    int a[1000]; for (int i = 0; i < 1000; i++) a[i] = i - 500;
    int expected = 0;
    for (int n = 0; n <= 1000; n++) {
        if (n) expected += a[n - 1];
        node *h = buildList(a, n); assert(sumNodes(h) == expected); expectList(h, a, n); disposeList(h);
    }
  `,
  },
  "list-find": {
    helpers: listHelpers,
    body: String.raw`
    assert(findNode(NULL, 9) == NULL);
    const int a[] = {7, 2, 7, -5}; node *h = buildList(a, 4);
    assert(findNode(h, 7) == h); assert(findNode(h, 2) == h->next);
    assert(findNode(h, -5) == h->next->next->next); assert(findNode(h, 8) == NULL);
    expectList(h, a, 4); disposeList(h);
  `,
  },
  "list-prepend": {
    helpers: listHelpers,
    body: String.raw`
    node *h = prepend(NULL, 10); int a[] = {10}; expectList(h, a, 1); node *old = h;
    h = prepend(h, -4); int b[] = {-4, 10}; expectList(h, b, 2); assert(h->next == old); disposeList(h);
  `,
  },
  "list-append": {
    helpers: listHelpers,
    body: String.raw`
    node *h = NULL; int values[100];
    for (int n = 0; n < 100; n++) {
        node *old = h; values[n] = n - 50; h = append(h, values[n]);
        if (old) assert(h == old); expectList(h, values, n + 1);
    }
    disposeList(h);
  `,
  },
  "list-insert-position": {
    helpers: listHelpers,
    body: String.raw`
    int values[12], expected[13]; for (int i = 0; i < 12; i++) values[i] = 10 + i;
    for (int n = 1; n <= 12; n++) for (int p = 2; p <= 16; p++) {
        node *h = buildList(values, n); node *old = h; int at = p - 1 < n ? p - 1 : n;
        for (int i = 0; i < at; i++) expected[i] = values[i]; expected[at] = -8;
        for (int i = at; i < n; i++) expected[i + 1] = values[i];
        assert(insertAt(h, -8, p) == n + 1); assert(h == old); expectList(h, expected, n + 1); disposeList(h);
    }
  `,
  },
  "list-remove-first": {
    helpers: listHelpers,
    body: String.raw`
    const int a[] = {7, 2, 7, 5};
    for (int target = 0; target <= 8; target++) for (int n = 0; n <= 4; n++) {
        int expected[4], used = 0, removed = 0;
        for (int i = 0; i < n; i++) {
            if (!removed && a[i] == target) removed = 1; else expected[used++] = a[i];
        }
        node *h = buildList(a, n); h = removeFirst(h, target); expectList(h, expected, used);
        assert(liveCount() == used); disposeList(h);
    }
  `,
  },
  "list-reverse": {
    helpers: listHelpers,
    body: String.raw`
    int values[100], expected[100]; node *identities[100];
    for (int i = 0; i < 100; i++) values[i] = i;
    for (int n = 0; n <= 100; n++) {
        node *h = buildList(values, n), *p = h;
        for (int i = 0; i < n; i++) { identities[i] = p; p = p->next; expected[i] = values[n - 1 - i]; }
        h = reverseList(h); expectList(h, expected, n); p = h;
        for (int i = 0; i < n; i++) { assert(p == identities[n - 1 - i]); p = p->next; }
        assert(liveCount() == n); disposeList(h);
    }
  `,
  },
  "list-free-iterative": {
    helpers: listHelpers,
    body: String.raw`
    int a[1000]; for (int i = 0; i < 1000; i++) a[i] = i;
    for (int n = 0; n <= 1000; n++) { freeList(buildList(a, n)); assert(liveCount() == 0); }
  `,
  },
  "list-expand-even": {
    helpers: listHelpers,
    body: String.raw`
    const int values[] = {-4, -3, 0, 1, 2, 6, 7};
    for (int n = 0; n <= 7; n++) {
        int expected[14], used = 0;
        for (int i = 0; i < n; i++) { expected[used++] = values[i]; if (values[i] % 2 == 0) expected[used++] = values[i] + 5; }
        node *h = buildList(values, n); expandEven(h); expectList(h, expected, used); assert(liveCount() == used); disposeList(h);
    }
  `,
  },
  "stack-array-push": {
    body: String.raw`
    for (int initial = 0; initial <= 8; initial++) {
        Stack s = {{0}, initial}; for (int i = 0; i < initial; i++) s.items[i] = i + 10;
        Stack before = s; assert(push(&s, 91) == (initial < 8));
        assert(s.top == initial + (initial < 8));
        for (int i = 0; i < initial; i++) assert(s.items[i] == before.items[i]);
        if (initial < 8) assert(s.items[initial] == 91); else assert(memcmp(&s, &before, sizeof s) == 0);
    }
  `,
  },
  "stack-array-pop": {
    body: String.raw`
    for (int initial = 0; initial <= 8; initial++) {
        Stack s = {{0}, initial}; for (int i = 0; i < initial; i++) s.items[i] = i + 10;
        int out = 1234; assert(pop(&s, &out) == (initial > 0));
        assert(s.top == initial - (initial > 0)); assert(out == (initial ? initial + 9 : 1234));
        for (int i = 0; i < s.top; i++) assert(s.items[i] == i + 10);
    }
  `,
  },
  "stack-linked-push": {
    helpers: listHelpers,
    body: String.raw`
    node *h = NULL;
    fail_allocation = 1; assert(pushLinked(&h, 3) == 0 && h == NULL); fail_allocation = 0;
    assert(pushLinked(&h, 4) == 1); node *old = h;
    fail_allocation = 1; assert(pushLinked(&h, 6) == 0 && h == old); fail_allocation = 0;
    assert(pushLinked(&h, 9) == 1); int expected[] = {9, 4}; expectList(h, expected, 2); assert(h->next == old); disposeList(h);
  `,
  },
  "stack-linked-pop": {
    helpers: listHelpers,
    body: String.raw`
    int values[] = {9, 4, -2}; node *h = buildList(values, 3);
    for (int i = 0; i < 3; i++) { int out = 0; assert(popLinked(&h, &out) == 1 && out == values[i]); assert(liveCount() == 2 - i); }
    assert(h == NULL); int out = 123; assert(popLinked(&h, &out) == 0 && out == 123);
  `,
  },
  "stack-parentheses": {
    body: String.raw`
    assert(balanced("") == 1); assert(balanced("(a+(b))") == 1); assert(balanced(")(") == 0); assert(balanced("(()") == 0);
    for (int length = 0; length <= 10; length++) for (int pattern = 0; pattern < (1 << length); pattern++) {
        char text[11]; int openings = 0, closings = 0, valid = 1;
        for (int i = 0; i < length; i++) {
            text[i] = pattern & (1 << i) ? '(' : ')';
            if (text[i] == '(') openings++; else closings++;
            if (closings > openings) valid = 0;
        }
        text[length] = '\0'; valid = valid && openings == closings;
        assert(balanced(text) == valid);
    }
  `,
  },
  "queue-circular-enqueue": {
    body: String.raw`
    for (int capacity = 1; capacity <= 8; capacity++) for (int front = 0; front < capacity; front++) for (int count = 0; count <= capacity; count++) {
        int a[8], before[8]; for (int i = 0; i < 8; i++) a[i] = before[i] = 10 + i;
        queue q = {a, front, count, capacity}; int result = enqueue(&q, 91);
        assert(result == (count < capacity)); assert(q.front == front); assert(q.noe == count + result);
        int insertion = front; for (int i = 0; i < count; i++) { insertion++; if (insertion == capacity) insertion = 0; }
        for (int i = 0; i < 8; i++) assert(a[i] == (result && i == insertion ? 91 : before[i]));
    }
  `,
  },
  "queue-circular-dequeue": {
    body: String.raw`
    for (int capacity = 1; capacity <= 8; capacity++) for (int front = 0; front < capacity; front++) for (int count = 0; count <= capacity; count++) {
        int a[8]; for (int i = 0; i < 8; i++) a[i] = 10 + i;
        queue q = {a, front, count, capacity}; int result = dequeue(&q);
        assert(result == (count ? a[front] : -1)); assert(q.noe == count - (count > 0));
        int next = front + 1 == capacity ? 0 : front + 1;
        assert(q.front == (count ? next : front));
        for (int i = 0; i < 8; i++) assert(a[i] == 10 + i);
    }
  `,
  },
  "queue-linked-enqueue": {
    helpers: listHelpers,
    body: String.raw`
    queue q = {NULL, NULL}; int expected[100];
    for (int n = 0; n < 100; n++) {
        node *oldFront = q.front; expected[n] = n - 50; enqueueLinked(&q, expected[n]);
        if (oldFront) assert(q.front == oldFront);
        expectList(q.front, expected, n + 1); assert(q.rear->data == expected[n] && q.rear->next == NULL);
        if (n == 0) assert(q.front == q.rear);
    }
    disposeList(q.front);
  `,
  },
  "queue-doubly-dequeue": {
    body: String.raw`
    assert(dequeue(NULL) == 0);
    for (int n = 0; n <= 20; n++) {
        node *nodes[20];
        for (int i = 0; i < n; i++) { nodes[i] = malloc(sizeof *nodes[i]); nodes[i]->data = i - 3; }
        for (int i = 0; i < n; i++) { nodes[i]->prev = i ? nodes[i - 1] : NULL; nodes[i]->next = i + 1 < n ? nodes[i + 1] : NULL; }
        queue q = {n, n ? nodes[0] : NULL, n ? nodes[n - 1] : NULL};
        for (int removed = 0; removed < n; removed++) {
            assert(dequeue(&q) == removed - 3); assert(q.size == n - removed - 1); assert(liveCount() == q.size);
            assert(q.head == (removed + 1 < n ? nodes[removed + 1] : NULL)); assert(q.tail == (q.size ? nodes[n - 1] : NULL));
            node *p = q.head, *prior = NULL;
            for (int i = removed + 1; i < n; i++) { assert(p == nodes[i] && p->prev == prior && p->data == i - 3); prior = p; p = p->next; }
            assert(p == NULL);
        }
        assert(dequeue(&q) == 0 && q.size == 0 && q.head == NULL && q.tail == NULL);
    }
  `,
  },
  "queue-deque-add-front": {
    helpers: listHelpers,
    body: String.raw`
    deque d = {NULL, NULL}; int expected[100];
    for (int n = 0; n < 100; n++) {
        node *oldBack = d.back; addFront(&d, n);
        if (oldBack) assert(d.back == oldBack); else assert(d.front == d.back);
        for (int i = 0; i <= n; i++) expected[i] = n - i;
        expectList(d.front, expected, n + 1); assert(d.back->data == 0 && d.back->next == NULL);
    }
    disposeList(d.front);
  `,
  },
};

test("30 structure-writing exercises have complete distinct contracts and native fixtures", () => {
  assert.equal(structureExercises.length, 30);
  assert.equal(new Set(structureExercises.map((q) => q.id)).size, 30);
  assert.deepEqual(
    structureExercises.reduce(
      (counts, q) => ({ ...counts, [q.topic]: (counts[q.topic] || 0) + 1 }),
      {},
    ),
    { memory: 10, linked: 10, stacks: 5, queues: 5 },
  );
  assert.deepEqual(
    Object.keys(fixtures).sort(),
    structureExercises.map((q) => q.id).sort(),
  );
  for (const q of structureExercises) {
    assert(q.title && q.prompt && q.assumptions && q.setup && q.example);
    assert(q.rubric.length >= 2, q.id);
    assert(q.signature.endsWith("{"), q.id);
    assert(q.lines.length > 0, q.id);
    for (const line of q.lines) {
      assert(line.code && line.hint && line.why, q.id);
      if (line.fixed)
        assert.match(
          line.code,
          /^\s*[{}]\s*$/,
          `${q.id}: only brace lines are fixed`,
        );
    }
  }
});

function verifyNative(q, replacement = null) {
  const directory = mkdtempSync(join(tmpdir(), "cs-writing-structures-"));
  try {
    const source = join(directory, "verify.c");
    const executable = join(directory, "verify");
    const fixture = fixtures[q.id];
    const c = `${allocationHarness}\n${q.setup}\n${q.signature}\n${q.lines.map((line, index) => (replacement?.index === index ? replacement.code : line.code)).join("\n")}\n}\n${fixture.helpers || ""}\nint main(void) {\n${fixture.body}\nassert(liveCount() == 0);\nreturn 0;\n}\n`;
    writeFileSync(source, c);
    const compiled = spawnSync(
      process.env.CC || "clang",
      [
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-pedantic",
        "-fsanitize=address,undefined",
        "-fno-sanitize-recover=all",
        source,
        "-o",
        executable,
      ],
      { encoding: "utf8", timeout: 60000 },
    );
    assert.equal(
      compiled.status,
      0,
      `${q.id}: ${compiled.stderr || compiled.error || "C compiler unavailable"}`,
    );
    const result = spawnSync(executable, [], {
      encoding: "utf8",
      timeout: 20000,
      env: {
        ...process.env,
        ASAN_OPTIONS: `detect_leaks=${process.platform === "linux" ? 1 : 0}:halt_on_error=1`,
        UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=1",
      },
    });
    assert.equal(result.status, 0, `${q.id}: ${result.stderr || result.error}`);
    if (fixture.output)
      assert.equal(
        result.stdout.replace(/\s/g, ""),
        fixture.output.replace(/\s/g, ""),
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const q of structureExercises) {
  test(`canonical C: ${q.id}`, { timeout: 90000 }, () => verifyNative(q));
  q.lines.forEach((line, index) => {
    for (const code of line.accept || []) {
      test(
        `accepted C: ${q.id}, line ${index + 1}, ${code}`,
        { timeout: 90000 },
        () => verifyNative(q, { index, code }),
      );
    }
  });
}
