import { gradeMallocAnswer } from "./mallocAnswer.js";
// Shared, bounded parsers for practice and exam answers. Never execute user code.
import { growthSignature } from "./growthNotation.js";

export const operatorGlyphs = (value) =>
  String(value).replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/");
export const compactAnswer = (value) =>
  operatorGlyphs(value).toUpperCase().replace(/\s+/g, "");
const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const arithmeticText = (value) =>
  operatorGlyphs(value)
    .replace(
      /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,
      (digits) =>
        "^" + [...digits].map((d) => superscripts.indexOf(d)).join(""),
    )
    .replace(/\*\*/g, "^");

const gcd = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
};
function rational(n, d = 1n) {
  if (!d || n.toString().length > 100 || d.toString().length > 100)
    throw Error("Out of range");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n, d);
  return [n / divisor, d / divisor];
}
function decimal(token) {
  const [mantissa, exponent = "0"] = token.toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const shift = Number(exponent) - fraction.length;
  if (Math.abs(shift) > 30) throw Error("Out of range");
  const n = BigInt((whole || "0") + fraction);
  return shift >= 0
    ? rational(n * 10n ** BigInt(shift))
    : rational(n, 10n ** BigInt(-shift));
}
function add([a, b], [c, d], sign = 1n) {
  return rational(a * d + sign * c * b, b * d);
}
function multiply([a, b], [c, d]) {
  return rational(a * c, b * d);
}

// Exact fractions prevent rounding from awarding a nearby but incorrect number.
// This grammar accepts only arithmetic, not identifiers, calls, JS, or assignment.
export function numericValue(value, unit) {
  try {
    let text = arithmeticText(value).trim().toLowerCase();
    if (!text || text.length > 180) return null;
    let factor = [1n, 1n];
    const suffix = text.match(
      /\s*(milliseconds?|msecs?|ms|seconds?|secs?|s|bytes?|b)\.?$/,
    );
    if (suffix) {
      const label = suffix[1];
      if (unit === "seconds" && /^(milliseconds?|msecs?|ms)$/.test(label))
        factor = [1n, 1000n];
      else if (
        !(unit === "seconds" && /^(seconds?|secs?|s)$/.test(label)) &&
        !(unit === "bytes" && /^(bytes?|b)$/.test(label))
      )
        return null;
      text = text.slice(0, suffix.index).trim();
    }
    // Only conventional thousands groups; "1,6" is not quietly turned into 16.
    text = text.replace(/\b\d{1,3}(?:,\d{3})+(?!\d)/g, (number) =>
      number.replaceAll(",", ""),
    );
    const tokens =
      text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[()+*/^\-]/g) || [];
    if (tokens.join("") !== text.replace(/\s+/g, "") || tokens.length > 100)
      return null;
    let i = 0;
    const take = (token) => tokens[i] === token && (++i, true);
    function atom() {
      if (take("(")) {
        const result = sum();
        if (!take(")")) throw Error("Missing )");
        return result;
      }
      const token = tokens[i++];
      if (!token || !/^[\d.]/.test(token)) throw Error("Expected number");
      return decimal(token);
    }
    function power() {
      let result = atom();
      if (take("^")) {
        const [n, d] = unary();
        if (d !== 1n || n < -30n || n > 30n) throw Error("Invalid power");
        result =
          n < 0n
            ? rational(result[1] ** -n, result[0] ** -n)
            : rational(result[0] ** n, result[1] ** n);
      }
      return result;
    }
    function unary() {
      if (take("+")) return unary();
      if (take("-")) {
        const [n, d] = unary();
        return [-n, d];
      }
      return power();
    }
    function product() {
      let result = unary();
      while (tokens[i] === "*" || tokens[i] === "/") {
        const op = tokens[i++],
          right = unary();
        result = multiply(
          result,
          op === "/" ? rational(right[1], right[0]) : right,
        );
      }
      return result;
    }
    function sum() {
      let result = product();
      while (tokens[i] === "+" || tokens[i] === "-") {
        const op = tokens[i++];
        result = add(result, product(), op === "+" ? 1n : -1n);
      }
      return result;
    }
    const result = multiply(sum(), factor);
    return i === tokens.length ? result.map(String).join("/") : null;
  } catch {
    return null;
  }
}

function radixValue(value, radix) {
  let text = String(value).trim().toUpperCase();
  const subscript = text.match(/[₀₁₂₃₄₅₆₇₈₉]+$/);
  if (subscript) {
    const base = [...subscript[0]].map((d) => "₀₁₂₃₄₅₆₇₈₉".indexOf(d)).join("");
    if (Number(base) !== radix) return null;
    text = text.slice(0, subscript.index).trim();
  }
  const suffix = text.match(
    /(?:\s*\(\s*(?:BASE\s*)?(2|8|10|16)\s*\)|_(2|8|10|16))$/,
  );
  if (suffix) {
    if (Number(suffix[1] || suffix[2]) !== radix) return null;
    text = text.slice(0, suffix.index).trim();
  }
  if (text.startsWith("(") && text.endsWith(")")) text = text.slice(1, -1);
  text = text.replace(/[\s_]/g, "").replace(/^\+/, "");
  // 0B is also a valid zero-padded hexadecimal number (eleven).
  const rawPattern = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^\d+$/,
    16: /^[0-9A-F]+$/,
  }[radix];
  if (rawPattern?.test(text)) return text.replace(/^0+(?=.)/, "");
  const prefix = text.match(/^0([BOX])/);
  if (prefix) {
    if ({ B: 2, O: 8, X: 16 }[prefix[1]] !== radix) return null;
    text = text.slice(2);
  }
  const pattern = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^\d+$/,
    16: /^[0-9A-F]+$/,
  }[radix];
  return pattern?.test(text) ? text.replace(/^0+(?=.)/, "") : null;
}

function sequenceValue(value) {
  let text = operatorGlyphs(value).trim();
  if (/^[[(]/.test(text) && /[\])]$/.test(text)) text = text.slice(1, -1);
  text = text
    .replace(/^head\s*(?::|->|→)\s*/i, "")
    .replace(/(?:\s|,|;|->|→)*(?:NULL|∅)\s*$/i, "");
  const tokens = text
    .replace(/->|→|,|;/g, " ")
    .trim()
    .split(/\s+/);
  if (!tokens.every((token) => /^[+-]?\d+(?:\.0+)?$/.test(token))) return null;
  return tokens
    .map((token) => BigInt(token.replace(/\.0+$/, "")).toString())
    .join(",");
}
function stackValue(value) {
  let text = operatorGlyphs(value).trim().toUpperCase();
  if (/^(EMPTY(?: STACK)?|NONE|NULL|\[\]|∅)$/.test(text)) return "";
  text = text
    .replace(/^TOP\s*:?\s*(?:->|→)?/, "")
    .replace(/(?:->|→)?\s*:?\s*BOTTOM$/, "");
  if (text.startsWith("[") && text.endsWith("]")) text = text.slice(1, -1);
  text = text.replace(/->|→|[\s,;]/g, "");
  return /^[+*/(\-]*$/.test(text) ? text : null;
}

// Compact postfix is interpreted using the supplied expression's operands.
// If the student DOES delimit adjacent numbers, those boundaries must be correct:
// "1 23 +" and "12 3 +" are different answers, even though "123+" is allowed.
export function equalPostfix(value, answer) {
  const text = operatorGlyphs(value).toUpperCase().trim().replace(/[;,]/g, " ");
  const expected = operatorGlyphs(answer).toUpperCase().trim().split(/\s+/);
  if (!/^[\sA-Z\d+*/\-]+$/.test(text)) return false;
  const compact = text.replace(/\s+/g, "");
  if (compact !== expected.join("")) return false;
  const boundaries = new Set();
  let offset = 0;
  for (const token of expected) {
    offset += token.length;
    boundaries.add(offset);
  }
  for (const match of text.matchAll(/\s+/g)) {
    const left = text[match.index - 1],
      right = text[match.index + match[0].length];
    if (/\d/.test(left || "") && /\d/.test(right || "")) {
      const at = text.slice(0, match.index).replace(/\s+/g, "").length;
      if (!boundaries.has(at)) return false;
    }
  }
  return true;
}

export function equalAnswer(part, value) {
  if (part.format === "malloc") return gradeMallocAnswer(part, value).correct;
  const draft = Array.isArray(value) ? value.join(" ") : String(value ?? "");
  if (part.kind === "stack") {
    // Practice's empty array is an intentional empty-stack answer; exam blanks aren't.
    if (!draft.trim() && !Array.isArray(value)) return false;
    const actual = stackValue(draft),
      expected = stackValue(part.answer || "empty");
    return actual !== null && actual === expected;
  }
  if (!draft.trim()) return false;
  if (part.kind === "postfix") return equalPostfix(draft, part.answer);
  if (part.radix) {
    const actual = radixValue(draft, part.radix);
    return actual !== null && actual === radixValue(part.answer, part.radix);
  }
  if (part.format === "bigO") {
    const actual = growthSignature(draft);
    return actual !== null && actual === growthSignature(part.answer);
  }
  if (part.format === "sequence") {
    const actual = sequenceValue(draft);
    return actual !== null && actual === sequenceValue(part.answer);
  }
  if (
    part.kind === "number" ||
    (part.kind === "input" && /^[+-]?\d+(?:\.\d+)?$/.test(part.answer))
  ) {
    const actual = numericValue(draft, part.unit);
    return actual !== null && actual === numericValue(part.answer, part.unit);
  }
  return compactAnswer(draft) === compactAnswer(part.answer);
}

// Examples describe notation, never reveal the generated answer.
export function answerFormatHint(part) {
  if (part.kind === "code" || part.auto === false)
    return "Equivalent solutions count. Review your reasoning with the rubric after submitting.";
  if (part.format === "bigO")
    return "Use the code’s variables. Formats: O(n²), n^2, n*n; O(n log n), n*log(n).";
  if (part.format === "sequence")
    return "Keep head → tail order. Spaces, commas, arrows, or [brackets] all work; NULL is optional.";
  if (part.kind === "stack")
    return "Top → bottom. Separate items with spaces, commas, or arrows—or write empty.";
  if (part.kind === "postfix")
    return "Spaces or commas are optional. Keep each number and the operand order unchanged.";
  if (part.radix)
    return `Write base-${part.radix} digits. Leading zeros, spacing, letter case, and a matching base label are fine.`;
  if (part.unit === "seconds")
    return "Seconds by default. Decimals, fractions, or arithmetic work; e.g. 0.5, 1/2, 0.5 s, or 500 ms.";
  if (part.unit === "bytes")
    return "Decimals or arithmetic work; “bytes” is optional.";
  if (part.kind === "number" || part.kind === "input")
    return "A number or equivalent arithmetic works: 12, 12.0, or 3*4.";
  return "";
}
