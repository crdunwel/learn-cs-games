import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { generateSearch } from "../src/games/search.js";
import { validateSearchQuestion } from "../src/engine/searchValidation.js";
const kinds = [
  "mid",
  "bounds",
  "result",
  "comparisons",
  "probe-value",
  "direction",
  "next-mid",
  "remaining",
  "worst-checks",
];
const draw = (value, min, max) => (value - min + 0.25) / (max - min + 1);
function question(size, start, gap, key, kind, fraction) {
  const array = Array.from({ length: size }, (_, i) => start + i * gap),
    index = array.indexOf(key);
  const values = [
    draw(size, 5, 10),
    draw(start, 1, 20),
    draw(gap, 2, 8),
    index >= 0 ? 0 : 0.9,
  ];
  if (index >= 0) values.push(draw(index, 0, size - 1));
  else
    values.push(
      draw(Math.max(0, array.indexOf(key - 1)), 0, size - 1),
      draw(key < start ? 0 : key > array.at(-1) ? 1 : 2, 0, 2),
    );
  values.push(draw(kinds.indexOf(kind), 0, 8), fraction);
  let at = 0;
  return generateSearch(() => values[at++] ?? 0.25, 3);
}

test(
  "new search C templates execute boundary arrays and all reached branch positions under sanitizers",
  { timeout: 120000 },
  (t) => {
    const functions = [],
      invocations = [];
    let number = 0;
    for (const size of [5, 10])
      for (const start of [1, 20])
        for (const gap of [2, 8]) {
          const array = Array.from({ length: size }, (_, i) => start + i * gap);
          for (const key of [
            ...new Set([
              start - 1,
              array.at(-1) + 1,
              ...array,
              ...array.map((value) => value + 1),
            ]),
          ])
            for (const kind of [
              "probe-value",
              "direction",
              "next-mid",
              "remaining",
            ])
              for (const fraction of [0, 0.25, 0.5, 0.75, 0.99]) {
                const q = question(size, start, gap, key, kind, fraction);
                validateSearchQuestion(q);
                if (q.meta.kind === "result") continue;
                const m = q.meta,
                  name = `verify_${number++}`;
                const left = key < m.value,
                  low = left ? m.low : m.mid + 1,
                  high = left ? m.mid - 1 : m.high;
                functions.push(
                  `static void ${name}(void){ int a[${size}]={${array.join(",")}};\n${q.code}\n${kind === "probe-value" ? `assert(probe==${array[m.mid]});` : `assert(low==${low}); assert(high==${high}); int count=high<low?0:high-low+1; assert(count==${Math.max(0, high - low + 1)}); if(count) assert(low+(high-low)/2==${low + Math.floor((high - low) / 2)});`} }`,
                );
                invocations.push(`${name}();`);
              }
        }
    const directory = mkdtempSync(join(tmpdir(), "cs-search-expanded-"));
    try {
      const source = join(directory, "verify.c"),
        executable = join(directory, "verify");
      writeFileSync(
        source,
        `#include <assert.h>\n${functions.join("\n")}\nint main(void){${invocations.join("\n")}return 0;}\n`,
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
        { encoding: "utf8", timeout: 90000, maxBuffer: 1024 * 1024 },
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
        `${number} actual generated search snippets checked source/answer validity, midpoint value, both next bounds, candidate count and next midpoint for boundary arrays and all reachable rounds.`,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
