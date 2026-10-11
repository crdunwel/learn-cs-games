// Compile the actual generated model answers, not rewritten JS equivalents.
// Requires clang; temporary native sources/binaries are removed on completion.
import { generateExam } from "../src/games/exam.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const families = {
  allocation: new Map(),
  resize: new Map(),
  book: new Map(),
  recursion: new Map(),
  permutation: new Map(),
  trace: new Map(),
  analysis: new Map(),
};
const targets = {
  allocation: 6,
  resize: 2,
  book: 3,
  recursion: 24,
  permutation: 6,
  trace: 10,
  analysis: 12,
};
let exemplar;
for (let seed = 0; seed < 10000; seed++) {
  const e = generateExam(seed),
    q = e.questions;
  exemplar ??= e;
  for (const [family, question, key] of [
    ["allocation", q[0], q[0].parts[0].answer],
    ["resize", q[0], q[0].parts[1].answer],
    ["book", q[1], q[1].parts[0].answer],
    ["recursion", q[3], q[3].code],
    ["permutation", q[5], q[5].code + q[5].parts[1].answer],
    ["trace", q[7], q[7].code],
    ["analysis", q[13], q[13].code],
  ])
    families[family].set(key, question);
  if (
    Object.entries(targets).every(
      ([family, size]) => families[family].size === size,
    )
  )
    break;
}
for (const [family, size] of Object.entries(targets))
  if (families[family].size !== size)
    throw new Error(`Incomplete finite C coverage for ${family}`);
const headers = `#include <assert.h>
#include <stddef.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#include <limits.h>
#include <stdint.h>

typedef struct node { int data; struct node *next; } node;
typedef struct { void *p; size_t bytes; } Allocation;
static Allocation allocations[4096];
static int allocation_count, fail_realloc, emitted[100000], emit_count, searches;
static char message[40];
static void track(void *p, size_t bytes) {
  assert(p != NULL && allocation_count < 4096);
  allocations[allocation_count++] = (Allocation){p,bytes};
}
static int allocation_index(void *p) { for(int i=0;i<allocation_count;i++) if(allocations[i].p==p) return i; assert(0); return -1; }
static size_t allocation_size(void *p) { return allocations[allocation_index(p)].bytes; }
static void *checked_malloc(size_t n) { void *p=malloc(n); track(p,n); return p; }
static void *checked_calloc(size_t n,size_t s) { void *p=calloc(n,s); track(p,n*s); return p; }
static void checked_free(void *p) { if(p) { int i=allocation_index(p); allocations[i]=allocations[--allocation_count]; free(p); } }
static void *checked_realloc(void *p,size_t n) {
  if(fail_realloc) { fail_realloc=0; return NULL; }
  int i=allocation_index(p); void *result=realloc(p,n); assert(result); allocations[i]=(Allocation){result,n}; return result;
}
static int capture_printf(const char *format, ...) {
  va_list args; va_start(args,format);
  if(strstr(format,"%d")) { assert(emit_count<100000); emitted[emit_count++]=va_arg(args,int); }
  else { snprintf(message,sizeof message,"%s",format); }
  va_end(args); return 0;
}
#define malloc checked_malloc
#define calloc checked_calloc
#define free checked_free
#define realloc checked_realloc
#define printf capture_printf
static node *make_list(int n) {
  node *head=NULL; for(int i=n-1;i>=0;i--) { node *next=malloc(sizeof *next); next->data=i+2; next->next=head; head=next; } return head;
}
static void dispose_list(node *head) { while(head) { node *next=head->next; free(head); head=next; } }
static int binSearch(int key, int *values,int n) {
  searches++; int low=0,high=n-1;
  while(low<=high) { int mid=low+(high-low)/2; if(values[mid]==key)return 1; if(values[mid]<key)low=mid+1;else high=mid-1; } return 0;
}
static int iterative_gap(int *values,int n,int gap) { for(int i=1;i<n;i++) if(abs(values[i]-values[i-1])==gap)return 1;return 0; }
static int next_permutation(int *a,int n) {
  int i=n-2; while(i>=0 && a[i]>=a[i+1])i--; if(i<0)return 0;
  int j=n-1;while(a[j]<=a[i])j--;int t=a[i];a[i]=a[j];a[j]=t;
  for(int l=i+1,r=n-1;l<r;l++,r--){t=a[l];a[l]=a[r];a[r]=t;} return 1;
}
`;
const definitions = [],
  checks = [];
let i = 0;
for (const q of families.allocation.values()) {
  const id = i++,
    count = Number(q.parts[0].prompt.match(/with (\d+) elements/)[1]);
  definitions.push(
    `static void test_allocate_${id}(void) { ${q.parts[0].answer} assert(allocation_size(scores)==${count}*sizeof(int)); for(int i=0;i<${count};i++)assert(scores[i]==0); free(scores);assert(allocation_count==0); }`,
  );
  checks.push(`test_allocate_${id}();`);
}
i = 0;
for (const q of families.resize.values()) {
  const id = i++,
    factor = Number(q.parts[1].prompt.match(/Resize it to (\d+)/)[1]);
  definitions.push(
    `static void test_resize_${id}(int N,int failure) { int *scores=malloc(N*sizeof *scores);for(int i=0;i<N;i++)scores[i]=i*3; fail_realloc=failure;message[0]=0; ${q.parts[1].answer} if(failure){assert(scores==NULL);assert(strcmp(message,"failed\\n")==0);}else{assert(scores!=NULL);assert(allocation_size(scores)==${factor}*N*sizeof *scores);for(int i=0;i<N;i++)assert(scores[i]==i*3);assert(strcmp(message,"success\\n")==0);free(scores);}assert(allocation_count==0); }`,
  );
  checks.push(
    `for(int n=1;n<=64;n++)for(int failure=0;failure<2;failure++)test_resize_${id}(n,failure);`,
  );
  const sizeExpression = q.parts[1].answer.match(/realloc\(scores, (.*)\);/)[1];
  definitions.push(
    `static size_t resize_bytes_${id}(int N) { int *scores=NULL; return ${sizeExpression}; }`,
  );
  checks.push(
    `if(SIZE_MAX / sizeof(int) / ${factor} > (size_t)INT_MAX / 2 + 1) {int N=INT_MAX/2+1;assert(resize_bytes_${id}(N)==(size_t)${factor}*N*sizeof(int));}`,
  );
}
i = 0;
for (const q of families.book.values()) {
  const id = i++,
    width = Number(q.code.match(/title\[(\d+)\]/)[1]);
  const rename = (s) =>
    s
      .replace(/\bBook\b/g, `Book_${id}`)
      .replace(/\bcreateBook\b/g, `createBook_${id}`)
      .replace(/\bfreeBook\b/g, `freeBook_${id}`);
  definitions.push(
    rename(q.code.slice(0, q.code.indexOf("Book *createBook"))),
    rename(q.parts[0].answer),
    rename(exemplar.questions[2].parts[0].answer),
  );
  definitions.push(`static void test_book_${id}(void) {
    for(int n=1;n<=8;n++) { char title[${width}],authors[8][${width}],saved[8][${width}];
      memset(title,'T',sizeof title-1);title[sizeof title-1]=0;
      for(int j=0;j<n;j++){int len=j==0?0:j==1?${width - 1}:j+1; memset(authors[j],'A'+j,len);authors[j][len]=0;strcpy(saved[j],authors[j]);}
      Book_${id} *book=createBook_${id}(title,authors,12.5f,n);
      assert(book->nAuth==n && book->price==12.5f && strcmp(book->title,title)==0);
      assert(allocation_size(book)==sizeof *book && allocation_size(book->authors)==n*sizeof *book->authors);
      for(int j=0;j<n;j++)assert(allocation_size(book->authors[j])==strlen(authors[j])+1);
      title[0]='X';for(int j=0;j<n;j++)authors[j][0]='X';
      assert(book->title[0]=='T');for(int j=0;j<n;j++)assert(strcmp(book->authors[j],saved[j])==0);
      freeBook_${id}(book);assert(allocation_count==0);
    }
  }`);
  checks.push(`test_book_${id}();`);
}
i = 0;
for (const q of families.recursion.values()) {
  const id = i++;
  // Parse all four constants explicitly, independently of question answers.
  const a = Number(q.code.match(/n <= 1\) return (\d+)/)[1]),
    b = Number(q.code.match(/n == 2\) return (\d+)/)[1]),
    m = Number(q.code.match(/return (\d+) \*/)[1]),
    s = Number(q.code.match(/- (\d+);/)[1]);
  definitions.push(q.code.replace(/\bf\b/g, `rec_${id}`));
  checks.push(
    `{int expected[7]={${a},${a},${b}};for(int n=3;n<=6;n++)expected[n]=${m}*expected[n-1]+expected[n-2]-${s};for(int n=0;n<=6;n++)assert(rec_${id}(n)==expected[n]);}`,
  );
}
definitions.push(exemplar.questions[4].parts[0].answer);
checks.push(
  "for(int n=0;n<=257;n++){byeList(make_list(n));assert(allocation_count==0);}",
);
i = 0;
for (const q of families.permutation.values()) {
  const id = i++,
    gap = Number(q.prompt.match(/difference (\d+)/)[1]);
  let source = q.code
    .replace(/#define SIZE \d+\n/, "")
    .replace("/* Your loop body */", q.parts[0].answer)
    .replace(
      /int check\(int \*perm, int n\) \{[\s\S]*?\/\* Your recursive function \*\/[\s\S]*?\}/,
      q.parts[1].answer,
    );
  source = source
    .replace(/\bmakePerm\b/g, `makePerm_${id}`)
    .replace(/\bcheck\b/g, `check_${id}`)
    .replace(/\bprint\b/g, `print_${id}`);
  definitions.push(
    `static unsigned char seen_${id}[46656];static int perm_count_${id};
void print_${id}(int *perm,int n) { int used[6]={0},rank=0;for(int i=0;i<n;i++){assert(perm[i]>=0 && perm[i]<n && !used[perm[i]]);used[perm[i]]=1;rank=rank*6+perm[i];}assert(iterative_gap(perm,n,${gap}));assert(!seen_${id}[rank]);seen_${id}[rank]=1;perm_count_${id}++; }`,
    source,
  );
  checks.push(
    `for(int n=0;n<=6;n++){int perm[6]={0},used[6]={0},ordered[6];memset(seen_${id},0,sizeof seen_${id});perm_count_${id}=0;for(int j=0;j<n;j++)ordered[j]=j;int expected=0;do{expected+=iterative_gap(ordered,n,${gap});assert(check_${id}(ordered,n)==iterative_gap(ordered,n,${gap}));}while(next_permutation(ordered,n));makePerm_${id}(perm,used,0,n);assert(perm_count_${id}==expected);for(int j=0;j<n;j++)assert(used[j]==0);}`,
  );
}
definitions.push(exemplar.questions[6].parts[0].answer);
checks.push(
  `for(int n=1;n<=20;n++)for(int p=2;p<=n+3;p++){node *head=make_list(n);assert(insertAt(head,42,p)==n+1);int at=0;for(node *cur=head;cur;cur=cur->next,at++){int insertIndex=p-1<n?p-1:n;assert(cur->data==(at==insertIndex?42:at<insertIndex?at+2:at+1));}assert(at==n+1);dispose_list(head);assert(allocation_count==0);}`,
);
i = 0;
for (const q of families.trace.values()) {
  const id = i++,
    parity = Number(q.code.match(/% 2 == (\d)/)[1]),
    increment = Number(q.code.match(/data \+ (\d+)/)[1]);
  definitions.push(q.code.replace(/\bmystery\b/g, `mystery_${id}`));
  checks.push(
    `for(int value=2;value<=15;value++)for(int n=0;n<=12;n++){node *head=make_list(n);for(node *cur=head;cur;cur=cur->next)cur->data=value;mystery_${id}(head);int at=0;for(node *cur=head;cur;cur=cur->next,at++)assert(cur->data==(value%2==${parity} && at%2==1?value+${increment}:value));assert(at==n*(value%2==${parity}?2:1));dispose_list(head);assert(allocation_count==0);}`,
  );
}
// The supplied linked-queue function, including the second isEmpty check.
definitions.push(
  `struct queue {node *front,*back;}; static int isEmpty(struct queue *qPtr){return qPtr->front==NULL;}`,
  exemplar.questions[9].code,
);
checks.push(
  `for(int n=0;n<=64;n++){struct queue q={make_list(n),NULL};for(node *cur=q.front;cur;cur=cur->next)q.back=cur;for(int i=0;i<n;i++){assert(deQueue(&q)==i+2);assert((q.front==NULL)==(q.back==NULL));}assert(deQueue(&q)==-1 && q.front==NULL && q.back==NULL && allocation_count==0);}`,
);
definitions.push(
  exemplar.questions[11].code
    .split("int dequeue")[0]
    .replace(/struct queue/g, "struct arrayQueue"),
  exemplar.questions[11].parts[0].answer.replace(
    /struct queue/g,
    "struct arrayQueue",
  ),
);
checks.push(
  `for(int size=1;size<=16;size++)for(int front=0;front<size;front++)for(int count=0;count<=size;count++){int elements[16];for(int i=0;i<size;i++)elements[i]=100+i;struct arrayQueue q={elements,front,count,size};for(int i=0;i<count;i++){int index=(front+i)%size;assert(dequeue(&q)==100+index);assert(q.front==(index+1)%size && q.noe==count-i-1);for(int j=0;j<size;j++)assert(elements[j]==100+j);}int saved=q.front;assert(dequeue(&q)==-1 && q.front==saved && q.noe==0);}`,
);
i = 0;
for (const q of families.analysis.values()) {
  const id = i++,
    stop = Number(q.code.match(/j == (\d+)/)[1]),
    factor = Number(q.code.match(/i \*= (\d+)/)[1]);
  let source = q.code;
  for (const name of ["f1", "f2", "f3", "match"])
    source = source.replace(new RegExp(`\\b${name}\\b`, "g"), `${name}_${id}`);
  definitions.push(source);
  checks.push(`for(int n=1;n<=30;n++){int a[30],b[30];for(int j=0;j<n;j++){a[j]=j;b[j]=j;}assert(f1_${id}(a,b,n)==n);for(int j=0;j<n;j++)a[j]=b[j]=7;assert(f1_${id}(a,b,n)==n*n);assert(f2_${id}(n)==(n<${stop}?n+1:${stop}));int expected=n*n*(n-1);for(int j=1;j<n;j*=${factor})expected+=j;emit_count=0;f3_${id}(n);assert(emit_count==1 && emitted[0]==expected);}
  for(int m=1;m<=20;m++)for(int n=1;n<=20;n++){int a[20],b[20];for(int j=0;j<n;j++)b[j]=2*j;for(int j=0;j<m;j++)a[j]=2*(j%n);emit_count=searches=0;match_${id}(a,m,b,n);assert(searches==m && emit_count==m);for(int j=0;j<m;j++)assert(emitted[j]==a[j]);a[0]=-1;emit_count=searches=0;match_${id}(a,m,b,n);assert(searches==0 && emit_count==0);}`);
}
const source =
  headers +
  definitions.join("\n\n") +
  "\nint main(void) {\n" +
  checks.join("\n") +
  "\nassert(allocation_count==0);return 0;\n}\n";
const dir = mkdtempSync(join(tmpdir(), "cs-club-exam-"));
try {
  const c = join(dir, "exam.c"),
    binary = join(dir, "exam");
  writeFileSync(c, source);
  const compile = spawnSync(
    process.env.CC || "clang",
    [
      "-std=c11",
      "-Wall",
      "-Wextra",
      "-Werror",
      "-g",
      "-O1",
      "-fsanitize=address,undefined",
      "-fno-sanitize-recover=all",
      "-fno-omit-frame-pointer",
      c,
      "-o",
      binary,
    ],
    { encoding: "utf8", timeout: 90000, maxBuffer: 1024 * 1024 },
  );
  if (compile.status !== 0)
    throw new Error(
      compile.stderr || compile.error?.message || "C compilation failed",
    );
  const run = spawnSync(binary, [], {
    encoding: "utf8",
    timeout: 20000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      // Linux CI can check leaks too; Apple clang/macOS cannot enable LSan.
      ASAN_OPTIONS: `detect_leaks=${process.platform === "linux" ? 1 : 0}:halt_on_error=1`,
      UBSAN_OPTIONS: "halt_on_error=1:print_stacktrace=1",
    },
  });
  if (run.status !== 0)
    throw new Error(
      run.stderr || run.error?.message || "Native exam verification failed",
    );
  console.log(
    JSON.stringify(
      {
        status: "passed",
        sanitizers: ["address", "undefined"],
        compiler: process.env.CC || "clang",
        completeTemplateVariants: targets,
        allocationTracking:
          "all allocations freed; exact sizes checked; realloc failure injected",
        inputDomains: {
          recursion: "all 24 functions, n=0..6",
          backtracking: "all 6 variants, all permutations n=0..6",
          insert: "length=1..20, p=2..length+3",
          pointerTrace: "all 10 variants, each value 2..15, lengths 0..12",
          linkedDequeue: "length=0..64 until empty",
          circularDequeue: "capacity=1..16, every front and count, until empty",
          analysis: "all 12 variants, n=1..30; independent m,n=1..20",
        },
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
