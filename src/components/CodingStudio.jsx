import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  writingExercises,
  writingTopics,
  writingById,
  modelFunction,
  checkWritingLine,
  checkWritingFunction,
  isRecognized,
  emptyWritingDraft,
  loadWriting,
  saveWriting,
  writingCompletion,
} from "../engine/cWriting.js";
import CodeBlock from "./CodeBlock.jsx";
import Help from "./Help.jsx";
import CodingPrint from "./CodingPrint.jsx";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function firstLine(q, draft) {
  const i = q.lines.findIndex(
    (line, index) =>
      !line.fixed &&
      !isRecognized(checkWritingLine(draft.lines[index] || "", line)),
  );
  return i < 0 ? q.lines.findIndex((line) => !line.fixed) : i;
}

export default function CodingStudio({ exerciseId }) {
  const [drafts, setDrafts] = useState(() => loadWriting(storage()));
  const [topic, setTopic] = useState("All topics"),
    [mode, setMode] = useState("guided"),
    [helper, setHelper] = useState(true);
  const [saved, setSaved] = useState(true);
  const exercise = writingById(exerciseId) || writingExercises[0];
  const [cursor, setCursor] = useState(() => ({
    id: exercise.id,
    index: firstLine(exercise, drafts[exercise.id] || emptyWritingDraft()),
  }));
  const position =
    cursor.id === exercise.id
      ? cursor.index
      : firstLine(exercise, drafts[exercise.id] || emptyWritingDraft());
  const setPosition = (index) => setCursor({ id: exercise.id, index });
  const [feedback, setFeedback] = useState(null),
    [showModel, setShowModel] = useState(false),
    [finished, setFinished] = useState(false);
  const editor = useRef(null),
    form = useRef(null),
    soFar = useRef(null);
  const draft = drafts[exercise.id] || emptyWritingDraft();
  const selected =
    topic === "All topics"
      ? writingExercises
      : writingExercises.filter((q) => q.topic === topic);
  const options = selected.some((q) => q.id === exercise.id)
    ? selected
    : [exercise, ...selected];
  const current = exercise.lines[position];
  const editable = exercise.lines
    .map((line, i) => (!line.fixed ? i : -1))
    .filter((i) => i >= 0);
  const lineNumber = editable.indexOf(position) + 1;
  const complete = writingExercises.filter(
    (q) => writingCompletion(q, drafts[q.id]) === "complete",
  ).length;
  useEffect(() => {
    setSaved(saveWriting(storage(), drafts));
  }, [drafts]);
  useLayoutEffect(() => {
    setPosition(
      firstLine(exercise, drafts[exercise.id] || emptyWritingDraft()),
    );
    setFeedback(null);
    setShowModel(false);
    setFinished(false);
  }, [exercise.id]);
  useLayoutEffect(() => {
    const node = form.current;
    if (!node || mode !== "guided") return;
    const measure = () => {
      const hint = node.querySelector(".coding-helper"),
        feedbackNode = node.querySelector(".coding-feedback");
      if (!hint || !feedbackNode) return;
      function maximum(element, values) {
        const clone = element.cloneNode(false);
        Object.assign(clone.style, {
          position: "fixed",
          visibility: "hidden",
          width: `${element.clientWidth}px`,
          height: "auto",
          minHeight: "0",
          left: "0",
          top: "0",
        });
        clone.removeAttribute("aria-live");
        clone.setAttribute("aria-hidden", "true");
        node.append(clone);
        let height = 0;
        for (const value of values) {
          clone.replaceChildren();
          value.forEach(([tag, text]) => {
            const part = document.createElement(tag);
            part.textContent = text;
            clone.append(part);
          });
          height = Math.max(height, clone.getBoundingClientRect().height);
        }
        clone.remove();
        return Math.ceil(height);
      }
      node.style.setProperty(
        "--helper-height",
        `${maximum(
          hint,
          exercise.lines
            .filter((line) => !line.fixed)
            .map((line) => [
              ["b", "Your next action"],
              ["p", line.hint],
            ]),
        )}px`,
      );
      const longestFeedback =
        "This needs review. Compare with the guided approach.";
      node.style.setProperty(
        "--feedback-height",
        `${maximum(
          feedbackNode,
          exercise.lines
            .filter((line) => !line.fixed)
            .map((line) => [
              ["strong", longestFeedback],
              ["p", line.why],
            ]),
        )}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [exercise.id, mode, finished]);
  useLayoutEffect(() => {
    if (soFar.current) soFar.current.scrollTop = soFar.current.scrollHeight;
  }, [position, mode]);
  function update(changes) {
    setDrafts((all) => ({
      ...all,
      [exercise.id]: {
        ...(all[exercise.id] || emptyWritingDraft()),
        ...("raw" in changes || "lines" in changes ? { reviewed: false } : {}),
        ...changes,
      },
    }));
  }
  function select(id) {
    window.location.hash = `code/${id}`;
  }
  function chooseMode(next) {
    if (next === "raw" && draft.raw == null) {
      const allWritten = exercise.lines.every(
        (line, i) =>
          line.fixed ||
          isRecognized(checkWritingLine(draft.lines[i] || "", line)),
      );
      update({
        raw: allWritten
          ? [
              exercise.signature,
              ...exercise.lines.map((line, i) =>
                line.fixed ? line.code : draft.lines[i],
              ),
              "}",
            ].join("\n")
          : `${exercise.signature}\n\n}`,
      });
    }
    setMode(next);
    setFeedback(null);
    setShowModel(false);
    setFinished(false);
  }
  function check(event) {
    event?.preventDefault();
    const result =
      mode === "guided"
        ? checkWritingLine(draft.lines[position] || "", current)
        : checkWritingFunction(draft.raw, exercise);
    setFeedback(result);
    if (mode === "raw" && isRecognized(result)) setFinished(true);
  }
  function move(next) {
    setPosition(next);
    setFeedback(null);
    setShowModel(false);
    setFinished(false);
    requestAnimationFrame(() => editor.current?.focus({ preventScroll: true }));
  }
  function nextLine() {
    const next = editable[editable.indexOf(position) + 1];
    if (next == null) {
      setFinished(true);
      return;
    }
    move(next);
  }
  const assembled = [
    exercise.signature,
    ...exercise.lines
      .slice(0, position)
      .map((line, i) =>
        line.fixed ? line.code : draft.lines[i] || "/* not written yet */",
      ),
  ].join("\n");
  const status = writingCompletion(exercise, draft);
  const fullRaw = draft.raw ?? `${exercise.signature}\n\n}`;
  const allGuided = [
    exercise.signature,
    ...exercise.lines.map((line, i) =>
      line.fixed ? line.code : draft.lines[i] || "/* not written yet */",
    ),
    "}",
  ].join("\n");
  const finishResult = finished
    ? checkWritingFunction(mode === "raw" ? fullRaw : allGuided, exercise)
    : null;
  return (
    <main className="game-page coding-studio">
      <div className="coding-top">
        <a className="back-link" href="#">
          ← All games
        </a>
        <CodingPrint exercise={exercise} exercises={options} />
      </div>
      <div className="game-heading">
        <div className="game-emblem" aria-hidden="true">
          ✎
        </div>
        <div>
          <span className="eyebrow">FROM THE IDEA TO THE C</span>
          <h1>C Writing Studio</h1>
        </div>
      </div>
      <p className="coding-intro">
        {writingExercises.length} different problems. Build one line at a time,
        then try the whole function.
      </p>
      {draft.previous && (
        <details className="coding-provided">
          <summary>
            Problem updated · your earlier writing is saved here
          </summary>
          <p>
            This draft belongs to an older version. Compare it with the current
            problem before using it.
          </p>
          <CodeBlock code={draft.previous} />
        </details>
      )}
      <div className="coding-library">
        <label>
          Topic
          <select
            aria-label="Coding topic"
            value={topic}
            onChange={(e) => {
              const value = e.target.value;
              setTopic(value);
              select(
                (value === "All topics"
                  ? writingExercises
                  : writingExercises.filter((q) => q.topic === value))[0].id,
              );
            }}
          >
            <option>All topics</option>
            {writingTopics.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Problem
          <select
            aria-label="Coding problem"
            value={exercise.id}
            onChange={(e) => select(e.target.value)}
          >
            {options.map((q) => (
              <option value={q.id} key={q.id}>
                {writingCompletion(q, drafts[q.id]) === "complete" ? "✓ " : ""}
                {q.title}
              </option>
            ))}
          </select>
        </label>
        <span className="coding-count">
          {complete} / {writingExercises.length} completed
        </span>
      </div>
      <section
        className="play-panel coding-problem"
        aria-label="C writing problem"
      >
        <div className="panel-top">
          <span className="eyebrow">{exercise.topic}</span>
          <Help label="How C writing is checked">
            Write with the supplied names and signature in guided mode. Spaces,
            indentation and comments do not affect checking. Missing statement
            semicolons get a small syntax reminder. We recognize the taught
            solution and listed alternatives; other approaches need your review
            against the sample and checklist. Your C is never executed.
            Completed means a recognized approach, not a proof for arbitrary C.
          </Help>
        </div>
        <h2>{exercise.title}</h2>
        <p className="coding-prompt">{exercise.prompt}</p>
        <p className="coding-assumptions">{exercise.assumptions}</p>
        <p className="coding-example">
          <b>Example</b> {exercise.example}
        </p>
        {exercise.setup && (
          <details className="coding-provided">
            <summary>Provided types & helpers</summary>
            <CodeBlock code={exercise.setup} />
          </details>
        )}
        <div className="coding-modes">
          <div className="mode-tabs" aria-label="Writing mode">
            <button
              aria-pressed={mode === "guided"}
              onClick={() => chooseMode("guided")}
            >
              Line by line
            </button>
            <button
              aria-pressed={mode === "raw"}
              onClick={() => chooseMode("raw")}
            >
              Whole function
            </button>
          </div>
          {mode === "guided" && (
            <button
              className="quiet-button"
              aria-pressed={!helper}
              onClick={() => setHelper(!helper)}
            >
              {helper ? "Hide helper" : "Show helper"}
            </button>
          )}
        </div>
        {finished ? (
          <div className="coding-finish" role="status">
            <h3>
              {status === "complete"
                ? "You built it."
                : "Walkthrough complete."}
            </h3>
            <p>
              {status === "complete"
                ? "Now write it once on paper, without the helper."
                : "Compare your solution with the checklist, then try writing it without help."}
            </p>
            {finishResult?.kind === "minor" && <p>{finishResult.message}</p>}
            <CodeBlock
              code={
                mode === "raw"
                  ? fullRaw
                  : [
                      exercise.signature,
                      ...exercise.lines.map((line, i) =>
                        line.fixed
                          ? line.code
                          : draft.lines[i] || "/* not written yet */",
                      ),
                      "}",
                    ].join("\n")
              }
            />
            <button
              className="quiet-button"
              onClick={() => {
                setFinished(false);
                setFeedback(null);
              }}
            >
              Review my work
            </button>
            <button
              className="primary"
              onClick={() =>
                select(
                  options[
                    (options.findIndex((q) => q.id === exercise.id) + 1) %
                      options.length
                  ].id,
                )
              }
            >
              Next problem →
            </button>
          </div>
        ) : (
          <form ref={form} onSubmit={check} className="coding-editor-form">
            {mode === "guided" ? (
              <>
                <div className="coding-step-bar">
                  <span>
                    Line {lineNumber} of {editable.length}
                  </span>
                  <span>Function so far ↓</span>
                </div>
                <div className="coding-so-far" ref={soFar}>
                  <CodeBlock code={assembled} />
                </div>
                <div
                  className={`coding-helper ${helper ? "" : "helper-hidden"}`}
                  aria-hidden={!helper}
                >
                  <b>Your next action</b>
                  <p>{current.hint}</p>
                </div>
                <label className="coding-input-label" htmlFor="code-line">
                  Write the next line of C
                </label>
                <textarea
                  ref={editor}
                  id="code-line"
                  className="coding-input coding-line"
                  value={draft.lines[position] || ""}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  aria-describedby="coding-entry-note"
                  onChange={(e) => {
                    update({
                      lines: { ...draft.lines, [position]: e.target.value },
                    });
                    setFeedback(null);
                  }}
                  placeholder="Write C here"
                />
                <p id="coding-entry-note" className="coding-entry-note">
                  Use the supplied names. Indentation and spacing are up to you.
                </p>
              </>
            ) : (
              <>
                <label className="coding-input-label" htmlFor="code-function">
                  Write the complete function
                </label>
                <textarea
                  ref={editor}
                  id="code-function"
                  className="coding-input coding-full"
                  value={fullRaw}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  onChange={(e) => {
                    update({ raw: e.target.value });
                    setFeedback(null);
                  }}
                  aria-describedby="coding-raw-note"
                />
                <p id="coding-raw-note" className="coding-entry-note">
                  Includes the signature and braces. Your line-by-line draft is
                  kept separately.
                </p>
              </>
            )}
            <div className="coding-feedback" aria-live="polite">
              {feedback && (
                <>
                  <strong>{feedback.message}</strong>
                  {mode === "guided" && feedback.kind !== "empty" && (
                    <p>{current.why}</p>
                  )}
                </>
              )}
            </div>
            <div className="coding-actions">
              {mode === "guided" && (
                <button
                  type="button"
                  className="quiet-button"
                  disabled={lineNumber === 1}
                  onClick={() => move(editable[lineNumber - 2])}
                >
                  ← Previous line
                </button>
              )}
              <button
                type="button"
                className="quiet-button"
                onClick={() => setShowModel(!showModel)}
              >
                {showModel ? "Hide example" : "Show one approach"}
              </button>
              {mode === "guided" && isRecognized(feedback) ? (
                <button type="button" className="primary" onClick={nextLine}>
                  {lineNumber === editable.length
                    ? "Finish function"
                    : "Next line"}{" "}
                  →
                </button>
              ) : (
                <button type="submit" className="primary">
                  {mode === "guided" ? "Check line" : "Check function"}
                </button>
              )}
            </div>
            {showModel && (
              <div className="coding-model">
                <h3>One correct approach</h3>
                <CodeBlock
                  code={
                    mode === "guided" ? current.code : modelFunction(exercise)
                  }
                />
                {mode === "guided" ? (
                  <p>{current.why} Read it, then type the line yourself.</p>
                ) : (
                  <>
                    <ul>
                      {exercise.rubric.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p>
                      Other correct implementations are valid. Check your base
                      cases, bounds, pointer order and cleanup.
                    </p>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => {
                        update({ reviewed: true });
                        setFeedback({
                          kind: "reviewed",
                          message:
                            "Marked as self-reviewed. This is separate from automatic completion.",
                        });
                      }}
                    >
                      I compared my solution
                    </button>
                  </>
                )}
              </div>
            )}
          </form>
        )}
      </section>
      <p className="coding-save">
        {saved
          ? "Writing saved in this browser."
          : "Storage unavailable — keep this page open to retain your writing."}{" "}
        {status === "reviewed" ? "This problem is self-reviewed." : ""}
      </p>
    </main>
  );
}
