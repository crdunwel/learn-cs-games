import React, { useState } from "react";
import { Stack, Tokens, QueueArray, Growth } from "./Visuals.jsx";
import Help from "./Help.jsx";
import CodeBlock from "./CodeBlock.jsx";
import TraceVisual from "./TraceVisual.jsx";

export default function Tutorial({ game, onComplete }) {
  const lessons = game.lessons || [
    {
      id: "basics",
      title: "The basics",
      summary: "One move at a time.",
      steps: game.tutorial,
    },
  ];
  const [lessonIndex, setLessonIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const lesson = lessons[lessonIndex];
  const step = lesson.steps[index];
  const last = index === lesson.steps.length - 1;
  function selectLesson(value) {
    setLessonIndex(Number(value));
    setIndex(0);
  }
  return (
    <section
      className={`play-panel tutorial-panel tutorial-game-${game.id} ${step.type === "trace" ? "tutorial-trace" : ""}`}
      aria-label={`${game.title} tutorial`}
    >
      <div className="lesson-picker">
        <label htmlFor={`example-${game.id}`}>Example</label>
        <select
          id={`example-${game.id}`}
          value={lessonIndex}
          onChange={(event) => selectLesson(event.target.value)}
        >
          {lessons.map((item, i) => (
            <option value={i} key={item.id}>
              {i + 1}. {item.title}
            </option>
          ))}
        </select>
      </div>
      <p className="lesson-summary">{lesson.summary}</p>
      <div className="panel-top">
        <span className="eyebrow">ONE MOVE AT A TIME</span>
        <div className="tutorial-step-tools">
          <span className="muted">
            Step {index + 1} / {lesson.steps.length}
          </span>
          <Help label="About this example">
            {game.id === "queue"
              ? "front is the first item’s index; rear is the last item’s index, as in Lab 6 Q3. QSize counts items. When empty, this app keeps front and sets rear = (front − 1 + capacity) % capacity; neither points to an item. A blank cell means no active queue item."
              : game.id === "postfix"
                ? "This is the operator stack for infix-to-postfix conversion. Numbers go directly to postfix. Read everything before a checkpoint letter; the letter itself is not a token."
                : game.help ||
                  "Choose the tightest Big-O bound. Assume positive input sizes and constant-time work(). Scaling examples use an exact work model."}
          </Help>
        </div>
      </div>
      <h2 className="tutorial-caption" aria-live="polite">
        <span className="step-caption" key={`${lesson.id}-${index}`}>
          {step.caption}
        </span>
      </h2>
      <div className="tutorial-stage" key={lesson.id}>
        {step.type === "postfix" && (
          <>
            <Tokens
              tokens={step.tokens}
              stop={step.stop}
              checkpointLabel={
                step.checkpoint?.after === step.stop
                  ? step.checkpoint.label
                  : undefined
              }
            />
            <div className="stack-scene">
              <Stack
                values={[...step.stack].reverse()}
                capacity={step.stackCapacity}
              />
              <div className="output-well">
                <span className="eyebrow">POSTFIX</span>
                <p key={`${index}-${step.output.join("")}`}>
                  {step.output.join(" ") || "—"}
                </p>
              </div>
            </div>
          </>
        )}
        {step.type === "queue" && (
          <>
            <div className="operations">
              <span className="operation">{step.movement}</span>
            </div>
            <div
              className="queue-state-values"
              aria-label="Queue indices and size"
            >
              <span>
                front = <b>{step.state.front}</b>
              </span>
              <span>
                rear = <b>{step.state.rear}</b>
              </span>
              <span>
                QSize = <b>{step.state.count}</b>
              </span>
            </div>
            <QueueArray state={step.state} />
          </>
        )}
        {step.type === "bigO" && (
          <>
            <CodeBlock code={step.code} />
            <div className="growth-demo">
              <Growth bars={step.bars} />
              <strong>{step.answer}</strong>
            </div>
          </>
        )}
        {step.type === "trace" && (
          <div className="trace-scene">
            {step.code && <CodeBlock code={step.code} />}
            <TraceVisual visual={step.visual} />
            <p
              className="trace-result"
              key={`${lesson.id}-${index}`}
              tabIndex={game.id === "bases" ? 0 : undefined}
            >
              {step.result || ""}
            </p>
          </div>
        )}
      </div>
      <div className="tutorial-controls">
        <button
          className="quiet-button"
          disabled={!index}
          onClick={() => setIndex(index - 1)}
        >
          ← Previous step
        </button>
        <div className="step-dots" aria-hidden="true">
          {lesson.steps.map((_, i) => (
            <i className={i === index ? "active" : ""} key={i} />
          ))}
        </div>
        <button
          className="primary"
          onClick={() => (last ? onComplete() : setIndex(index + 1))}
        >
          {last ? "Try a round" : "Next step"} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
