// Place-value scaffolding and grading. Generation is checked independently in
// practiceValidation.js; numeric input uses the shared exact arithmetic parser.
import { equalAnswer, numericValue } from "./answerFormats.js";
const alphabet = "0123456789ABCDEF";
export function placeRows(text, base) {
  return [...text].map((digit, index) => {
    const exponent = text.length - index - 1,
      weight = base ** exponent;
    return {
      digit,
      value: alphabet.indexOf(digit),
      exponent,
      weight,
      product: alphabet.indexOf(digit) * weight,
    };
  });
}
export function baseWork(source, from, answer, to) {
  return {
    from,
    to,
    source: placeRows(source, from),
    target: placeRows(answer, to),
  };
}
export function emptyBaseWork(work) {
  return {
    products: work.from === 10 ? [] : work.source.map(() => ""),
    total:
      work.from === 10
        ? String(work.source.reduce((n, r) => n + r.product, 0))
        : "",
    digits: work.to === 10 ? [] : work.target.map(() => ""),
  };
}
export function solvedBaseWork(work) {
  return {
    products: work.from === 10 ? [] : work.source.map((r) => String(r.product)),
    total: String(work.source.reduce((n, r) => n + r.product, 0)),
    digits: work.to === 10 ? [] : work.target.map((r) => r.digit),
  };
}
export function wholeNumber(text) {
  const fraction = numericValue(text);
  if (!fraction || !fraction.endsWith("/1")) return null;
  const value = Number(fraction.slice(0, -2));
  return Number.isSafeInteger(value) ? value : null;
}
export function placeDigit(text, base) {
  const raw = String(text ?? "")
    .trim()
    .toUpperCase();
  const value = /^[A-F]$/.test(raw) ? alphabet.indexOf(raw) : wholeNumber(raw);
  return value !== null && value >= 0 && value < base ? value : null;
}
export function baseWorkResult(work, draft) {
  if (work.to === 10) return String(wholeNumber(draft?.total) ?? "□");
  return work.target
    .map((_, i) => {
      const digit = placeDigit(draft?.digits?.[i], work.to);
      return digit === null ? "□" : alphabet[digit];
    })
    .join("");
}
export function checkBaseWork(work, draft) {
  const expected = solvedBaseWork(work);
  const products = (work.from === 10 ? [] : work.source).map((r, i) =>
    equalAnswer(
      { kind: "number", answer: String(r.product) },
      draft?.products?.[i],
    ),
  );
  const total = equalAnswer(
    { kind: "number", answer: expected.total },
    draft?.total,
  );
  const digits =
    work.to === 10
      ? []
      : work.target.map(
          (r, i) => placeDigit(draft?.digits?.[i], work.to) === r.value,
        );
  const shape =
    Array.isArray(draft?.products) &&
    draft.products.length === products.length &&
    Array.isArray(draft?.digits) &&
    draft.digits.length === digits.length;
  return {
    products,
    total,
    digits,
    correct: shape && products.every(Boolean) && total && digits.every(Boolean),
  };
}
export function baseWorkFeedback(work, draft) {
  const result = checkBaseWork(work, draft);
  const index = result.products.indexOf(false);
  if (index >= 0) {
    const r = work.source[index];
    return `Position ${r.exponent} uses ${work.from}^${r.exponent} = ${r.weight}. Multiply the digit's value ${r.value} by ${r.weight}: ${r.product}. The exponent counts places from the right, starting at 0.`;
  }
  if (!result.total)
    return `Add all the products, including zeros: ${work.source.map((r) => r.product).join(" + ")} = ${solvedBaseWork(work).total}. This total is in decimal.`;
  const wrong = result.digits.indexOf(false);
  if (wrong >= 0) {
    const r = work.target[wrong];
    const remaining = work.target
      .slice(wrong)
      .reduce((n, p) => n + p.product, 0);
    return `At ${work.to}^${r.exponent} = ${r.weight}, ${remaining} remains. ${r.weight} fits ${r.value} times, so use ${r.digit}${r.value >= 10 ? ` (value ${r.value})` : ""}. Subtract ${r.product}; ${remaining - r.product} remains.`;
  }
  return "Each digit multiplies its place value. Adding those products gives the same number in both bases.";
}
