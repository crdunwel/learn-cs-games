import test from "node:test";
import assert from "node:assert/strict";
import { seeded } from "../src/engine/random.js";
import { generateLinks, linksLessons } from "../src/games/links.js";
import {
  generateSearch,
  searchLessons,
  traceSearch,
} from "../src/games/search.js";
import { generateMemory, memoryLessons } from "../src/games/memory.js";

const chain = (values) => `${values.join(" → ")} → NULL`;
function searchOracle(array, key) {
  let lo = 0,
    hi = array.length - 1;
  const visits = [];
  while (hi >= lo) {
    const i = Math.floor((lo + hi) / 2);
    visits.push(i);
    if (array[i] === key) return { index: i, visits };
    if (array[i] > key) hi = i - 1;
    else lo = i + 1;
  }
  return { index: -1, visits };
}
function assertQuestion(q) {
  assert.equal(q.type, "trace");
  assert.ok(q.code);
  assert.ok(q.visual.items.length);
  for (const step of q.steps) {
    assert.equal(typeof step.answer, "string");
    assert.ok(step.explanation.length > 60);
    assert.ok(step.illustration.length > 0 && step.illustration.length <= 4);
    if (step.kind === "choice") {
      assert.ok(step.options.length >= 2);
      assert.equal(new Set(step.options).size, step.options.length);
      assert.equal(
        step.options.filter((option) => option === step.answer).length,
        1,
      );
    }
  }
}

test("linked-list generation matches independent insert and mutation models", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 2000; seed++) {
    const q = generateLinks(seeded(seed), 3);
    const m = q.meta,
      answer = q.steps[0].answer;
    seen.add(m.kind);
    assertQuestion(q);
    if (m.kind === "insert") {
      const expected = [...m.values];
      expected.splice(Math.min(m.p, m.values.length + 1) - 1, 0, m.x);
      assert.equal(answer, chain(expected));
      assert.equal(expected.length, m.values.length + 1);
      assert.deepEqual(
        expected.filter((value) => value !== m.x),
        m.values,
      );
    } else if (m.kind === "mutation") {
      const expected = [];
      for (const value of m.values) {
        expected.push(value);
        if (value % 2 === m.parity) expected.push(value + m.offset);
      }
      assert.equal(answer, chain(expected));
    } else if (m.kind === "pointer-order") {
      assert.equal(answer, "tmp->next = current->next;\ncurrent->next = tmp;");
      assert.ok(m.index >= 0 && m.index < m.values.length - 1);
    } else {
      assert.equal(answer, "byeList(head->next);\nfree(head);");
      assert.match(q.code, /if \(head == NULL\) return;/);
    }
  }
  assert.deepEqual([...seen].sort(), [
    "free",
    "insert",
    "mutation",
    "pointer-order",
  ]);
});

test("binary-search questions agree with an independent full search", () => {
  const seen = new Set();
  let absent = 0,
    found = 0,
    oneCandidate = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    const q = generateSearch(seeded(seed), 3),
      m = q.meta;
    assertQuestion(q);
    seen.add(m.kind);
    assert.ok(m.array.every((v, i) => i === 0 || v > m.array[i - 1]));
    assert.ok(m.low >= 0 && m.high < m.array.length && m.low <= m.high);
    const expected = searchOracle(m.array, m.target);
    if (expected.index === -1) absent++;
    else found++;
    if (m.low === m.high) oneCandidate++;
    if (m.kind === "result")
      assert.equal(q.steps[0].answer, String(m.array.indexOf(m.target)));
    if (m.kind === "comparisons")
      assert.equal(q.steps[0].answer, String(expected.visits.length));
    if (m.kind === "mid")
      assert.equal(q.steps[0].answer, String(Math.floor((m.low + m.high) / 2)));
    if (m.kind === "bounds") {
      const mid = Math.floor((m.low + m.high) / 2);
      assert.notEqual(m.target, m.array[mid]);
      const answer =
        m.target < m.array[mid] ? `high = ${mid - 1}` : `low = ${mid + 1}`;
      assert.equal(q.steps[0].answer, answer);
    }
  }
  assert.ok(absent > 100 && found > 100 && oneCandidate > 100);
  assert.deepEqual([...seen].sort(), [
    "bounds",
    "comparisons",
    "mid",
    "result",
  ]);
});

test("binary-search traces terminate at empty and single-item boundaries", () => {
  for (const [array, target, index, count] of [
    [[], 4, -1, 0],
    [[4], 4, 0, 1],
    [[4], 3, -1, 1],
    [[4], 5, -1, 1],
    [[2, 4], 4, 1, 2],
    [[2, 4], 3, -1, 2],
    [[2, 4, 6], 6, 2, 2],
  ]) {
    const result = traceSearch(array, target);
    assert.equal(result.index, index);
    assert.equal(result.rounds.length, count);
  }
});

test("dynamic-memory answers respect byte counts, preservation, and ownership", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 2000; seed++) {
    const q = generateMemory(seeded(seed), 3),
      m = q.meta;
    assertQuestion(q);
    const answer = q.steps[0].answer;
    seen.add(m.kind);
    if (m.kind === "calloc")
      assert.equal(answer, `int *scores = calloc(${m.count}, sizeof *scores);`);
    if (m.kind === "bytes") assert.equal(Number(answer), m.count * m.bytes);
    if (m.kind === "string") assert.equal(Number(answer), m.length + 1);
    if (m.kind === "resize") {
      assert.ok(m.nextCount > m.oldValues.length);
      assert.equal(Number(answer), m.oldValues[m.index]);
      assert.match(q.steps[0].explanation, /uninitialized/);
    }
    if (m.kind === "realloc") {
      assert.ok(m.nextCount > m.count);
      assert.match(q.code, /Required policy on failure: free the old array/);
      assert.equal(answer, 'free(scores);\nscores = NULL;\nprintf("failed");');
    }
    if (m.kind === "free-order") {
      assert.equal(answer, "Free each authors[i] → free authors → free book");
      assert.match(q.steps[0].explanation, /title needs no separate free/);
    }
  }
  assert.deepEqual([...seen].sort(), [
    "bytes",
    "calloc",
    "free-order",
    "realloc",
    "resize",
    "string",
  ]);
});

test("every new game offers over 100 distinct generated variants at each difficulty", () => {
  for (const generate of [generateLinks, generateSearch, generateMemory]) {
    for (const level of [1, 2, 3]) {
      const variants = new Set();
      for (let seed = 1; seed <= 1000; seed++) {
        const q = generate(seeded(seed), level);
        variants.add(
          JSON.stringify([
            q.code,
            q.visual,
            q.steps.map((s) => [s.prompt, s.answer]),
          ]),
        );
      }
      assert.ok(
        variants.size > 100,
        `${generate.name} level ${level}: ${variants.size}`,
      );
    }
  }
});

test("new games each include at least three complete guided examples", () => {
  for (const lessons of [linksLessons, searchLessons, memoryLessons]) {
    assert.ok(lessons.length >= 3);
    assert.equal(new Set(lessons.map((l) => l.id)).size, lessons.length);
    for (const lesson of lessons) {
      assert.ok(lesson.steps.length >= 3);
      for (const step of lesson.steps) {
        assert.equal(step.type, "trace");
        assert.ok(step.caption && step.code && step.visual && step.result);
      }
    }
  }
});
