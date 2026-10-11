// A small grammar for the growth classes used in this course, not a CAS.
// Positive sums/products, integer powers, log bases and constant factors are
// canonicalized. m and n remain independent; unsupported syntax is rejected.
// Exponential exponents must be a bare variable: simplifying 2*(n) to n there
// would incorrectly identify 2^(2*n) with 2^n. This is intentionally not a CAS.
const one = () => [1, 1, 0, 0, 0, 0]; // exponential bases, polynomial powers, log powers
const constant = (value) => ({ value });
const termsOf = (x) =>
  x.terms || (Number.isFinite(x.value) && x.value > 0 ? [one()] : []);
const variable = (name) => {
  const term = one();
  term[name === "n" ? 2 : 3] = 1;
  return { terms: [term], bareVariable: name };
};
const key = (term) => term.join(":");
function dominates(a, b) {
  // Compare each independent variable: exponential > polynomial > logarithm.
  const compare = (indices) => {
    for (const i of indices) {
      if (a[i] !== b[i]) return a[i] > b[i];
    }
    return true;
  };
  return compare([0, 2, 4]) && compare([1, 3, 5]);
}
function simplify(terms) {
  const unique = [...new Map(terms.map((t) => [key(t), t])).values()];
  if (unique.length > 64) throw Error("Too many terms");
  return unique.filter(
    (t, i) => !unique.some((u, j) => i !== j && dominates(u, t)),
  );
}
function add(a, b) {
  if ("value" in a && "value" in b) return constant(a.value + b.value);
  return { terms: simplify([...termsOf(a), ...termsOf(b)]) };
}
function times(a, b) {
  if ("value" in a && "value" in b) return constant(a.value * b.value);
  return {
    terms: simplify(
      termsOf(a).flatMap((x) =>
        termsOf(b).map((y) => x.map((v, i) => (i < 2 ? v * y[i] : v + y[i]))),
      ),
    ),
  };
}
function power(a, b) {
  if ("value" in b) {
    const p = b.value;
    if (!Number.isInteger(p) || p < 0 || p > 12)
      throw Error("Unsupported power");
    if ("value" in a) return constant(a.value ** p);
    let result = constant(1);
    for (let i = 0; i < p; i++) result = times(result, a);
    return result;
  }
  if ("value" in a && a.value > 1 && b.terms.length === 1) {
    for (const name of ["n", "m"]) {
      if (b.bareVariable === name) {
        const term = one();
        term[name === "n" ? 0 : 1] = a.value;
        return { terms: [term] };
      }
    }
  }
  throw Error("Unsupported power");
}
function logarithm(x) {
  if ("value" in x) {
    if (x.value <= 1) throw Error("Invalid log");
    return constant(1);
  }
  if (x.terms.length !== 1) throw Error("Unsupported log");
  const term = x.terms[0],
    result = [];
  if (term[0] !== 1 || term[1] !== 1 || term[4] || term[5])
    throw Error("Unsupported log");
  for (const i of [2, 3])
    if (term[i] > 0) {
      const t = one();
      t[i + 2] = 1;
      result.push(t);
    }
  if (!result.length) throw Error("Invalid log");
  return { terms: result };
}

export function growthSignature(value) {
  try {
    let text = String(value).toLowerCase().trim();
    if (!text || text.length > 180) return null;
    text = text
      .replace(/\\(?:left|right)/g, "")
      .replace(/\\theta/g, "theta")
      .replace(/\\(?:cdot|times)/g, "*")
      .replace(/\\(?:log|ln)/g, "log")
      .replace(/[×·]/g, "*")
      .replace(/\*\*/g, "^")
      .replace(/[{}\[\]]/g, (c) => ("{[".includes(c) ? "(" : ")"))
      .replace(
        /([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,
        (digits) =>
          "^" + [...digits].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join(""),
      )
      .replace(/ⁿ/g, "^n")
      .replace(/\b([nm])\s+squared\b/g, "$1^2")
      .replace(/\b([nm])\s+cubed\b/g, "$1^3")
      .replace(/\s+/g, "");
    if (/^(?:o|θ|theta)\(/.test(text) && text.endsWith(")"))
      text = text.replace(/^(?:o|θ|theta)\(/, "").slice(0, -1);
    // All supported bases > 1 differ only by a positive constant factor.
    text = text
      .replace(
        /(?:log|lg|ln)(?:_?\(?(\d+(?:\.\d+)?|e)\)?)?(?=[(nm])/g,
        (_, base) => {
          if (base && base !== "e" && Number(base) <= 1)
            throw Error("Invalid log base");
          return "log";
        },
      )
      .replace(/log\(([nm]),(?:2|10|e)\)/g, "log($1)");
    const tokens =
      text.match(/log|[nm]|(?:\d+(?:\.\d*)?|\.\d+)|[()+*/^]/g) || [];
    if (tokens.join("") !== text || tokens.length > 100) return null;
    let i = 0;
    const take = (token) => tokens[i] === token && (++i, true);
    function atom() {
      if (take("(")) {
        const result = sum();
        if (!take(")")) throw Error("Missing )");
        return result;
      }
      if (take("log")) return logarithm(atom());
      const token = tokens[i++];
      if (token === "n" || token === "m") return variable(token);
      if (!token || !/^[\d.]/.test(token)) throw Error("Expected expression");
      return constant(Number(token));
    }
    function powered() {
      let result = atom();
      if (take("^")) result = power(result, powered());
      return result;
    }
    function product() {
      let result = powered();
      while (i < tokens.length && ![")", "+"].includes(tokens[i])) {
        const divide = take("/");
        if (!divide) take("*");
        const right = powered();
        if (divide) {
          if (!("value" in right) || right.value <= 0)
            throw Error("Only constant divisors");
          if ("value" in result) result = constant(result.value / right.value);
          else result = { terms: result.terms };
        } else result = times(result, right);
      }
      return result;
    }
    function sum() {
      let result = product();
      while (take("+")) result = add(result, product());
      return result;
    }
    const result = sum();
    if (i !== tokens.length) return null;
    const terms = simplify(termsOf(result));
    if (!terms.length || terms.some((t) => t.some((v) => !Number.isFinite(v))))
      return null;
    return terms.map(key).sort().join("|");
  } catch {
    return null;
  }
}
