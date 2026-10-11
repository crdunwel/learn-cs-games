// Authored C-writing problems. Canonical lines are one valid solution; callers
// must not claim that unmatched student C is necessarily wrong.
const line = (code, hint, why, accept) => ({
  code,
  hint,
  why,
  ...(accept ? { accept } : {}),
});
const close = {
  code: "}",
  hint: "Close this block.",
  why: "The statements in this block are complete.",
  fixed: true,
};
const headers = "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>";
const make = (
  id,
  topic,
  title,
  prompt,
  assumptions,
  signature,
  lines,
  example,
  rubric,
  extra = "",
) => ({
  id,
  topic,
  title,
  prompt,
  assumptions,
  setup: headers + (extra ? "\n" + extra : ""),
  signature,
  lines,
  example,
  rubric,
});
const seqHelper = `void printSeq(int n) {
    if (n == 1) { printf("1"); return; }
    printSeq(n - 1);
    printf(" %d", n);
}`;
const powerHelper = `int power(int a, int b) {
    if (b == 0) return 1;
    return a * power(a, b - 1);
}`;

export const algorithmExercises = [
  make(
    "rec-print-sequence",
    "recursion",
    "Print 1 through n",
    "Write printSeq recursively. Print 1 through n, separated by one space, without a trailing space or newline.",
    "1 <= n <= 20. Do not use a loop.",
    "void printSeq(int n) {",
    [
      line(
        "if (n == 1) {",
        "Handle the smallest sequence first.",
        "A one-number sequence needs no recursive call.",
      ),
      line(
        'printf("1");',
        "Print the first number without a space.",
        "Every later number will supply its own leading space.",
      ),
      line(
        "return;",
        "Stop this base-case call.",
        "Otherwise it would recurse below 1.",
      ),
      close,
      line(
        "printSeq(n - 1);",
        "Print the smaller sequence before n.",
        "Doing the recursive call first puts the numbers in ascending order.",
      ),
      line(
        'printf(" %d", n);',
        "Print a space followed by this call's n.",
        "The earlier call has already printed 1 through n - 1.",
      ),
    ],
    "printSeq(4) prints: 1 2 3 4",
    [
      "Base case prints 1 and returns.",
      "Recursive call precedes the final print.",
      "No loop and no trailing space.",
    ],
  ),
  make(
    "rec-print-triangle",
    "recursion",
    "Build a number triangle",
    "Write printTriangle recursively. Row i contains 1 through i. Use the supplied printSeq helper, then end each row with a newline.",
    "0 <= n <= 10. printSeq is supplied. Do not use a loop.",
    "void printTriangle(int n) {",
    [
      line(
        "if (n == 0) return;",
        "An empty triangle prints nothing.",
        "This stops the recursion before a negative row count.",
      ),
      line(
        "printTriangle(n - 1);",
        "Print the first n - 1 rows.",
        "The smaller triangle must appear above the final row.",
      ),
      line(
        "printSeq(n);",
        "Print the numbers on row n.",
        "The helper prints one complete row but no newline.",
      ),
      line(
        'printf("\\n");',
        "Finish this row with a newline.",
        "Each recursive call contributes exactly one row.",
      ),
    ],
    "printTriangle(3) prints:\n1\n1 2\n1 2 3",
    [
      "Zero rows is the base case.",
      "Recursion prints earlier rows first.",
      "Each row calls printSeq and ends with a newline.",
    ],
    seqHelper,
  ),
  make(
    "rec-even-range",
    "recursion",
    "Count evens in an index range",
    "Return the number of even array values from lowInd through highInd, inclusive. Use recursion.",
    "0 <= len <= 100; the array has len valid elements and 0 <= lowInd <= highInd + 1 <= len. An empty range is allowed. No loop.",
    "int evens(int *arr, int len, int lowInd, int highInd) {",
    [
      line(
        "if (lowInd > highInd) return 0;",
        "Return zero when the range is empty.",
        "No elements remain to contribute to the count.",
      ),
      line(
        "return (arr[lowInd] % 2 == 0) + evens(arr, len, lowInd + 1, highInd);",
        "Count the first value if even, then count the remaining range.",
        "A comparison contributes 1 when true and 0 when false; advancing lowInd visits each index once.",
      ),
    ],
    "[3, 5, 8, 6, 7, 9, 4], range 2..6 -> 3",
    [
      "Stop before indexing an empty range.",
      "Test evenness with remainder zero, including negative evens.",
      "Advance one boundary without skipping an element.",
    ],
  ),
  make(
    "rec-digit-array",
    "recursion",
    "Sum an array of digits",
    "Return the sum of digits from index through size - 1 using recursion.",
    "0 <= index <= size <= 100. Each array element is a digit 0..9. No loop.",
    "int sumOfDigits(int arr[], int size, int index) {",
    [
      line(
        "if (index == size) return 0;",
        "Stop at the first index beyond the digits.",
        "Reading arr[size] would go past the array.",
      ),
      line(
        "return arr[index] + sumOfDigits(arr, size, index + 1);",
        "Add this digit to the sum of the rest.",
        "Each call advances one position and contributes exactly one digit.",
      ),
    ],
    "[1, 2, 3], index 0 -> 6; index 2 -> 3",
    [
      "Empty suffix returns zero.",
      "Add the current digit once.",
      "Recurse with index + 1.",
    ],
  ),
  make(
    "rec-power",
    "recursion",
    "Raise a number to a power",
    "Return a raised to the nonnegative exponent b recursively, without pow or a loop.",
    "0 <= a <= 6 and 0 <= b <= 6. Define a^0 = 1, including 0^0 for this exercise.",
    "int power(int a, int b) {",
    [
      line(
        "if (b == 0) return 1;",
        "Return the multiplicative identity for exponent zero.",
        "The empty product is 1, so it can end the chain of multiplications.",
      ),
      line(
        "return a * power(a, b - 1);",
        "Multiply a by the result for one smaller exponent.",
        "a^b = a times a^(b - 1).",
      ),
    ],
    "power(3, 4) -> 81",
    [
      "Base case returns 1.",
      "Decrease the exponent, not the base.",
      "Multiply by the recursive result.",
    ],
  ),
  make(
    "rec-crazy-sum",
    "recursion",
    "Sum self powers",
    "Return 1^1 + 2^2 + ... + n^n recursively. The recursive power helper is supplied.",
    "1 <= n <= 6. No loop. The result fits in int.",
    "int crazySum(int n) {",
    [
      line(
        "if (n == 1) return 1;",
        "End the sum at its first term.",
        "The smallest requested sum is just 1^1.",
      ),
      line(
        "return power(n, n) + crazySum(n - 1);",
        "Add n^n to the sum of all smaller terms.",
        "The helper computes one term; the recursive call handles the remaining terms.",
      ),
    ],
    "crazySum(3) -> 1 + 4 + 27 = 32",
    ["Use the n == 1 base case.", "Compute n^n, not n*n.", "Recurse on n - 1."],
    powerHelper,
  ),
  make(
    "rec-free-list",
    "recursion",
    "Free a list safely",
    "Free every node of a singly linked list recursively. The caller will discard its old head pointer after this call.",
    "head is NULL or an acyclic list of at most 100 separately allocated nodes. No loop.",
    "void byeList(node *head) {",
    [
      line(
        "if (head == NULL) return;",
        "Stop at the end of the list.",
        "NULL is not a node and must not be dereferenced.",
      ),
      line(
        "byeList(head->next);",
        "Free the remaining list before this node.",
        "head is still alive, so reading head->next is safe.",
      ),
      line(
        "free(head);",
        "Release this node after its suffix is freed.",
        "This call never reads head again after free.",
      ),
    ],
    "10 -> 20 -> 30 -> NULL: all three allocations are freed.",
    [
      "NULL is the base case.",
      "Obtain or use next before freeing the current node.",
      "Free each node exactly once.",
    ],
    "typedef struct node { int data; struct node *next; } node;",
  ),
  make(
    "rec-fibonacci",
    "recursion",
    "Write Fibonacci",
    "Return Fibonacci number n recursively, with F(0) = 0 and F(1) = 1.",
    "0 <= n <= 20. This exercise uses the simple two-call recurrence, without a loop or memoization.",
    "int fibonacci(int n) {",
    [
      line(
        "if (n <= 1) return n;",
        "Handle both starting values.",
        "Returning n gives 0 for F(0) and 1 for F(1).",
      ),
      line(
        "return fibonacci(n - 1) + fibonacci(n - 2);",
        "Add the two previous Fibonacci numbers.",
        "Each larger Fibonacci number is defined by these two smaller values.",
      ),
    ],
    "fibonacci(6) -> 8",
    [
      "Both base cases are correct.",
      "Use n - 1 and n - 2.",
      "Add, rather than multiply, the recursive results.",
    ],
  ),
  make(
    "rec-factorial",
    "recursion",
    "Write factorial",
    "Return n! recursively. Remember that 0! is 1.",
    "0 <= n <= 10, so the result fits in int. No loop.",
    "int factorial(int n) {",
    [
      line(
        "if (n <= 1) return 1;",
        "Return 1 for the two smallest factorials.",
        "This stops the recursion and supplies a neutral factor.",
      ),
      line(
        "return n * factorial(n - 1);",
        "Multiply n by the previous factorial.",
        "n! = n times (n - 1)!.",
      ),
    ],
    "factorial(5) -> 120",
    [
      "0! and 1! both return 1.",
      "Decrease n on every recursive call.",
      "Multiply by n.",
    ],
  ),
  make(
    "rec-permutations",
    "recursion",
    "Generate qualifying permutations",
    "Complete makePerm to print each permutation of 0 through n - 1 that has an adjacent pair differing by 1. Supplied check and print functions test and display a finished permutation.",
    "2 <= n <= 5. Initially k = 0 and used[0..n-1] are all zero. perm and used have n slots. Use the used-array backtracking method.",
    "void makePerm(int *perm, int *used, int k, int n) {",
    [
      line(
        "if (k == n) {",
        "Recognize a completely filled permutation.",
        "Only a finished permutation is ready for the adjacency test.",
      ),
      line(
        "if (check(perm, n)) print(perm, n);",
        "Print the completed permutation only when it qualifies.",
        "check returns true if any neighboring values differ by +1 or -1.",
      ),
      line(
        "return;",
        "Finish this complete-permutation call.",
        "There is no next slot to fill.",
      ),
      close,
      line(
        "for (int i = 0; i < n; i++) {",
        "Use an integer i to consider values 0 through n - 1 for slot k.",
        "The allowed values are the integers 0 through n - 1.",
      ),
      line(
        "if (!used[i]) {",
        "Only choose a value that is not already in the prefix.",
        "A permutation must use each value at most once.",
      ),
      line(
        "perm[k] = i;",
        "Place this candidate into the current slot.",
        "The recursive call will extend this chosen prefix.",
      ),
      line(
        "used[i] = 1;",
        "Mark this value as taken.",
        "Deeper calls must not choose the same value again.",
      ),
      line(
        "makePerm(perm, used, k + 1, n);",
        "Fill the next slot recursively.",
        "Increasing k moves toward a complete permutation.",
      ),
      line(
        "used[i] = 0;",
        "Undo this choice before trying the next candidate.",
        "Backtracking makes i available to different branches.",
      ),
      close,
      close,
    ],
    "n = 3 prints all 6 permutations, once each.",
    [
      "Only print a full qualifying permutation.",
      "Choose only unused values and mark before recursion.",
      "Restore used[i] after recursion.",
    ],
    `int check(int *perm, int n) {
    for (int i = 1; i < n; i++) if (abs(perm[i] - perm[i - 1]) == 1) return 1;
    return 0;
}
void print(int *perm, int n) {
    for (int i = 0; i < n; i++) printf("%d%c", perm[i], i + 1 == n ? '\\n' : ' ');
}`,
  ),
  make(
    "rec-adjacent-difference",
    "recursion",
    "Find an adjacent ±1 pair",
    "Return 1 if any adjacent pair differs by +1 or -1; otherwise return 0. Write the check recursively.",
    "0 <= n <= 20. Values are integers from 0 through 20. No loop.",
    "int check(int *perm, int n) {",
    [
      line(
        "if (n < 2) return 0;",
        "Stop when fewer than two values remain.",
        "A pair requires two elements.",
      ),
      line(
        "if (abs(perm[0] - perm[1]) == 1) return 1;",
        "Check the first adjacent pair in either direction.",
        "Absolute difference 1 covers both +1 and -1.",
      ),
      line(
        "return check(perm + 1, n - 1);",
        "Search the suffix starting one element later.",
        "Moving by one retains every adjacent pair; moving by two would skip a pair.",
      ),
    ],
    "[0, 3, 2, 5] -> 1 because 3 and 2 differ by 1.",
    [
      "Handle arrays with no pair.",
      "Accept either order of consecutive values.",
      "Search overlapping adjacent pairs recursively.",
    ],
  ),
  make(
    "rec-binary-search",
    "recursion",
    "Search by halving recursively",
    "Return the index of key in a sorted array, or -1 if absent, using recursive binary search with inclusive low and high indices.",
    "Distinct ascending integers; 0 <= n <= 100. Initially low = 0, high = n - 1. No loop.",
    "int binarySearchRecursive(int a[], int low, int high, int key) {",
    [
      line(
        "if (low > high) return -1;",
        "Stop if the search interval is empty.",
        "An empty interval proves the key is absent.",
      ),
      line(
        "int mid = low + (high - low) / 2;",
        "Calculate the middle index and name it mid.",
        "Integer division rounds down, and this form avoids adding both endpoints.",
      ),
      line(
        "if (a[mid] == key) return mid;",
        "Return the index if the middle value matches.",
        "The question asks for an index, not the value itself.",
      ),
      line(
        "if (key < a[mid]) return binarySearchRecursive(a, low, mid - 1, key);",
        "Search strictly left when key is smaller.",
        "Sorted order rules out mid and every value to its right.",
      ),
      line(
        "return binarySearchRecursive(a, mid + 1, high, key);",
        "Otherwise search strictly right.",
        "The middle value has already been checked, so exclude it.",
      ),
    ],
    "[2, 5, 9, 14], key 9 -> index 2; key 8 -> -1",
    [
      "Empty interval returns -1.",
      "Return an index on equality.",
      "Exclude mid and preserve the correct half.",
    ],
  ),
  make(
    "rec-string-length",
    "recursion",
    "Measure a string recursively",
    "Return the number of characters before the null terminator, using recursion and no strlen.",
    "s points to a valid null-terminated string of at most 100 characters. No loop.",
    "int stringLength(const char *s) {",
    [
      line(
        "if (*s == '\\0') return 0;",
        "Stop at the null terminator.",
        "The terminator marks the end and is not part of the string length.",
      ),
      line(
        "return 1 + stringLength(s + 1);",
        "Count this character and measure the suffix.",
        "Advancing the pointer by one examines the next character.",
      ),
    ],
    'stringLength("code") -> 4; stringLength("") -> 0',
    [
      "Do not count the null terminator.",
      "Advance the pointer once per call.",
      "Add one for each actual character.",
    ],
  ),
  make(
    "rec-palindrome",
    "recursion",
    "Check matching ends",
    "Return 1 if characters from left through right form a palindrome; otherwise return 0. Comparisons are case sensitive.",
    "Valid string of at most 100 characters. Initially left = 0 and right = length - 1. Empty and one-character strings are palindromes. No loop.",
    "int palindrome(const char *s, int left, int right) {",
    [
      line(
        "if (left >= right) return 1;",
        "Accept when the indices meet or cross.",
        "Zero or one remaining characters cannot contain a mismatched pair.",
      ),
      line(
        "if (s[left] != s[right]) return 0;",
        "Reject different characters at the two ends.",
        "A palindrome must match at every mirrored pair.",
      ),
      line(
        "return palindrome(s, left + 1, right - 1);",
        "Check the inner substring.",
        "The outer pair is already known to match.",
      ),
    ],
    'palindrome("level", 0, 4) -> 1; "hello" -> 0',
    [
      "Accept an empty inner range.",
      "Reject mismatched ends immediately.",
      "Move both boundaries inward.",
    ],
  ),
  make(
    "rec-gcd",
    "recursion",
    "Use Euclid's algorithm",
    "Return the greatest common divisor of a and b recursively using the remainder rule.",
    "0 <= a, b <= 10000. At least one input is positive. No loop.",
    "int gcd(int a, int b) {",
    [
      line(
        "if (b == 0) return a;",
        "Stop when the second number is zero.",
        "At this point the first number is the greatest common divisor.",
      ),
      line(
        "return gcd(b, a % b);",
        "Replace the pair with b and the remainder.",
        "The common divisors are unchanged and the second number gets smaller.",
      ),
    ],
    "gcd(48, 18) -> gcd(18, 12) -> gcd(12, 6) -> 6",
    [
      "Test for zero before taking remainder.",
      "Recurse with b and a % b.",
      "Return the recursive result.",
    ],
  ),
  make(
    "rec-hanoi-count",
    "recursion",
    "Count Tower of Hanoi moves",
    "Return the minimum moves needed for n disks recursively. Moving a stack requires moving n - 1 disks away, moving the largest disk, then moving n - 1 disks back.",
    "0 <= n <= 15. Return 0 for no disks. No loop and no power function.",
    "int hanoiMoves(int n) {",
    [
      line(
        "if (n == 0) return 0;",
        "An empty tower needs no moves.",
        "This supplies the base count for the smallest subproblem.",
      ),
      line(
        "return 2 * hanoiMoves(n - 1) + 1;",
        "Count two smaller transfers plus the largest disk's move.",
        "The two transfers cost the same number of moves, with one move between them.",
      ),
    ],
    "hanoiMoves(3) -> 7",
    [
      "Zero disks needs zero moves.",
      "Use the n - 1 subproblem twice in the count.",
      "Add one for the largest disk.",
    ],
  ),
  make(
    "search-binary-iterative",
    "search",
    "Write iterative binary search",
    "Return the index of key in an ascending array, or -1 if absent. Use an inclusive search interval and a loop.",
    "0 <= n <= 100. Values are distinct and sorted. a has n valid elements.",
    "int binarySearch(int a[], int n, int key) {",
    [
      line(
        "int low = 0, high = n - 1;",
        "Set low to 0 and high to the last valid index.",
        "An empty array gives high = -1 and is skipped safely.",
      ),
      line(
        "while (low <= high) {",
        "Continue while at least one candidate remains.",
        "Equal endpoints still describe one unchecked element.",
      ),
      line(
        "int mid = low + (high - low) / 2;",
        "Calculate the middle candidate and name its index mid.",
        "The midpoint splits the remaining interval.",
      ),
      line(
        "if (a[mid] == key) return mid;",
        "Return the index on a match.",
        "This completes the search without further narrowing.",
      ),
      line(
        "if (key < a[mid]) high = mid - 1;",
        "Discard mid and the right half when key is smaller.",
        "Every value in that half is too large.",
      ),
      line(
        "else low = mid + 1;",
        "Otherwise discard mid and the left half.",
        "Those values are too small, and excluding mid guarantees progress.",
      ),
      close,
      line(
        "return -1;",
        "Report that no matching value was found.",
        "The search interval has become empty.",
      ),
    ],
    "[1, 4, 7, 10], key 10 -> 3",
    [
      "Include a one-element interval.",
      "Update the correct boundary past mid.",
      "Return -1 after exhausting the interval.",
    ],
  ),
  make(
    "search-lower-bound",
    "search",
    "Find the insertion boundary",
    "Return the first index whose value is at least key, or n if every value is smaller. Use binary search with a half-open interval [low, high).",
    "0 <= n <= 100. Array is ascending; duplicates are allowed.",
    "int lowerBound(int a[], int n, int key) {",
    [
      line(
        "int low = 0, high = n;",
        "Set low to 0 and high to n for the half-open interval.",
        "high may equal n, but is never read as an array index.",
      ),
      line(
        "while (low < high) {",
        "Continue until the boundaries meet.",
        "The answer is the boundary between values below key and values at least key.",
      ),
      line(
        "int mid = low + (high - low) / 2;",
        "Calculate a candidate index inside the interval and name it mid.",
        "While low < high, mid is always less than high.",
      ),
      line(
        "if (a[mid] < key) low = mid + 1;",
        "Discard values known to be too small.",
        "mid cannot be the first value at least key.",
      ),
      line(
        "else high = mid;",
        "Keep mid as a possible first qualifying index.",
        "Do not skip a possible earlier match when duplicates exist.",
      ),
      close,
      line(
        "return low;",
        "Return the boundary where both indices meet.",
        "It is n when no array element qualifies.",
      ),
    ],
    "[2, 4, 4, 9], key 4 -> 1; key 12 -> 4",
    [
      "Use high = n with low < high.",
      "Keep mid on the qualifying side.",
      "Allow answer n.",
    ],
  ),
  make(
    "search-first-occurrence",
    "search",
    "Find the first duplicate",
    "Return the first index of key, or -1 if absent. Use binary search even when duplicates occur.",
    "0 <= n <= 100. Array is ascending with duplicates allowed.",
    "int firstOccurrence(int a[], int n, int key) {",
    [
      line(
        "int low = 0, high = n - 1, answer = -1;",
        "Declare low = 0, high = n - 1, and answer = -1.",
        "answer remains -1 unless a match is actually found.",
      ),
      line(
        "while (low <= high) {",
        "Search while a candidate remains.",
        "The leftmost match might be the last candidate.",
      ),
      line(
        "int mid = low + (high - low) / 2;",
        "Calculate the middle index and name it mid.",
        "Each comparison can discard roughly half of the interval.",
      ),
      line(
        "if (a[mid] == key) answer = mid;",
        "Save a matching index without returning yet.",
        "An earlier occurrence may still lie to the left.",
      ),
      line(
        "if (a[mid] >= key) high = mid - 1;",
        "Search left on equality as well as on a larger value.",
        "This moves toward the first occurrence.",
      ),
      line(
        "else low = mid + 1;",
        "Search right when the middle value is too small.",
        "No position through mid can contain key.",
      ),
      close,
      line(
        "return answer;",
        "Return the earliest match saved.",
        "If there was no match, the initial -1 is preserved.",
      ),
    ],
    "[1, 3, 3, 3, 8], key 3 -> 1",
    [
      "Save matches before narrowing.",
      "Continue left on equality.",
      "Preserve -1 for an absent key.",
    ],
  ),
  make(
    "search-last-occurrence",
    "search",
    "Find the last duplicate",
    "Return the last index of key, or -1 if absent. Use binary search with duplicates.",
    "0 <= n <= 100. Array is ascending with duplicates allowed.",
    "int lastOccurrence(int a[], int n, int key) {",
    [
      line(
        "int low = 0, high = n - 1, answer = -1;",
        "Declare low = 0, high = n - 1, and answer = -1.",
        "The result changes only when a match is found.",
      ),
      line(
        "while (low <= high) {",
        "Continue while there are candidates.",
        "The final candidate must still be checked.",
      ),
      line(
        "int mid = low + (high - low) / 2;",
        "Calculate the middle index and name it mid.",
        "This lets one comparison remove half of the candidates.",
      ),
      line(
        "if (a[mid] == key) answer = mid;",
        "Remember a match and keep searching.",
        "A later occurrence might still exist.",
      ),
      line(
        "if (a[mid] <= key) low = mid + 1;",
        "Search right on equality or a smaller value.",
        "Continuing right after a match finds the last occurrence.",
      ),
      line(
        "else high = mid - 1;",
        "Search left when the middle value is too large.",
        "Everything from mid onward is too large.",
      ),
      close,
      line(
        "return answer;",
        "Return the latest saved match.",
        "An absent key leaves answer at -1.",
      ),
    ],
    "[1, 3, 3, 3, 8], key 3 -> 3",
    [
      "Remember a matching index.",
      "Continue right on equality.",
      "Return -1 when no match exists.",
    ],
  ),
  make(
    "search-linear",
    "search",
    "Find the first match",
    "Return the first index containing key, or -1 if absent, in an unsorted array.",
    "0 <= n <= 100. a has n valid elements.",
    "int linearSearch(int a[], int n, int key) {",
    [
      line(
        "for (int i = 0; i < n; i++) {",
        "Use an integer index i to visit each valid index from left to right.",
        "Starting at zero makes the first match the earliest index.",
      ),
      line(
        "if (a[i] == key) return i;",
        "Return immediately when a value matches.",
        "Continuing could replace the first match with a later duplicate.",
      ),
      close,
      line(
        "return -1;",
        "Report no match after the loop.",
        "Every valid element has been checked.",
      ),
    ],
    "[8, 3, 8], key 8 -> 0",
    [
      "Read only indices 0 through n - 1.",
      "Return the first matching index.",
      "Return -1 for empty or absent cases.",
    ],
  ),
  make(
    "search-sorted-insert",
    "search",
    "Insert into a sorted array",
    "Insert x into an ascending array, after any equal values. Shift larger values right and return the new length.",
    "0 <= n <= 99. a has capacity for at least n + 1 elements and its first n elements are sorted.",
    "int insertSorted(int a[], int n, int x) {",
    [
      line(
        "int i = n - 1;",
        "Start an integer index named i at the last occupied position.",
        "Shifting from the right avoids overwriting unread values.",
      ),
      line(
        "while (i >= 0 && a[i] > x) {",
        "Shift only values greater than x.",
        "The bound is checked before a[i], and equal values stay before x.",
      ),
      line(
        "a[i + 1] = a[i];",
        "Move this larger value one position right.",
        "The extra capacity provides room for the shifted last element.",
      ),
      line(
        "i--;",
        "Check the previous value next.",
        "This moves toward the insertion point.",
      ),
      close,
      line(
        "a[i + 1] = x;",
        "Store x just after the final smaller-or-equal value.",
        "If i is -1, x belongs at index zero.",
      ),
      line(
        "return n + 1;",
        "Return the enlarged logical length.",
        "Exactly one value was inserted.",
      ),
    ],
    "[2, 4, 7], x = 3 -> [2, 3, 4, 7], length 4",
    [
      "Shift from right to left.",
      "Check i before indexing.",
      "Store x and return n + 1.",
    ],
  ),
  make(
    "search-merge-sorted",
    "search",
    "Merge two sorted arrays",
    "Fill out with all values from ascending arrays a and b in ascending order. Keep duplicates.",
    "0 <= m, n <= 50. out has capacity m + n and does not overlap a or b.",
    "void mergeSorted(int a[], int m, int b[], int n, int out[]) {",
    [
      line(
        "int i = 0, j = 0, k = 0;",
        "Declare integer indices i for a, j for b, and k for out; start all three at 0.",
        "Each pointer advances independently.",
      ),
      line(
        "while (i < m && j < n) {",
        "Compare candidates while both inputs have values.",
        "Both array reads are safe only while both indices are in range.",
      ),
      line(
        "if (a[i] <= b[j]) out[k++] = a[i++];",
        "Take a's next value when it is no larger.",
        "The smallest remaining value is next in the merged order.",
      ),
      line(
        "else out[k++] = b[j++];",
        "Otherwise take b's next value.",
        "Advance only the input whose value was copied.",
      ),
      close,
      line(
        "while (i < m) out[k++] = a[i++];",
        "Copy any leftover values from a.",
        "They are already sorted after all values already emitted.",
      ),
      line(
        "while (j < n) out[k++] = b[j++];",
        "Copy any leftover values from b.",
        "One input may be longer than the other.",
      ),
    ],
    "[1, 4, 4] and [2, 4] -> [1, 2, 4, 4, 4]",
    [
      "Take the smaller available value.",
      "Advance the selected input only.",
      "Copy both possible remaining suffixes.",
    ],
  ),
  make(
    "loop-pair-matches",
    "loops",
    "Count matching pairs",
    "Return how many index pairs (i, j) satisfy a[i] == b[j]. Count all duplicate combinations, not just distinct matching values.",
    "0 <= m, n <= 100. Both arrays have their stated lengths.",
    "int countMatches(int a[], int m, int b[], int n) {",
    [
      line(
        "int count = 0;",
        "Start an integer named count at 0 matching pairs.",
        "The count will increase once for each successful comparison.",
      ),
      line(
        "for (int i = 0; i < m; i++) {",
        "Use an integer index i to visit each valid index of a.",
        "Every a element must be paired with every b element.",
      ),
      line(
        "for (int j = 0; j < n; j++) {",
        "Use an integer index j to visit each valid index of b.",
        "The inner loop restarts for every outer-loop value.",
      ),
      line(
        "if (a[i] == b[j]) count++;",
        "Count this pair when its two values match.",
        "Different duplicate indices are different pairs.",
      ),
      close,
      close,
      line(
        "return count;",
        "Return the total number of matches.",
        "All m times n index pairs have been considered.",
      ),
    ],
    "[2, 2, 5] and [2, 2] -> 4 pairs",
    [
      "Use both array lengths correctly.",
      "Restart the inner loop for every outer item.",
      "Count duplicates as separate pairs.",
    ],
  ),
  make(
    "loop-sentinel-sum",
    "loops",
    "Stop at a sentinel",
    "Sum values before the first -1 in the array. If -1 is absent, sum all n values. Do not include the sentinel.",
    "0 <= n <= 100. Every value is -1 or an integer 0..100.",
    "int sumUntilSentinel(int a[], int n) {",
    [
      line(
        "int sum = 0;",
        "Start an integer named sum at 0.",
        "An empty array or leading sentinel should return zero.",
      ),
      line(
        "for (int i = 0; i < n; i++) {",
        "Use an integer index i to walk through valid array indices.",
        "The length check also protects arrays without a sentinel.",
      ),
      line(
        "if (a[i] == -1) break;",
        "Stop before adding the sentinel.",
        "Values after -1 must not affect the result.",
      ),
      line(
        "sum += a[i];",
        "Add this ordinary value.",
        "The sentinel case has already exited.",
      ),
      close,
      line(
        "return sum;",
        "Return the sum collected so far.",
        "It includes exactly the prefix before -1.",
      ),
    ],
    "[4, 2, -1, 9] -> 6",
    [
      "Respect the array length.",
      "Stop on the first -1.",
      "Do not include -1 or later values.",
    ],
  ),
  make(
    "loop-reverse-array",
    "loops",
    "Reverse an array in place",
    "Reverse the first n integers without a second array.",
    "0 <= n <= 100. The array is writable.",
    "void reverseArray(int a[], int n) {",
    [
      line(
        "for (int i = 0; i < n / 2; i++) {",
        "Use an integer index i, starting at 0, to visit only the first half.",
        "Visiting every index would swap each pair twice and undo the reversal.",
      ),
      line(
        "int temp = a[i];",
        "Save the left value in an integer named temp before overwriting it.",
        "Without a temporary value, one value would be lost.",
      ),
      line(
        "a[i] = a[n - 1 - i];",
        "Copy the mirrored right value to the left.",
        "n - 1 - i identifies the matching index from the other end.",
      ),
      line(
        "a[n - 1 - i] = temp;",
        "Put the saved left value into the right position.",
        "The pair is now swapped without losing either value.",
      ),
      close,
    ],
    "[2, 5, 8, 9, 1] -> [1, 9, 8, 5, 2]",
    [
      "Swap mirrored positions.",
      "Use a temporary value.",
      "Stop after half the pairs.",
    ],
  ),
  make(
    "loop-parse-base",
    "bases",
    "Read base digits as an integer",
    "Convert the digit string s in base 2, 8, or 16 into an integer. Process digits left to right; the supplied digitValue helper accepts 0..9 and uppercase A..F.",
    "base is 2, 8, or 16. s is nonempty, valid for that base, uppercase, null-terminated, and represents a value 0..4095.",
    "int parseBase(const char *s, int base) {",
    [
      line(
        "int value = 0;",
        "Start an integer named value at 0 for the empty digit prefix.",
        "Zero is the value of the empty prefix.",
      ),
      line(
        "for (int i = 0; s[i] != '\\0'; i++) {",
        "Use an integer index i, starting at 0, to read each digit until the terminator.",
        "The terminator is not a digit.",
      ),
      line(
        "value = value * base + digitValue(s[i]);",
        "Shift the old value one base place, then add this digit.",
        "For hex 2F, this computes 2 times 16 plus 15.",
      ),
      close,
      line(
        "return value;",
        "Return the decimal integer value.",
        "Every digit has contributed its correct positional weight.",
      ),
    ],
    'parseBase("2F", 16) -> 47; parseBase("101", 2) -> 5',
    [
      "Multiply the accumulated prefix by base.",
      "Add the numeric digit value, not its character code.",
      "Stop at the null terminator.",
    ],
    "int digitValue(char c) { return c <= '9' ? c - '0' : c - 'A' + 10; }",
  ),
  make(
    "loop-write-base",
    "bases",
    "Write an integer in another base",
    "Write nonnegative value in base 2, 8, or 16 into out, using uppercase digits and no leading zeros. Terminate the output string. reverseText(out, length) is supplied.",
    "0 <= value <= 4095. base is 2, 8, or 16. out is writable with at least 13 bytes. Use repeated division.",
    "void writeBase(int value, int base, char out[]) {",
    [
      line(
        'const char digits[] = "0123456789ABCDEF";',
        "Declare a constant character array named digits containing 0123456789ABCDEF.",
        "Remainders 10 through 15 need letters in hexadecimal.",
      ),
      line(
        "int length = 0;",
        "Start an integer named length at 0 to track the next output position.",
        "length tracks the next free output position.",
      ),
      line(
        "do {",
        "Extract at least one digit, even when value is zero.",
        "A while loop that never ran would print zero as an empty string.",
      ),
      line(
        "out[length++] = digits[value % base];",
        "Store the character for the remainder.",
        "The remainder is the rightmost remaining base digit.",
      ),
      line(
        "value /= base;",
        "Remove that digit by dividing by the base.",
        "Integer division leaves the unprocessed higher places.",
      ),
      line(
        "} while (value > 0);",
        "Continue until no higher places remain.",
        "Repeated division eventually reaches zero.",
      ),
      line(
        "out[length] = '\\0';",
        "Place the string terminator after the digits.",
        "C string operations need a null terminator.",
      ),
      line(
        "reverseText(out, length);",
        "Reverse the extracted digits into reading order.",
        "Remainders were produced from rightmost digit to leftmost.",
      ),
    ],
    'writeBase(47, 16, out) produces "2F"; zero produces "0".',
    [
      "Handle zero with one output digit.",
      "Map remainders to digit characters.",
      "Reverse digits and null-terminate.",
    ],
    "void reverseText(char s[], int n) { for (int i = 0; i < n / 2; i++) { char t = s[i]; s[i] = s[n - 1 - i]; s[n - 1 - i] = t; } }",
  ),
  make(
    "loop-copy-string",
    "strings",
    "Copy a C string",
    "Copy src into dst, including the null terminator, without strcpy or a library copy function.",
    "src is a valid string of at most 100 characters. dst has length + 1 writable bytes. The buffers do not overlap.",
    "void copyString(char *dst, const char *src) {",
    [
      line(
        "int i = 0;",
        "Start an integer index named i at 0, the first character.",
        "C strings use zero-based array indices.",
      ),
      line(
        "while (src[i] != '\\0') {",
        "Copy ordinary characters until the terminator.",
        "The loop condition finds where the source string ends.",
      ),
      line(
        "dst[i] = src[i];",
        "Copy this character to the same destination index.",
        "Preserving indices preserves character order.",
      ),
      line(
        "i++;",
        "Move to the next character.",
        "Without advancing, the loop would repeat forever.",
      ),
      close,
      line(
        "dst[i] = '\\0';",
        "Terminate the destination string.",
        "Copying only visible characters would leave dst without a known end.",
      ),
    ],
    '"hello" becomes h, e, l, l, o, \\0 in dst.',
    [
      "Copy all characters in order.",
      "Do not read past the terminator.",
      "Write the terminator even for an empty string.",
    ],
  ),
  make(
    "loop-count-vowels",
    "strings",
    "Count lowercase vowels",
    "Return the number of lowercase vowels a, e, i, o, u in s. Count every occurrence; other characters do not count.",
    "s is a valid null-terminated string of at most 100 characters. Uppercase letters do not count in this exercise.",
    "int countVowels(const char *s) {",
    [
      line(
        "int count = 0;",
        "Start an integer named count at 0 vowels.",
        "The empty string should return zero.",
      ),
      line(
        "for (int i = 0; s[i] != '\\0'; i++) {",
        "Use an integer index i, starting at 0, to inspect each character before the terminator.",
        "There is no separate string length argument.",
      ),
      line(
        "char c = s[i];",
        "Store the current character in a char variable named c.",
        "The next condition compares this same character several times.",
      ),
      line(
        "if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') count++;",
        "Increase the count when any vowel comparison matches.",
        "Use OR: a character only needs to match one vowel, not all five.",
      ),
      close,
      line(
        "return count;",
        "Return the number of vowel occurrences.",
        "Each character has been counted at most once.",
      ),
    ],
    'countVowels("recursion") -> 4',
    [
      "Check every character until null.",
      "Use OR between character comparisons.",
      "Count occurrences, including repeated vowels.",
    ],
  ),
];
