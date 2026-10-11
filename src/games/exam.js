import { seeded, integer, pick } from "../engine/random.js";
import { convert } from "./postfix.js";
import { assertValidExam } from "../engine/examValidation.js";

export const examSections = [
  { id: "A", title: "Dynamic Memory Allocation", points: 20 },
  { id: "B", title: "Recursion", points: 20 },
  { id: "C", title: "Linked Lists", points: 18 },
  { id: "D", title: "Stacks and Queues", points: 20 },
  { id: "E", title: "Algorithm Analysis", points: 22 },
];

// These are full written-exam tasks, not a collection of quick practice rounds.
// C solutions are model answers: equivalent correct C earns the same credit.
export function generateExam(seed = Date.now()) {
  const rng = seeded(seed);
  const questions = [];
  function question(section, title, prompt, parts, extra = {}) {
    const id = `q${questions.length + 1}`;
    questions.push({
      id,
      section,
      label: String(questions.length + 1),
      title,
      prompt,
      points: parts.reduce((sum, part) => sum + part.points, 0),
      ...extra,
      parts: parts.map((part, index) => ({
        id: `${id}${String.fromCharCode(97 + index)}`,
        auto: false,
        ...part,
      })),
    });
  }
  const count = pick(rng, [250, 320, 400, 500, 640, 750]);
  const factor = integer(rng, 2, 3);
  const titleSize = pick(rng, [40, 50, 60]);
  const bookStruct = `typedef struct Book {
    char title[${titleSize}];
    char **authors;
    float price;
    int nAuth;
} Book;`;
  question(
    "A",
    "Allocate and resize",
    "Write C code for each task. Assume N is positive and the requested sizes fit in size_t.",
    [
      {
        prompt: `Allocate an int array named scores with ${count} elements, all initially zero.`,
        points: 2,
        kind: "code",
        answer: `int *scores = calloc(${count}, sizeof *scores);`,
        explanation:
          "calloc allocates the array and zeroes its bytes. sizeof *scores gives the size of one int.",
        rubric: [
          "1 point: allocate count × sizeof(int) bytes and assign the returned pointer.",
          "1 point: initialize every element to zero, using calloc or an equivalent initialization loop.",
        ],
      },
      {
        prompt: `scores already points to an allocated int array of length N. Resize it to ${factor} * N elements. If realloc fails, free the original array, set scores to NULL, and print "failed". On success, update scores and print "success".`,
        points: 2,
        kind: "code",
        answer: `int *tmp = realloc(scores, ${factor} * (size_t) N * sizeof *scores);
if (tmp == NULL) {
    free(scores);
    scores = NULL;
    printf("failed\\n");
} else {
    scores = tmp;
    printf("success\\n");
}`,
        explanation:
          "Multiplying in size_t avoids an intermediate int overflow. A temporary pointer keeps the old allocation reachable if realloc fails. This question explicitly asks you to free it on failure.",
        rubric: [
          "1 point: use a temporary realloc result; on success assign it to scores and print success.",
          "1 point: on failure free the original scores, assign NULL, and print failed.",
        ],
      },
    ],
  );
  question(
    "A",
    "Create a book",
    `Complete createBook. Allocate one Book, copy the title and price, and make an independent copy of every author name using exactly strlen(name) + 1 bytes. Store n in nAuth. Assume allocations succeed, allocation sizes fit in size_t, n > 0, and every input string fits its declared array.`,
    [
      {
        prompt: "Write the complete function body.",
        points: 12,
        kind: "code",
        answer: `Book *createBook(char *title, char authNames[][${titleSize}], float price, int n) {
    Book *book = malloc(sizeof *book);
    strcpy(book->title, title);
    book->price = price;
    book->nAuth = n;
    book->authors = malloc(n * sizeof *book->authors);
    for (int i = 0; i < n; i++) {
        book->authors[i] = malloc(strlen(authNames[i]) + 1);
        strcpy(book->authors[i], authNames[i]);
    }
    return book;
}`,
        explanation:
          "The Book owns an array of author pointers and one allocation per author string. The fixed title array is already inside the Book.",
        rubric: [
          "2 points: allocate exactly one Book.",
          "2 points: copy title and assign price and nAuth.",
          "2 points: allocate an array of n char pointers.",
          "3 points: allocate strlen(authNames[i]) + 1 bytes for each author.",
          "2 points: copy each author string into its own allocation.",
          "1 point: return the allocated Book.",
        ],
      },
    ],
    {
      code: `${bookStruct}\n\nBook *createBook(char *title, char authNames[][${titleSize}], float price, int n) {
    /* Your code */
}`,
    },
  );
  question(
    "A",
    "Free the book",
    "Free all memory owned by the Book from Question 2. Assume book points to a valid Book created successfully.",
    [
      {
        prompt: "Complete freeBook without leaking memory.",
        points: 4,
        kind: "code",
        answer: `void freeBook(Book *book) {
    for (int i = 0; i < book->nAuth; i++)
        free(book->authors[i]);
    free(book->authors);
    free(book);
}`,
        explanation:
          "Free the author strings first, then their pointer array, then the Book. Freeing the owner first loses access to its allocations.",
        rubric: [
          "2 points: free every individual author string.",
          "1 point: free the authors pointer array after its strings.",
          "1 point: free book last, without reading freed memory.",
        ],
      },
    ],
    { code: "void freeBook(Book *book) {\n    /* Your code */\n}" },
  );

  const base1 = integer(rng, 1, 2),
    base2 = integer(rng, 3, 5);
  const multiplier = integer(rng, 2, 3),
    subtract = integer(rng, 1, 2),
    argument = integer(rng, 4, 6);
  const results = [base1, base1, base2];
  for (let n = 3; n <= argument; n++)
    results[n] = multiplier * results[n - 1] + results[n - 2] - subtract;
  const recurrenceSteps = results
    .slice(3)
    .map((value, index) => {
      const n = index + 3;
      return `f(${n}) = ${multiplier} * ${results[n - 1]} + ${results[n - 2]} - ${subtract} = ${value}`;
    })
    .join("\n");
  question(
    "B",
    "Trace the recursion",
    "Show the recursive calls or a table of return values, including the base cases.",
    [
      {
        prompt: `What does f(${argument}) return?`,
        points: 3,
        kind: "number",
        auto: true,
        answer: String(results[argument]),
        explanation: `Use both previous return values in each step. ${recurrenceSteps.split("\n").at(-1)}.`,
      },
      {
        prompt: "Show your recursive steps.",
        points: 4,
        kind: "text",
        answer: `f(0) = f(1) = ${base1}; f(2) = ${base2}\n${recurrenceSteps}`,
        explanation:
          "Calls return numbers to their caller. Substitute those returned values upward until you reach the requested call.",
        rubric: [
          "1 point: identify both base cases correctly.",
          "2 points: show the recursive dependencies and intermediate return values.",
          "1 point: apply the multiply, add, and subtract operations in the correct order.",
        ],
      },
    ],
    {
      code: `int f(int n) {
    if (n <= 1) return ${base1};
    if (n == 2) return ${base2};
    return ${multiplier} * f(n - 1) + f(n - 2) - ${subtract};
}`,
    },
  );
  const nodeStruct =
    "typedef struct node {\n    int data;\n    struct node *next;\n} node;";
  question(
    "B",
    "Recursive cleanup",
    "Write a recursive function that frees every node of a finite, acyclic singly linked list. It must also handle an empty list safely.",
    [
      {
        prompt: "Complete byeList using recursion.",
        points: 6,
        kind: "code",
        answer: `void byeList(node *head) {
    if (head == NULL) return;
    byeList(head->next);
    free(head);
}`,
        explanation:
          "Stop at NULL. This solution frees the remaining list before the current node, so head->next is never read after head is freed.",
        rubric: [
          "2 points: stop safely at head == NULL.",
          "2 points: recursively visit the remaining list.",
          "2 points: free each node exactly once without accessing freed memory. Saving next before free and recursing on the saved pointer is also correct.",
        ],
      },
    ],
    {
      code: `${nodeStruct}\n\nvoid byeList(node *head) {\n    /* Your code */\n}`,
    },
  );
  const size = integer(rng, 4, 6),
    gap = integer(rng, 1, 2);
  question(
    "B",
    "Permutations and backtracking",
    `Print each permutation of 0 through ${size - 1} exactly once if at least one adjacent pair has absolute difference ${gap}. used starts filled with zeroes. Complete the loop and write check recursively. Assume print is provided.`,
    [
      {
        prompt: "Write the body of the for loop in makePerm.",
        points: 4,
        kind: "code",
        answer: `if (!used[i]) {
    perm[k] = i;
    used[i] = 1;
    makePerm(perm, used, k + 1, n);
    used[i] = 0;
}`,
        explanation:
          "Mark the chosen value, recurse to fill the next position, then unmark it so the next branch can reuse it.",
        rubric: [
          "1 point: choose only an unused value and store it at perm[k].",
          "1 point: mark it used before recursion.",
          "1 point: recurse with k + 1.",
          "1 point: reset used[i] after the recursive call (backtracking).",
        ],
      },
      {
        prompt: `Write int check(int *perm, int n) recursively. Return 1 if any adjacent pair differs by ${gap}; otherwise return 0.`,
        points: 3,
        kind: "code",
        answer: `int check(int *perm, int n) {
    if (n < 2) return 0;
    if (abs(perm[n - 1] - perm[n - 2]) == ${gap}) return 1;
    return check(perm, n - 1);
}`,
        explanation:
          "Check one adjacent pair, then recurse on the shorter prefix. Fewer than two values cannot form a pair.",
        rubric: [
          "1 point: safe base case when fewer than two values remain.",
          `1 point: accept either sign by testing absolute difference ${gap}.`,
          "1 point: recursively examine all remaining adjacent pairs. A correct loop-only solution earns at most 2/3.",
        ],
      },
    ],
    {
      code: `#define SIZE ${size}
/* abs is available from <stdlib.h>. */
int check(int *perm, int n);
void print(int *perm, int n);
void makePerm(int *perm, int *used, int k, int n) {
    if (k == n) {
        if (check(perm, n)) print(perm, n);
        return;
    }
    for (int i = 0; i < n; i++) {
        /* Your loop body */
    }
}
int check(int *perm, int n) {
    /* Your recursive function */
}`,
    },
  );

  const list = Array.from({ length: 5 }, () => integer(rng, 1, 25));
  const position = integer(rng, 2, 7),
    inserted = integer(rng, 26, 40);
  question(
    "C",
    "Insert at a position",
    `Write insertAt for a nonempty singly linked list. Positions start at 1; p > 1. Insert x at position p, or append if p is beyond the end. Return the total number of nodes after insertion. Assume malloc succeeds and the new node count fits in int. For the example below use x = ${inserted}, p = ${position}. Your function must work for any valid x and p.`,
    [
      {
        prompt: "Write the complete function.",
        points: 10,
        kind: "code",
        answer: `int insertAt(node *head, int x, int p) {
    int oldCount = 0;
    for (node *cur = head; cur != NULL; cur = cur->next)
        oldCount++;
    node *prev = head;
    int pos = 1;
    while (pos < p - 1 && prev->next != NULL) {
        prev = prev->next;
        pos++;
    }
    node *added = malloc(sizeof *added);
    added->data = x;
    added->next = prev->next;
    prev->next = added;
    return oldCount + 1;
}`,
        explanation:
          "Stop at the node before the requested position, or at the tail. Link the new node to the old successor before changing the predecessor's next pointer.",
        rubric: [
          "2 points: allocate and initialize the new node.",
          "3 points: find position p - 1 or the tail without dereferencing NULL.",
          "3 points: connect both next pointers without losing the rest of the list.",
          "2 points: return the new total node count, including nodes after the insertion.",
        ],
      },
    ],
    {
      code: `${nodeStruct}\n\nint insertAt(node *head, int x, int p) {\n    /* Your code */\n}`,
      diagram: { type: "list", values: list },
    },
  );
  const traced = Array.from(
    { length: 6 },
    (_, index) => integer(rng, 1, 7) * 2 + (index % 2),
  );
  const increment = integer(rng, 3, 7),
    parity = pick(rng, [0, 1]);
  const tracedAnswer = traced.flatMap((value) =>
    value % 2 === parity ? [value, value + increment] : [value],
  );
  question(
    "C",
    "Follow the pointers",
    "Show the final list after mystery finishes. Use arrows, commas, or spaces between values. Assume every allocation succeeds.",
    [
      {
        prompt: "Final list, from head to tail:",
        points: 8,
        kind: "text",
        format: "sequence",
        auto: true,
        answer: tracedAnswer.join(" → "),
        explanation: `Each original ${parity ? "odd" : "even"} node gets a new node holding its value + ${increment}. Setting cur = added skips the new node before the next iteration.`,
      },
    ],
    {
      diagram: { type: "list", values: traced },
      code: `void mystery(node *cur) {
    while (cur != NULL) {
        if (cur->data % 2 == ${parity}) {
            node *added = malloc(sizeof *added);
            added->data = cur->data + ${increment};
            added->next = cur->next;
            cur->next = added;
            cur = added;
        }
        cur = cur->next;
    }
}`,
    },
  );

  // The structure matches the reference's long expression; numerical operands
  // and checkpoint positions vary. A marker is between tokens, never an operand.
  const v = Array.from({ length: 12 }, () => String(integer(rng, 1, 9)));
  const tokens =
    `${v[0]} * ( ${v[1]} - ${v[2]} ) / ( ${v[3]} + ${v[4]} ) + ${v[5]} * ${v[6]} - ${v[7]} / ( ${v[8]} * ( ${v[9]} - ${v[10]} ) ) + ${v[11]}`.split(
      " ",
    );
  const solution = convert(tokens);
  const checkpoints = [
    { label: "A", stop: pick(rng, [9, 10, 11]) },
    { label: "B", stop: pick(rng, [20, 21, 22]) },
    { label: "C", stop: pick(rng, [26, 27, 28]) },
  ];
  question(
    "D",
    "Infix to postfix",
    "Convert the expression to postfix using an operator stack. At A, B, and C, stop after the token immediately before the marker. Show each stack from top to bottom. Spaces between symbols are optional.",
    [
      ...checkpoints.map(({ label, stop }) => ({
        prompt: `Stack at ${label}, top → bottom (write empty if needed):`,
        points: 1,
        kind: "stack",
        auto: true,
        answer:
          [...solution.states[stop + 1].stack].reverse().join(" ") || "empty",
        explanation: `Process through token ${stop + 1} (${tokens[stop]}), then stop before ${tokens[stop + 1]}. Operands go straight to postfix; equal or higher-precedence operators are popped before a new operator is pushed.`,
      })),
      {
        prompt: "Final postfix expression:",
        points: 5,
        kind: "postfix",
        auto: true,
        answer: solution.postfix.join(" "),
        explanation:
          "Preserve operand order. Place each operator after its operands, discard parentheses, and pop the remaining stack from top to bottom at the end.",
      },
    ],
    { diagram: { type: "postfix", tokens, checkpoints } },
  );
  question(
    "D",
    "The last dequeue",
    "A linked queue stores front and back pointers. Explain the second isEmpty check in this function in one to three sentences.",
    [
      {
        prompt:
          "What initial queue size makes the second check true, and why must back be changed?",
        points: 4,
        kind: "text",
        answer:
          "The queue initially contains exactly one node. Removing it makes front NULL, so back must also become NULL; otherwise back points to freed memory and the empty-queue representation is inconsistent.",
        explanation:
          "A one-node queue loses both its first and last node in the same dequeue.",
        rubric: [
          "2 points: identify an initial size of exactly one.",
          "2 points: explain that back would otherwise point to the freed final node; empty queues need front and back both NULL.",
        ],
      },
    ],
    {
      code: `int deQueue(struct queue *qPtr) {
    if (isEmpty(qPtr)) return -1;
    int value = qPtr->front->data;
    struct node *old = qPtr->front;
    qPtr->front = old->next;
    free(old);
    if (isEmpty(qPtr)) qPtr->back = NULL;
    return value;
}`,
    },
  );
  question(
    "D",
    "A queue without a back pointer",
    "A singly linked queue stores only a front pointer. It removes at the front and inserts at the end.",
    [
      {
        prompt:
          "Which operation is inefficient, what is its runtime for n items, and how does storing a back pointer help?",
        points: 3,
        kind: "text",
        answer:
          "Enqueue is O(n) because it must follow next pointers to find the last node. A back pointer permits O(1) insertion. Dequeue at the front is already O(1).",
        explanation:
          "Knowing the front does not tell you where the tail is; finding it requires traversing the list.",
        rubric: [
          "1 point: identify enqueue (insertion at the end).",
          "1 point: explain the O(n) traversal.",
          "1 point: a maintained back pointer makes enqueue O(1); dequeue remains O(1).",
        ],
      },
    ],
  );
  const capacity = integer(rng, 5, 8),
    front = capacity - 1,
    queueCount = integer(rng, 2, capacity - 1);
  const cells = Array(capacity).fill(null);
  for (let i = 0; i < queueCount; i++)
    cells[(front + i) % capacity] = integer(rng, 10, 70);
  question(
    "D",
    "Circular-array dequeue",
    "The queue below is the initial state. Write a general dequeue function: return -1 if empty; otherwise return the removed value and update front and noe. Do not shift the elements. noe is the number of stored items; queueSize is capacity. Array indices start at 0.",
    [
      {
        prompt: "Complete dequeue for any valid queue.",
        points: 3,
        kind: "code",
        answer: `int dequeue(struct queue *qPtr) {
    if (qPtr->noe == 0) return -1;
    int value = qPtr->elements[qPtr->front];
    qPtr->front = (qPtr->front + 1) % qPtr->queueSize;
    qPtr->noe--;
    return value;
}`,
        explanation:
          "Save the old front's value, advance front with modulo capacity, and decrease the item count. The array does not move.",
        rubric: [
          "1 point: detect an empty queue and return -1; otherwise save the front value.",
          "1 point: update front using (front + 1) % queueSize.",
          "1 point: decrease noe and return the saved value.",
        ],
      },
      {
        prompt: "For the shown queue, what value does one dequeue return?",
        points: 1,
        kind: "number",
        auto: true,
        answer: String(cells[front]),
        explanation: `The value at front index ${front} is removed first.`,
      },
      {
        prompt: "After that dequeue, what is the new front index?",
        points: 1,
        kind: "number",
        auto: true,
        answer: "0",
        explanation: `(${front} + 1) % ${capacity} = 0: the index wraps around to the beginning.`,
      },
    ],
    {
      code: `struct queue {
    int *elements;
    int front;
    int noe;
    int queueSize;
};
int dequeue(struct queue *qPtr) {
    /* Your code */
}`,
      diagram: {
        type: "queue",
        capacity,
        cells,
        front,
        showRear: false,
        count: queueCount,
        operations: ["dequeue(qPtr)"],
      },
    },
  );

  const exponentialBase = pick(rng, [2, 3, 4]),
    startN = integer(rng, 7, 12),
    delta = integer(rng, 2, 3);
  const milliseconds = pick(rng, [100, 125, 200, 250]);
  const seconds = (milliseconds * exponentialBase ** delta) / 1000;
  question(
    "E",
    "Predict the runtime",
    `Assume runtime is proportional to ${exponentialBase}ⁿ. At n = ${startN}, it takes ${milliseconds} milliseconds. How long should it take at n = ${startN + delta}? Give your answer in seconds. (1 second = 1000 milliseconds.)`,
    [
      {
        prompt: "Expected time in seconds:",
        unit: "seconds",
        points: 2,
        kind: "number",
        auto: true,
        answer: String(seconds),
        explanation: `Increasing n by ${delta} multiplies runtime by ${exponentialBase}^${delta} = ${exponentialBase ** delta}; ${milliseconds} × ${exponentialBase ** delta} ÷ 1000 = ${seconds} seconds.`,
      },
      {
        prompt: "Show the scaling calculation.",
        points: 2,
        kind: "text",
        answer: `${milliseconds} * ${exponentialBase}^(${startN + delta} - ${startN}) / 1000 = ${seconds} seconds`,
        explanation:
          "Use the ratio of the exponential terms, then convert milliseconds to seconds.",
        rubric: [
          "1 point: multiply the original time by base raised to the increase in n.",
          "1 point: divide milliseconds by 1000 to obtain seconds.",
        ],
      },
    ],
  );
  const breakAt = integer(rng, 2, 5),
    logFactor = integer(rng, 2, 4);
  question(
    "E",
    "Analyze four functions",
    "Give the tightest worst-case Big-O bound for each function. Assume m >= 1, n >= 2, no arithmetic overflow, and O(1) array access, arithmetic, and printing one integer. binSearch searches a sorted array of length n in O(log n). m and n can vary independently.",
    [
      {
        prompt: "f1 runtime:",
        points: 2,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(n^2)",
        explanation:
          "The inner loop runs n times for each of n outer iterations: n × n = n².",
      },
      {
        prompt: "f2 runtime:",
        points: 2,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(m)",
        explanation: `The inner loop stops after at most ${breakAt} iterations, a constant. The outer loop still runs m times.`,
      },
      {
        prompt: "f3 runtime:",
        points: 2,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(n^2)",
        explanation:
          "The logarithmic loop and quadratic loops run sequentially, so add their work: log n + n² is O(n²).",
      },
      {
        prompt: "match runtime:",
        points: 2,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(m log n)",
        explanation:
          "In the worst case there is no early break: m iterations each perform a binary search over n elements.",
      },
    ],
    {
      code: `int f1(int A[], int B[], int n) {
    int sum = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (A[i] == B[j]) sum++;
    return sum;
}
int f2(int m) {
    int j = 0;
    for (int i = 1; i <= m; i++) {
        for (j = 1; j <= m; j++)
            if (j == ${breakAt}) break;
    }
    return j;
}
void f3(int n) {
    int sum = 0, i = 1;
    while (i < n) { sum += i; i *= ${logFactor}; }
    for (int j = 0; j < n; j++)
        for (int k = 0; k < n; k++) sum += j + k;
    printf("%d", sum);
}
void match(int a[], int m, int b[], int n) {
    for (int i = 0; i < m; i++) {
        if (a[i] == -1) break;
        if (binSearch(a[i], b, n) == 1)
            printf("%d ", a[i]);
    }
}`,
    },
  );
  const comparison = pick(rng, ["less", "greater"]);
  question(
    "E",
    "Search and data structures",
    "Use Big-O for the runtimes. A singly linked list here has no tail pointer. Stack push does not reallocate.",
    [
      {
        prompt: `In binary search, searchKey is ${comparison} than A[mid]. Which update is correct?`,
        points: 1,
        kind: "choice",
        auto: true,
        answer: comparison === "less" ? "high = mid - 1" : "low = mid + 1",
        options: [
          "high = mid - 1",
          "high = mid + 1",
          "low = mid + 1",
          "low = mid - 1",
        ],
        explanation:
          comparison === "less"
            ? "Discard mid and everything to its right; the key could only be to the left."
            : "Discard mid and everything to its left; the key could only be to the right.",
      },
      {
        prompt:
          "Read the largest element of an ascending sorted array of n items: worst case?",
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(1)",
        explanation:
          "The largest item is at index n - 1, so a single indexed access finds it.",
      },
      {
        prompt: "Linear search over n items: best case?",
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(1)",
        explanation:
          "The first element can match, requiring only one comparison.",
      },
      {
        prompt: "Linear search over n items: worst case?",
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(n)",
        explanation:
          "A missing key or a match at the end requires examining all n items.",
      },
      {
        prompt:
          "Append to a singly linked list of n items without a tail pointer: worst case?",
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(n)",
        explanation:
          "Traverse from the head to find the tail before inserting.",
      },
      {
        prompt:
          "Push onto a stack of n items without reallocation: worst case?",
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(1)",
        explanation:
          "Only the top entry or pointer changes; the existing items are not traversed.",
      },
    ],
  );
  const disks = integer(rng, 4, 8),
    coefficient = integer(rng, 2, 9),
    linear = integer(rng, 100, 900);
  question(
    "E",
    "Growth and recursion basics",
    "Answer each short question. For factorial, assume each multiplication takes constant time.",
    [
      {
        prompt: `Tightest Big-O for ${coefficient}n² + ${linear}n log n + 12:`,
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(n^2)",
        explanation:
          "n² eventually dominates n log n; constants and lower-order terms do not change the bound.",
      },
      {
        prompt: "Print every element in a stack containing n items: runtime?",
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(n)",
        explanation: "Every one of the n items must be visited and printed.",
      },
      {
        prompt:
          "Compute n! with a function that calls itself once on n - 1: runtime?",
        points: 1,
        kind: "text",
        format: "bigO",
        auto: true,
        answer: "O(n)",
        explanation:
          "The argument decreases by one per call, producing n constant-work calls.",
      },
      {
        prompt: `Minimum moves for the three-peg Tower of Hanoi with ${disks} disks:`,
        points: 1,
        kind: "number",
        auto: true,
        answer: String(2 ** disks - 1),
        explanation: `The recurrence is T(n) = 2T(n - 1) + 1, so ${disks} disks require 2^${disks} - 1 = ${2 ** disks - 1} moves.`,
      },
    ],
  );
  return assertValidExam({
    id: `exam-${seed}`,
    seed,
    title: "THE EXAM",
    durationMinutes: 120,
    totalPoints: 100,
    sections: examSections.map((section) => ({ ...section })),
    questions,
  });
}
