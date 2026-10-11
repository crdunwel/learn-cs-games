// Bounded comparison of taught C solutions. Student text is never executed.
import { structureExercises } from "../data/cWritingStructures.js";
import { algorithmExercises } from "../data/cWritingAlgorithms.js";

export const writingExercises = [...structureExercises, ...algorithmExercises];
export const writingTopics = [...new Set(writingExercises.map((q) => q.topic))];
export const writingById = (id) => writingExercises.find((q) => q.id === id);
export const modelFunction = (q) =>
  [q.signature, ...q.lines.map((l) => l.code), "}"].join("\n");

// Preserve token boundaries, operators and the contents of quoted literals.
// Whitespace/comments are presentation; changing '++' to '+ +' is not.
export function cTokens(source) {
  const tokens = [];
  if (/\\\r?\n|\?\?\//.test(source))
    return {
      error:
        "Line continuations need manual review. Use ordinary lines for automatic checking.",
      tokens,
    };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const space = rest.match(/^\s+/);
    if (space) {
      i += space[0].length;
      continue;
    }
    if (rest.startsWith("//")) {
      const end = rest.indexOf("\n");
      i += end < 0 ? rest.length : end;
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/", 2);
      if (end < 0) return { error: "Close the comment with */.", tokens };
      i += end + 2;
      continue;
    }
    if (rest[0] === '"' || rest[0] === "'") {
      const quote = rest[0];
      let end = 1;
      while (end < rest.length && rest[end] !== quote && rest[end] !== "\n") {
        if (rest[end] === "\\") end++;
        end++;
      }
      if (rest[end] !== quote)
        return { error: "Close the quoted text before continuing.", tokens };
      tokens.push(rest.slice(0, end + 1));
      i += end + 1;
      continue;
    }
    const match = rest.match(
      /^(?:[A-Za-z_]\w*|0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUlLfF]*|>>=|<<=|->|\+\+|--|==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|%=|<<|>>|[{}()[\];,.?:~!+*\/%<>=&|^-])/,
    );
    if (!match)
      return {
        error: `Check the character ${JSON.stringify(rest[0])}. C uses plain quotes and operators.`,
        tokens,
      };
    tokens.push(match[0]);
    i += match[0].length;
  }
  return { tokens };
}

function matchPattern(actual, start, source) {
  const parsed = cTokens(source);
  if (parsed.error) throw new Error(`Invalid authored C: ${source}`);
  let position = start,
    missing = 0,
    depth = 0;
  for (const token of parsed.tokens) {
    if (token === ";" && depth === 0 && actual[position] !== ";") {
      missing++;
      continue;
    }
    if (actual[position] !== token) return null;
    position++;
    if (token === "(") depth++;
    if (token === ")") depth--;
  }
  return { position, missing };
}

export function compareC(source, sections) {
  if (!source.trim())
    return { kind: "empty", message: "Write your code first." };
  if (source.length > 24000)
    return {
      kind: "review",
      message:
        "This answer is longer than this exercise needs. Compare it with the sample solution.",
    };
  const parsed = cTokens(source);
  if (parsed.error) return { kind: "syntax", message: parsed.error };
  let states = [{ position: 0, missing: 0 }];
  for (const section of sections) {
    const next = new Map();
    for (const state of states)
      for (const candidate of section) {
        const result = matchPattern(parsed.tokens, state.position, candidate);
        if (result) {
          result.missing += state.missing;
          if (
            !next.has(result.position) ||
            result.missing < next.get(result.position).missing
          )
            next.set(result.position, result);
        }
      }
    states = [...next.values()];
    if (!states.length) break;
  }
  const result = states.find(
    (state) => state.position === parsed.tokens.length,
  );
  if (!result)
    return {
      kind: "review",
      message: "This needs review. Compare with the guided approach.",
    };
  if (result.missing)
    return {
      kind: "minor",
      missing: result.missing,
      message: `Logic matches. Add ${result.missing === 1 ? "the missing semicolon" : `${result.missing} missing semicolons`} to finish the C syntax.`,
    };
  return { kind: "matched", message: "That fits. Keep going." };
}

export const checkWritingLine = (source, line) =>
  compareC(source, [[line.code, ...(line.accept || [])]]);
export const checkWritingFunction = (source, q) =>
  compareC(source, [
    [q.signature],
    ...q.lines.map((line) => [line.code, ...(line.accept || [])]),
    ["}"],
  ]);
export const isRecognized = (result) =>
  ["matched", "minor"].includes(result?.kind);

// Reject a malformed authored catalog rather than silently serving partial work.
export function validateWritingCatalog(catalog) {
  const ids = new Set();
  for (const q of catalog) {
    if (
      !q.id ||
      ids.has(q.id) ||
      !q.title ||
      !q.topic ||
      !q.prompt ||
      !q.assumptions ||
      !q.signature ||
      !q.example ||
      !q.rubric?.length ||
      !q.lines?.length
    )
      throw new Error(`Incomplete C exercise: ${q.id}`);
    ids.add(q.id);
    if (cTokens(q.signature).error || !q.signature.trim().endsWith("{"))
      throw new Error(`Invalid signature: ${q.id}`);
    for (const line of q.lines) {
      if (
        !line.code ||
        (!line.fixed && (!line.hint || !line.why)) ||
        cTokens(line.code).error
      )
        throw new Error(`Incomplete C line: ${q.id}`);
    }
    if (!q.lines.some((line) => !line.fixed))
      throw new Error(`No writing in ${q.id}`);
    if (checkWritingFunction(modelFunction(q), q).kind !== "matched")
      throw new Error(`Invalid C model: ${q.id}`);
  }
  return catalog;
}
validateWritingCatalog(writingExercises);

export const WRITING_KEY = "cs-club-c-writing-v1";
export function exerciseVersion(q) {
  let hash = 2166136261;
  // Copy and indentation edits must not discard a student's work.
  const contract = [
    q.setup || "",
    cTokens(q.signature).tokens,
    q.lines.map((line) => [
      cTokens(line.code).tokens,
      !!line.fixed,
      (line.accept || []).map((code) => cTokens(code).tokens),
    ]),
  ];
  for (const char of JSON.stringify(contract))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
export const emptyWritingDraft = () => ({
  lines: {},
  raw: null,
  reviewed: false,
});
export function loadWriting(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(WRITING_KEY) || "null");
    if (
      saved?.version !== 1 ||
      !saved.drafts ||
      typeof saved.drafts !== "object"
    )
      return {};
    const result = {};
    for (const q of writingExercises) {
      const d = saved.drafts[q.id];
      if (!d) continue;
      if (d.version !== exerciseVersion(q)) {
        const previous = [
          typeof d.raw === "string" ? `Earlier whole function:\n${d.raw}` : "",
          typeof d.snapshot === "string"
            ? `Earlier guided work:\n${d.snapshot}`
            : Object.values(d.lines || {})
                .filter((value) => typeof value === "string")
                .join("\n"),
          typeof d.previous === "string" ? d.previous : "",
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 48000);
        result[q.id] = { ...emptyWritingDraft(), previous };
        continue;
      }
      const lines = {};
      q.lines.forEach((line, i) => {
        if (!line.fixed && typeof d.lines?.[i] === "string")
          lines[i] = d.lines[i].slice(0, 4000);
      });
      result[q.id] = {
        lines,
        raw: typeof d.raw === "string" ? d.raw.slice(0, 24000) : null,
        reviewed: d.reviewed === true,
        ...(typeof d.previous === "string"
          ? { previous: d.previous.slice(0, 48000) }
          : {}),
      };
    }
    return result;
  } catch {
    return {};
  }
}
export function saveWriting(storage, drafts) {
  try {
    if (!storage) return false;
    const known = {};
    for (const q of writingExercises)
      if (drafts[q.id])
        known[q.id] = {
          ...drafts[q.id],
          version: exerciseVersion(q),
          snapshot: [
            q.signature,
            ...q.lines.map((line, i) =>
              line.fixed ? line.code : drafts[q.id].lines?.[i] || "",
            ),
            "}",
          ].join("\n"),
        };
    storage.setItem(WRITING_KEY, JSON.stringify({ version: 1, drafts: known }));
    return true;
  } catch {
    return false;
  }
}
export function writingCompletion(q, draft) {
  if (!draft) return "new";
  const linesDone = q.lines.every(
    (line, i) =>
      line.fixed ||
      isRecognized(checkWritingLine(draft.lines?.[i] || "", line)),
  );
  if (linesDone || isRecognized(checkWritingFunction(draft.raw || "", q)))
    return "complete";
  return draft.reviewed ? "reviewed" : "started";
}
