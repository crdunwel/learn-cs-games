// Authored, bounded C-writing problems. Tests compile the actual canonical
// statements; the app compares supported spellings without executing input.
const includes = "#include <stdlib.h>\n#include <string.h>\n#include <stdio.h>";
const node = `${includes}\ntypedef struct node { int data; struct node *next; } node;`;
const book = `${includes}\ntypedef struct Book {\n    char title[50];\n    char **authors;\n    float price;\n    int nAuth;\n} Book;`;
const arrayStack = `${includes}\ntypedef struct { int items[8]; int top; } Stack;\n/* top is the number of stored items; empty top = 0. */`;
const circular = `${includes}\ntypedef struct queue {\n    int *elements;\n    int front, noe, queueSize;\n} queue;\n/* front = first item; noe = count; queueSize = capacity. */`;
const linkedQueue = `${node}\ntypedef struct queue { node *front, *rear; } queue;`;
const line = (code, hint, why, accept = []) => ({
  code,
  hint,
  why,
  ...(accept.length ? { accept } : {}),
});
const close = (code = "}") => ({
  code,
  hint: "End this block.",
  why: "The braces keep this block's actions together.",
  fixed: true,
});
// The solution is readable when shown raw or printed, while grading may ignore
// this indentation. Braces change the visual depth, never the teaching steps.
const indent = (lines) => {
  let depth = 1;
  return lines.map((step) => {
    if (step.code.startsWith("}")) depth--;
    const indented = { ...step, code: "    ".repeat(depth) + step.code };
    if (step.code.endsWith("{")) depth++;
    return indented;
  });
};
const exercise = (
  id,
  topic,
  title,
  prompt,
  assumptions,
  setup,
  signature,
  lines,
  example,
  rubric,
) => ({
  id,
  topic,
  title,
  prompt,
  assumptions,
  setup,
  signature,
  lines: indent(lines),
  example,
  rubric,
});

export const structureExercises = [
  exercise(
    "memory-zero-array",
    "memory",
    "Start every score at zero",
    "Allocate an array of n integers, all initially zero. Return its pointer, or NULL if allocation fails.",
    "1 ≤ n ≤ 1000. The caller owns and frees the returned array.",
    includes,
    "int *zeroScores(size_t n) {",
    [
      line(
        "int *scores = calloc(n, sizeof *scores);",
        "Create a pointer named scores and allocate n zeroed integers.",
        "calloc reserves n elements and sets all their bytes to zero.",
        ["int *scores = calloc(n, sizeof(int));"],
      ),
      line(
        "return scores;",
        "Return the allocated pointer (which is already NULL on failure).",
        "The caller receives ownership of the allocation; no extra copy is needed.",
      ),
    ],
    "n = 3 → [0, 0, 0]",
    [
      "Allocate n integers with calloc.",
      "Return the pointer, including NULL on failure.",
    ],
  ),

  exercise(
    "memory-copy-array",
    "memory",
    "Own a separate array",
    "Return a newly allocated copy of the n integers in source. Return NULL on allocation failure.",
    "1 ≤ n ≤ 1000. source points to n valid integers. The caller frees the result.",
    includes,
    "int *copyArray(const int *source, size_t n) {",
    [
      line(
        "int *copy = malloc(n * sizeof *copy);",
        "Allocate n integers and name the pointer copy.",
        "An independent allocation lets the copy change without modifying source.",
        ["int *copy = malloc(n * sizeof(int));"],
      ),
      line(
        "if (copy == NULL) return NULL;",
        "Return immediately if the allocation failed.",
        "Writing through a NULL pointer would be invalid.",
      ),
      line(
        "for (size_t i = 0; i < n; i++) {",
        "Visit every source index, naming the index i.",
        "The valid indices run from 0 through n − 1.",
      ),
      line(
        "copy[i] = source[i];",
        "Copy the current integer into its matching destination slot.",
        "malloc does not initialize the integers; each value must be copied.",
      ),
      close(),
      line(
        "return copy;",
        "Return the new array.",
        "The copied array remains allocated after this function returns.",
      ),
    ],
    "[4, 7, 2] → a separate [4, 7, 2]",
    [
      "Allocate enough bytes.",
      "Check failure before writing.",
      "Copy exactly n elements.",
    ],
  ),

  exercise(
    "memory-copy-string",
    "memory",
    "Copy the terminator too",
    "Return an independently allocated copy of text using exactly enough bytes. If text is NULL or allocation fails, return NULL.",
    "A non-NULL text is a valid terminated string of at most 1000 characters. The caller frees the result.",
    includes,
    "char *copyText(const char *text) {",
    [
      line(
        "if (text == NULL) return NULL;",
        "Handle a missing source before measuring its length.",
        "strlen requires a valid string pointer.",
      ),
      line(
        "char *copy = malloc(strlen(text) + 1);",
        "Allocate a character pointer named copy with room for the text and its terminator.",
        "strlen excludes the final '\\0', which needs one more byte.",
      ),
      line(
        "if (copy == NULL) return NULL;",
        "Handle allocation failure before copying.",
        "strcpy must receive a valid destination.",
      ),
      line(
        "strcpy(copy, text);",
        "Copy the complete string into copy.",
        "strcpy includes the terminating null character.",
      ),
      line(
        "return copy;",
        "Return the new string's address.",
        "The caller now owns the independent string.",
      ),
    ],
    '"CS" → 3 allocated bytes: C, S, \\0',
    [
      "Include the terminator in the allocation.",
      "Check NULL before dereferencing.",
      "Return an independent copy.",
    ],
  ),

  exercise(
    "memory-realloc-preserve",
    "memory",
    "Resize without losing the original",
    "Resize *values to n integers. On failure leave *values unchanged and return 0. On success update *values and return 1.",
    "values is not NULL; *values is either NULL or a pointer returned by malloc/calloc/realloc. 1 ≤ n ≤ 1000.",
    includes,
    "int resizeKeep(int **values, size_t n) {",
    [
      line(
        "int *tmp = realloc(*values, n * sizeof **values);",
        "Request the new allocation through a temporary pointer named tmp.",
        "A failed realloc returns NULL while the old allocation still exists.",
        ["int *tmp = realloc(*values, n * sizeof(int));"],
      ),
      line(
        "if (tmp == NULL) return 0;",
        "Report failure without changing the caller's pointer.",
        "The caller can still use and free the original allocation.",
      ),
      line(
        "*values = tmp;",
        "Store the successful pointer in the caller's variable.",
        "realloc may move the allocation, so the old address may no longer be valid.",
      ),
      line(
        "return 1;",
        "Report success.",
        "The caller now knows that the resize completed.",
      ),
    ],
    "Failure → original pointer and values survive.",
    [
      "Keep realloc's result separate until checked.",
      "Preserve the old pointer on failure.",
      "Update the caller on success.",
    ],
  ),

  exercise(
    "memory-realloc-discard",
    "memory",
    "The exam's failure policy",
    'Double an array of n integers. On failure free the original array, set *scores to NULL, print "failed", and return 0. On success update *scores, print "success", and return 1.',
    "scores points to a valid allocated array pointer. 1 ≤ n ≤ 500. This problem deliberately discards the old array on failure.",
    includes,
    "int doubleScores(int **scores, size_t n) {",
    [
      line(
        "int *tmp = realloc(*scores, 2 * n * sizeof **scores);",
        "Attempt the larger allocation into a temporary pointer named tmp.",
        "Keeping the original address allows it to be freed if realloc fails.",
        ["int *tmp = realloc(*scores, 2 * n * sizeof(int));"],
      ),
      line(
        "if (tmp == NULL) {",
        "Start the allocation-failure branch.",
        "NULL means realloc did not release the original array.",
      ),
      line(
        "free(*scores);",
        "Release the original array.",
        "This question's failure policy explicitly discards the old data.",
      ),
      line(
        "*scores = NULL;",
        "Clear the caller's pointer.",
        "It must not keep pointing at freed memory.",
      ),
      line(
        'printf("failed\\n");',
        "Print the failure message.",
        "The caller sees which branch ran.",
        ['printf("failed");', 'puts("failed");'],
      ),
      line(
        "return 0;",
        "Report failure.",
        "Returning here prevents using the failed allocation.",
      ),
      close(),
      line(
        "*scores = tmp;",
        "Replace the caller's pointer with the successful result.",
        "The resized array may live at a new address.",
      ),
      line(
        'printf("success\\n");',
        "Print the success message.",
        "This message runs only after a successful resize.",
        ['printf("success");', 'puts("success");'],
      ),
      line(
        "return 1;",
        "Report success.",
        "The caller may now use twice as many elements.",
      ),
    ],
    "Failure → old memory freed, *scores = NULL.",
    [
      "Use a temporary for realloc.",
      "Free and clear the original on failure.",
      "Report the correct branch.",
    ],
  ),

  exercise(
    "memory-create-book",
    "memory",
    "One book, several owned strings",
    "Create one Book with the given title, price, and n author names. Deep-copy each author into exactly enough space. Return the Book pointer.",
    "0 ≤ n ≤ 10; title and every name are terminated strings shorter than 50 characters. All allocations succeed. Use NULL for authors when n is 0.",
    book,
    "Book *createBook(const char *title, char authNames[][50], float price, int n) {",
    [
      line(
        "Book *book = malloc(sizeof *book);",
        "Allocate one Book and name its pointer book.",
        "The struct must survive after this function returns.",
        ["Book *book = malloc(sizeof(Book));"],
      ),
      line(
        "strcpy(book->title, title);",
        "Copy the title into the struct's fixed character array.",
        "The title array is already inside Book; it needs no separate allocation.",
      ),
      line(
        "book->price = price;",
        "Store the supplied price.",
        "Each new struct field must be initialized.",
      ),
      line(
        "book->nAuth = n;",
        "Record how many author strings the Book owns.",
        "Cleanup uses this count to visit exactly the allocated names.",
      ),
      line(
        "book->authors = n == 0 ? NULL : malloc(n * sizeof *book->authors);",
        "Allocate n author-pointer slots, or use NULL for zero authors.",
        "This allocation stores char pointers, not the characters in each name.",
        ["book->authors = n == 0 ? NULL : malloc(n * sizeof(char *));"],
      ),
      line(
        "for (int i = 0; i < n; i++) {",
        "Visit each supplied author name using index i.",
        "Each name needs its own independently owned character allocation.",
      ),
      line(
        "book->authors[i] = malloc(strlen(authNames[i]) + 1);",
        "Allocate just enough bytes for author i, including its terminator.",
        "Different names can have different lengths.",
      ),
      line(
        "strcpy(book->authors[i], authNames[i]);",
        "Copy author i into its newly allocated space.",
        "Storing the input pointer would not create an owned deep copy.",
      ),
      close(),
      line(
        "return book;",
        "Return the completed Book.",
        "The caller receives the struct and all the allocations it owns.",
      ),
    ],
    "Two authors → one Book, one pointer array, two name strings.",
    [
      "Allocate the struct and pointer array with correct element sizes.",
      "Allocate and copy every author string, including its terminator.",
      "Initialize all fields.",
    ],
  ),

  exercise(
    "memory-free-book",
    "memory",
    "Free from the inside out",
    "Release every allocation owned by book, then release the Book itself. Accept NULL without doing anything.",
    "A non-NULL book owns nAuth allocated name strings and their pointer array; title is a fixed array inside the struct. nAuth may be 0.",
    book,
    "void freeBook(Book *book) {",
    [
      line(
        "if (book == NULL) return;",
        "Stop when there is no Book.",
        "Reading a field of NULL would be invalid.",
      ),
      line(
        "for (int i = 0; i < book->nAuth; i++) {",
        "Visit each owned author string using i.",
        "Freeing the pointer array alone would leak the strings it points to.",
      ),
      line(
        "free(book->authors[i]);",
        "Free author i's character allocation.",
        "The string must be released while its pointer is still available.",
      ),
      close(),
      line(
        "free(book->authors);",
        "Release the array of author pointers.",
        "All the character allocations have already been freed.",
      ),
      line(
        "free(book);",
        "Release the struct last.",
        "The fixed title array disappears with the struct; it is not freed separately.",
      ),
    ],
    "Names → author-pointer array → Book.",
    [
      "Free every name exactly once.",
      "Free the pointer array before the struct.",
      "Do not separately free the embedded title array.",
    ],
  ),

  exercise(
    "memory-matrix-create",
    "memory",
    "Build a grid one row at a time",
    "Return a rows-by-cols integer matrix as an array of row pointers. Allocate each row separately and initialize all entries to zero.",
    "1 ≤ rows, cols ≤ 20. All allocations succeed. The caller will free each row and then the pointer array.",
    includes,
    "int **makeMatrix(size_t rows, size_t cols) {",
    [
      line(
        "int **matrix = malloc(rows * sizeof *matrix);",
        "Allocate rows pointer slots and name the result matrix.",
        "The outer allocation stores addresses of integer rows.",
        ["int **matrix = malloc(rows * sizeof(int *));"],
      ),
      line(
        "for (size_t r = 0; r < rows; r++) {",
        "Visit each row using r.",
        "Each row is a separate allocation.",
      ),
      line(
        "matrix[r] = calloc(cols, sizeof *matrix[r]);",
        "Allocate cols zeroed integers for row r.",
        "calloc initializes every entry in this row.",
        ["matrix[r] = calloc(cols, sizeof(int));"],
      ),
      close(),
      line(
        "return matrix;",
        "Return the row-pointer array.",
        "The caller can access an integer using matrix[r][c].",
      ),
    ],
    "2 × 3 → two separately allocated rows of three zeros.",
    [
      "Allocate pointers in the outer array.",
      "Allocate integers in each row.",
      "Initialize every matrix entry.",
    ],
  ),

  exercise(
    "memory-matrix-free",
    "memory",
    "Release a separately allocated grid",
    "Free every row of matrix, then free its row-pointer array. A NULL matrix should do nothing.",
    "Each of the rows rows was separately allocated. rows may be 0. This is not one contiguous integer allocation.",
    includes,
    "void freeMatrix(int **matrix, size_t rows) {",
    [
      line(
        "if (matrix == NULL) return;",
        "Handle a missing matrix first.",
        "The row pointers cannot be read through NULL.",
      ),
      line(
        "for (size_t r = 0; r < rows; r++) {",
        "Visit every allocated row using r.",
        "Each separate row needs its own matching free.",
      ),
      line(
        "free(matrix[r]);",
        "Free the integer allocation for row r.",
        "Freeing the outer pointer array would not automatically free a row.",
      ),
      close(),
      line(
        "free(matrix);",
        "Free the outer array last.",
        "The row addresses are no longer needed once their allocations are released.",
      ),
    ],
    "Free row 0, free row 1, then free matrix.",
    [
      "Free rows before losing their pointers.",
      "Free the outer allocation exactly once.",
    ],
  ),

  exercise(
    "memory-append-char",
    "memory",
    "Grow a string safely",
    "Append the character ch to the owned string *text. Return 1 on success. If resizing fails, return 0 and keep the original string unchanged.",
    "text is not NULL; *text points to an allocated, terminated string of at most 1000 characters. ch is not '\\0'.",
    includes,
    "int appendChar(char **text, char ch) {",
    [
      line(
        "size_t n = strlen(*text);",
        "Save the current character count in n.",
        "This is the position of the old terminator and the future new character.",
      ),
      line(
        "char *tmp = realloc(*text, n + 2);",
        "Request space for the old characters, one new character, and a terminator using tmp.",
        "The extra two bytes hold ch and the new '\\0'.",
      ),
      line(
        "if (tmp == NULL) return 0;",
        "Preserve the original pointer if resizing fails.",
        "realloc leaves the original string allocated on failure.",
      ),
      line(
        "tmp[n] = ch;",
        "Replace the old terminator with the appended character.",
        "All earlier character positions stay unchanged.",
      ),
      line(
        "tmp[n + 1] = '\\0';",
        "Terminate the longer string one position later.",
        "Without a terminator, string functions would read beyond the new text.",
      ),
      line(
        "*text = tmp;",
        "Update the caller's pointer.",
        "The allocation may have moved while growing.",
      ),
      line(
        "return 1;",
        "Report a completed append.",
        "The string now owns room for its extra character.",
      ),
    ],
    '"CS" + \'!\' → "CS!"',
    [
      "Allocate both the character and terminator.",
      "Preserve the original on failure.",
      "Keep the result terminated.",
    ],
  ),

  exercise(
    "list-count",
    "linked",
    "Count nodes without changing the list",
    "Return the number of nodes reachable from head.",
    "The list is finite and acyclic, with at most 1000 nodes. head may be NULL.",
    node,
    "int countNodes(const node *head) {",
    [
      line(
        "int count = 0;",
        "Start a counter named count at zero.",
        "An empty list has no nodes.",
      ),
      line(
        "while (head != NULL) {",
        "Continue while head points to a node.",
        "NULL marks the end of the chain.",
      ),
      line(
        "count++;",
        "Count this node once.",
        "Every iteration visits exactly one existing node.",
        ["++count;", "count += 1;", "count = count + 1;"],
      ),
      line(
        "head = head->next;",
        "Move the local pointer to the next node.",
        "Changing the local pointer does not change any links in the original list.",
      ),
      close(),
      line(
        "return count;",
        "Return the number visited.",
        "The traversal has reached the end of the list.",
      ),
    ],
    "10 → 20 → 30 → NULL returns 3.",
    [
      "Handle an empty list.",
      "Advance through each node exactly once.",
      "Do not change or free nodes.",
    ],
  ),

  exercise(
    "list-sum",
    "linked",
    "Add every stored value",
    "Return the sum of the integers in a linked list.",
    "The list is finite and acyclic, with at most 1000 nodes; values are between −1000 and 1000. head may be NULL.",
    node,
    "int sumNodes(const node *head) {",
    [
      line(
        "int total = 0;",
        "Start an accumulator named total at zero.",
        "Zero is the sum of an empty list.",
      ),
      line(
        "while (head != NULL) {",
        "Visit nodes until the pointer is NULL.",
        "Only existing nodes have readable data fields.",
      ),
      line(
        "total += head->data;",
        "Add the current node's data to total.",
        "The stored number is in data; the pointer itself is an address.",
        ["total = total + head->data;"],
      ),
      line(
        "head = head->next;",
        "Follow the next link.",
        "Advancing prevents counting the same node repeatedly.",
      ),
      close(),
      line(
        "return total;",
        "Return the accumulated sum.",
        "Every stored value has now contributed once.",
      ),
    ],
    "4 → −2 → 7 → NULL returns 9.",
    ["Start from zero.", "Sum data, not addresses.", "Preserve all links."],
  ),

  exercise(
    "list-find",
    "linked",
    "Find the first matching node",
    "Return the address of the first node whose data equals target, or NULL when target is absent.",
    "The list is finite and acyclic. Do not allocate, free, or change nodes.",
    node,
    "node *findNode(node *head, int target) {",
    [
      line(
        "while (head != NULL) {",
        "Search while a node remains.",
        "An empty list skips the loop.",
      ),
      line(
        "if (head->data == target) return head;",
        "Return this node when its stored value matches target.",
        "Returning immediately guarantees the first match.",
      ),
      line(
        "head = head->next;",
        "Move to the next candidate.",
        "The current node did not match.",
      ),
      close(),
      line(
        "return NULL;",
        "Report that no node matched.",
        "The search reached the end without returning a node.",
      ),
    ],
    "7 → 2 → 7: searching for 7 returns the first node.",
    [
      "Compare the data field.",
      "Return a node pointer rather than its value.",
      "Return NULL when absent.",
    ],
  ),

  exercise(
    "list-prepend",
    "linked",
    "Return a new head",
    "Insert x before the current first node and return the new head.",
    "head may be NULL. Allocation succeeds. The caller stores the returned head.",
    node,
    "node *prepend(node *head, int x) {",
    [
      line(
        "node *added = malloc(sizeof *added);",
        "Allocate one node named added.",
        "Only the new node needs new storage.",
        ["node *added = malloc(sizeof(node));"],
      ),
      line(
        "added->data = x;",
        "Store x in the new node.",
        "Newly allocated memory has no initialized data yet.",
      ),
      line(
        "added->next = head;",
        "Link the new node to the old first node.",
        "This preserves the existing chain, including NULL for an empty list.",
      ),
      line(
        "return added;",
        "Return the new first node.",
        "The caller must replace its head pointer to see the insertion.",
      ),
    ],
    "20 → 30, insert 10 → 10 → 20 → 30.",
    [
      "Allocate and initialize one node.",
      "Preserve the old head as the new node's next.",
      "Return the new head.",
    ],
  ),

  exercise(
    "list-append",
    "linked",
    "Append without a tail pointer",
    "Append x to the end of a singly linked list and return its head. You are not given a tail pointer.",
    "The list is finite and acyclic. head may be NULL. Allocation succeeds.",
    node,
    "node *append(node *head, int x) {",
    [
      line(
        "node *added = malloc(sizeof *added);",
        "Allocate a node named added.",
        "The old nodes can remain in their existing allocations.",
        ["node *added = malloc(sizeof(node));"],
      ),
      line(
        "added->data = x;",
        "Store the new value.",
        "The new node must contain the supplied data.",
      ),
      line(
        "added->next = NULL;",
        "Mark the new node as the final node.",
        "A tail's next pointer is NULL.",
      ),
      line(
        "if (head == NULL) return added;",
        "Make the new node the head when the list is empty.",
        "There is no existing tail to link in an empty list.",
      ),
      line(
        "node *tail = head;",
        "Start a traversal pointer named tail at the head.",
        "Preserving head allows it to be returned unchanged.",
      ),
      line(
        "while (tail->next != NULL) tail = tail->next;",
        "Advance until tail reaches the last node.",
        "The final node is the one whose next is NULL.",
      ),
      line(
        "tail->next = added;",
        "Connect the old tail to the new node.",
        "The new node becomes reachable from the existing head.",
      ),
      line(
        "return head;",
        "Return the original head for this nonempty list.",
        "Appending changes the end, not the first node.",
      ),
    ],
    "10 → 20, append 30 → 10 → 20 → 30.",
    [
      "Handle the empty list separately.",
      "Find the tail without losing head.",
      "Terminate the new list with NULL.",
    ],
  ),

  exercise(
    "list-insert-position",
    "linked",
    "Insert at the exam's position",
    "Insert x at 1-based position p. If p is past the list, append x. Return the total node count after insertion.",
    "The list has at least one node, p > 1, and at most 1000 nodes. Allocation succeeds. Do not change head.",
    node,
    "int insertAt(node *head, int x, int p) {",
    [
      line(
        "node *prev = head;",
        "Start prev at the first node.",
        "Insertion will happen after the node just before the requested position.",
      ),
      line(
        "int position = 1;",
        "Record prev's 1-based position in position.",
        "The head is position 1 in this exam convention.",
      ),
      line(
        "while (prev->next != NULL && position < p - 1) {",
        "Advance until the predecessor or the current tail is reached.",
        "Stopping at the tail makes oversized positions append safely.",
      ),
      line(
        "prev = prev->next;",
        "Move prev one node forward.",
        "The predecessor search follows the list in order.",
      ),
      line(
        "position++;",
        "Advance its position count.",
        "The count must stay aligned with the node pointer.",
        ["++position;", "position += 1;"],
      ),
      close(),
      line(
        "node *added = malloc(sizeof *added);",
        "Allocate a node named added.",
        "One insertion needs one new allocation.",
        ["node *added = malloc(sizeof(node));"],
      ),
      line(
        "added->data = x;",
        "Store the inserted value.",
        "The allocated node must be initialized.",
      ),
      line(
        "added->next = prev->next;",
        "Save the remaining chain as the new node's next link.",
        "This must happen before replacing prev's next link.",
      ),
      line(
        "prev->next = added;",
        "Link prev to the inserted node.",
        "The new node is now in the list without losing the suffix.",
      ),
      line(
        "int count = 0;",
        "Start a total node count named count.",
        "The function must return the whole list's length, not just the insertion position.",
      ),
      line(
        "for (node *current = head; current != NULL; current = current->next) count++;",
        "Count all nodes in the updated list with a pointer named current.",
        "This includes nodes after the inserted one as well as the new node.",
      ),
      line(
        "return count;",
        "Return the total length after insertion.",
        "Exactly one new node was added.",
      ),
    ],
    "10 → 20 → 30; x = 9, p = 3 → 10 → 20 → 9 → 30; returns 4.",
    [
      "Respect 1-based positions and append beyond the end.",
      "Preserve the suffix before replacing the predecessor link.",
      "Return the full updated count.",
    ],
  ),

  exercise(
    "list-remove-first",
    "linked",
    "Delete only the first match",
    "Remove and free the first node whose data equals target. Return the possibly changed head. Leave the list unchanged if absent.",
    "The list is finite and acyclic. head may be NULL. All nodes were dynamically allocated.",
    node,
    "node *removeFirst(node *head, int target) {",
    [
      line(
        "node **link = &head;",
        "Make link point to the pointer that currently leads to the first candidate.",
        "A pointer-to-pointer lets the same update replace head or a previous node's next.",
      ),
      line(
        "while (*link != NULL && (*link)->data != target) link = &(*link)->next;",
        "Move link to successive incoming links until a match or the end.",
        "The short-circuit test avoids dereferencing NULL.",
      ),
      line(
        "if (*link != NULL) {",
        "Delete only when a matching node exists.",
        "An absent value leaves every link unchanged.",
      ),
      line(
        "node *removed = *link;",
        "Save the matching node in removed.",
        "Its address is needed for free after the chain is reconnected.",
      ),
      line(
        "*link = removed->next;",
        "Make its incoming link skip to the following node.",
        "The suffix stays reachable even when the removed node was the head.",
      ),
      line(
        "free(removed);",
        "Release the detached node.",
        "Only the removed node's allocation should be freed.",
      ),
      close(),
      line(
        "return head;",
        "Return the resulting head.",
        "Deleting the first node changes the list's starting address.",
      ),
    ],
    "2 → 7 → 7, target 7 → 2 → 7.",
    [
      "Remove only the first occurrence.",
      "Handle head, middle, tail, and absence.",
      "Reconnect before freeing.",
    ],
  ),

  exercise(
    "list-reverse",
    "linked",
    "Reverse the links",
    "Reverse the list in place and return its new head. Do not allocate or free nodes.",
    "The list is finite and acyclic. head may be NULL.",
    node,
    "node *reverseList(node *head) {",
    [
      line(
        "node *prev = NULL;",
        "Start the reversed prefix at NULL using prev.",
        "The old first node will become the tail and point to NULL.",
      ),
      line(
        "while (head != NULL) {",
        "Process each node in the remaining original chain.",
        "The process ends once there are no original nodes left.",
      ),
      line(
        "node *next = head->next;",
        "Save the following node in next before changing a link.",
        "Otherwise the unprocessed remainder would become unreachable.",
      ),
      line(
        "head->next = prev;",
        "Point the current node back at the reversed prefix.",
        "This is the operation that reverses one arrow.",
      ),
      line(
        "prev = head;",
        "Move prev to the front of the longer reversed prefix.",
        "The current node is now the first reversed node.",
      ),
      line(
        "head = next;",
        "Resume with the saved original next node.",
        "Traversal follows the original chain even though its arrows are changing.",
      ),
      close(),
      line(
        "return prev;",
        "Return the reversed chain's first node.",
        "The original head pointer has reached NULL.",
      ),
    ],
    "1 → 2 → 3 → NULL becomes 3 → 2 → 1 → NULL.",
    [
      "Save next before overwriting it.",
      "Reverse every link once.",
      "Return the old tail as the new head.",
    ],
  ),

  exercise(
    "list-free-iterative",
    "linked",
    "Free a list without looking back",
    "Free every node using a loop. Do not read any node after freeing it.",
    "The list is finite, acyclic, and entirely dynamically allocated. head may be NULL. The caller must stop using its old head afterward.",
    node,
    "void freeList(node *head) {",
    [
      line(
        "while (head != NULL) {",
        "Continue while an allocated node remains.",
        "An empty list needs no frees.",
      ),
      line(
        "node *next = head->next;",
        "Save the next node's address in next.",
        "The next field becomes inaccessible once the current node is freed.",
      ),
      line(
        "free(head);",
        "Free the current node.",
        "The saved next pointer still identifies the unprocessed remainder.",
      ),
      line(
        "head = next;",
        "Advance using the saved address.",
        "Following head->next here would read freed memory.",
      ),
      close(),
    ],
    "Save next → free current → advance; repeat.",
    [
      "Save the next pointer before free.",
      "Free each node exactly once.",
      "Never dereference freed storage.",
    ],
  ),

  exercise(
    "list-expand-even",
    "linked",
    "Insert after each original even value",
    "After each original node containing an even integer, insert a node whose value is that integer plus 5. Do not process the inserted nodes again.",
    "The list is finite and acyclic, values are between −1000 and 1000, and all allocations succeed. head may be NULL.",
    node,
    "void expandEven(node *head) {",
    [
      line(
        "while (head != NULL) {",
        "Walk through the list's original nodes.",
        "NULL ends the traversal.",
      ),
      line(
        "if (head->data % 2 == 0) {",
        "Check whether this original value is even.",
        "A zero remainder works for positive, negative, and zero even values.",
      ),
      line(
        "node *added = malloc(sizeof *added);",
        "Allocate a new node named added.",
        "Only even original values need an extra node.",
        ["node *added = malloc(sizeof(node));"],
      ),
      line(
        "added->data = head->data + 5;",
        "Give it the original value plus five.",
        "The original node's data stays unchanged.",
      ),
      line(
        "added->next = head->next;",
        "Preserve the original suffix in the new node's next field.",
        "The suffix must be saved before replacing the original link.",
      ),
      line(
        "head->next = added;",
        "Connect the original node to the inserted node.",
        "The extra value is now immediately after its source.",
      ),
      line(
        "head = added;",
        "Skip to the inserted node before the common advance.",
        "The next advance will land on the next original node.",
      ),
      close(),
      line(
        "head = head->next;",
        "Advance to the next original node.",
        "New nodes are not processed a second time.",
      ),
      close(),
    ],
    "3 → 2 → 6 becomes 3 → 2 → 7 → 6 → 11.",
    [
      "Insert only after original even values.",
      "Preserve the suffix.",
      "Skip inserted nodes during traversal.",
    ],
  ),

  exercise(
    "stack-array-push",
    "stacks",
    "Push with a full-stack guard",
    "Push value onto an array stack. Return 1 on success, or 0 if its 8 slots are already full. top stores the item count.",
    "s is valid and 0 ≤ top ≤ 8. A failed push must not change anything.",
    arrayStack,
    "int push(Stack *s, int value) {",
    [
      line(
        "if (s->top == 8) return 0;",
        "Reject a full stack before writing.",
        "Index 8 is past the array; its valid indices are 0 through 7.",
      ),
      line(
        "s->items[s->top] = value;",
        "Store the new value in the first unused slot.",
        "With top as a count, that slot's index equals top.",
      ),
      line(
        "s->top++;",
        "Increase the stored item count.",
        "The new last item is at index top − 1 after this update.",
        ["++s->top;", "s->top += 1;"],
      ),
      line(
        "return 1;",
        "Report a successful push.",
        "Exactly one value was added.",
      ),
    ],
    "top = 2 → write items[2] → top = 3.",
    [
      "Reject full stacks without changing them.",
      "Write before advancing the count.",
    ],
  ),

  exercise(
    "stack-array-pop",
    "stacks",
    "Pop and preserve the empty case",
    "Remove the most recently pushed value into *out. Return 1 on success. If empty, return 0 and leave *out unchanged.",
    "s and out are valid. 0 ≤ top ≤ 8; top is the count, not the top item's index.",
    arrayStack,
    "int pop(Stack *s, int *out) {",
    [
      line(
        "if (s->top == 0) return 0;",
        "Reject an empty stack first.",
        "There is no item at index −1.",
      ),
      line(
        "s->top--;",
        "Reduce the count to reach the last occupied index.",
        "The old top value lived at old top − 1.",
        ["--s->top;", "s->top -= 1;"],
      ),
      line(
        "*out = s->items[s->top];",
        "Copy the removed value to the caller's output variable.",
        "The updated count identifies the slot just removed from the logical stack.",
      ),
      line(
        "return 1;",
        "Report a successful pop.",
        "The stale array value is outside the logical stack and need not be erased.",
      ),
    ],
    "[10, 20, 30], top = 3 → out = 30, top = 2.",
    [
      "Handle underflow before decrementing.",
      "Return the latest stored value.",
    ],
  ),

  exercise(
    "stack-linked-push",
    "stacks",
    "Push onto a linked stack",
    "Push x onto a stack whose top pointer is *top. Return 0 if allocation fails without changing the stack; otherwise return 1.",
    "top is valid; *top may be NULL. Nodes form a finite singly linked chain.",
    node,
    "int pushLinked(node **top, int x) {",
    [
      line(
        "node *added = malloc(sizeof *added);",
        "Allocate one node named added.",
        "A linked stack grows one node per push.",
        ["node *added = malloc(sizeof(node));"],
      ),
      line(
        "if (added == NULL) return 0;",
        "Handle allocation failure before changing the stack.",
        "The original top and links remain valid.",
      ),
      line(
        "added->data = x;",
        "Store the pushed value.",
        "The allocated node needs initialized data.",
      ),
      line(
        "added->next = *top;",
        "Link the new node to the previous top.",
        "The earlier values remain underneath the new one.",
      ),
      line(
        "*top = added;",
        "Update the caller's top pointer.",
        "The newly added value must be the next one popped.",
      ),
      line(
        "return 1;",
        "Report success.",
        "One node is now on top of the stack.",
      ),
    ],
    "top → 4; push 9 → top → 9 → 4.",
    [
      "Keep the original stack on allocation failure.",
      "Link before replacing top.",
    ],
  ),

  exercise(
    "stack-linked-pop",
    "stacks",
    "Detach, save, and free the top",
    "Pop a linked stack into *out. Return 0 when empty without changing *out; otherwise free the old top and return 1.",
    "top and out are valid. Stack nodes are dynamically allocated.",
    node,
    "int popLinked(node **top, int *out) {",
    [
      line(
        "if (*top == NULL) return 0;",
        "Handle an empty stack.",
        "The data and next fields of NULL cannot be read.",
      ),
      line(
        "node *removed = *top;",
        "Save the old top in removed.",
        "Its allocation must be freed after the stack is reconnected.",
      ),
      line(
        "*out = removed->data;",
        "Copy out the stored value before freeing the node.",
        "The data cannot be read after free.",
      ),
      line(
        "*top = removed->next;",
        "Move the caller's top to the following node.",
        "The following value becomes the next one to pop.",
      ),
      line(
        "free(removed);",
        "Release the old top node.",
        "It is no longer part of the stack.",
      ),
      line(
        "return 1;",
        "Report a successful pop.",
        "The caller receives the removed value through out.",
      ),
    ],
    "top → 9 → 4 becomes top → 4; out = 9.",
    [
      "Save data and next before free.",
      "Update the caller's top.",
      "Free exactly the removed node.",
    ],
  ),

  exercise(
    "stack-parentheses",
    "stacks",
    "Reject unmatched parentheses",
    "Return 1 if every opening parenthesis has a correctly ordered closing parenthesis; otherwise return 0. Ignore other characters. Use depth as a count of unmatched openings.",
    "text is a valid string of at most 1000 characters. A count is enough because there is only one bracket type.",
    includes,
    "int balanced(const char *text) {",
    [
      line(
        "int depth = 0;",
        "Start depth as the number of unmatched opening parentheses.",
        "No opening parentheses have been seen yet.",
      ),
      line(
        "for (size_t i = 0; text[i] != '\\0'; i++) {",
        "Read characters from left to right using i.",
        "Correct order matters, not just the final counts.",
      ),
      line(
        "if (text[i] == '(') depth++;",
        "Count an opening parenthesis as one pending match.",
        "This behaves like pushing one opening onto a stack.",
      ),
      line(
        "if (text[i] == ')') {",
        "Handle a closing parenthesis.",
        "It must match an earlier opening.",
      ),
      line(
        "if (depth == 0) return 0;",
        "Reject a closing parenthesis with no pending opening.",
        "A later opening cannot repair a premature closing.",
      ),
      line(
        "depth--;",
        "Consume one pending opening.",
        "This behaves like popping the matching opening.",
        ["--depth;", "depth -= 1;"],
      ),
      close(),
      close(),
      line(
        "return depth == 0;",
        "Succeed only if no unmatched openings remain.",
        "A positive depth means some openings never received a closing match.",
      ),
    ],
    '"(a+(b))" → 1; ")(" → 0; "(()" → 0.',
    [
      "Reject premature closings.",
      "Ignore ordinary characters.",
      "Reject openings left at the end.",
    ],
  ),

  exercise(
    "queue-circular-enqueue",
    "queues",
    "Find the next circular slot",
    "Enqueue value in a circular array queue. Return 0 if full without changing it, otherwise return 1. Compute insertion index from front and noe.",
    "q is valid; 1 ≤ queueSize ≤ 1000; 0 ≤ front < queueSize and 0 ≤ noe ≤ queueSize. elements has queueSize slots.",
    circular,
    "int enqueue(queue *q, int value) {",
    [
      line(
        "if (q->noe == q->queueSize) return 0;",
        "Reject a full queue first.",
        "Overwriting a slot in a full queue would destroy an item still waiting.",
      ),
      line(
        "int index = (q->front + q->noe) % q->queueSize;",
        "Compute the next insertion index and name it index.",
        "front plus the count reaches the first free logical slot; modulo wraps to the array's start.",
      ),
      line(
        "q->elements[index] = value;",
        "Store value in that slot.",
        "Enqueue adds at the rear of the waiting order.",
      ),
      line(
        "q->noe++;",
        "Increase the queue's item count.",
        "front stays unchanged because the first waiting item did not move.",
        ["++q->noe;", "q->noe += 1;"],
      ),
      line(
        "return 1;",
        "Report success.",
        "The queue now contains one more item.",
      ),
    ],
    "capacity 5, front 4, count 2 → insert at (4 + 2) % 5 = 1.",
    [
      "Reject full queues.",
      "Wrap the insertion index.",
      "Increase count without moving front.",
    ],
  ),

  exercise(
    "queue-circular-dequeue",
    "queues",
    "Remove and wrap the front",
    "Dequeue and return the front integer. Return −1 if empty. Adjust front and noe using the exam's circular-array representation.",
    "q is valid; 1 ≤ queueSize ≤ 1000; front is a valid index; 0 ≤ noe ≤ queueSize. A stored −1 is allowed but shares the empty sentinel.",
    circular,
    "int dequeue(queue *q) {",
    [
      line(
        "if (q->noe == 0) return -1;",
        "Handle an empty queue before reading a slot.",
        "No array slot represents a waiting item when the count is zero.",
      ),
      line(
        "int retval = q->elements[q->front];",
        "Save the first waiting value in retval.",
        "front will change, so save its value first.",
      ),
      line(
        "q->front = (q->front + 1) % q->queueSize;",
        "Advance front, wrapping after the last physical slot.",
        "Modulo makes the slot after capacity − 1 become slot 0.",
      ),
      line(
        "q->noe--;",
        "Decrease the number of waiting items.",
        "The old array bytes may remain, but that slot is no longer part of the queue.",
        ["--q->noe;", "q->noe -= 1;"],
      ),
      line(
        "return retval;",
        "Return the removed value.",
        "The first enqueued value is the first one removed.",
      ),
    ],
    "capacity 5, front 4, count 2 → remove slot 4; front 0, count 1.",
    [
      "Guard the empty case.",
      "Save the value before moving front.",
      "Wrap and decrement count.",
    ],
  ),

  exercise(
    "queue-linked-enqueue",
    "queues",
    "Enqueue with both endpoints",
    "Append value to a singly linked queue in constant time. Update both endpoints if the queue starts empty.",
    "q is valid; an empty queue has front = rear = NULL. In a nonempty queue, rear is the last node. Allocation succeeds.",
    linkedQueue,
    "void enqueueLinked(queue *q, int value) {",
    [
      line(
        "node *added = malloc(sizeof *added);",
        "Allocate a node named added.",
        "The incoming value needs one node.",
        ["node *added = malloc(sizeof(node));"],
      ),
      line(
        "added->data = value;",
        "Store the incoming value.",
        "The new node's data must be initialized.",
      ),
      line(
        "added->next = NULL;",
        "Make the new node the final node.",
        "There is no node after the rear.",
      ),
      line(
        "if (q->rear == NULL) {",
        "Handle an initially empty queue.",
        "It has no old rear whose next link could be updated.",
      ),
      line(
        "q->front = added;",
        "Make the new node the first waiting item.",
        "In a one-node queue, front and rear must identify the same node.",
      ),
      line(
        "} else {",
        "Otherwise, handle the existing nonempty queue.",
        "A nonempty queue has a rear node whose next link can be updated.",
      ),
      line(
        "q->rear->next = added;",
        "Connect the old rear to the new node.",
        "The new item joins behind every existing item.",
      ),
      close(),
      line(
        "q->rear = added;",
        "Update rear in both cases.",
        "The new node is always the last node after enqueue.",
      ),
    ],
    "Empty → front and rear both point to the new node.",
    [
      "Initialize the new tail's next to NULL.",
      "Update front only when initially empty.",
      "Always update rear.",
    ],
  ),

  exercise(
    "queue-doubly-dequeue",
    "queues",
    "Write the linked dequeue walkthrough",
    "Remove the front of a doubly linked queue and return its value. Return 0 if the queue pointer is NULL or the queue is empty. Free the removed node and repair both directions.",
    "A non-NULL queue is consistent: size is its node count, head is front, tail is end, and both are NULL when empty. Values can include 0, so 0 also serves as the empty sentinel.",
    `${includes}\ntypedef struct node { int data; struct node *next, *prev; } node;\ntypedef struct queue { int size; node *head, *tail; } queue;`,
    "int dequeue(queue *thisQ) {",
    [
      line(
        "if (thisQ == NULL) return 0;",
        "Handle a missing queue before reading its fields.",
        "A NULL queue pointer has no readable size or head.",
      ),
      line(
        "if (thisQ->size == 0) return 0;",
        "Handle an existing but empty queue.",
        "The head is NULL when no nodes are present.",
      ),
      line(
        "int retval = thisQ->head->data;",
        "Save the first node's value in retval.",
        "The value must be copied before its node is freed.",
      ),
      line(
        "node *temp = thisQ->head;",
        "Save the old first node's address in temp.",
        "Moving head must not lose the allocation that needs to be freed.",
      ),
      line(
        "thisQ->head = thisQ->head->next;",
        "Move head to the second node, or NULL if there was only one.",
        "Dequeue removes the front node from the forward chain.",
      ),
      line(
        "if (thisQ->size > 1) {",
        "Check whether a new head exists using the original size.",
        "The size has not been decremented yet, so greater than one means another node remains.",
      ),
      line(
        "thisQ->head->prev = NULL;",
        "Clear the new head's backward link.",
        "The first node cannot point backward to the node about to be freed.",
      ),
      line(
        "} else {",
        "Otherwise, handle removal of the only node.",
        "A one-node queue becomes empty and needs both endpoints cleared.",
      ),
      line(
        "thisQ->tail = NULL;",
        "Clear tail when the removed node was the only node.",
        "Both endpoints must be NULL once the queue is empty.",
      ),
      close(),
      line(
        "free(temp);",
        "Release the old first node.",
        "All live queue links have already been repaired.",
      ),
      line(
        "thisQ->size--;",
        "Decrease the stored node count.",
        "Exactly one node was removed.",
        ["--thisQ->size;", "thisQ->size -= 1;"],
      ),
      line(
        "return retval;",
        "Return the saved integer.",
        "Returning temp's data would read freed memory; retval is an independent copy.",
      ),
    ],
    "10 ⇄ 20 ⇄ 30 → return 10; head at 20, 20.prev = NULL, tail at 30, size = 2.",
    [
      "Guard NULL and empty queues.",
      "Save data and old head before changing links.",
      "Clear new head.prev or clear tail for the singleton.",
      "Free exactly once and decrement size.",
    ],
  ),

  exercise(
    "queue-deque-add-front",
    "queues",
    "Add to the front of a deque",
    "Add value at the front of a singly linked deque. Use the provided makeNode helper. Maintain both front and back pointers.",
    "d is valid, may be empty, and is consistent. makeNode returns an allocated node with data set and next = NULL; allocation succeeds.",
    `${node}\ntypedef struct deque { node *front, *back; } deque;\nnode *makeNode(int value) {\n    node *p = malloc(sizeof *p);\n    p->data = value;\n    p->next = NULL;\n    return p;\n}`,
    "void addFront(deque *d, int value) {",
    [
      line(
        "node *added = makeNode(value);",
        "Use the helper to create a node named added.",
        "The helper initializes data and a NULL next pointer.",
      ),
      line(
        "added->next = d->front;",
        "Link it to the previous first node.",
        "This also works when the old front is NULL.",
      ),
      line(
        "if (d->front == NULL) d->back = added;",
        "Set back if this is the deque's first node.",
        "A one-node deque has the same front and back.",
      ),
      line(
        "d->front = added;",
        "Make the new node the front.",
        "For a nonempty deque, the old back stays the same.",
      ),
    ],
    "front → 20 → 30 ← back; add 10 → front → 10 → 20 → 30 ← back.",
    [
      "Preserve the existing chain.",
      "Set back when initially empty.",
      "Always replace front.",
    ],
  ),
];
