import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { generateWorksheet } from "../engine/worksheet.js";
import { operationLabel } from "../games/queue.js";
import "../print.css";

function ArrayDiagram({ cells, blank = false }) {
  return (
    <table className="paper-array">
      <tbody>
        <tr>
          {cells.map((value, i) => (
            <td key={i}>{blank ? "\u00a0" : (value ?? "—")}</td>
          ))}
        </tr>
        <tr className="paper-indices">
          {cells.map((_, i) => (
            <td key={i}>{i}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function PaperDiagram({ diagram }) {
  if (!diagram) return null;
  const type = diagram.type || diagram.kind;
  if (type === "postfix")
    return (
      <div
        className="paper-infix"
        aria-label="Infix expression with checkpoint markers"
      >
        {diagram.tokens.map((token, index) => (
          <React.Fragment key={index}>
            <span className="paper-token">{token}</span>
            {diagram.checkpoints
              .filter((point) => point.stop === index)
              .map((point) => (
                <sup className="paper-marker" key={point.label}>
                  {point.label}
                </sup>
              ))}
          </React.Fragment>
        ))}
      </div>
    );
  if (type === "array")
    return (
      <div className="paper-given">
        <p>{diagram.label || "Array (indices start at 0)"}</p>
        <ArrayDiagram cells={diagram.values} />
      </div>
    );
  if (type === "list")
    return (
      <p className="paper-list">head → {diagram.values.join(" → ")} → NULL</p>
    );
  if (type === "queue")
    return (
      <div className="paper-given">
        <p>
          Initial queue: {diagram.showRear === false ? "queueSize" : "capacity"}{" "}
          = {diagram.capacity}; front = {diagram.front};{" "}
          {diagram.showRear !== false && diagram.rear != null && (
            <>rear = {diagram.rear}; </>
          )}
          {diagram.showRear === false ? "noe" : "QSize"} = {diagram.count}.
        </p>

        <ArrayDiagram cells={diagram.cells} />
        {!!diagram.operations?.length && (
          <p className="paper-operations">
            Operations:{" "}
            {diagram.operations
              .map((operation) =>
                typeof operation === "string"
                  ? operation
                  : operationLabel(operation),
              )
              .join("; ")}
          </p>
        )}
      </div>
    );
  return null;
}

// Explicit, inset vector strokes keep every edge inside the printable diagram.
// Shared CSS borders and fractional layout rounding cannot erase a wall or row.
function PaperGrid({ columns = 1, rows = 1, className, label }) {
  const width = columns === 1 ? 92 : columns * 22 + 2;
  const height = rows === 1 ? 29 : rows * 20 + 2;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      data-columns={columns}
      data-rows={rows}
    >
      <g fill="none" stroke="#000" strokeWidth="2" strokeLinecap="square">
        <rect
          data-grid-outline=""
          vectorEffect="non-scaling-stroke"
          x="1"
          y="1"
          width={width - 2}
          height={height - 2}
        />
        {Array.from({ length: rows - 1 }, (_, index) => {
          const y = 1 + ((height - 2) * (index + 1)) / rows;
          return (
            <line
              data-grid-divider=""
              vectorEffect="non-scaling-stroke"
              key={`row-${index}`}
              x1="1"
              y1={y}
              x2={width - 1}
              y2={y}
            />
          );
        })}
        {Array.from({ length: columns - 1 }, (_, index) => {
          const x = 1 + ((width - 2) * (index + 1)) / columns;
          return (
            <line
              data-grid-divider=""
              vectorEffect="non-scaling-stroke"
              key={`column-${index}`}
              x1={x}
              y1="1"
              x2={x}
              y2={height - 1}
            />
          );
        })}
      </g>
    </svg>
  );
}

function BlankStack({ label }) {
  return (
    <div className="paper-stack-wrap">
      <span>TOP</span>
      <PaperGrid
        rows={8}
        className="paper-stack"
        label={`Blank stack ${label}`}
      />
      <span>BOTTOM</span>
      <b>{label}</b>
    </div>
  );
}

function WritingSpace({ kind = "text", long = false, lines }) {
  return (
    <div
      className={`paper-writing ${kind === "code" || long ? "paper-writing-long" : ""}`}
      aria-label="Space for written work"
    >
      {Array.from(
        { length: lines ?? (kind === "code" || long ? 7 : 3) },
        (_, i) => (
          <div key={i} />
        ),
      )}
    </div>
  );
}

function PaperQuestion({ question, index, answers, exam }) {
  const postfix =
    (question.diagram?.type || question.diagram?.kind) === "postfix";
  const queue = (question.diagram?.type || question.diagram?.kind) === "queue";
  const compact =
    (queue && !exam) ||
    (exam &&
      question.parts.length >= 4 &&
      question.parts.every((part) => part.auto));
  const heading = (
    <h2>
      {index + 1}. {question.title}
      {question.points != null && <span> ({question.points} points)</span>}
    </h2>
  );
  return (
    <section
      className={`paper-question ${exam ? "paper-exam-question" : ""}`}
      data-question={question.id}
    >
      {answers ? (
        <>
          {heading}
          <div className="paper-answers">
            {question.parts.map((part, partIndex) => (
              <div className="paper-answer" key={part.id}>
                <h3>
                  {question.parts.length > 1
                    ? `${String.fromCharCode(97 + partIndex)}. `
                    : ""}
                  {part.prompt}
                </h3>
                <pre>{part.answer || "empty"}</pre>
                <p>{part.explanation}</p>
                {part.rubric?.length > 0 && (
                  <ul>
                    {part.rubric.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="paper-question-context">
            {heading}
            <p className="paper-prompt">{question.prompt}</p>
            {question.code && <pre className="paper-code">{question.code}</pre>}
            <PaperDiagram diagram={question.diagram} />
          </div>
          {postfix ? (
            <>
              <div className="paper-stacks">
                {question.diagram.checkpoints.map((point) => (
                  <BlankStack key={point.label} label={point.label} />
                ))}
              </div>
              <p className="paper-checkpoint-notes">
                {question.diagram.checkpoints
                  .map(
                    ({ label, stop }) =>
                      `${label}: after ${question.diagram.tokens[stop]}${stop + 1 < question.diagram.tokens.length ? ` and before ${question.diagram.tokens[stop + 1]}` : ", before the final stack is popped"}.`,
                  )
                  .join(" ")}
              </p>
              <p>Resulting postfix expression:</p>
              <PaperGrid
                className="paper-postfix-boxes"
                columns={
                  question.diagram.tokens.filter(
                    (token) => token !== "(" && token !== ")",
                  ).length
                }
                label="Blank postfix answer boxes"
              />
            </>
          ) : (
            <div
              className={`paper-parts ${compact ? "paper-compact" : ""} ${queue && !exam ? "paper-queue-parts" : ""}`}
            >
              {question.parts.map((part, partIndex) => (
                <div
                  className={`paper-part ${(queue && ["cells", "result"].includes(part.id)) || part.options ? "paper-part-wide" : ""}`}
                  key={part.id}
                >
                  <h3>
                    {question.parts.length > 1
                      ? `${String.fromCharCode(97 + partIndex)}. `
                      : ""}
                    {part.prompt}
                    {part.points != null && (
                      <span>
                        {" "}
                        ({part.points} {part.points === 1 ? "point" : "points"})
                      </span>
                    )}
                  </h3>
                  {part.options?.length > 0 && (
                    <ol type="A" className="paper-options">
                      {part.options.map((option, i) => (
                        <li key={i}>
                          <span>{option}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {queue && part.id === "cells" ? (
                    <ArrayDiagram cells={question.diagram.cells} blank />
                  ) : (
                    <WritingSpace
                      kind={part.kind}
                      lines={
                        exam
                          ? part.auto
                            ? 1
                            : part.kind === "code"
                              ? Math.max(2, part.answer.split("\n").length + 1)
                              : part.prompt.includes("recursive steps")
                                ? 5
                                : 3
                          : queue || part.options
                            ? 1
                            : undefined
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function WorksheetDocument({ worksheet, answers = false }) {
  const exam = worksheet.durationMinutes != null;
  return (
    <article
      className={`worksheet ${answers ? "worksheet-key" : "worksheet-questions"} ${exam ? "worksheet-exam" : ""}`}
      aria-label={answers ? "Answer key preview" : "Question paper preview"}
    >
      <header className="paper-heading">
        <p className="paper-id">
          Set {worksheet.id}
          {worksheet.level ? ` · Level ${worksheet.level}` : ""}
        </p>
        <h1>
          {worksheet.title}
          {answers ? " — Answer Key" : ""}
        </h1>
        {!answers && (
          <>
            <div className="paper-name">
              <span>Name: ____________________________</span>
              <span>Date: _________________</span>
            </div>
            <p>
              {exam
                ? `${worksheet.durationMinutes} minutes · ${worksheet.totalPoints} points. `
                : ""}
              Show your work. Use the space provided.
            </p>
          </>
        )}
      </header>
      {worksheet.questions.map((question, index) => {
        const section = worksheet.sections?.find(
          (item) => item.id === question.section,
        );
        const beginsSection =
          section &&
          (index === 0 ||
            worksheet.questions[index - 1].section !== question.section);
        return (
          <React.Fragment key={question.id}>
            {beginsSection && (
              <h2 className="paper-section">
                {section.id}. {section.title}{" "}
                <span>({section.points} points)</span>
              </h2>
            )}
            <PaperQuestion
              question={question}
              index={index}
              answers={answers}
              exam={exam}
            />
          </React.Fragment>
        );
      })}
    </article>
  );
}

export default function PrintPractice({ game, exam, examRunning = false }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(3);
  const [level, setLevel] = useState(3);
  const [answers, setAnswers] = useState(false);
  const [worksheet, setWorksheet] = useState(null);
  const launch = useRef(null),
    dialog = useRef(null);
  const titleId = useId();
  const isExam = game?.id === "exam";
  const answerKeyLocked = isExam && examRunning;
  const showAnswers = answers && !answerKeyLocked;
  const make = (nextCount = count, nextLevel = level) =>
    generateWorksheet({
      gameId: game.id,
      count: nextCount,
      level: nextLevel,
      seed: (Date.now() + Math.floor(Math.random() * 1e6)) >>> 0,
      exam: isExam ? exam : undefined,
    });
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launch.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const appRoot = document.getElementById("root");
    const wasInert = appRoot?.inert;
    if (appRoot) appRoot.inert = true;
    dialog.current?.querySelector("button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...dialog.current.querySelectorAll(
          "button, select, input, [tabindex='0']",
        ),
      ].filter((element) => !element.disabled);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      if (appRoot) appRoot.inert = wasInert;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  if (!game) return null;
  return (
    <>
      <button
        ref={launch}
        className="print-launch"
        aria-label="Print practice sheets"
        onClick={() => {
          setAnswers(false);
          setWorksheet((current) => (isExam ? make() : current || make()));
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
        <span className="print-launch-label">Print / PDF</span>
      </button>
      {open &&
        createPortal(
          <div
            className="print-portal"
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <section
              ref={dialog}
              className="print-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="print-controls">
                <div className="print-title-row">
                  <h2 id={titleId}>Pen & paper practice</h2>
                  <button
                    className="print-close"
                    aria-label="Close print preview"
                    onClick={close}
                  >
                    ×
                  </button>
                </div>
                <p>
                  Plain questions, room to work. Choose “Save as PDF” in the
                  print dialog.
                </p>
                <div className="print-settings">
                  {!isExam && (
                    <>
                      <label>
                        Questions
                        <select
                          aria-label="Worksheet question count"
                          value={count}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setCount(next);
                            setWorksheet(make(next));
                          }}
                        >
                          <option value="3">3</option>
                          <option value="5">5</option>
                          <option value="10">10</option>
                        </select>
                      </label>
                      <label>
                        Level
                        <select
                          aria-label="Worksheet level"
                          value={level}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setLevel(next);
                            setWorksheet(make(count, next));
                          }}
                        >
                          <option value="1">1 · Warm-up</option>
                          <option value="2">2 · Practice</option>
                          <option value="3">3 · Exam</option>
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Print
                    <select
                      aria-label="Worksheet content"
                      value={showAnswers ? "answers" : "questions"}
                      onChange={(e) => setAnswers(e.target.value === "answers")}
                    >
                      <option value="questions">Questions only</option>
                      <option value="answers" disabled={answerKeyLocked}>
                        Answer key only
                      </option>
                    </select>
                  </label>
                  {!isExam && (
                    <button
                      className="print-new"
                      onClick={() => setWorksheet(make())}
                    >
                      New set ↻
                    </button>
                  )}
                  <button
                    className="print-confirm"
                    onClick={() => window.print()}
                  >
                    Print / Save PDF
                  </button>
                </div>
                {isExam && (
                  <p className="print-exam-note">
                    This is the same paper as the exam on screen.
                    {answerKeyLocked &&
                      " The answer key unlocks after you submit."}
                  </p>
                )}
              </div>
              <div
                className="print-preview"
                tabIndex={0}
                aria-label="Scrollable paper preview"
              >
                <WorksheetDocument
                  worksheet={worksheet}
                  answers={showAnswers}
                />
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
