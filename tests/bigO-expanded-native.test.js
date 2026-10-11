import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { generateBigO } from "../src/games/bigO.js";
import { validateBigOQuestion } from "../src/engine/bigOValidation.js";

const kinds = [
  "constant",
  "linear",
  "square",
  "log",
  "nlog",
  "triangle",
  "sequential",
  "cube",
  "binary-search",
  "recursive-binary-search",
  "linear-search",
  "independent-inputs",
  "sequential-log-square",
];
const sourceCase = (kind) => {
  const values = [0.9, (kinds.indexOf(kind) + 0.25) / kinds.length, 0, 0];
  let at = 0;
  const q = generateBigO(() => values[at++] ?? 0.25, 3);
  assert.equal(q.kind, kind);
  validateBigOQuestion(q);
  return q;
};

test(
  "six new displayed Big-O C families execute correct counts and searches under sanitizers",
  { timeout: 120000 },
  (t) => {
    const compiler = process.env.CC || "clang";
    assert.equal(
      spawnSync(compiler, ["--version"], { encoding: "utf8" }).status,
      0,
      "A C11 compiler is required (set CC).",
    );
    const definitions = [],
      checks = [];
    for (const kind of [
      "cube",
      "independent-inputs",
      "sequential-log-square",
    ]) {
      const q = sourceCase(kind),
        name = kind.replaceAll("-", "_");
      definitions.push(
        `static int ${name}(int n,int m){(void)m; work_count=0; ${q.code}\nreturn work_count;}`,
      );
      if (kind === "cube")
        checks.push(`for(int n=1;n<=64;n++) assert(cube(n,1)==n*n*n);`);
      if (kind === "independent-inputs")
        checks.push(
          `for(int n=1;n<=64;n++) for(int m=1;m<=64;m++) assert(independent_inputs(n,m)==n*m);`,
        );
      if (kind === "sequential-log-square")
        checks.push(
          `for(int n=1;n<=64;n++){int h=0;for(int remaining=n;remaining>1;remaining/=2)h++;assert(sequential_log_square(n,1)==h+n*n);}`,
        );
    }
    for (const kind of [
      "binary-search",
      "recursive-binary-search",
      "linear-search",
    ]) {
      const q = sourceCase(kind),
        name = kind.replaceAll("-", "_");
      const original =
        kind === "linear-search" ? "linearSearch" : "binarySearch";
      definitions.push(
        q.code.replace(new RegExp(`\\b${original}\\b`, "g"), name),
      );
      const args =
        kind === "recursive-binary-search" ? "a,0,n-1,key" : "a,n,key";
      // Every generated-independent size here includes nonpowers of two; all keys
      // cover left/right branches, successful positions and absent gaps/bounds.
      checks.push(`for(int n=1;n<=64;n++){
      int a[64], max_seen=0, bound=0; for(int i=0;i<n;i++)a[i]=1+3*i;
      for(int size=n;size>0;size/=2)bound++; (void)bound;
      for(int key=0;key<=3*n+1;key++){
        int expected=-1;for(int i=0;i<n;i++)if(a[i]==key)expected=i;
        work_count=0;assert(${name}(${args})==expected);
        if(work_count>max_seen)max_seen=work_count;
        assert(work_count<=${kind === "linear-search" ? "n" : "bound"});
      }
      assert(max_seen==${kind === "linear-search" ? "n" : "bound"});
    }`);
    }
    const source = `#include <assert.h>\nstatic int work_count=0;\nstatic void work(void){work_count++;}\n${definitions.join("\n")}\nint main(void){${checks.join("\n")}return 0;}\n`;
    const directory = mkdtempSync(join(tmpdir(), "bigO-expanded-native-"));
    try {
      const file = join(directory, "check.c"),
        executable = join(directory, "check");
      writeFileSync(file, source);
      const compile = spawnSync(
        compiler,
        [
          "-std=c11",
          "-Wall",
          "-Wextra",
          "-Werror",
          "-pedantic",
          "-O1",
          "-g",
          "-fsanitize=address,undefined",
          "-fno-sanitize-recover=all",
          "-fno-omit-frame-pointer",
          file,
          "-o",
          executable,
        ],
        { encoding: "utf8", timeout: 60000 },
      );
      assert.equal(compile.status, 0, compile.stderr);
      const run = spawnSync(executable, [], {
        encoding: "utf8",
        timeout: 60000,
        env: {
          ...process.env,
          ASAN_OPTIONS: `detect_leaks=${process.platform === "linux" ? 1 : 0}:halt_on_error=1`,
          UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=1",
        },
      });
      assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
      t.diagnostic(
        "Six displayed-source C families passed strict C11 compilation, all n=1..64 and m=1..64 loop counts, every present/absent key in the search domains, AddressSanitizer and UndefinedBehaviorSanitizer.",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
