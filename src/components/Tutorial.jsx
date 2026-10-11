import PostfixRules from "./PostfixRules.jsx";
import QueueLine from "./QueueLine.jsx";
import React, { useState, useRef, useLayoutEffect } from "react";
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
  const stageRef = useRef(null),
    captionRef = useRef(null),
    measureRef = useRef(null);
  const [width, setWidth] = useState(0),
    [layout, setLayout] = useState(null);
  const layoutKey = `${lesson.id}:${width}`;
  const measuredLayout = layout?.key === layoutKey ? layout : null;
  useLayoutEffect(() => {
    const node = stageRef.current;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    // Establish the initial width before the first paint, rather than waiting
    // one frame for ResizeObserver and briefly reserving the legacy fallback.
    setWidth(Math.round(node.getBoundingClientRect().width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [lesson.id]);
  useLayoutEffect(() => {
    // Learn remains mounted behind [hidden] during Play. Measuring its zero-width
    // captions would reserve one line per word when the student returns to Learn.
    if (
      width <= 0 ||
      layout?.key === layoutKey ||
      !measureRef.current ||
      !stageRef.current.getClientRects().length ||
      stageRef.current.closest("[hidden]")
    )
      return;
    const height = Math.ceil(
      Math.max(
        ...[...measureRef.current.children].map(
          (node) => node.getBoundingClientRect().height,
        ),
      ),
    );
    const caption = captionRef.current,
      style = getComputedStyle(caption),
      measure = document.createElement("div");
    const captionWidth = caption.getBoundingClientRect().width;
    if (captionWidth <= 0) return;
    Object.assign(measure.style, {
      position: "absolute",
      visibility: "hidden",
      left: "0",
      top: "0",
      width: `${captionWidth}px`,
      boxSizing: style.boxSizing,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textTransform: style.textTransform,
      wordBreak: style.wordBreak,
      overflowWrap: style.overflowWrap,
    });
    document.body.appendChild(measure);
    let captionHeight = 0;
    for (const item of lesson.steps) {
      measure.textContent = item.caption;
      captionHeight = Math.max(
        captionHeight,
        measure.getBoundingClientRect().height,
      );
    }
    measure.remove();
    setLayout({
      key: layoutKey,
      height,
      captionHeight: Math.ceil(captionHeight),
    });
  }, [layoutKey, lesson, layout]);

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
            {game.id === "queue" && step.state?.items ? (
              "This is an ordinary FIFO queue. ENQUEUE joins the rear; DEQUEUE removes the front. These labels name items, not array indices."
            ) : game.id === "queue" ? (
              "front is the first item’s index; rear is the last item’s index, as in Lab 6 Q3. QSize counts items. When empty, this app keeps front and sets rear = (front − 1 + capacity) % capacity; neither points to an item. A blank cell means no active queue item."
            ) : game.id === "postfix" ? (
              <PostfixRules />
            ) : (
              game.help ||
              "Choose the tightest Big-O bound. Assume positive input sizes and constant-time work(). Scaling examples use an exact work model."
            )}
          </Help>
        </div>
      </div>
      <h2
        className="tutorial-caption"
        aria-live="polite"
        ref={captionRef}
        style={{ minHeight: measuredLayout?.captionHeight }}
      >
        <span className="step-caption" key={`${lesson.id}-${index}`}>
          {step.caption}
        </span>
      </h2>
      <div
        className="tutorial-stage tutorial-sized-stage"
        ref={stageRef}
        style={{ minHeight: measuredLayout?.height }}
        key={lesson.id}
      >
        <TutorialScene step={step} game={game} index={index} />
        {layout?.key !== layoutKey && (
          <div
            className="tutorial-measures"
            aria-hidden="true"
            inert={true}
            ref={measureRef}
          >
            {lesson.steps.map((item, i) => (
              <div className="tutorial-measure" key={i}>
                <TutorialScene step={item} game={game} index={i} />
              </div>
            ))}
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

function TutorialScene({ step, game, index }) {
  return (
    <>
      {step.type === "postfix" && (
        <>
          <Tokens
            tokens={step.tokens}
            stop={step.stop}
            activeIndex={step.activeIndex}
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
          {!step.state.items && (
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
          )}
          {step.state.items ? (
            <QueueLine items={step.state.items} />
          ) : (
            <QueueArray state={step.state} />
          )}
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
            key={index}
            tabIndex={game.id === "bases" ? 0 : undefined}
          >
            {step.result || ""}
          </p>
        </div>
      )}
    </>
  );
}
