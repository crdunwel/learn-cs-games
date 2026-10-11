import test from "node:test";
import assert from "node:assert/strict";
import { gradeMallocAnswer } from "../src/engine/mallocAnswer.js";

const array = {
  format: "malloc",
  allocation: { type: "int", name: "scores", elementBytes: 4, count: 24 },
};
const char = {
  format: "malloc",
  allocation: { type: "char", name: "copy", elementBytes: 1, count: 13 },
};
const book = {
  format: "malloc",
  allocation: { type: "Book", name: "book", elementBytes: 44, count: 1 },
};

test("malloc grading accepts correct allocation meaning and one-point semicolon repair", () => {
  const accepted = [
    "int *scores = malloc(24 * sizeof *scores);",
    "scores=malloc(sizeof(int)*24);",
    "int*scores=(int*)malloc((12+12)*sizeof(int));",
    "scores = (void *) malloc(96);",
    "scores = malloc(4 * (30 - 6));",
    "(scores) = (malloc(96));",
    "scores = ((int *) (malloc(24 * sizeof((*(scores))))));",
    "scores = malloc(24 * sizeof((scores)[0]));",
    "scores = malloc(48 + +48);",
    "scores = malloc((sizeof(*scores)) * 24U);",
    "scores = malloc(24 * sizeof scores[0]);",
    "scores = malloc(24 * sizeof(scores[0]));",
    "scores = malloc(24 * sizeof *(scores));",
    "scores = malloc(030 * sizeof(int));", // 030 is 24 in C.
    "scores = malloc(192 / 2); // enough bytes",
    "scores /* pointer */ = malloc(24LL * sizeof(int));",
  ];
  for (const line of accepted) {
    assert.deepEqual(
      gradeMallocAnswer(array, line),
      { correct: true, earned: 10 },
      line,
    );
    const missing = line.replace(";", "");
    const grade = gradeMallocAnswer(array, missing);
    assert.equal(grade.correct, true, missing);
    assert.equal(grade.earned, 9, missing);
    assert.match(grade.warning, /Add ;/);
  }
  assert.equal(gradeMallocAnswer(char, "copy = malloc(12 + 1);").correct, true);
  assert.equal(
    gradeMallocAnswer(book, "Book *book = malloc(sizeof(Book));").correct,
    true,
  );
});

test("malloc grading rejects wrong bytes, wrong target/types, unsafe and extra code", () => {
  const rejected = [
    "int *scores = malloc(24);",
    "int *scores = malloc(23 * sizeof *scores);",
    "int *scores = malloc(25 * sizeof *scores);",
    "scores = malloc(sizeof scores * 24);",
    "scores = malloc(sizeof(scores) * 24);",
    "double *scores = malloc(96);",
    "scores = (double *)malloc(96);",
    "int scores = malloc(96);",
    "int *other = malloc(96);",
    "malloc(96);",
    "scores = calloc(24, sizeof(int));",
    "scores = realloc(scores, 96);",
    "scores = malloc(96); free(scores);",
    "scores = malloc(96);;",
    "scores = malloc(96), other = scores;",
    'scores = malloc(system("echo hi"));',
    "scores = malloc(96/0);",
    "scores = malloc(++96);",
    "scores = malloc(+++96);",
    "scores = malloc(24 * ++sizeof(int));",
    "scores = malloc(96--);",
    "(int *scores) = malloc(96);",
    "scores = malloc(24 * sizeof(*scores()));",
    "scores = malloc(24 * sizeof(*scores[0]));",
    "scores = malloc(24 * sizeof(*other));",
    "scores = malloc(24 * sizeof scores++);",
    "scores = malloc(96) scores = 0",
    "scores = malloc(96;);",
    "scores == malloc(96);",
    "scores += malloc(96);",
    "scores = malloc(96) /* unterminated",
    "scores = malloc(-96);",
    "scores = malloc(0 - 96 + 192);",
    "scores = malloc(999999 * 999999 / 999999);",
    "scores = malloc(32768 - 32672);", // Avoid implementation-dependent int width.
    "scores = malloc(16000 * 3 / 500);", // Intermediate exceeds minimum INT_MAX.
    "scores = malloc(024 * sizeof(int));", // 024 is 20, not 24.
    "scores = malloc(08 * 12);",
    "scores = malloc(24lL * sizeof(int));", // Invalid C long-long suffix.
    "scores = malloc(sizeof((int)) * 24);",
    "scores = malloc((sizeof(int) * 24);",
    "scores = malloc(96); } int exploit(){",
  ];
  for (const line of rejected) {
    const grade = gradeMallocAnswer(array, line);
    assert.equal(grade.correct, false, line);
    assert.equal(grade.earned, 0, line);
    assert.ok(grade.reason, line);
  }
  assert.equal(gradeMallocAnswer(char, "copy = malloc(12);").correct, false);
  assert.equal(gradeMallocAnswer(book, "book = malloc(8);").correct, false);
});
