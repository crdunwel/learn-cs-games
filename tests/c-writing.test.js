import test from "node:test";
import assert from "node:assert/strict";
import {
  writingExercises,
  validateWritingCatalog,
  cTokens,
  compareC,
  checkWritingLine,
  checkWritingFunction,
  modelFunction,
  isRecognized,
  loadWriting,
  saveWriting,
  writingCompletion,
  WRITING_KEY,
  exerciseVersion,
} from "../src/engine/cWriting.js";

test("60 distinct authored problems all recognize their complete and per-line solutions", () => {
  assert.equal(writingExercises.length, 60);
  assert.equal(new Set(writingExercises.map((q) => q.id)).size, 60);
  assert.equal(new Set(writingExercises.map((q) => q.prompt)).size, 60);
  assert.equal(new Set(writingExercises.map(modelFunction)).size, 60);
  for (const q of writingExercises) {
    assert.equal(
      checkWritingFunction(modelFunction(q), q).kind,
      "matched",
      q.id,
    );
    assert.equal(
      checkWritingFunction(`/* My answer */\n${modelFunction(q)}\n// done`, q)
        .kind,
      "matched",
      q.id,
    );
    for (const line of q.lines) {
      for (const form of [line.code, ...(line.accept || [])]) {
        assert.equal(checkWritingLine(form, line).kind, "matched", form);
        assert.equal(
          checkWritingLine(cTokens(form).tokens.join(" \t "), line).kind,
          "matched",
          form,
        );
      }
      if (line.code.endsWith(";"))
        assert.equal(
          checkWritingLine(line.code.slice(0, -1), line).kind,
          "minor",
          line.code,
        );
    }
    assert.equal(
      writingCompletion(q, { lines: {}, raw: modelFunction(q) }),
      "complete",
    );
    assert.equal(
      writingCompletion(q, { lines: {}, raw: "", reviewed: true }),
      "reviewed",
    );
  }
});

test("token comparison preserves syntax and meaning while ignoring cosmetic presentation", () => {
  const line = { code: "if (n == 0) return 1;", accept: ["if (!n) return 1;"] };
  assert.equal(
    checkWritingLine("if(n==0) return 1 /* base */;", line).kind,
    "matched",
  );
  assert.equal(checkWritingLine("if(!n) return 1", line).kind, "minor");
  for (const wrong of [
    "if(n=0) return 1;",
    "if(n==0) return 0;",
    "if(n==1) return 1;",
    "if(n==0); return 1;",
  ])
    assert.equal(checkWritingLine(wrong, line).kind, "review", wrong);
  assert.equal(
    checkWritingLine("intn=1;", { code: "int n = 1;" }).kind,
    "review",
  );
  assert.equal(checkWritingLine("i + +;", { code: "i++;" }).kind, "review");
  assert.equal(
    checkWritingLine('printf("ab");', { code: 'printf("a b");' }).kind,
    "review",
  );
  assert.equal(
    checkWritingLine("for(int i=0 i<n i++){", {
      code: "for (int i = 0; i < n; i++) {",
    }).kind,
    "review",
  );
  assert.equal(
    checkWritingLine("ptr.next=NULL;", { code: "ptr->next = NULL;" }).kind,
    "review",
  );
  assert.equal(
    checkWritingLine("return 1; garbage", { code: "return 1;" }).kind,
    "review",
  );
  assert.equal(checkWritingLine('printf("oops);', line).kind, "syntax");
  assert.equal(checkWritingLine("/* unclosed", line).kind, "syntax");
  assert.equal(checkWritingLine("", line).kind, "empty");
  assert.equal(isRecognized({ kind: "review" }), false);
  assert.deepEqual(
    compareC("int x = 1\nreturn x", [["int x=1;"], ["return x;"]]),
    {
      kind: "minor",
      missing: 2,
      message:
        "Logic matches. Add 2 missing semicolons to finish the C syntax.",
    },
  );
});

test("raw comparison permits authored alternatives without requiring their line layout", () => {
  assert.equal(
    checkWritingLine("return // comment \\\n1;", { code: "return 1;" }).kind,
    "syntax",
  );
  const q = {
    signature: "int f(int n) {",
    lines: [
      { code: "if (n == 0) return 0;", accept: ["if (!n) return 0;"] },
      { code: "return n;" },
    ],
  };
  assert.equal(
    checkWritingFunction("int f(int n){if(!n)return 0;return n;}", q).kind,
    "matched",
  );
  assert.equal(
    checkWritingFunction("int f(int n){if(!n)return 0\nreturn n}", q).kind,
    "minor",
  );
  assert.equal(
    checkWritingFunction("int f(int n){return n;}", q).kind,
    "review",
    "Equivalent but unrecognized is review, never an automatic wrong grade",
  );
});

test("catalog rejects duplicate IDs, empty writing and incomplete guidance", () => {
  const q = writingExercises[0];
  assert.throws(() => validateWritingCatalog([q, q]));
  assert.throws(() =>
    validateWritingCatalog([{ ...q, lines: [{ code: "return NULL;" }] }]),
  );
  assert.throws(() =>
    validateWritingCatalog([{ ...q, lines: [{ code: "}", fixed: true }] }]),
  );
  assert.throws(() =>
    validateWritingCatalog([{ ...q, signature: "not a signature" }]),
  );
});

test("draft persistence preserves text, filters corrupted data and recomputes completion", () => {
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k),
      setItem: (k, v) => data.set(k, v),
    };
  const q = writingExercises[0],
    draft = {
      lines: { 0: q.lines[0].code },
      raw: "my partial work",
      reviewed: false,
    };
  assert.equal(
    exerciseVersion(q),
    exerciseVersion({
      ...q,
      title: "A nicer title",
      lines: q.lines.map((line) => ({
        ...line,
        hint: "Clearer words",
        code: `  ${line.code}  `,
      })),
    }),
  );
  assert.equal(
    saveWriting(storage, { [q.id]: draft, unknown: { raw: "x" } }),
    true,
  );
  assert.deepEqual(loadWriting(storage), { [q.id]: draft });
  const saved = JSON.parse(data.get(WRITING_KEY));
  saved.drafts[q.id].complete = true;
  saved.drafts[q.id].lines[99] = "stale";
  saved.drafts[q.id].lines[1] = { bad: true };
  data.set(WRITING_KEY, JSON.stringify(saved));
  assert.equal(writingCompletion(q, loadWriting(storage)[q.id]), "started");
  assert.equal(loadWriting(storage)[q.id].lines[99], undefined);
  saved.drafts[q.id].version = exerciseVersion(q) + "old";
  data.set(WRITING_KEY, JSON.stringify(saved));
  const recovered = loadWriting(storage);
  assert.match(recovered[q.id].previous, /my partial work/);
  assert.deepEqual(recovered[q.id].lines, {});
  assert.equal(writingCompletion(q, recovered[q.id]), "started");
  saveWriting(storage, recovered);
  assert.equal(loadWriting(storage)[q.id].previous, recovered[q.id].previous);
  data.set(WRITING_KEY, "{broken");
  assert.deepEqual(loadWriting(storage), {});
  assert.equal(saveWriting(null, {}), false);
  assert.equal(
    saveWriting(
      {
        setItem() {
          throw Error("denied");
        },
      },
      {},
    ),
    false,
  );
});
