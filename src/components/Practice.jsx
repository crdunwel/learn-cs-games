import PostfixRules from "./PostfixRules.jsx";
import { gradeMallocAnswer } from "../engine/mallocAnswer.js";
import QueueLine from "./QueueLine.jsx";
import StepReview from "./StepReview.jsx";
import { reviewSteps, queueMoveSteps } from "../engine/learningSteps.js";
import BaseWork from "./BaseWork.jsx";
import { baseWorkResult, baseWorkFeedback } from "../engine/baseWork.js";
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { startSession, sessionReducer } from "../engine/session.js";
import { explainMistake } from "../engine/feedback.js";
import { recordRound } from "../engine/progress.js";
import { operationLabel } from "../games/queue.js";
import { Stack, Tokens, QueueArray } from "./Visuals.jsx";
import Help from "./Help.jsx";
import CodeBlock from "./CodeBlock.jsx";
import TraceVisual from "./TraceVisual.jsx";
import { answerFormatHint } from "../engine/answerFormats.js";

// Replays are visual only: they never dispatch an answer or award points.
function QueueScene({ question, checked, draft, onSelect }) {
  const [move, setMove] = useState(0),
    [playing, setPlaying] = useState(false);
  const trace = question.trace,
    ordinary = question.variant === "fifo";
  useEffect(() => {
    setMove(0);
    setPlaying(false);
  }, [checked, question]);
  useEffect(() => {
    if (!playing) return;
    if (move >= trace.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setMove((i) => i + 1), 1500);
    return () => clearTimeout(timer);
  }, [playing, move, trace.length]);
  const state = checked && move ? trace[move - 1].state : question.initial;
  const indexQuestion =
    !ordinary && ["front", "rear"].includes(question.target);
  const entry = checked && move ? trace[move - 1] : null;
  const details = entry ? queueMoveSteps(entry) : [];
  return (
    <>
      <p className="queue-instruction">
        ENQUEUE adds an item. DEQUEUE removes the first item. Work left to
        right.
      </p>
      <div className="operations" aria-label="Queue operations">
        {question.operations.map((op, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span aria-hidden="true">→</span>}
            <span
              className={`operation ${checked && move === i + 1 ? "active" : ""}`}
            >
              {operationLabel(op)}
            </span>
          </React.Fragment>
        ))}
      </div>
      <span className="diagram-label">
        {!checked || !move
          ? "STARTING QUEUE"
          : move === trace.length
            ? "AFTER THE OPERATIONS"
            : `AFTER OPERATION ${move}`}
      </span>
      {ordinary ? (
        <QueueLine items={state.items} />
      ) : (
        <>
          <div
            className="queue-state-values"
            aria-label="Queue indices and size"
          >
            <span>
              front = <b>{state.front}</b>
            </span>
            <span>
              rear = <b>{state.rear}</b>
            </span>
            <span>
              QSize = <b>{state.count}</b>
            </span>
          </div>
          <QueueArray
            state={state}
            selectedIndex={
              indexQuestion && draft !== "" ? Number(draft) : undefined
            }
            correctIndex={
              checked && indexQuestion && move === trace.length
                ? Number(question.steps[0].answer)
                : undefined
            }
            onSelect={
              !checked && indexQuestion ? (i) => onSelect(String(i)) : undefined
            }
          />
          <p className="queue-cycle">
            Index order:{" "}
            {Array.from({ length: state.capacity }, (_, i) => i).join(" → ")} →
            0
          </p>
        </>
      )}
      <div className="queue-replay">
        <p className="replay-status" aria-live="polite">
          {checked
            ? move
              ? `Operation ${move} / ${trace.length}: ${operationLabel(entry.operation)}`
              : `Start here. Next: ${operationLabel(question.operations[0])}. Tap Next operation to see each change.`
            : ordinary
              ? "Follow the line: the oldest item leaves first."
              : "front points to the next item out. rear points to the last item in."}
        </p>
        <div className="queue-move-detail">
          {details.length ? (
            details.map((d, i) => (
              <div key={i}>
                <b>
                  {i + 1}. {d.title}
                </b>
                <p>{d.detail}</p>
                <pre tabIndex={0}>{d.math}</pre>
              </div>
            ))
          ) : (
            <p>
              {ordinary ? (
                "ENQUEUE joins the rear. DEQUEUE removes the front. No indices or wraparound."
              ) : (
                <>
                  Advance an index with{" "}
                  <code>(index + 1) % {state.capacity}</code>. After index{" "}
                  {state.capacity - 1}, the next slot is 0. The % operator gives
                  the remainder.
                </>
              )}
            </p>
          )}
        </div>
        <div
          className={`replay-buttons ${!checked ? "is-inactive" : ""}`}
          aria-hidden={!checked}
        >
          <button
            type="button"
            className="quiet-button"
            disabled={!checked || !move}
            onClick={() => {
              setPlaying(false);
              setMove(move - 1);
            }}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="quiet-button"
            disabled={!checked || move >= trace.length}
            onClick={() => {
              setPlaying(false);
              setMove(move + 1);
            }}
          >
            Next operation →
          </button>
          <button
            type="button"
            className="quiet-button"
            disabled={!checked}
            onClick={() => {
              setMove(0);
              setPlaying(true);
            }}
          >
            ↻ Replay
          </button>
        </div>
      </div>
    </>
  );
}

function displayAnswer(step, draft) {
  if (step.work && draft && typeof draft === "object")
    return baseWorkResult(step.work, draft) || "empty";
  if (Array.isArray(draft)) return draft.join(" ") || "empty";
  return step.optionLabels?.[draft] || draft || "empty";
}

export default function Practice({ game, level, onProgress }) {
  const [session, setSession] = useState(() =>
    startSession(game.generate(Math.random, level)),
  );
  const current = useRef(session);
  const { question, step: stepIndex, draft, status } = session;
  const step = question.steps[stepIndex],
    checked = status !== "answering";
  const postfixScene = useRef(null);
  const [postfixHeight, setPostfixHeight] = useState(null);
  useLayoutEffect(() => {
    if (step.kind !== "stack" || !postfixScene.current) return;
    const node = postfixScene.current;
    const capture = () => {
      const height = node.getBoundingClientRect().height;
      if (height > 0)
        setPostfixHeight((previous) =>
          previous === height ? previous : height,
        );
    };
    const observer = new ResizeObserver(capture);
    observer.observe(node);
    capture();
    return () => observer.disconnect();
  }, [question, step.kind]);
  const finalStep = stepIndex === question.steps.length - 1;
  const indexQuestion =
    question.type === "queue" &&
    question.variant !== "fifo" &&
    ["front", "rear"].includes(question.target);
  function send(action) {
    const before = current.current,
      after = sessionReducer(before, action);
    current.current = after;
    setSession(after);
    if (after !== before && ["check", "reveal"].includes(action.type)) {
      onProgress((previous) => {
        const result = {
          ...previous,
          xp: previous.xp + after.earned - before.earned,
        };
        return after.step === after.question.steps.length - 1
          ? recordRound(result, game.id, after.allCorrect)
          : result;
      });
    }
  }
  const setDraft = (value) => send({ type: "draft", value });
  const expectedStack =
    step.kind === "stack" ? step.answer.split(" ").filter(Boolean) : [];
  function advance() {
    send(
      finalStep
        ? { type: "new", question: game.generate(Math.random, level) }
        : { type: "next" },
    );
  }
  return (
    <section
      className={`play-panel practice-panel practice-${question.type} ${step.work ? "practice-base-work" : ""}`}
      aria-label={`${game.title} practice`}
    >
      <div className="panel-top">
        <span className="eyebrow">
          {question.type === "postfix"
            ? stepIndex === 0
              ? "01 / STACK CHECK"
              : "02 / POSTFIX FINISH"
            : question.type === "queue"
              ? question.variant === "fifo"
                ? "ORDINARY FIFO QUEUE"
                : "CIRCULAR ARRAY QUEUE"
              : question.type === "trace"
                ? game.topic.toUpperCase()
                : "SPOT THE PATTERN"}
        </span>
        <Help key={`${session.round}-${stepIndex}`} label="Show hint">
          {step.hint}
          {question.type === "postfix" && (
            <>
              <hr />
              <PostfixRules />
            </>
          )}
          <hr />
          {step.format === "malloc"
            ? "Correct allocation: 10 XP, or 9 XP if only the semicolon is missing."
            : "Correct answer: +10 XP."}{" "}
          Reveals: 0 XP. A perfect round grows your streak.
        </Help>
      </div>
      <h2>
        <span className="step-caption" key={`${session.round}-${stepIndex}`}>
          {step.prompt}
        </span>
      </h2>
      <div className="exercise-stage">
        {question.type === "postfix" && (
          <>
            <Tokens
              tokens={question.tokens}
              stop={step.kind === "stack" ? question.stop : undefined}
              checkpointLabel={
                step.kind === "stack" ? question.checkpoint.label : undefined
              }
            />
            <p className="checkpoint">
              {stepIndex === 0 ? (
                <>
                  Process everything{" "}
                  <b>before point {question.checkpoint.label}</b>.{" "}
                  {question.checkpoint.note}
                </>
              ) : (
                "Use the whole expression. Spaces are optional."
              )}
            </p>
            <div
              className={`stack-scene ${step.kind === "postfix" ? "postfix-entry-scene" : ""}`}
              ref={postfixScene}
              style={{ minHeight: postfixHeight }}
            >
              {step.kind === "stack" && (
                <Stack
                  values={
                    step.kind === "stack"
                      ? checked
                        ? expectedStack
                        : draft
                      : [
                          ...question.solution.states[question.stop].stack,
                        ].reverse()
                  }
                  capacity={question.stackCapacity}
                />
              )}
              {step.kind === "stack" ? (
                <div className="stack-builder">
                  <span className="eyebrow">
                    {checked ? "CORRECT STACK" : "PUSH FROM BOTTOM TO TOP"}
                  </span>
                  <div className="operator-buttons">
                    {["+", "-", "*", "/", "("].map((operator) => (
                      <button
                        type="button"
                        aria-label={`Push ${operator}`}
                        key={operator}
                        disabled={
                          checked ||
                          draft.length >= Math.max(8, question.stackCapacity)
                        }
                        onClick={() => setDraft([operator, ...draft])}
                      >
                        {operator}
                      </button>
                    ))}
                  </div>
                  <div className="small-controls">
                    <button
                      type="button"
                      disabled={checked || !draft.length}
                      onClick={() => setDraft(draft.slice(1))}
                    >
                      Pop ↑
                    </button>
                    <button
                      type="button"
                      disabled={checked || !draft.length}
                      onClick={() => setDraft([])}
                    >
                      Clear
                    </button>
                  </div>
                  <span className="builder-note">
                    Tap to push. New items go on top.
                  </span>
                </div>
              ) : (
                <div className="answer-field">
                  <label htmlFor="postfix-answer">Your postfix</label>
                  <input
                    id="postfix-answer"
                    aria-describedby="postfix-format"
                    form="practice-answer"
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="e.g. 4 2 3 * +"
                    value={draft}
                    disabled={checked}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <p className="answer-format-hint" id="postfix-format">
                    {answerFormatHint(step)}
                  </p>
                  <p className="builder-note">
                    Start from the first token. Convert the whole expression.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {question.type === "queue" && (
          <QueueScene
            key={session.round}
            question={question}
            checked={checked}
            draft={draft}
            onSelect={setDraft}
          />
        )}
        {question.type === "bigO" &&
          (question.code ? (
            <CodeBlock code={question.code} />
          ) : (
            <div className="scale-scene">
              <span className="eyebrow">
                {question.scale.mode === "time"
                  ? "EXACT TIME MODEL"
                  : "EXACT WORK MODEL"}
              </span>
              <strong>
                {question.scale.mode === "time" ? "T(n) = c × " : "W(n) = "}
                {["1", "n", "n²", "n³"][question.scale.power]}
              </strong>
              <div>
                {question.scale.initialSize} items <span>→</span>{" "}
                {question.scale.initialSize * question.scale.factor} items
              </div>
              {question.scale.mode === "time" && (
                <p>
                  Original time: {question.scale.timeMs} ms. Same machine; c
                  stays fixed.
                </p>
              )}
            </div>
          ))}
        {question.type === "trace" && !step.work && (
          <div className="trace-scene">
            {question.code && <CodeBlock code={question.code} />}
            <TraceVisual visual={question.visual} />
          </div>
        )}
        {step.work && (
          <BaseWork
            key={session.round}
            step={step}
            draft={draft}
            onChange={setDraft}
            status={status}
          />
        )}
        {step.kind === "input" && !step.work && (
          <div className="answer-field trace-answer">
            <label htmlFor="short-answer">Your answer</label>
            <input
              id="short-answer"
              aria-describedby="short-answer-format"
              form="practice-answer"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              placeholder={
                step.format === "malloc"
                  ? `e.g. ${step.allocation.type} *${step.allocation.name} = malloc(...);`
                  : "Type your answer"
              }
              className={
                step.format === "malloc" ? "code-answer-input" : undefined
              }
              value={draft}
              disabled={checked}
              onChange={(event) => setDraft(event.target.value)}
            />
            <p className="answer-format-hint" id="short-answer-format">
              {step.format === "malloc"
                ? "Write one malloc assignment. Spacing is flexible. A missing semicolon costs 1 point."
                : answerFormatHint(step)}
            </p>
          </div>
        )}
        {step.kind === "choice" && !indexQuestion && (
          <div
            className={`choices ${step.optionFormat ? "choices-wide" : ""}`}
            role="group"
            aria-label="Answer choices"
          >
            {step.options.map((option) => (
              <button
                type="button"
                aria-pressed={draft === option}
                className={`${draft === option ? "selected" : ""} ${checked && option === step.answer ? "right-answer" : ""}`}
                key={option}
                disabled={checked}
                onClick={() => setDraft(option)}
              >
                <span
                  className={
                    step.optionFormat
                      ? `option-${step.optionFormat}`
                      : "option-text"
                  }
                >
                  {step.optionLabels?.[option] || option}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        id="practice-answer"
        className="answer-dock"
        onSubmit={(event) => {
          event.preventDefault();
          checked ? advance() : send({ type: "check" });
        }}
      >
        <div
          className={`feedback-copy ${status === "correct" ? "success" : ""}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {checked
              ? status === "correct"
                ? `✓ Correct. +${step.format === "malloc" ? gradeMallocAnswer(step, draft).earned : 10} XP`
                : status === "revealed"
                  ? "Here’s why."
                  : "Not quite. Here’s why."
              : ""}
          </strong>
          <p
            className={`answer-comparison ${status !== "incorrect" || step.work ? "is-inactive" : ""}`}
            aria-hidden={status !== "incorrect" || !!step.work}
          >
            You: <b>{displayAnswer(step, draft)}</b> · Correct:{" "}
            <b>{displayAnswer(step, step.answer)}</b>
            {step.kind === "stack" ? " (top → bottom)" : ""}
          </p>
          <p
            className="feedback-text"
            key={`${session.round}-${stepIndex}-${status}`}
          >
            {checked
              ? status === "incorrect"
                ? step.format === "malloc"
                  ? gradeMallocAnswer(step, draft).reason || step.explanation
                  : step.work
                    ? baseWorkFeedback(step.work, draft)
                    : explainMistake(question, stepIndex, draft)
                : step.work
                  ? "Each digit × its place value makes a product. Add the products: both bases describe the same number."
                  : step.explanation
              : ""}
          </p>
          {session.warning && (
            <p className="syntax-reminder">{session.warning}</p>
          )}
          <div className="feedback-illustration" aria-label="Worked example">
            {checked && !step.work && question.type !== "queue" && (
              <StepReview
                key={`${session.round}-${stepIndex}`}
                steps={reviewSteps(question, stepIndex)}
              />
            )}
            {checked && step.work && (
              <p className="base-work-summary">
                {question.data.from === 10
                  ? `${question.data.value} (decimal) = ${step.answer} (base ${step.radix})`
                  : question.data.to === 10
                    ? `${question.data.source} (base ${question.data.from}) = ${question.data.value} (decimal)`
                    : `${question.data.source} (base ${question.data.from}) = ${question.data.value} (decimal) = ${step.answer} (base ${step.radix})`}
              </p>
            )}
          </div>
        </div>
        <div className="dock-actions">
          <button
            className="text-button"
            type="button"
            disabled={checked}
            onClick={() => send({ type: "reveal" })}
          >
            Reveal
          </button>
          <button
            className="primary"
            type="submit"
            disabled={
              !checked && step.kind !== "stack" && !String(draft).trim()
            }
          >
            {checked ? (finalStep ? "Next round" : "Next") : "Check"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
