import React from "react";
import {
  baseWorkResult,
  checkBaseWork,
  solvedBaseWork,
  wholeNumber,
  placeDigit,
} from "../engine/baseWork.js";

function Power({ base, row }) {
  return (
    <span className="place-power">
      <span aria-label={`${base} to the power ${row.exponent}`}>
        {base}
        <sup>{row.exponent}</sup>
      </span>
      <small>= {row.weight}</small>
    </span>
  );
}
export default function BaseWork({ step, draft, onChange, status }) {
  const work = step.work,
    checked = status !== "answering",
    shown = status === "revealed" ? solvedBaseWork(work) : draft;
  const result = checkBaseWork(work, shown);
  function update(key, index, value) {
    onChange({
      ...draft,
      [key]:
        index === null
          ? value
          : draft[key].map((entry, i) => (i === index ? value : entry)),
    });
  }
  const total = wholeNumber(shown.total);
  const guideBase = work.from === 10 ? work.to : work.from;
  let remainder = total;
  return (
    <div
      className={`base-work ${work.from === 10 ? "base-direct" : ""}`}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.target.tagName !== "INPUT") return;
        const fields = [
          ...event.currentTarget.querySelectorAll("input:not(:disabled)"),
        ];
        const next = fields[fields.indexOf(event.target) + 1];
        if (next) {
          event.preventDefault();
          next.focus();
        }
      }}
    >
      <p className="place-rule">
        The rightmost place is{" "}
        <b>
          {guideBase}
          <sup>0</sup> = 1
        </b>
        . Move left: the exponent goes up by 1 and the place value multiplies by{" "}
        {guideBase}.
      </p>
      <p className="power-example">
        <b>
          {guideBase}
          <sup>3</sup>
        </b>{" "}
        means{" "}
        <b>
          {guideBase} × {guideBase} × {guideBase} = {guideBase ** 3}
        </b>
        . The small number counts repeated factors.
      </p>
      <div className="base-work-panels">
        {work.from !== 10 && (
          <section className="place-section" aria-label="Read source places">
            <h3>1. Multiply each digit</h3>
            <p>
              Fill the decimal product. A zero digit still holds its place.
              {work.from === 16 ? " A–F mean 10–15." : ""}
            </p>
            <div className="place-column-labels">
              <span>Digit</span>
              <span>Place value</span>
              <span>Product</span>
            </div>
            {work.source.map((row, i) => (
              <div className="place-row" key={row.exponent}>
                <div className="place-equation">
                  <span className="place-digit">
                    {row.digit}
                    {row.value >= 10 && <small>= {row.value}</small>}
                  </span>
                  <span>×</span>
                  <Power base={guideBase} row={row} />
                  <span>=</span>
                  <input
                    form="practice-answer"
                    aria-label={`Product at ${guideBase}^${row.exponent}`}
                    aria-describedby={`product-help-${i}`}
                    aria-invalid={checked && !result.products[i]}
                    autoComplete="off"
                    spellCheck="false"
                    value={shown.products[i]}
                    disabled={checked}
                    placeholder="□"
                    onChange={(e) => update("products", i, e.target.value)}
                  />
                </div>
                <p
                  id={`product-help-${i}`}
                  className={`place-feedback ${checked && !result.products[i] ? "place-wrong" : ""}`}
                >
                  {checked
                    ? result.products[i]
                      ? "✓"
                      : `${row.value} × ${row.weight} = ${row.product}`
                    : row.exponent === 0
                      ? "Start counting positions at 0 here."
                      : "\u00a0"}
                </p>
              </div>
            ))}
            <h3>2. Add the products</h3>
            <div className="place-sum" aria-label="Products to add">
              {work.source.map((row, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span> + </span>}
                  <b>{shown.products[i].trim() || "□"}</b>
                </React.Fragment>
              ))}
            </div>
            <label className="place-total">
              Decimal total
              <input
                form="practice-answer"
                aria-label="Decimal total"
                aria-describedby="total-help"
                aria-invalid={checked && !result.total}
                autoComplete="off"
                value={shown.total}
                disabled={checked}
                placeholder="□"
                onChange={(e) => update("total", null, e.target.value)}
              />
            </label>
            <p id="total-help" className="place-feedback">
              {checked
                ? result.total
                  ? "✓ Same value, written in decimal."
                  : `Add all the products: ${solvedBaseWork(work).total}.`
                : "Numbers or arithmetic (like 32 + 16 + 2 + 1) are fine."}
            </p>
          </section>
        )}
        {work.to !== 10 && (
          <section className="place-section" aria-label="Build target places">
            <h3>
              {work.from === 10 ? "1" : "3"}. Fill the base-{work.to} digits
            </h3>
            <p>
              Start at the largest place. How many times does it fit in what
              remains? Subtract its product, then move down.
            </p>
            <p className="place-start">
              Start with your total: <b>{total === null ? "□" : total}</b>
            </p>
            <div className="place-column-labels">
              <span>Your digit</span>
              <span>Place value</span>
              <span>Product</span>
            </div>
            {work.target.map((row, i) => {
              const digit = placeDigit(shown.digits[i], work.to),
                before = remainder;
              const product = digit === null ? null : digit * row.weight;
              remainder =
                before === null || product === null ? null : before - product;
              const after = remainder;
              return (
                <div className="place-row" key={row.exponent}>
                  <div className="place-equation target-equation">
                    <input
                      form="practice-answer"
                      aria-label={`Digit at ${work.to}^${row.exponent}`}
                      aria-describedby={`digit-help-${i}`}
                      aria-invalid={checked && !result.digits[i]}
                      autoComplete="off"
                      spellCheck="false"
                      value={shown.digits[i]}
                      disabled={checked}
                      placeholder="□"
                      onChange={(e) => update("digits", i, e.target.value)}
                    />
                    <span>×</span>
                    <Power base={work.to} row={row} />
                    <span>=</span>
                    <span>{product === null ? "□" : product}</span>
                  </div>
                  <p
                    id={`digit-help-${i}`}
                    className={`place-feedback ${checked && !result.digits[i] ? "place-wrong" : ""}`}
                  >
                    {checked && !result.digits[i]
                      ? `Use ${row.digit}${row.value >= 10 ? ` (= ${row.value})` : ""}: ${row.value} × ${row.weight} = ${row.product}.`
                      : before !== null && product !== null
                        ? `${before} − ${product} = ${after} remaining${checked ? " ✓" : ""}`
                        : "Fill this digit to see what remains."}
                  </p>
                </div>
              );
            })}
            <p className="place-digit-help">
              Use digits 0–
              {work.to === 16
                ? "9 or A–F. Decimal values 10–15 also count"
                : work.to - 1}
              . Keep zeros between other digits.
            </p>
          </section>
        )}
      </div>
      <div className="place-final">
        <span>Your result · base {work.to}</span>
        <span
          className="place-result-value"
          role="group"
          aria-label="Assembled answer"
        >
          {baseWorkResult(work, shown) || "□"}
        </span>
        <small>
          {work.to === 10
            ? "This is your decimal total."
            : "Read your filled digit positions from top to bottom."}
        </small>
      </div>
    </div>
  );
}
