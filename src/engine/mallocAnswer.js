// Bounded single-line allocation grading. Parse meaning; never execute student C.
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
// Every admitted nonnegative intermediate fits even C's minimum INT_MAX.
const LIMIT = 32_767;

// Remove only parentheses that enclose the entire expression.
function ungroup(tokens) {
  while (tokens[0] === "(" && tokens.at(-1) === ")") {
    let depth = 0,
      enclosesAll = true;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === "(") depth++;
      if (tokens[i] === ")") depth--;
      if (depth < 0 || (depth === 0 && i < tokens.length - 1)) {
        enclosesAll = false;
        break;
      }
    }
    if (!enclosesAll || depth !== 0) break;
    tokens = tokens.slice(1, -1);
  }
  return tokens;
}
function measuresElement(tokens, name) {
  const operand = ungroup(tokens);
  if (operand[0] === "*") return same(ungroup(operand.slice(1)), [name]);
  if (same(operand.slice(-3), ["[", "0", "]"]))
    return same(ungroup(operand.slice(0, -3)), [name]);
  return false;
}

function tokensFor(draft) {
  const text = String(draft ?? "");
  if (text.length > 600) throw Error("Write one short malloc assignment.");
  const source = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
  const tokens =
    source.match(
      /[A-Za-z_]\w*|\d+(?:[uU](?:(?:ll|LL|[lL]))?|(?:ll|LL|[lL])[uU]?)?|\+\+|--|[=;()+*\/\-\[\]]/g,
    ) || [];
  if (tokens.join("") !== source.replace(/\s/g, "") || tokens.length > 160)
    throw Error(
      "Use one malloc assignment, with numbers, arithmetic, and sizeof.",
    );
  return tokens;
}

function sizeExpression(tokens, allocation) {
  let at = 0;
  const type = allocation.type.split(" ");
  const take = (token) => tokens[at] === token && (++at, true);
  const bounded = (number) => {
    if (!Number.isSafeInteger(number) || number < 0 || number > LIMIT)
      throw Error("Keep the allocation arithmetic within the stated sizes.");
    return number;
  };
  function sizeofValue() {
    if (take("(")) {
      const start = at;
      let depth = 1;
      while (at < tokens.length && depth) {
        if (tokens[at] === "(") depth++;
        if (tokens[at] === ")") depth--;
        at++;
      }
      if (depth) throw Error("Close the sizeof parentheses.");
      const operand = tokens.slice(start, at - 1);
      if (same(operand, type) || measuresElement(operand, allocation.name))
        return allocation.elementBytes;
      throw Error(
        `sizeof must measure ${allocation.type} or *${allocation.name}, not the pointer.`,
      );
    }
    if (take("*")) {
      const wrapped = take("(");
      if (tokens[at++] !== allocation.name || (wrapped && !take(")")))
        throw Error(`Use sizeof *${allocation.name} for one element.`);
      return allocation.elementBytes;
    }
    if (
      tokens[at] === allocation.name &&
      tokens[at + 1] === "[" &&
      tokens[at + 2] === "0" &&
      tokens[at + 3] === "]"
    ) {
      at += 4;
      return allocation.elementBytes;
    }
    throw Error(
      `Use sizeof(${allocation.type}) or sizeof *${allocation.name}.`,
    );
  }
  function atom() {
    if (take("+")) return atom();
    if (take("(")) {
      const result = sum();
      if (!take(")")) throw Error("Close the arithmetic parentheses.");
      return result;
    }
    if (take("sizeof")) return sizeofValue();
    const token = tokens[at++];
    if (
      !/^\d+(?:[uU](?:(?:ll|LL|[lL]))?|(?:ll|LL|[lL])[uU]?)?$/.test(token || "")
    )
      throw Error("Use the stated count and element size in malloc.");
    // A leading-zero C literal is octal, not decimal.
    const literal = token.replace(/[uUlL]+$/, "");
    if (/^0\d/.test(literal) && !/^0[0-7]+$/.test(literal))
      throw Error(
        "A C integer starting with 0 is octal; write the decimal count normally.",
      );
    return bounded(
      /^0\d/.test(literal) ? parseInt(literal, 8) : Number(literal),
    );
  }
  function product() {
    let result = atom();
    while (["*", "/"].includes(tokens[at])) {
      const operation = tokens[at++],
        right = atom();
      if (operation === "/" && !right) throw Error("Do not divide by zero.");
      result = bounded(
        operation === "*" ? result * right : Math.floor(result / right),
      );
    }
    return result;
  }
  function sum() {
    let result = product();
    while (["+", "-"].includes(tokens[at])) {
      const operation = tokens[at++],
        right = product();
      result = bounded(operation === "+" ? result + right : result - right);
    }
    return result;
  }
  const bytes = sum();
  if (at !== tokens.length)
    throw Error("Use one allocation size, without extra statements.");
  return bytes;
}

export function gradeMallocAnswer(step, draft) {
  const allocation = step.allocation;
  try {
    if (!allocation || step.format !== "malloc")
      throw Error("This is not a malloc-writing question.");
    const tokens = tokensFor(draft);
    const hasSemicolon = tokens.at(-1) === ";";
    if (hasSemicolon) tokens.pop();
    const assignment = tokens.indexOf("=");
    const type = allocation.type.split(" ");
    const left = tokens.slice(0, assignment);
    if (
      assignment < 0 ||
      !(
        same(ungroup(left), [allocation.name]) ||
        same(left, [...type, "*", allocation.name])
      )
    )
      throw Error(
        `Store the allocated address in ${allocation.name}, a ${allocation.type} pointer.`,
      );
    let right = ungroup(tokens.slice(assignment + 1));
    if (right[0] === "(" && right.includes(")")) {
      const end = right.indexOf(")"),
        cast = right.slice(1, end);
      if (!same(cast, [...type, "*"]) && !same(cast, ["void", "*"]))
        throw Error(`An optional cast must be ${allocation.type} * or void *.`);
      right = ungroup(right.slice(end + 1));
    }
    if (right[0] !== "malloc" || right[1] !== "(" || right.at(-1) !== ")")
      throw Error("Use malloc with one size expression.");
    const bytes = sizeExpression(right.slice(2, -1), allocation);
    const expected = allocation.count * allocation.elementBytes;
    if (bytes !== expected)
      throw Error(
        `This requests ${bytes} bytes; ${allocation.count} × ${allocation.elementBytes} = ${expected} bytes are needed.`,
      );
    return hasSemicolon
      ? { correct: true, earned: 10 }
      : {
          correct: true,
          earned: 9,
          warning:
            "Right allocation. Add ; (a semicolon) to end the C statement. −1 point.",
        };
  } catch (error) {
    return { correct: false, earned: 0, reason: error.message };
  }
}
