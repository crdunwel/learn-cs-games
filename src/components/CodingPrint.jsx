import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { modelFunction } from "../engine/cWriting.js";
import "../print.css";

export default function CodingPrint({ exercise, exercises }) {
  const [open, setOpen] = useState(false),
    [count, setCount] = useState(1),
    [answers, setAnswers] = useState(false);
  const launch = useRef(null),
    dialog = useRef(null);
  const start = Math.max(
    0,
    exercises.findIndex((q) => q.id === exercise.id),
  );
  const selected = Array.from(
    { length: Math.min(count, exercises.length) },
    (_, i) => exercises[(start + i) % exercises.length],
  );
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launch.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root"),
      wasInert = root.inert,
      overflow = document.body.style.overflow;
    root.inert = true;
    document.body.style.overflow = "hidden";
    dialog.current.querySelector("button")?.focus();
    function key(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const nodes = [
        ...dialog.current.querySelectorAll("button, select, [tabindex='0']"),
      ];
      if (event.shiftKey && document.activeElement === nodes[0]) {
        event.preventDefault();
        nodes.at(-1).focus();
      }
      if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
        event.preventDefault();
        nodes[0].focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      root.inert = wasInert;
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <>
      <button
        className="print-launch"
        ref={launch}
        aria-label="Print C writing questions"
        onClick={() => {
          setAnswers(false);
          setOpen(true);
        }}
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" />
          <path d="M17 11h1" />
        </svg>
        <span>Print / PDF</span>
      </button>
      {open &&
        createPortal(
          <div
            className="print-portal"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <section
              className="print-dialog"
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-label="C writing paper"
            >
              <div className="print-controls">
                <div className="print-title-row">
                  <h2>Write it on paper</h2>
                  <button
                    className="print-close"
                    aria-label="Close print preview"
                    onClick={close}
                  >
                    ×
                  </button>
                </div>
                <p>
                  Plain questions and writing space. No line helpers. Starts
                  with the selected problem.
                </p>
                <div className="print-settings">
                  <label>
                    Questions
                    <select
                      aria-label="C worksheet question count"
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                    >
                      {[1, 3, 5, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Print
                    <select
                      aria-label="C worksheet content"
                      value={answers ? "answers" : "questions"}
                      onChange={(e) => setAnswers(e.target.value === "answers")}
                    >
                      <option value="questions">Questions only</option>
                      <option value="answers">Sample solutions only</option>
                    </select>
                  </label>
                  <button
                    className="print-confirm"
                    onClick={() => window.print()}
                  >
                    Print / Save PDF
                  </button>
                </div>
              </div>
              <div
                className="print-preview"
                tabIndex={0}
                aria-label="Scrollable C paper preview"
              >
                <article
                  className={`worksheet coding-paper ${answers ? "worksheet-key" : "worksheet-questions"}`}
                  aria-label={answers ? "C solution paper" : "C question paper"}
                >
                  <header className="paper-heading">
                    <p className="paper-id">
                      C Writing Studio · {selected.map((q) => q.id).join(", ")}
                    </p>
                    <h1>
                      {answers
                        ? "C — Sample solutions"
                        : "C — Code writing practice"}
                    </h1>
                    {!answers && (
                      <>
                        <div className="paper-name">
                          Name: ____________________ &nbsp; Date: __________
                        </div>
                        <p>
                          Implement each function in C. Use the supplied types
                          and assumptions.
                        </p>
                      </>
                    )}
                  </header>
                  {selected.map((q, i) => (
                    <section className="paper-question" key={q.id}>
                      <h2>
                        {i + 1}. {q.title}
                      </h2>
                      <p>{q.prompt}</p>
                      <p>{q.assumptions}</p>
                      {q.setup && (
                        <>
                          <h3>Provided</h3>
                          <pre className="paper-code">{q.setup}</pre>
                        </>
                      )}
                      {answers ? (
                        <>
                          <pre className="paper-code">{modelFunction(q)}</pre>
                          <ul>
                            {q.rubric.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                          <p>
                            Equivalent correct implementations are also valid.
                          </p>
                        </>
                      ) : (
                        <>
                          <pre className="paper-code">{q.signature}</pre>
                          <div
                            className="paper-writing"
                            aria-label="Blank space for C code"
                          >
                            {Array.from(
                              { length: Math.max(8, q.lines.length + 2) },
                              (_, n) => (
                                <div key={n} />
                              ),
                            )}
                          </div>
                          <pre className="paper-code">{"}"}</pre>
                        </>
                      )}
                    </section>
                  ))}
                </article>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
