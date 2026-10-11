import React, { useEffect, useRef, useState } from "react";
import { generateExam } from "../games/exam.js";
import {
  createExamAttempt,
  examReducer,
  remainingSeconds,
  gradeExam,
} from "../engine/exam.js";
import "../exam.css";
import { answerFormatHint } from "../engine/answerFormats.js";

const STORAGE_KEY = "cs-club-exam-v1";

function freshPaper(previousSeed) {
  const randomSeed = Math.floor(Math.random() * 0xffffffff);
  const seed =
    randomSeed === previousSeed ? (randomSeed + 1) >>> 0 : randomSeed;
  return {
    version: 1,
    exam: generateExam(seed),
    attempt: null,
    questionIndex: 0,
    flagged: [],
  };
}

// Regenerate from the seed so old or malformed stored papers cannot break review.
function loadPaper() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1 || !Number.isInteger(saved.exam?.seed))
      return freshPaper();
    const exam = generateExam(saved.exam.seed);
    if (exam.id !== saved.exam.id) return freshPaper();
    const parts = exam.questions.flatMap((question) => question.parts);
    const ids = new Set(parts.map((part) => part.id));
    let attempt = null;
    if (saved.attempt) {
      const old = saved.attempt;
      if (
        !Number.isFinite(old.startedAt) ||
        old.startedAt < 0 ||
        !Number.isFinite(old.deadline) ||
        old.deadline !== old.startedAt + exam.durationMinutes * 60000 ||
        !["running", "submitted", "expired"].includes(old.status) ||
        (old.status !== "running" &&
          (!Number.isFinite(old.submittedAt) ||
            old.submittedAt < old.startedAt ||
            old.submittedAt > old.deadline))
      )
        return freshPaper();
      const answers = Object.fromEntries(
        Object.entries(old.answers || {}).filter(
          ([id, value]) => ids.has(id) && typeof value === "string",
        ),
      );
      const manualScores = Object.fromEntries(
        Object.entries(old.manualScores || {}).filter(([id, value]) => {
          const part = parts.find((item) => item.id === id);
          return (
            part &&
            !part.auto &&
            Number.isFinite(value) &&
            value >= 0 &&
            value <= part.points
          );
        }),
      );
      attempt = { ...old, exam, answers, manualScores };
      attempt = examReducer(attempt, { type: "expire", now: Date.now() });
    }
    return {
      version: 1,
      exam,
      attempt,
      questionIndex: Math.max(
        0,
        Math.min(
          exam.questions.length - 1,
          Math.floor(Number(saved.questionIndex)) || 0,
        ),
      ),
      flagged: Array.isArray(saved.flagged)
        ? saved.flagged.filter((id) => exam.questions.some((q) => q.id === id))
        : [],
    };
  } catch {
    return freshPaper();
  }
}

function clockText(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

function questionAnswered(question, answers) {
  return question.parts.every((part) => String(answers[part.id] || "").trim());
}

function ExamDiagram({ diagram }) {
  if (!diagram) return null;
  if (diagram.tokens)
    return (
      <div
        className="exam-expression"
        tabIndex={0}
        aria-label="Infix expression with checkpoints"
      >
        {diagram.tokens.map((token, index) => (
          <React.Fragment key={index}>
            <span>{token}</span>
            {diagram.checkpoints
              .filter((point) => point.stop === index)
              .map((point) => (
                <sup key={point.label} aria-label={`Point ${point.label}`}>
                  {point.label}
                </sup>
              ))}
          </React.Fragment>
        ))}
      </div>
    );
  if (diagram.capacity)
    return (
      <div className="exam-diagram">
        <div className="exam-array" aria-label="Starting circular array queue">
          {Array.from({ length: diagram.capacity }, (_, index) => (
            <div key={index}>
              <span>{diagram.cells[index] ?? "—"}</span>
              <small>{index}</small>
            </div>
          ))}
        </div>
        <p>
          front = {diagram.front};{" "}
          {diagram.rear != null && <>rear = {diagram.rear}; </>}noe ={" "}
          {diagram.count}; queueSize = {diagram.capacity}
        </p>
      </div>
    );
  if (diagram.values)
    return (
      <div tabIndex={0} className="exam-list" aria-label="Linked list">
        <span>head →</span>
        {diagram.values.map((value, index) => (
          <React.Fragment key={index}>
            <b>{value}</b>
            <span>→</span>
          </React.Fragment>
        ))}
        <span>NULL</span>
      </div>
    );
  return null;
}

function AnswerField({ part, answer, onChange, index }) {
  const id = `exam-answer-${part.id}`;
  const formatHint = part.kind === "choice" ? "" : answerFormatHint(part);
  return (
    <div className="exam-answer-part">
      <label htmlFor={id}>
        <span className="exam-part-letter">
          {String.fromCharCode(97 + index)}.
        </span>
        <span>{part.prompt}</span>
        <small>
          {part.points} pt{part.points === 1 ? "" : "s"}
        </small>
      </label>
      {part.kind === "choice" ? (
        <select
          id={id}
          aria-describedby={formatHint ? `${id}-format` : undefined}
          value={answer}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose an answer</option>
          {part.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : part.kind === "code" || (part.kind === "text" && !part.auto) ? (
        <textarea
          id={id}
          aria-describedby={formatHint ? `${id}-format` : undefined}
          className="exam-code-answer"
          rows={part.kind === "code" ? 7 : 5}
          value={answer}
          onChange={(event) => onChange(event.target.value)}
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={
            part.kind === "code"
              ? "Write your C code here."
              : "Show your steps here."
          }
        />
      ) : (
        <input
          id={id}
          aria-describedby={formatHint ? `${id}-format` : undefined}
          value={answer}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck="false"
          autoCapitalize="off"
          inputMode="text"
          placeholder={
            part.kind === "stack"
              ? "Top → bottom; write empty if needed"
              : part.kind === "postfix"
                ? "Postfix expression · spaces optional"
                : part.format === "bigO"
                  ? "Big-O bound · O(...) is optional"
                  : "Your answer"
          }
        />
      )}
      {formatHint && (
        <p className="answer-format-hint" id={`${id}-format`}>
          {formatHint}
        </p>
      )}
    </div>
  );
}

function Confirm({ title, children, onCancel, onConfirm, confirmLabel }) {
  const cancel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="exam-confirm-backdrop" onClick={onCancel}>
      <div
        className="exam-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-confirm-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key === "Tab") {
            const buttons = Array.from(
              event.currentTarget.querySelectorAll("button"),
            );
            if (event.shiftKey && document.activeElement === buttons[0]) {
              event.preventDefault();
              buttons.at(-1).focus();
            } else if (
              !event.shiftKey &&
              document.activeElement === buttons.at(-1)
            ) {
              event.preventDefault();
              buttons[0].focus();
            }
          }
        }}
      >
        <span className="exam-kicker">ONE LAST CHECK</span>
        <h2 id="exam-confirm-title">{title}</h2>
        <p>{children}</p>
        <div className="exam-confirm-actions">
          <button ref={cancel} className="exam-secondary" onClick={onCancel}>
            Keep working
          </button>
          <button className="exam-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Results({ attempt, onScore, onNew }) {
  const grade = gradeExam(attempt);
  const { exam } = attempt;
  const elapsed = Math.min(
    exam.durationMinutes * 60,
    Math.max(
      0,
      Math.floor(
        ((attempt.submittedAt || attempt.deadline) - attempt.startedAt) / 1000,
      ),
    ),
  );
  return (
    <div className="exam-results">
      <div className="exam-results-heading">
        <span className="exam-kicker">
          {attempt.status === "expired"
            ? "TIME’S UP · ANSWERS SAVED"
            : "EXAM COMPLETE"}
        </span>
        <h2>
          You showed up.
          <br />
          Now find your next step.
        </h2>
        <p>{clockText(elapsed)} used · Review the model answers below.</p>
      </div>
      <div className="exam-score-grid">
        <div>
          <span>Automatically checked</span>
          <strong>
            {grade.automaticEarned}
            <small> / {grade.automaticPossible}</small>
          </strong>
        </div>
        <div>
          <span>
            {grade.pendingManual ? "Estimated total so far" : "Estimated total"}
          </span>
          <strong>
            {grade.totalEarned}
            <small> / {grade.totalPossible}</small>
          </strong>
        </div>
      </div>
      <p className="exam-review-note">
        {grade.pendingManual
          ? `${grade.pendingManual} written ${grade.pendingManual === 1 ? "part needs" : "parts need"} your review. Compare your code with each rubric and award partial credit. Unreviewed parts count as 0 for now.`
          : "Written answers use your self-awarded rubric points. This is a practice estimate, not an official grade."}
      </p>
      <section className="exam-review-list" aria-label="Exam answer review">
        {exam.questions.map((question, index) => {
          const earned = question.parts.reduce(
            (sum, part) => sum + grade.parts[part.id].earned,
            0,
          );
          const pending = question.parts.some(
            (part) => grade.parts[part.id].pending,
          );
          return (
            <details className="exam-review-question" key={question.id}>
              <summary>
                <span className="exam-review-number">{index + 1}</span>
                <span>{question.title}</span>
                <b>{pending ? "Review" : `${earned} / ${question.points}`}</b>
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="exam-review-body">
                <p>{question.prompt}</p>
                {question.code && (
                  <pre className="exam-code" tabIndex={0} aria-label="C code">
                    <code>{question.code}</code>
                  </pre>
                )}
                <ExamDiagram diagram={question.diagram} />
                {question.parts.map((part) => {
                  const score = grade.parts[part.id];
                  return (
                    <article className="exam-review-part" key={part.id}>
                      <h3>{part.prompt}</h3>
                      <span
                        className={`exam-verdict ${part.auto && score.correct ? "is-correct" : ""}`}
                      >
                        {part.auto
                          ? score.correct
                            ? `✓ Correct · ${score.earned}/${part.points}`
                            : `${score.earned}/${part.points} · Review this one`
                          : "Written answer · self-review"}
                      </span>
                      <div className="exam-review-answer">
                        <span>Your answer</span>
                        <pre tabIndex={0}>
                          {attempt.answers[part.id]?.trim() || "No answer"}
                        </pre>
                      </div>
                      <div className="exam-review-answer is-model">
                        <span>Model answer</span>
                        <pre tabIndex={0}>{part.answer}</pre>
                      </div>
                      <p className="exam-explanation">{part.explanation}</p>
                      {!part.auto && (
                        <>
                          <ul className="exam-rubric">
                            {part.rubric?.map((criterion, i) => (
                              <li key={i}>{criterion}</li>
                            ))}
                          </ul>
                          <label className="exam-self-score">
                            Your rubric score
                            <select
                              aria-label={`Rubric score for ${part.id}`}
                              value={attempt.manualScores[part.id] ?? ""}
                              onChange={(event) =>
                                onScore(part.id, Number(event.target.value))
                              }
                            >
                              <option value="" disabled>
                                Choose points
                              </option>
                              {Array.from(
                                { length: part.points + 1 },
                                (_, value) => (
                                  <option key={value} value={value}>
                                    {value} / {part.points}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </section>
      <div className="exam-results-actions">
        <a href="#" className="exam-secondary">
          Back to games
        </a>
        <button className="exam-primary" onClick={onNew}>
          Generate new exam ↗
        </button>
      </div>
    </div>
  );
}

export default function Exam({ onExamChange }) {
  const [paper, setPaper] = useState(loadPaper);
  const [now, setNow] = useState(Date.now);
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const heading = useRef(null);
  const { exam, attempt, questionIndex, flagged } = paper;
  const running = attempt?.status === "running";
  const finished = attempt && !running;
  const answers = attempt?.answers || {};
  const answered = exam.questions.filter((question) =>
    questionAnswered(question, answers),
  ).length;
  const seconds = attempt
    ? remainingSeconds(attempt, now)
    : exam.durationMinutes * 60;
  const question = exam.questions[questionIndex];
  const section = exam.sections.find((item) => item.id === question.section);

  useEffect(() => {
    onExamChange?.(exam, attempt?.status || "ready");
  }, [exam, attempt?.status, onExamChange]);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(paper));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [paper]);
  useEffect(() => {
    if (!running) return;
    const update = () => {
      const time = Date.now();
      setNow(time);
      setPaper((previous) => {
        const next = examReducer(previous.attempt, {
          type: "expire",
          now: time,
        });
        return next === previous.attempt
          ? previous
          : { ...previous, attempt: next };
      });
    };
    update();
    const interval = setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [running]);
  useEffect(() => {
    if (finished) setConfirm(false);
  }, [finished]);

  function send(action) {
    const time = Date.now();
    setNow(time);
    setPaper((previous) => ({
      ...previous,
      attempt: examReducer(previous.attempt, { ...action, now: time }),
    }));
  }
  function focusQuestion() {
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
  }
  function navigate(index) {
    setPaper((previous) => ({ ...previous, questionIndex: index }));
    focusQuestion();
  }
  return (
    <main className="exam-page theme-exam">
      <a href="#" className="back-link">
        ← All games
      </a>
      <div className="exam-title-row">
        <div>
          <span className="eyebrow">09 / THE DRESS REHEARSAL</span>
          <h1>
            THE EXAM<span>.</span>
          </h1>
        </div>
        <span className="exam-title-mark" aria-hidden="true">
          ✳
        </span>
      </div>
      <section className="exam-shell" aria-label="Timed mock exam">
        {!attempt ? (
          <div className="exam-start">
            <span className="exam-kicker">
              A QUIET ROOM. A FRESH PAPER. YOU.
            </span>
            <h2>
              Practice for
              <br />
              the real thing.
            </h2>
            <p className="exam-start-description">
              A new mix of exam-style CS questions.
              <br />
              No hints. Answers after you submit.
            </p>
            <div className="exam-facts">
              <div>
                <strong>{exam.durationMinutes}</strong>
                <span>minutes</span>
              </div>
              <div>
                <strong>{exam.totalPoints}</strong>
                <span>points</span>
              </div>
              <div>
                <strong>{exam.sections.length}</strong>
                <span>sections</span>
              </div>
            </div>
            <div className="exam-section-preview">
              {exam.sections.map((item, index) => (
                <div key={item.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{item.title}</b>
                  <small>{item.points} pts</small>
                </div>
              ))}
            </div>
            <p className="exam-start-note">
              The timer keeps running if you leave or reload. Your answers save
              here. Written C answers are self-scored with a rubric.
            </p>
            <button
              className="exam-primary exam-begin"
              onClick={() => {
                const time = Date.now();
                setNow(time);
                setPaper((previous) => ({
                  ...previous,
                  attempt: createExamAttempt(previous.exam, time),
                }));
                focusQuestion();
              }}
            >
              Begin exam <span aria-hidden="true">→</span>
            </button>
            <button
              className="exam-fresh-paper"
              onClick={() =>
                setPaper((previous) => freshPaper(previous.exam.seed))
              }
            >
              <span aria-hidden="true">↻</span> Generate a new paper
            </button>
            <p className="exam-paper-id">
              Paper {String(exam.seed).slice(-6).padStart(6, "0")} ·{" "}
              {exam.questions.length} questions
            </p>
          </div>
        ) : finished ? (
          <Results
            attempt={attempt}
            onScore={(partId, value) => send({ type: "score", partId, value })}
            onNew={() => {
              setPaper((previous) => freshPaper(previous.exam.seed));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : (
          <>
            <div className="exam-live-header">
              <div>
                <span className="exam-kicker">IN PROGRESS</span>
                <p>
                  {answered} / {exam.questions.length} answered
                </p>
              </div>
              <div className={`exam-clock ${seconds <= 600 ? "is-low" : ""}`}>
                <span>Time left</span>
                <strong role="timer" aria-label="Time remaining">
                  {clockText(seconds)}
                </strong>
              </div>
            </div>
            <div className="exam-progress-track" aria-hidden="true">
              <span
                style={{
                  width: `${(answered / exam.questions.length) * 100}%`,
                }}
              />
            </div>
            <nav className="exam-question-nav" aria-label="Exam questions">
              {exam.questions.map((item, index) => (
                <button
                  key={item.id}
                  aria-label={`Question ${index + 1}${questionAnswered(item, answers) ? ", answered" : ""}${flagged.includes(item.id) ? ", marked for review" : ""}`}
                  aria-current={questionIndex === index ? "step" : undefined}
                  className={`${questionAnswered(item, answers) ? "is-answered" : ""} ${flagged.includes(item.id) ? "is-flagged" : ""}`}
                  onClick={() => navigate(index)}
                >
                  {index + 1}
                  {flagged.includes(item.id) && <i aria-hidden="true">•</i>}
                </button>
              ))}
            </nav>
            <div className="exam-nav-key">
              <span>● Answered</span>
              <span>• Marked for review</span>
            </div>
            <article className="exam-question" key={question.id}>
              <div className="exam-question-meta">
                <span>{section?.title || question.section}</span>
                <b>{question.points} points</b>
              </div>
              <h2 ref={heading} tabIndex={-1}>
                {questionIndex + 1}. {question.title}
              </h2>
              <p className="exam-question-prompt">{question.prompt}</p>
              {question.code && (
                <pre className="exam-code" tabIndex={0} aria-label="C code">
                  <code>{question.code}</code>
                </pre>
              )}
              <ExamDiagram diagram={question.diagram} />
              <div className="exam-answer-parts">
                {question.parts.map((part, index) => (
                  <AnswerField
                    key={part.id}
                    part={part}
                    answer={answers[part.id] || ""}
                    index={index}
                    onChange={(value) =>
                      send({ type: "draft", partId: part.id, value })
                    }
                  />
                ))}
              </div>
              <button
                className={`exam-review-toggle ${flagged.includes(question.id) ? "is-marked" : ""}`}
                aria-pressed={flagged.includes(question.id)}
                onClick={() =>
                  setPaper((previous) => ({
                    ...previous,
                    flagged: previous.flagged.includes(question.id)
                      ? previous.flagged.filter((id) => id !== question.id)
                      : [...previous.flagged, question.id],
                  }))
                }
              >
                <span aria-hidden="true">⚑</span>
                {flagged.includes(question.id)
                  ? "Marked for review"
                  : "Mark for review"}
              </button>
            </article>
            <div className="exam-controls">
              <button
                className="exam-secondary"
                disabled={!questionIndex}
                onClick={() => navigate(questionIndex - 1)}
              >
                ← Previous
              </button>
              <span>
                {questionIndex + 1} / {exam.questions.length}
              </span>
              {questionIndex < exam.questions.length - 1 ? (
                <button
                  className="exam-primary"
                  onClick={() => navigate(questionIndex + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="exam-primary"
                  onClick={() => setConfirm(true)}
                >
                  Finish →
                </button>
              )}
            </div>
            <div className="exam-submit-row">
              <span>
                {saved
                  ? "Answers saved · timer stays on"
                  : "Storage unavailable · keep this page open"}
              </span>
              <button onClick={() => setConfirm(true)}>Submit exam</button>
            </div>
          </>
        )}
      </section>
      {!running && (
        <p className="exam-persistence-note">
          {saved
            ? "Your paper and progress save in this browser."
            : "Browser storage is unavailable. Keep this page open to retain your paper."}
        </p>
      )}
      {confirm && (
        <Confirm
          title="Ready to submit?"
          confirmLabel="Submit now"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            send({ type: "submit" });
            setConfirm(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          {answered < exam.questions.length
            ? `${exam.questions.length - answered} questions still have a blank part. `
            : "Every question has an answer. "}
          Submission ends the timer and opens your answer review.
        </Confirm>
      )}
    </main>
  );
}
