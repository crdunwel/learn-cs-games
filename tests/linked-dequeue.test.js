import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildLinkedDequeueLesson,
  linkedDequeueCode,
  linkedDequeueLessons,
} from "../src/engine/linkedDequeue.js";

const scalarState = (state) => ({
  head: state.head,
  tail: state.tail,
  size: state.size,
  temp: state.temp,
  retval: state.retval,
  returned: state.returned,
  finished: state.finished,
});

test("three-node walkthrough binds one action to each actual C line", () => {
  const lesson = linkedDequeueLessons[0];
  assert.deepEqual(
    lesson.steps.map((step) => step.change),
    [
      "start",
      "guard",
      "guard",
      "retval",
      "temp",
      "head",
      "guard",
      "prev",
      "free",
      "size",
      "return",
    ],
  );
  assert.deepEqual(
    lesson.steps.map((step) => step.activeLines),
    [[], [1], [3], [5], [6], [7], [8], [9], [12], [13], [14]],
  );
  const initial = {
    head: "A",
    tail: "C",
    size: 3,
    temp: null,
    retval: null,
    returned: null,
    finished: false,
  };
  assert.deepEqual(
    lesson.steps.map(({ state }) => scalarState(state)),
    [
      initial,
      initial,
      initial,
      { ...initial, retval: 10 },
      { ...initial, retval: 10, temp: "A" },
      { ...initial, head: "B", retval: 10, temp: "A" },
      { ...initial, head: "B", retval: 10, temp: "A" },
      { ...initial, head: "B", retval: 10, temp: "A" },
      { ...initial, head: "B", retval: 10, temp: "A" },
      { ...initial, head: "B", size: 2, retval: 10, temp: "A" },
      { ...initial, head: "B", size: 2, returned: 10, finished: true },
    ],
  );
  assert.equal(lesson.steps[5].state.nodes[1].prev, "A");
  assert.equal(lesson.steps[7].state.nodes[1].prev, null);
  assert.equal(lesson.steps[7].state.nodes[0].freed, false);
  assert.equal(lesson.steps[8].state.nodes[0].freed, true);
  assert.equal(lesson.steps[8].state.temp, "A");
  assert.match(lesson.steps[5].caption, /A.next to B.*stay in place/);
  assert.match(lesson.steps[6].why, /size-- has not run/);
  assert.match(lesson.steps[8].why, /dangling.*never follows/);
  assert.match(lesson.steps[3].why, /number, not a pointer/);
});

test("empty queue returns immediately; singleton executes the tail branch", () => {
  const empty = linkedDequeueLessons[1];
  assert.deepEqual(
    empty.steps.map((step) => step.activeLines),
    [[], [1], [3], [4]],
  );
  assert.deepEqual(scalarState(empty.steps.at(-1).state), {
    head: null,
    tail: null,
    size: 0,
    temp: null,
    retval: null,
    returned: 0,
    finished: true,
  });
  assert.equal(empty.steps.at(-1).state.nodes.length, 0);
  const single = linkedDequeueLessons[2];
  assert.deepEqual(single.steps[7].activeLines, [10, 11]);
  assert.equal(single.steps[5].state.head, null);
  assert.equal(single.steps[5].state.tail, "A");
  assert.equal(single.steps[7].state.tail, null);
  assert.equal(single.steps[7].state.size, 1);
  assert.equal(single.steps[8].state.nodes[0].freed, true);
  assert.equal(single.steps.at(-1).state.size, 0);
  assert.equal(single.steps.at(-1).state.returned, 10);
  assert.equal(
    single.steps.some((step) => step.activeLines.includes(9)),
    false,
  );
});

function* inputs(length, prefix = []) {
  if (!length) yield prefix;
  else
    for (const value of [-3, 0, 4])
      yield* inputs(length - 1, [...prefix, value]);
}

test("all 1,093 queues of size 0–6 preserve exact links, values and action boundaries", () => {
  let checked = 0;
  for (let length = 0; length <= 6; length++) {
    for (const values of inputs(length)) {
      const before = [...values];
      const lesson = buildLinkedDequeueLesson(values);
      assert.deepEqual(values, before);
      const ids = values.map((_, index) => String.fromCharCode(65 + index));
      for (const [position, step] of lesson.steps.entries()) {
        assert.equal(step.type, "linkedQueue");
        assert(step.caption.length < 160);
        assert(step.title && step.why);
        for (const line of step.activeLines) assert(linkedDequeueCode[line]);
        assert.equal(step.state.queueExists, true);
        assert.equal(step.state.nodes.length, length);
        // Nodes keep their physical identity and value. Only B.prev and A's
        // allocation lifetime change; moving head never moves/relinks A.
        for (const [index, node] of step.state.nodes.entries()) {
          assert.equal(node.id, ids[index]);
          assert.equal(node.value, values[index]);
          assert.equal(node.next, ids[index + 1] ?? null);
          assert.equal(
            node.prev,
            index === 1 && position >= 7 ? null : (ids[index - 1] ?? null),
          );
          assert.equal(node.freed, index === 0 && position >= 8);
        }
        if (length) {
          assert.equal(step.state.head, position >= 5 ? (ids[1] ?? null) : "A");
          assert.equal(
            step.state.tail,
            length === 1 && position >= 7 ? null : ids.at(-1),
          );
          assert.equal(step.state.size, position >= 9 ? length - 1 : length);
          assert.equal(
            step.state.temp,
            position >= 4 && position < 10 ? "A" : null,
          );
          assert.equal(
            step.state.retval,
            position >= 3 && position < 10 ? values[0] : null,
          );
          assert.equal(step.state.returned, position === 10 ? values[0] : null);
          assert.equal(step.state.finished, position === 10);
        }
        if (position) {
          assert.notEqual(step.state, lesson.steps[position - 1].state);
          if (step.change === "guard")
            assert.deepEqual(step.state, lesson.steps[position - 1].state);
        }
      }
      const last = lesson.steps.at(-1).state;
      assert.equal(last.head, ids[1] ?? null);
      assert.equal(last.tail, length > 1 ? ids.at(-1) : null);
      assert.equal(last.size, Math.max(0, length - 1));
      assert.equal(last.returned, values[0] ?? 0);
      assert.equal(last.temp, null);
      assert.equal(last.retval, null);
      assert.equal(last.finished, true);
      const remaining = last.nodes.filter((node) => !node.freed);
      assert.deepEqual(
        remaining.map((node) => node.value),
        values.slice(1),
      );
      assert.equal(remaining[0]?.prev ?? null, null);
      assert.equal(remaining.at(-1)?.next ?? null, null);
      checked++;
    }
  }
  assert.equal(checked, 1093);
});

test("snapshots are isolated and immutable, and unsupported C inputs fail explicitly", () => {
  const values = [10, 20, 30];
  const lesson = buildLinkedDequeueLesson(values);
  values[0] = 90;
  assert.equal(lesson.steps[0].state.nodes[0].value, 10);
  assert.throws(() => {
    lesson.steps[8].state.nodes[0].value = 99;
  }, TypeError);
  assert.throws(() => {
    lesson.steps[5].state.head = "C";
  }, TypeError);
  assert.equal(lesson.steps[0].state.nodes[0].freed, false);
  assert.equal(lesson.steps[5].state.nodes[1].prev, "A");
  assert.equal(lesson.steps[7].state.nodes[1].prev, null);
  for (const invalid of [
    null,
    [NaN],
    [1.5],
    [2147483648],
    [-2147483649],
    ["10"],
    Array(7).fill(1),
    Array(1),
  ])
    assert.throws(() => buildLinkedDequeueLesson(invalid), TypeError);
  assert.equal(buildLinkedDequeueLesson([0]).steps.at(-1).state.returned, 0);
  for (const value of [-2147483648, 2147483647])
    assert.equal(
      buildLinkedDequeueLesson([value]).steps.at(-1).state.returned,
      value,
    );
});

test(
  "the exact displayed C dequeues every finite example safely under sanitizers",
  { timeout: 120000 },
  (t) => {
    const directory = mkdtempSync(join(tmpdir(), "cs-linked-dequeue-"));
    try {
      const source = join(directory, "verify.c"),
        executable = join(directory, "verify");
      writeFileSync(
        source,
        `#include <assert.h>
#include <stdlib.h>
#include <limits.h>
typedef struct node { int data; struct node *next, *prev; } node;
typedef struct queue { int size; struct node *head, *tail; } queue;
static int freed;
static void tracked_free(void *p) { assert(p != NULL); freed++; free(p); }
#define free tracked_free
${linkedDequeueCode.join("\n")}
#undef free
static void check(const int values[], int length) {
  node *nodes[6];
  for (int i = 0; i < length; i++) {
    nodes[i] = malloc(sizeof *nodes[i]); assert(nodes[i] != NULL);
    nodes[i]->data = values[i];
  }
  for (int i = 0; i < length; i++) {
    nodes[i]->next = i + 1 < length ? nodes[i + 1] : NULL;
    nodes[i]->prev = i > 0 ? nodes[i - 1] : NULL;
  }
  queue q = {length, length ? nodes[0] : NULL, length ? nodes[length - 1] : NULL};
  freed = 0;
  int result = dequeue(&q);
  assert(result == (length ? values[0] : 0));
  assert(freed == (length ? 1 : 0));
  assert(q.size == (length ? length - 1 : 0));
  assert(q.head == (length > 1 ? nodes[1] : NULL));
  assert(q.tail == (length > 1 ? nodes[length - 1] : NULL));
  node *current = q.head, *previous = NULL;
  for (int i = 1; i < length; i++) {
    assert(current == nodes[i]); assert(current->data == values[i]);
    assert(current->prev == previous);
    assert(current->next == (i + 1 < length ? nodes[i + 1] : NULL));
    previous = current; current = current->next;
  }
  assert(current == NULL);
  for (int i = 1; i < length; i++) free(nodes[i]);
}
static int count;
static void enumerate(int values[], int index, int length) {
  if (index == length) { check(values, length); count++; return; }
  const int domain[] = {-3, 0, 4};
  for (int i = 0; i < 3; i++) { values[index] = domain[i]; enumerate(values, index + 1, length); }
}
int main(void) {
  int values[6];
  for (int length = 0; length <= 6; length++) enumerate(values, 0, length);
  assert(count == 1093);
  const int extremes[] = {INT_MIN, INT_MAX}; check(extremes, 2);
  freed = 0; assert(dequeue(NULL) == 0); assert(freed == 0);
  return 0;
}
`,
      );
      const compiled = spawnSync(
        process.env.CC || "clang",
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
        "Exact displayed dequeue C: 1,093 queues of sizes 0–6, NULL queue, extreme ints; forward/backward links, one free, result, endpoints and count checked under ASan/UBSan.",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
