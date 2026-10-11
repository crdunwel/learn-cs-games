import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { generateMemory } from "../src/games/memory.js";
import { gradeMallocAnswer } from "../src/engine/mallocAnswer.js";
import { validateMallocQuestion } from "../src/engine/mallocValidation.js";

function generated(variant, count = 12, length = 2) {
  const values = [
    12.25 / 13,
    (count - 12 + 0.25) / 229,
    (variant + 0.25) / 6,
    (length - 2 + 0.25) / 95,
  ];
  return validateMallocQuestion(
    generateMemory(() => values.shift() ?? 0.25, 2),
  );
}

test(
  "every malloc model scalar size and equivalent line forms execute as strict C with sanitizers",
  { timeout: 120000 },
  (t) => {
    const compiler = process.env.CC || "clang";
    assert.equal(
      spawnSync(compiler, ["--version"], { encoding: "utf8" }).status,
      0,
      "C11 compiler is required for malloc model validation.",
    );
    const blocks = [];
    function verify(q, line = q.steps[0].answer) {
      const step = q.steps[0],
        { name, count, elementBytes } = step.allocation;
      assert.equal(gradeMallocAnswer(step, line).correct, true, line);
      const declaration = line.startsWith(name)
        ? `${step.allocation.type} *${name};`
        : "";
      blocks.push(
        `{${q.code}\n${declaration}\n${line.replace("malloc(", "record_malloc(")}\n_Static_assert(sizeof *${name}==${elementBytes},"stated native size");assert(${name});assert(last_size==${count * elementBytes});memset(${name},0,last_size);free(${name});}`,
      );
    }
    // Every distinct array count, every string length, and the one-struct case.
    for (let count = 12; count <= 240; count++)
      for (const variant of [0, 1, 2, 5]) verify(generated(variant, count));
    for (let length = 2; length <= 96; length++)
      verify(generated(3, 12, length));
    verify(generated(4));
    // Syntax equivalences execute on each type at both scalar boundaries.
    for (let variant = 0; variant < 6; variant++)
      for (const count of [12, 240]) {
        const q = generated(variant, count, count === 12 ? 2 : 96);
        const a = q.steps[0].allocation;
        for (const line of [
          `${a.name}=malloc(${a.count}*sizeof(${a.type}));`,
          `${a.type} *${a.name}=(${a.type} *)malloc(sizeof *${a.name}*(${a.count}+1-1));`,
          `${a.name} = (void *)malloc(${a.count * a.elementBytes});`,
          `${a.name}=malloc(${a.count}U*sizeof(${a.name}[0]));`,
          `${a.type} *${a.name}=((malloc(${a.count} * sizeof((*( ${a.name} ))))));`,
          `${a.type} *${a.name}=(${a.type} *)(malloc(${a.count * a.elementBytes} + +0));`,
        ])
          verify(q, line);
      }
    const directory = mkdtempSync(join(tmpdir(), "cs-club-malloc-proof-"));
    try {
      const source = join(directory, "malloc.c"),
        executable = join(directory, "malloc-proof");
      writeFileSync(
        source,
        `#include <stdlib.h>\n#include <string.h>\n#include <assert.h>\nstatic size_t last_size;\nstatic void *record_malloc(size_t bytes){last_size=bytes;return malloc(bytes);}\nint main(void){\n${blocks.join("\n")}\nreturn 0;}\n`,
      );
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
          source,
          "-o",
          executable,
        ],
        { encoding: "utf8", timeout: 90000, maxBuffer: 1024 * 1024 },
      );
      assert.equal(compiled.status, 0, compiled.stderr);
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
        `${blocks.length} model/equivalent allocation lines compiled and executed with independent requested-byte assertions and Address/UndefinedBehaviorSanitizer.`,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
