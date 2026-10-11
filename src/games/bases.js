import { integer, pick } from "../engine/random.js";

const digits = "0123456789ABCDEF";
const radixLabel = (value, base) => `${value} (base ${base})`;
const visual = (label, items) => ({ kind: "flow", label, items });

function placeValues(value, base) {
  return [...value].map((digit, index) => {
    const power = value.length - index - 1;
    return `${digits.indexOf(digit)} × ${base}${power === 0 ? "⁰" : power === 1 ? "¹" : power === 2 ? "²" : power === 3 ? "³" : `^${power}`}`;
  });
}
function divisions(value, base) {
  const lines = [];
  do {
    const quotient = Math.floor(value / base),
      remainder = value % base;
    lines.push(
      `${value} ÷ ${base} = ${quotient}, remainder ${digits[remainder]}`,
    );
    value = quotient;
  } while (value > 0);
  return lines;
}

// Base conversion preserves the number; only its written representation changes.
export function generateBases(rng, level = 1) {
  const basePool = level === 1 ? [2, 8, 10] : [2, 8, 10, 16];
  const from = pick(rng, basePool);
  const to = pick(
    rng,
    basePool.filter((base) => base !== from),
  );
  const value = integer(rng, 0, level === 1 ? 127 : level === 2 ? 1023 : 4095);
  const source = value.toString(from).toUpperCase();
  const answer = value.toString(to).toUpperCase();
  const divisionLines = divisions(value, to);
  const sourceLine = `${placeValues(source, from).join(" + ")} = ${value}`;
  let explanation, illustration;
  if (to === 10) {
    explanation = `The rightmost digit is worth ${from}⁰ = 1. Each place to its left is worth ${from} times more; add the digit × place-value products.${from === 16 ? " A–F mean 10–15." : ""}`;
    illustration = [
      sourceLine,
      `${radixLabel(source, from)} = ${radixLabel(answer, to)}`,
    ];
  } else {
    explanation = `${from === 10 ? "" : `First interpret ${source} in base ${from}: it is ${value} in decimal. `}Divide by ${to} repeatedly; each remainder is a digit. Read the remainders from last to first.${to === 16 ? " Use A–F for 10–15." : ""}`;
    const selected =
      divisionLines.length <= 2
        ? divisionLines
        : [divisionLines[0], `… ${divisionLines.at(-1)}`];
    illustration = [
      ...selected,
      `Remainders, bottom → top: ${answer.split("").join(" ")}`,
      `${radixLabel(source, from)} = ${radixLabel(answer, to)}`,
    ];
  }
  return {
    type: "trace",
    topic: "base-conversion",
    data: { value, from, to, source },
    visual: visual("Same value · different base", [
      radixLabel(source, from),
      `? (base ${to})`,
    ]),
    steps: [
      {
        kind: "input",
        prompt: `Convert ${source} from base ${from} to base ${to}.`,
        answer,
        radix: to,
        hint: `Write just the base-${to} digits. Spaces and letter case do not matter.${to === 16 ? " A = 10, B = 11, …, F = 15." : ""}`,
        explanation,
        illustration,
      },
    ],
  };
}

const step = (caption, result, items) => ({
  type: "trace",
  caption,
  result,
  visual: visual("Conversion steps", items),
});
export const basesLessons = [
  {
    id: "place-value",
    title: "Read the place values",
    summary: "Right to left: 1, base, base², …",
    steps: [
      step(
        "In 1011₂, the columns are worth 8, 4, 2 and 1.",
        "2³ = 8; 2² = 4; 2¹ = 2; 2⁰ = 1",
        ["1 × 8", "0 × 4", "1 × 2", "1 × 1"],
      ),
      step("Multiply each digit by its column’s value.", "8 + 0 + 2 + 1", [
        "8",
        "0",
        "2",
        "1",
      ]),
      step(
        "Add those contributions to get the decimal value.",
        "1011₂ = 11₁₀",
        ["1011 (base 2)", "11 (base 10)"],
      ),
      step(
        "Hex works the same way. A means 10, so 2A is 2 × 16 + 10.",
        "2A₁₆ = 42₁₀",
        ["2 × 16", "A × 1 = 10", "42"],
      ),
    ],
  },
  {
    id: "remainders",
    title: "Divide, then read upward",
    summary: "The lab’s 1925₁₀ → octal example.",
    steps: [
      step(
        "Divide by the destination base, 8. Save each remainder.",
        "1925 ÷ 8 = 240, remainder 5",
        ["1925", "240", "save 5"],
      ),
      step(
        "Keep dividing the quotient, not the remainder.",
        "240 ÷ 8 = 30, remainder 0",
        ["240", "30", "save 0"],
      ),
      step("Continue until the quotient is 0.", "30 ÷ 8 = 3 R6; 3 ÷ 8 = 0 R3", [
        "30",
        "3",
        "0",
      ]),
      step("Read saved remainders backward: 3, 6, 0, 5.", "1925₁₀ = 3605₈", [
        "3",
        "6",
        "0",
        "5",
      ]),
    ],
  },
  {
    id: "octal-hex",
    title: "Octal → hex through binary",
    summary: "The lab’s 277₈ → BF₁₆ example.",
    steps: [
      step(
        "One octal digit uses three binary bits: 2 → 010 and 7 → 111.",
        "277₈ = 010 111 111₂",
        ["2 → 010", "7 → 111", "7 → 111"],
      ),
      step(
        "For hex, regroup into four bits from the right.",
        "0 | 1011 | 1111",
        ["0", "1011", "1111"],
      ),
      step(
        "1011 is 11 (B); 1111 is 15 (F). Ignore the leading 0.",
        "277₈ = BF₁₆",
        ["1011 → B", "1111 → F"],
      ),
      step(
        "Check through decimal: both representations equal 191.",
        "2 × 64 + 7 × 8 + 7 = 11 × 16 + 15 = 191",
        ["277 (base 8)", "191 (base 10)", "BF (base 16)"],
      ),
    ],
  },
  {
    id: "hex-remainders",
    title: "Hex remainders use letters",
    summary: "The lab’s 32456₁₀ → 7EC8₁₆ example.",
    steps: [
      step(
        "Divide by 16; keep the quotient and remainder separate.",
        "32456 ÷ 16 = 2028, remainder 8",
        ["32456", "2028", "save 8"],
      ),
      step(
        "A remainder of 12 becomes C; a remainder of 14 becomes E.",
        "2028 ÷ 16 = 126 R12; 126 ÷ 16 = 7 R14",
        ["12 → C", "14 → E"],
      ),
      step(
        "The final remainder is 7. Read upward, not downward.",
        "32456₁₀ = 7EC8₁₆",
        ["7", "E", "C", "8"],
      ),
    ],
  },
];
export const basesTutorial = basesLessons[0].steps;
