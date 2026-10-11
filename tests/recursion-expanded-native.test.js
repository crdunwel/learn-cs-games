import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { generateRecursion } from "../src/games/recursion.js";
import { validateRecursionQuestion } from "../src/engine/recursionValidation.js";
const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
const tape = (...draws) => {
  let i = 0;
  return () => draws[i++] ?? 0.25;
};

test(
  "actual Fibonacci, permutation and recursive search C execute all finite inputs under sanitizers",
  { timeout: 120000 },
  (t) => {
    const fib = generateRecursion(tape(draw(8, 0, 11), draw(10, 0, 10)), 3);
    const permutation = generateRecursion(
      tape(draw(10, 0, 11), draw(5, 2, 5)),
      3,
    );
    const search = generateRecursion(
      tape(
        draw(11, 0, 11),
        draw(10, 5, 10),
        draw(20, 1, 20),
        draw(8, 2, 8),
        0,
        0.9,
      ),
      3,
    );
    for (const q of [fib, permutation, search]) validateRecursionQuestion(q);
    const directory = mkdtempSync(join(tmpdir(), "cs-recursion-expanded-"));
    try {
      const source = join(directory, "verify.c"),
        executable = join(directory, "verify");
      // Instrument call entry and printf only: the generated C control flow is unchanged.
      writeFileSync(
        source,
        `#include <assert.h>
#include <stdio.h>
#include <string.h>
static int calls;
static char words[120][6];
static int printed;
static int capture(const char *format, const char *word) {
  assert(strcmp(format, "%s\\n") == 0);
  assert(printed < 120);
  strcpy(words[printed++], word);
  return 0;
}
${fib.code.replace("if (n <= 1)", "calls++;\n  if (n <= 1)")}
${permutation.code.replaceAll("printf", "capture")}
${search.code}
int main(void) {
  const int values[] = {0,1,1,2,3,5,8,13,21,34,55};
  const int counts[] = {1,1,3,5,9,15,25,41,67,109,177};
  for(int n=0;n<=10;n++){ calls=0; assert(fib(n)==values[n]); assert(calls==counts[n]); }
  for(int size=2;size<=5;size++){
    char word[6]="ABCDE"; word[size]='\\0'; char original[6]; strcpy(original, word);
    printed=0; permute(word,0,size); int expected=1; for(int i=2;i<=size;i++) expected*=i;
    assert(printed==expected); assert(strcmp(word,original)==0);
    for(int i=0;i<printed;i++){
      assert((int)strlen(words[i])==size);
      for(int letter=0;letter<size;letter++){ int count=0; for(int p=0;p<size;p++) if(words[i][p]=='A'+letter) count++; assert(count==1); }
      for(int j=0;j<i;j++) assert(strcmp(words[i],words[j])!=0);
    }
  }
  for(int size=5;size<=10;size++) for(int start=1;start<=20;start++) for(int gap=2;gap<=8;gap++){
    int a[10]; for(int i=0;i<size;i++) a[i]=start+i*gap;
    for(int selection=-1;selection<=size;selection++){
      int key=selection<0?start-1:selection==size?a[size-1]+1:a[selection];
      int expected=-1; for(int i=0;i<size;i++) if(a[i]==key) expected=i;
      assert(find(a,0,size-1,key)==expected);
    }
    assert(find(a,1,0,start)==-1);
  }
  return 0;
}
`,
      );
      const compiler = process.env.CC || "clang";
      const compiled = spawnSync(
        compiler,
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
        { encoding: "utf8", timeout: 90000 },
      );
      assert.equal(
        compiled.status,
        0,
        compiled.stderr || "C compiler unavailable",
      );
      const run = spawnSync(executable, [], {
        encoding: "utf8",
        timeout: 20000,
        env: {
          ...process.env,
          ASAN_OPTIONS: `detect_leaks=${process.platform === "linux" ? 1 : 0}:halt_on_error=1`,
          UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=1",
        },
      });
      assert.equal(run.status, 0, run.stderr);
      t.diagnostic(
        "Actual generated C checked fib return/call counts n=0…10, all permutations of sizes 2…5 with uniqueness/restoration checks, and all 7,980 recursive-search array/key combinations plus empty intervals.",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
