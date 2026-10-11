import React, { useLayoutEffect, useRef, useState } from "react";

// Preserve the identity of lower cells so pushes and pops happen at the top.
export function Stack({ values = [], compact = false, capacity = 8 }) {
  const previous = useRef(values);
  const viewport = useRef(null);
  const sequence = useRef(0);
  const [leaving, setLeaving] = useState([]);
  const signature = JSON.stringify(values);
  useLayoutEffect(() => {
    const before = previous.current;
    let shared = 0;
    while (
      shared < before.length &&
      shared < values.length &&
      before[before.length - shared - 1] === values[values.length - shared - 1]
    )
      shared += 1;
    const removed = before
      .slice(0, before.length - shared)
      .map((value, index) => ({
        value,
        depth: before.length - index - 1,
        id: sequence.current++,
      }));
    previous.current = [...values];
    // Keep a newly pushed top in view without changing the diagram or page height.
    if (viewport.current) viewport.current.scrollTop = 0;
    setLeaving(removed);
    if (!removed.length) return;
    const timer = setTimeout(() => setLeaving([]), 460);
    return () => clearTimeout(timer);
  }, [signature]);
  return (
    <div
      className={`stack-wrap ${compact ? "compact" : ""}`}
      aria-label={`Operator stack, top to bottom: ${values.join(", ") || "empty"}`}
    >
      <span className="stack-edge">
        TOP <span aria-hidden="true">↓</span>
      </span>
      <div className="stack-shaft" data-capacity={capacity}>
        <div className="stack-viewport" ref={viewport}>
          <div
            className="stack-cells"
            style={{ "--stack-count": Math.max(8, values.length) }}
          >
            {values.length ? (
              values.map((value, index) => {
                const depth = values.length - index - 1;
                return (
                  <div
                    className={`stack-cell ${index === 0 ? "stack-top" : ""}`}
                    key={`${depth}:${value}`}
                    style={{ "--slot": depth }}
                  >
                    {value}
                  </div>
                );
              })
            ) : (
              <div className="stack-empty">Empty</div>
            )}
            {leaving.map(({ value, depth, id }) => (
              <div
                className="stack-cell stack-leaving"
                key={`leaving-${id}`}
                aria-hidden="true"
                style={{ "--slot": depth }}
              >
                {value}
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="stack-edge">BOTTOM</span>
    </div>
  );
}
export function Tokens({ tokens, stop, checkpointLabel }) {
  const atPoint = Boolean(checkpointLabel && stop > 0);
  return (
    <div
      className={`tokens ${atPoint ? "has-checkpoint" : ""}`}
      aria-label={`Expression: ${tokens.join(" ")}. ${atPoint ? `Point ${checkpointLabel} is after token ${stop}, ${tokens[stop - 1]}.` : stop ? `Processed through token ${stop}.` : "No tokens processed."}`}
    >
      {tokens.map((token, i) => {
        const tokenClass =
          !atPoint && i === stop - 1
            ? "token current"
            : i < stop
              ? "token processed"
              : "token";
        return atPoint && i === stop - 1 ? (
          // Keep the point with its preceding token if the expression wraps.
          <span className="token-point-wrap" key={i}>
            <span className={tokenClass}>{token}</span>
            <span className="checkpoint-point" aria-hidden="true">
              <span className="point-arrow">↑</span>
              <b className="point-label">{checkpointLabel}</b>
            </span>
          </span>
        ) : (
          <span key={i} className={tokenClass}>
            {token}
          </span>
        );
      })}
    </div>
  );
}
export function QueueArray({
  state,
  previousState,
  onSelect,
  selectedIndex,
  correctIndex,
}) {
  const previous = useRef(state);
  const sequence = useRef(0);
  const [motion, setMotion] = useState({ removed: [], wrapped: [] });
  const signature = JSON.stringify(state);
  useLayoutEffect(() => {
    const before = previousState || previous.current;
    previous.current = state;
    if (!before || before.capacity !== state.capacity) return;
    const removed = before.cells.flatMap((value, index) =>
      value != null && value !== state.cells[index]
        ? [{ value, index, id: sequence.current++ }]
        : [],
    );
    const wrapped = ["front", "rear"].filter(
      (pointer) =>
        before[pointer] === state.capacity - 1 && state[pointer] === 0,
    );
    setMotion({ removed, wrapped });
    const timer = setTimeout(
      () => setMotion({ removed: [], wrapped: [] }),
      1200,
    );
    return () => clearTimeout(timer);
  }, [signature, previousState]);
  const full = state.count === state.capacity;
  const Slot = onSelect ? "button" : "div";
  return (
    <div className="queue-diagram" style={{ "--capacity": state.capacity }}>
      <div className="queue-pointer-track" aria-hidden="true">
        {["front", "rear"].map((pointer) => (
          <span
            key={pointer}
            className={`queue-pointer ${pointer}-marker ${state.count === 0 ? "is-empty" : ""} ${motion.wrapped.includes(pointer) ? "pointer-wrapped" : ""}`}
            style={{ "--marker-index": Math.max(0, state[pointer]) }}
          >
            <span className="marker-full">{pointer.toUpperCase()}</span>
            <span className="marker-short">{pointer[0].toUpperCase()}</span>
            <span className="marker-arrow">↓</span>
          </span>
        ))}
      </div>
      <div
        className="queue-cells"
        aria-label={`Circular queue. Front index ${state.front}. Rear index ${state.rear}. ${state.count === 0 ? "Empty; neither retained index points to an item." : `Front is the first item; rear is the last item. ${state.count} of ${state.capacity} filled.`}`}
      >
        {state.cells.map((item, i) => (
          <Slot
            className={`queue-position ${selectedIndex === i ? "slot-selected" : ""} ${correctIndex === i ? "slot-correct" : ""}`}
            key={i}
            {...(onSelect
              ? {
                  type: "button",
                  onClick: () => onSelect(i),
                  "aria-label": `Slot ${i}`,
                  "aria-pressed": selectedIndex === i,
                }
              : {})}
          >
            <div className={`queue-cell ${item != null ? "occupied" : ""}`}>
              {item != null ? (
                <span className="queue-item" key={item}>
                  {item}
                </span>
              ) : (
                <span className="queue-vacancy">·</span>
              )}
              {motion.removed
                .filter(({ index }) => index === i)
                .map(({ value, id }) => (
                  <span
                    key={id}
                    className="queue-item queue-leaving"
                    aria-hidden="true"
                  >
                    {value}
                  </span>
                ))}
            </div>
            <span className="array-index">{i}</span>
          </Slot>
        ))}
      </div>
      <div className="array-legend">
        <span>
          <b className="legend-front">FRONT</b>{" "}
          {state.count ? "first item" : "index"}
        </span>
        <span>
          <b className="legend-rear">REAR</b>{" "}
          {state.count ? "last item" : "index"}
        </span>
        <span className="queue-fill">
          {state.count}/{state.capacity} filled
        </span>
      </div>
      <div className="queue-state-note" aria-live="polite">
        {motion.wrapped.length
          ? `${motion.wrapped.map((pointer) => pointer[0].toUpperCase() + pointer.slice(1)).join(" & ")} wraps ${state.capacity - 1} → 0`
          : full
            ? "Full · remove an item before adding"
            : state.count === 0
              ? "Empty · neither index points to an item"
              : ""}
      </div>
    </div>
  );
}
export function Growth({ bars = [1, 2, 4, 8] }) {
  return (
    <div className="growth" aria-label="Growth illustration">
      {bars.map((height, i) => (
        <div
          key={i}
          style={{ height: `${18 + (height / Math.max(...bars)) * 68}%` }}
        >
          <span>{i + 1}n</span>
        </div>
      ))}
    </div>
  );
}
export function CardArt({ id }) {
  if (id === "exam")
    return (
      <div className="card-art exam-card-art" aria-hidden="true">
        <div className="exam-clock-face">
          <span>120</span>
          <small>MINUTES</small>
        </div>
        <span className="exam-card-note">your practice, put together.</span>
      </div>
    );
  const concepts = {
    recursion: {
      symbol: "↻",
      tiles: ["f(3)", "f(2)", "f(1)"],
      caption: "one call at a time",
    },
    links: {
      symbol: "∞",
      tiles: ["10", "20", "30"],
      caption: "make the connection",
    },
    search: {
      symbol: "⌕",
      tiles: ["low", "mid", "high"],
      caption: "halfway to the answer",
    },
    memory: {
      symbol: "▦",
      tiles: ["alloc", "use", "free"],
      caption: "a place for everything",
    },
    bases: {
      symbol: "✧",
      tiles: ["1010", "10", "A"],
      caption: "same value, new look",
    },
  };
  if (concepts[id]) {
    const art = concepts[id];
    return (
      <div className={`card-art concept-art concept-${id}`} aria-hidden="true">
        <div className="concept-orbit" />
        <span className="concept-symbol">{art.symbol}</span>
        <div className="concept-tiles">
          {art.tiles.map((tile) => (
            <span key={tile}>{tile}</span>
          ))}
        </div>
        <span className="concept-caption">{art.caption}</span>
      </div>
    );
  }
  if (id === "postfix")
    return (
      <div className="card-art studio-art" aria-hidden="true">
        <span className="art-star">✳</span>
        <span className="art-note">one more rep.</span>
        <div className="art-stack">
          <span>＊</span>
          <span>＋</span>
          <span>（</span>
        </div>
        <span className="art-small">
          LAST IN
          <br />
          FIRST OUT
        </span>
      </div>
    );
  if (id === "queue")
    return (
      <div className="card-art pool-art" aria-hidden="true">
        <div className="pool-ring" />
        <span className="pool-sun">✺</span>
        <div className="pool-line">
          <i>A</i>
          <i>B</i>
          <i>C</i>
        </div>
        <span className="pool-caption">first in. first out.</span>
      </div>
    );
  return (
    <div className="card-art night-art" aria-hidden="true">
      <span className="night-star a">✦</span>
      <span className="night-star b">✧</span>
      <div className="orbit" />
      <div className="moon" />
      <div className="night-chart">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="night-label">n → ∞</span>
    </div>
  );
}
