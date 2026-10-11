// Reviewed C templates. These are deliberately independent of the generator.
// A template edit must update its proof, native tests, and this allow-list.
export const reviewedExamC = {
  q1a: "int *scores = calloc({{count}}, sizeof *scores);",
  q1b: 'int *tmp = realloc(scores, {{factor}} * (size_t) N * sizeof *scores);\nif (tmp == NULL) {\n    free(scores);\n    scores = NULL;\n    printf("failed\\n");\n} else {\n    scores = tmp;\n    printf("success\\n");\n}',
  q2: "typedef struct Book {\n    char title[{{titleSize}}];\n    char **authors;\n    float price;\n    int nAuth;\n} Book;\n\nBook *createBook(char *title, char authNames[][{{titleSize}}], float price, int n) {\n    /* Your code */\n}",
  q2a: "Book *createBook(char *title, char authNames[][{{titleSize}}], float price, int n) {\n    Book *book = malloc(sizeof *book);\n    strcpy(book->title, title);\n    book->price = price;\n    book->nAuth = n;\n    book->authors = malloc(n * sizeof *book->authors);\n    for (int i = 0; i < n; i++) {\n        book->authors[i] = malloc(strlen(authNames[i]) + 1);\n        strcpy(book->authors[i], authNames[i]);\n    }\n    return book;\n}",
  q3: "void freeBook(Book *book) {\n    /* Your code */\n}",
  q3a: "void freeBook(Book *book) {\n    for (int i = 0; i < book->nAuth; i++)\n        free(book->authors[i]);\n    free(book->authors);\n    free(book);\n}",
  q4: "int f(int n) {\n    if (n <= 1) return {{base1}};\n    if (n == 2) return {{base2}};\n    return {{multiplier}} * f(n - 1) + f(n - 2) - {{subtract}};\n}",
  q5: "typedef struct node {\n    int data;\n    struct node *next;\n} node;\n\nvoid byeList(node *head) {\n    /* Your code */\n}",
  q5a: "void byeList(node *head) {\n    if (head == NULL) return;\n    byeList(head->next);\n    free(head);\n}",
  q6: "#define SIZE {{size}}\n/* abs is available from <stdlib.h>. */\nint check(int *perm, int n);\nvoid print(int *perm, int n);\nvoid makePerm(int *perm, int *used, int k, int n) {\n    if (k == n) {\n        if (check(perm, n)) print(perm, n);\n        return;\n    }\n    for (int i = 0; i < n; i++) {\n        /* Your loop body */\n    }\n}\nint check(int *perm, int n) {\n    /* Your recursive function */\n}",
  q6a: "if (!used[i]) {\n    perm[k] = i;\n    used[i] = 1;\n    makePerm(perm, used, k + 1, n);\n    used[i] = 0;\n}",
  q6b: "int check(int *perm, int n) {\n    if (n < 2) return 0;\n    if (abs(perm[n - 1] - perm[n - 2]) == {{gap}}) return 1;\n    return check(perm, n - 1);\n}",
  q7: "typedef struct node {\n    int data;\n    struct node *next;\n} node;\n\nint insertAt(node *head, int x, int p) {\n    /* Your code */\n}",
  q7a: "int insertAt(node *head, int x, int p) {\n    int oldCount = 0;\n    for (node *cur = head; cur != NULL; cur = cur->next)\n        oldCount++;\n    node *prev = head;\n    int pos = 1;\n    while (pos < p - 1 && prev->next != NULL) {\n        prev = prev->next;\n        pos++;\n    }\n    node *added = malloc(sizeof *added);\n    added->data = x;\n    added->next = prev->next;\n    prev->next = added;\n    return oldCount + 1;\n}",
  q8: "void mystery(node *cur) {\n    while (cur != NULL) {\n        if (cur->data % 2 == {{parity}}) {\n            node *added = malloc(sizeof *added);\n            added->data = cur->data + {{increment}};\n            added->next = cur->next;\n            cur->next = added;\n            cur = added;\n        }\n        cur = cur->next;\n    }\n}",
  q10: "int deQueue(struct queue *qPtr) {\n    if (isEmpty(qPtr)) return -1;\n    int value = qPtr->front->data;\n    struct node *old = qPtr->front;\n    qPtr->front = old->next;\n    free(old);\n    if (isEmpty(qPtr)) qPtr->back = NULL;\n    return value;\n}",
  q12: "struct queue {\n    int *elements;\n    int front;\n    int noe;\n    int queueSize;\n};\nint dequeue(struct queue *qPtr) {\n    /* Your code */\n}",
  q12a: "int dequeue(struct queue *qPtr) {\n    if (qPtr->noe == 0) return -1;\n    int value = qPtr->elements[qPtr->front];\n    qPtr->front = (qPtr->front + 1) % qPtr->queueSize;\n    qPtr->noe--;\n    return value;\n}",
  q14: 'int f1(int A[], int B[], int n) {\n    int sum = 0;\n    for (int i = 0; i < n; i++)\n        for (int j = 0; j < n; j++)\n            if (A[i] == B[j]) sum++;\n    return sum;\n}\nint f2(int m) {\n    int j = 0;\n    for (int i = 1; i <= m; i++) {\n        for (j = 1; j <= m; j++)\n            if (j == {{breakAt}}) break;\n    }\n    return j;\n}\nvoid f3(int n) {\n    int sum = 0, i = 1;\n    while (i < n) { sum += i; i *= {{logFactor}}; }\n    for (int j = 0; j < n; j++)\n        for (int k = 0; k < n; k++) sum += j + k;\n    printf("%d", sum);\n}\nvoid match(int a[], int m, int b[], int n) {\n    for (int i = 0; i < m; i++) {\n        if (a[i] == -1) break;\n        if (binSearch(a[i], b, n) == 1)\n            printf("%d ", a[i]);\n    }\n}',
};

export const reviewedExamFields = [
  [
    {
      kind: "code",
      format: null,
      auto: false,
    },
    {
      kind: "code",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "code",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "code",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "number",
      format: null,
      auto: true,
    },
    {
      kind: "text",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "code",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "code",
      format: null,
      auto: false,
    },
    {
      kind: "code",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "code",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "text",
      format: "sequence",
      auto: true,
    },
  ],
  [
    {
      kind: "stack",
      format: null,
      auto: true,
    },
    {
      kind: "stack",
      format: null,
      auto: true,
    },
    {
      kind: "stack",
      format: null,
      auto: true,
    },
    {
      kind: "postfix",
      format: null,
      auto: true,
    },
  ],
  [
    {
      kind: "text",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "text",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "code",
      format: null,
      auto: false,
    },
    {
      kind: "number",
      format: null,
      auto: true,
    },
    {
      kind: "number",
      format: null,
      auto: true,
    },
  ],
  [
    {
      kind: "number",
      format: null,
      auto: true,
    },
    {
      kind: "text",
      format: null,
      auto: false,
    },
  ],
  [
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
  ],
  [
    {
      kind: "choice",
      format: null,
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
  ],
  [
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "text",
      format: "bigO",
      auto: true,
    },
    {
      kind: "number",
      format: null,
      auto: true,
    },
  ],
];
