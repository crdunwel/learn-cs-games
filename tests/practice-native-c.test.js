import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  recursionCase,
  bigOCase,
  linkCase,
  memoryCase,
  searchCase,
} from "./support/practice-cases.js";
import {
  bigOWorkCount,
  validatePracticeQuestion,
} from "../src/engine/practiceValidation.js";

// Execute the displayed C with a C compiler, not a JavaScript translation.
// The test is explicit about unavailable tooling instead of silently claiming coverage.
test(
  "displayed C compiles and executes independent exhaustive scalar/boundary checks with sanitizers",
  { timeout: 120000 },
  (t) => {
    const compiler = process.env.CC || "clang";
    const available = spawnSync(compiler, ["--version"], { encoding: "utf8" });
    assert.equal(
      available.status,
      0,
      "A C11 compiler is required for the C verification suite (set CC).",
    );
    const definitions = [],
      checks = [];
    let serial = 0;
    const add = (code, original) => {
      const name = `case_${serial++}`;
      definitions.push(
        code.replace(new RegExp(`\\b${original}\\b`, "g"), name),
      );
      return name;
    };
    const verify = (id, q) => {
      validatePracticeQuestion(id, q);
      return { ...q, code: q.code + "\n" };
    };
    // Every distinct scalar sum template: 4 decrements × 5 base values.
    for (let decrement = 1; decrement <= 4; decrement++)
      for (let base = 0; base <= 4; base++) {
        const q = verify(
          "recursion",
          recursionCase("sum", { n: 18, decrement, base }),
        );
        const name = add(q.code, "total");
        checks.push(
          `for (int n=0; n<=18; n++) { int terms=(n+${decrement}-1)/${decrement}; assert(${name}(n)==terms*n-${decrement}*terms*(terms-1)/2+${base}); }`,
        );
      }
    for (const before of [false, true]) {
      const q = verify("recursion", recursionCase("print", { n: 8, before }));
      const name = add(q.code.replaceAll("printf", "capture"), "printSeq");
      checks.push(
        `for(int n=2;n<=8;n++){ printed_count=0; ${name}(n); assert(printed_count==n); for(int i=0;i<n;i++) assert(printed[i]==${before ? "n-i" : "i+1"}); }`,
      );
    }
    {
      const q = verify("recursion", recursionCase("power", { a: 9, b: 4 })),
        name = add(q.code, "power");
      checks.push(
        `for(int a=2;a<=9;a++){ int expected=1; for(int b=0;b<=4;b++){ assert(${name}(a,b)==expected); expected*=a; } }`,
      );
    }
    {
      const q = verify("recursion", recursionCase("recurrence", { n: 7 })),
        name = add(q.code, "f");
      checks.push(
        `{ const int expected[]={1,1,3,6,14,33,79,190}; for(int n=0;n<=7;n++) assert(${name}(n)==expected[n]); }`,
      );
    }
    for (const topic of ["base-case", "recursive-step"])
      for (let decrement = 1; decrement <= 5; decrement++) {
        const q = verify(
          "recursion",
          recursionCase(topic, { n: 20, decrement }),
        );
        const name = add(
          q.code.replace("/* fill here */", q.steps[0].answer),
          "countCalls",
        );
        checks.push(
          `for(int n=0;n<=20;n++) assert(${name}(n)==(n+${decrement}-1)/${decrement});`,
        );
      }
    for (const topic of ["array-sum", "evens"]) {
      const q = verify(
        "recursion",
        recursionCase(topic, { values: [0, 1, 2], low: 0, high: 2 }),
      );
      const name = add(q.code, topic === "evens" ? "evens" : "sumOfDigits");
      // Every length, inclusive/empty interval, active array position, and possible element.
      // Basis vectors exhaust sum contributions; representatives 0..19 exhaust parity branches.
      checks.push(`for(int size=3;size<=7;size++) for(int high=0;high<size;high++) {
      ${topic === "array-sum" ? "if(high!=size-1) continue;" : ""}
      for(int low=0;low<=high+1;low++) for(int index=0;index<size;index++) for(int value=0;value<=${topic === "evens" ? 19 : 9};value++) {
        int a[7], expected=0; for(int i=0;i<size;i++) a[i]=${topic === "evens" ? 1 : 0}; a[index]=value;
        for(int i=low;i<=high;i++) expected+=${topic === "evens" ? "a[i]%2==0" : "a[i]"};
        assert(${name}(a,${topic === "evens" ? "low,high" : "size,low"})==expected);
      }
    }`);
    }
    // All 27 loop source variants; every positive n through 64, including nonpowers of two.
    for (const kind of [
      "constant",
      "linear",
      "square",
      "log",
      "nlog",
      "triangle",
      "sequential",
    ]) {
      const parameters =
        kind === "constant"
          ? Array.from({ length: 18 }, (_, i) => i + 3)
          : kind === "linear"
            ? [2, 3, 4, 5]
            : [3];
      for (const parameter of parameters) {
        const q = verify("bigO", bigOCase(kind, parameter));
        const name = add(
          `static int countWork(int n) { (void)n; work_count=0; ${q.code} return work_count; }`,
          "countWork",
        );
        const expected = Array.from({ length: 64 }, (_, i) =>
          bigOWorkCount(q, i + 1),
        );
        checks.push(
          `{ const int expected[]={${expected.join(",")}}; for(int n=1;n<=64;n++) assert(${name}(n)==expected[n-1]); }`,
        );
      }
    }
    // All insertion positions and inserted values; every generated list length.
    for (let p = 2; p <= 8; p++)
      for (let x = 51; x <= 89; x++) {
        const q = verify("links", linkCase("insert", { p, x }));
        const name = add(
          `static node *insert(node *head) { ${q.code} return head; }`,
          "insert",
        );
        checks.push(
          `for(int n=3;n<=5;n++){ if(${p}>n+3) continue; int values[5]={1,12,23,34,45}; node *head=build(values,n); head=${name}(head); node *cur=head; int place=${p}-1<n?${p}-1:n; for(int i=0;i<n+1;i++){assert(cur);assert(cur->data==(i==place?${x}:values[i-(i>place)]));cur=cur->next;} assert(!cur); release(head); }`,
        );
      }
    for (const parity of [0, 1])
      for (const offset of [3, 5, 7]) {
        const q = verify("links", linkCase("mutation", { parity, offset }));
        const name = add(
          `static void mutate(node *front) { ${q.code} }`,
          "mutate",
        );
        checks.push(
          `for(int n=3;n<=5;n++) for(int bits=0;bits<(1<<n);bits++) { int values[5]; for(int i=0;i<n;i++) values[i]=i*10+1+!!(bits&(1<<i)); node *head=build(values,n); ${name}(head); node *cur=head; for(int i=0;i<n;i++){ assert(cur&&cur->data==values[i]);cur=cur->next; if(values[i]%2==${parity}){assert(cur&&cur->data==values[i]+${offset});cur=cur->next;} }assert(!cur);release(head); }`,
        );
      }
    {
      const q = verify("links", linkCase("pointer-order", { x: 51 }));
      const name = add(
        `static void connect(node *current) { node *tmp=malloc(sizeof *tmp); assert(tmp); ${q.code}\n${q.steps[0].answer} }`,
        "connect",
      );
      checks.push(
        `for(int n=3;n<=5;n++)for(int index=0;index<n-1;index++){int values[5]={1,12,23,34,45};node *head=build(values,n),*cur=head;for(int i=0;i<index;i++)cur=cur->next;node *next=cur->next;${name}(cur);assert(cur->next->data==51&&cur->next->next==next);release(head);}`,
      );
    }
    {
      const q = verify("links", linkCase("free"));
      const name = add(
        q.code.replace("// Choose the next two lines.", q.steps[0].answer),
        "byeList",
      );
      checks.push(
        `for(int n=0;n<=5;n++){int values[5]={1,12,23,34,45};${name}(build(values,n));}`,
      );
    }
    // All target literals in the finite generator domain; actual generated search programs.
    const searchPrograms = new Map();
    for (let n = 5; n <= 10; n++)
      for (let start = 1; start <= 20; start++)
        for (let gap = 2; gap <= 8; gap++) {
          const values = Array.from({ length: n }, (_, i) => start + i * gap);
          for (const target of [
            start - 1,
            ...values,
            ...values.map((v) => v + 1),
          ])
            if (!searchPrograms.has(target))
              searchPrograms.set(target, searchCase(n, start, gap, target));
        }
    assert.equal(searchPrograms.size, 94);
    const searchNames = [];
    for (let key = 0; key <= 93; key++) {
      const q = verify("search", searchPrograms.get(key));
      searchNames.push(
        add(`static int find(int a[],int n) { ${q.code} }`, "find"),
      );
    }
    definitions.push(
      `static int (*search_functions[])(int*,int)={${searchNames.join(",")}};`,
    );
    checks.push(
      `for(int n=5;n<=10;n++)for(int start=1;start<=20;start++)for(int gap=2;gap<=8;gap++){int a[10];for(int i=0;i<n;i++)a[i]=start+i*gap;for(int key=0;key<=93;key++){int expected=-1;for(int i=0;i<n;i++)if(a[i]==key)expected=i;assert(search_functions[key](a,n)==expected);}}`,
    );
    for (let count = 12; count <= 240; count++) {
      const q = verify("memory", memoryCase("calloc", { count }));
      checks.push(
        `{ ${q.steps[0].answer} assert(scores);for(int i=0;i<${count};i++)assert(scores[i]==0);free(scores); }`,
      );
    }
    for (const type of ["int", "double", "Book", "float"])
      for (const count of [12, 240]) {
        const q = verify("memory", memoryCase("bytes", { count, type }));
        checks.push(
          `{ ${q.code.replace("malloc(", "tracked_malloc(")} assert(items);assert(requested_bytes==${q.steps[0].answer});free(items); }`,
        );
      }
    for (let length = 2; length <= 96; length++) {
      const q = verify("memory", memoryCase("string", { length }));
      checks.push(
        `{char name[${length + 1}];memset(name,'x',${length});name[${length}]=0;${q.code.replace("/* bytes */", q.steps[0].answer)}assert(copy);strcpy(copy,name);assert(strlen(copy)==${length});free(copy);}`,
      );
    }
    for (const count of [12, 240])
      for (const factor of [2, 3, 4]) {
        const q = verify("memory", memoryCase("realloc", { count, factor }));
        checks.push(
          `{int *scores=malloc(${count}*sizeof *scores);assert(scores);${q.code.replace("realloc(", "fail_realloc(").replace("/* choose this branch */", q.steps[0].answer)}assert(scores==NULL);}`,
        );
      }
    for (let size = 3; size <= 5; size++)
      for (const value of [1, 40])
        for (let factor = 2; factor <= 4; factor++) {
          const values = Array(size).fill(value),
            q = verify(
              "memory",
              memoryCase("resize", { values, factor, index: size - 1 }),
            );
          checks.push(
            `{int *scores=malloc(${size}*sizeof *scores);assert(scores);for(int i=0;i<${size};i++)scores[i]=${value};${q.code}assert(scores);for(int i=0;i<${size};i++)assert(scores[i]==${value});free(scores);}`,
          );
        }
    for (let authors = 1; authors <= 12; authors++)
      for (const titleLength of [5, 45]) {
        const q = verify(
          "memory",
          memoryCase("free-order", { authors, titleLength }),
        );
        checks.push(
          `{${q.code} Book *book=malloc(sizeof *book);assert(book);book->nAuth=${authors};book->authors=malloc(${authors}*sizeof *book->authors);assert(book->authors);for(int i=0;i<${authors};i++){book->authors[i]=malloc(4);assert(book->authors[i]);strcpy(book->authors[i],"Amy");}for(int i=0;i<book->nAuth;i++)free(book->authors[i]);free(book->authors);free(book);}`,
        );
      }
    // New memory templates execute their exact displayed source; boundary literals
    // complement the complete finite-domain JavaScript checks.
    for (const count of [12, 240]) {
      let q = verify("memory", memoryCase("array-length", { count }));
      checks.push(`{${q.code}assert(length==${count});}`);
      for (const index of [0, count - 1]) {
        q = verify("memory", memoryCase("zero-read", { count, index }));
        checks.push(`{${q.code}assert(result==0);free(values);}`);
      }
    }
    for (const value of [1, 40])
      for (const delta of [1, 9])
        for (let index = 0; index < 3; index++) {
          const q = verify(
            "memory",
            memoryCase("alias-write", { value, delta, index }),
          );
          checks.push(`{${q.code}assert(result==${value + delta});free(p);}`);
        }
    for (const start of [1, 20]) {
      for (let offset = 1; offset <= 3; offset++)
        for (let index = 0; index < 5 - offset; index++) {
          const q = verify(
            "memory",
            memoryCase("pointer-offset", { start, offset, index }),
          );
          checks.push(
            `{${q.code}assert(result==${start + 3 * (offset + index)});}`,
          );
        }
      for (let nextCount = 1; nextCount <= 5; nextCount++)
        for (let index = 0; index < nextCount; index++) {
          const q = verify(
            "memory",
            memoryCase("shrink", { start, nextCount, index }),
          );
          checks.push(
            `{${q.code}assert(result==${start + index});free(values);}`,
          );
        }
    }
    for (let rows = 1; rows <= 8; rows++)
      for (const columns of [2, 10]) {
        const q = verify(
          "memory",
          memoryCase("row-allocations", { rows, columns }),
        );
        checks.push(
          `{${q.code}int freed=0;for(int r=0;r<${rows};r++){free(grid[r]);freed++;}free(grid);freed++;assert(freed==${rows + 1});}`,
        );
      }
    const source = `#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stddef.h>
_Static_assert(sizeof(int)==4 && sizeof(float)==4 && sizeof(double)==8,"native size assumptions");
typedef struct Book { char bytes[64]; } Book;
typedef struct node { int data; struct node *next; } node;
static int work_count, printed[10], printed_count;
static size_t requested_bytes;
static void work(void){work_count++;}
static int capture(const char *format,int value){(void)format;assert(printed_count<10);printed[printed_count++]=value;return 0;}
static void *tracked_malloc(size_t size){requested_bytes=size;return malloc(size);}
static void *fail_realloc(void *ptr,size_t size){(void)ptr;(void)size;return NULL;}
static node *build(const int *values,int count){node *head=NULL,**link=&head;for(int i=0;i<count;i++){*link=malloc(sizeof **link);assert(*link);(*link)->data=values[i];(*link)->next=NULL;link=&(*link)->next;}return head;}
static void release(node *head){while(head){node *next=head->next;free(head);head=next;}}
${definitions.join("\n")}
int main(void){${checks.join("\n")}return 0;}
`;
    const directory = mkdtempSync(join(tmpdir(), "cs-club-c-proof-"));
    try {
      const input = join(directory, "practice.c"),
        executable = join(directory, "practice");
      writeFileSync(input, source);
      const compiled = spawnSync(
        compiler,
        [
          "-std=c11",
          "-Wall",
          "-Wextra",
          "-Werror",
          "-O1",
          "-g",
          "-fsanitize=address,undefined",
          "-fno-sanitize-recover=all",
          "-fno-omit-frame-pointer",
          input,
          "-o",
          executable,
        ],
        { encoding: "utf8", timeout: 90000, maxBuffer: 1024 * 1024 },
      );
      assert.equal(compiled.status, 0, compiled.stderr);
      const run = spawnSync(executable, [], {
        encoding: "utf8",
        timeout: 20000,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          // LeakSanitizer is available on Linux CI, but not Apple clang/macOS.
          ASAN_OPTIONS: `detect_leaks=${process.platform === "linux" ? 1 : 0}:halt_on_error=1`,
          UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=1",
        },
      });
      assert.equal(run.status, 0, `${run.stderr}\n${run.stdout}`);
      t.diagnostic(
        `${serial} displayed-source functions compiled with strict warnings, AddressSanitizer and UndefinedBehaviorSanitizer; all native assertions passed.`,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
