// Purpose: connect one dequeue source action to its exact pointer snapshot.
// Entry points: TutorialScene; static linkedDequeue lessons.
// Boundaries: display only, no grading, C execution, timers or persistent state.
// See also: docs/games/linked-dequeue.md; tests/browser/linked-dequeue.spec.js.
import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { linkedDequeueCode } from "../engine/linkedDequeue.js";

const targetName = (value) => value ?? "NULL";
const pathData = (points) =>
  points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");

function SourceLine({ line, index, active }) {
  // Break only at an assignment boundary, never inside a pointer expression.
  const chunks = line.trim().split(/(?<= = )/);
  return (
    <span
      className="dequeue-code-line"
      data-line={index}
      data-active={String(active)}
    >
      {chunks.map((chunk, i) => (
        <span className="dequeue-code-chunk" key={i}>
          {chunk}
        </span>
      ))}
    </span>
  );
}

export default function LinkedDequeue({ step, index, steps }) {
  const { state } = step;
  const active = step.activeLines.length ? step.activeLines : [0];
  const whyRef = useRef(null),
    samplesRef = useRef(null);
  const [whyHeight, setWhyHeight] = useState(0);
  useLayoutEffect(() => {
    const update = () =>
      setWhyHeight(
        Math.ceil(
          Math.max(
            ...[...samplesRef.current.children].map(
              (node) => node.getBoundingClientRect().height,
            ),
          ),
        ),
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(whyRef.current);
    return () => observer.disconnect();
  }, [steps]);
  return (
    <div className="linked-dequeue" data-step={index} data-change={step.change}>
      <div
        className="dequeue-code"
        aria-label={`Current C action: ${step.title}`}
      >
        <span className="eyebrow">{step.title}</span>
        <code>
          {active.map((line) => (
            <SourceLine
              key={line}
              line={linkedDequeueCode[line]}
              index={line}
              active={step.activeLines.includes(line)}
            />
          ))}
        </code>
      </div>
      <div
        className="dequeue-why-space"
        ref={whyRef}
        style={{ minHeight: whyHeight }}
      >
        <p className="dequeue-why">{step.why}</p>
        <div
          className="dequeue-why-samples"
          ref={samplesRef}
          aria-hidden="true"
          inert={true}
        >
          {steps.map((item, i) => (
            <p className="dequeue-why-sample" key={i}>
              {item.why}
            </p>
          ))}
        </div>
      </div>
      <LinkedQueueDiagram state={state} change={step.change} />
      <div
        className="dequeue-state"
        aria-label="Queue object and local variables"
      >
        <span className="dequeue-object">
          Queue ·{" "}
          <b data-changed={step.change === "size"}>size = {state.size}</b>
        </span>
        <span
          className="dequeue-local"
          data-local="retval"
          aria-hidden={state.retval === null}
          data-changed={step.change === "retval"}
        >
          <span>retval · saved number</span>
          <b>{state.retval === null ? "—" : state.retval}</b>
        </span>
        <span
          className="dequeue-return"
          data-changed={step.change === "return"}
        >
          <span>Returned</span>
          <b>{state.returned === null ? "—" : state.returned}</b>
        </span>
      </div>
    </div>
  );
}

function geometry(width, nodes) {
  const horizontal = width >= 650;
  const count = nodes.length;
  const nodeWidth = horizontal
    ? Math.min(
        220,
        (width - 100 - Math.max(0, count - 1) * 70) / Math.max(count, 1),
      )
    : Math.min(192, width - 72);
  const total = count * nodeWidth + Math.max(0, count - 1) * 70;
  const positions = Object.fromEntries(
    nodes.map((node, i) => [
      node.id,
      {
        x: horizontal
          ? (width - total) / 2 + i * (nodeWidth + 70)
          : (width - nodeWidth) / 2,
        y: horizontal ? 120 : 116 + i * 110,
        w: nodeWidth,
        h: 68,
      },
    ]),
  );
  const height = count === 0 ? 160 : count === 1 ? 220 : horizontal ? 260 : 440;
  const pointer = (name, id) => {
    const node = positions[id];
    const startX =
      name === "head"
        ? 64
        : name === "tail"
          ? width - 64
          : horizontal && positions.A
            ? positions.A.x + positions.A.w / 2
            : width / 2;
    if (horizontal) {
      const endX = node
        ? node.x +
          node.w * (name === "head" ? 0.25 : name === "tail" ? 0.75 : 0.5)
        : name === "head"
          ? 64
          : width - 64;
      const lane = name === "head" ? 45 : name === "tail" ? 78 : 101;
      return [
        [startX, name === "temp" ? 93 : 43],
        [startX, lane],
        [endX, lane],
        [endX, node ? node.y - 4 : 64],
      ];
    }
    if (name === "temp")
      return [
        [startX, 93],
        [startX, 99],
        [startX, 105],
        [startX, 112],
      ];
    const laneX = name === "head" ? 8 : width - 8;
    const endX = node
      ? name === "head"
        ? node.x - 4
        : node.x + node.w + 4
      : startX;
    const endY = node ? node.y + node.h / 2 : 64;
    return [
      [startX, 43],
      [laneX, 43],
      [laneX, endY],
      [endX, endY],
    ];
  };
  const link = (from, to, field) => {
    const a = positions[from],
      b = positions[to];
    if (horizontal) {
      const forward = field === "next";
      const y = a.y + (forward ? 24 : 50);
      return {
        points: [
          [forward ? a.x + a.w + 3 : a.x - 3, y],
          [forward ? b.x - 3 : b.x + b.w + 3, y],
        ],
        x: forward ? (a.x + a.w + b.x) / 2 : (b.x + b.w + a.x) / 2,
        y: y + (forward ? -9 : 20),
        anchor: "middle",
      };
    }
    const forward = field === "next";
    const x = a.x + a.w / 2 + (forward ? 26 : -26);
    return {
      points: [
        [x, forward ? a.y + a.h + 3 : a.y - 3],
        [x, forward ? b.y - 3 : b.y + b.h + 3],
      ],
      x: x + (forward ? 8 : -8),
      y: forward ? a.y + a.h + 23 : b.y + b.h + 23,
      anchor: forward ? "start" : "end",
    };
  };
  return { positions, height, horizontal, pointer, link };
}

function LinkedQueueDiagram({ state, change }) {
  const svgRef = useRef(null),
    previous = useRef(null),
    frame = useRef(null);
  const [width, setWidth] = useState(320);
  const markerId = useId().replace(/:/g, "");
  const layout = geometry(width, state.nodes);
  const pointers = ["head", "tail", ...(state.temp !== null ? ["temp"] : [])];
  const paths = Object.fromEntries(
    pointers.map((name) => [name, layout.pointer(name, state[name])]),
  );

  useLayoutEffect(() => {
    const node = svgRef.current;
    const update = () => {
      const value = Math.round(node.getBoundingClientRect().width);
      if (value > 0) setWidth(value);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current,
      old = previous.current;
    previous.current = { width, paths, state };
    if (
      !old ||
      old.width !== width ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const moving = pointers
      .map((name) => ({
        node: svg.querySelector(`[data-pointer="${name}"] path`),
        before: old.paths[name] || paths[name].map(() => paths[name][0]),
        after: paths[name],
      }))
      .filter(({ before, after }) => pathData(before) !== pathData(after));
    let start;
    const tick = (time) => {
      start ??= time;
      const t = Math.min(1, (time - start) / 280),
        eased = 1 - (1 - t) ** 3;
      for (const item of moving) {
        item.node.setAttribute(
          "d",
          pathData(
            item.after.map(([x, y], i) => [
              item.before[i][0] + (x - item.before[i][0]) * eased,
              item.before[i][1] + (y - item.before[i][1]) * eased,
            ]),
          ),
        );
      }
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    for (const item of moving)
      item.node.setAttribute("d", pathData(item.before));
    if (moving.length) frame.current = requestAnimationFrame(tick);
    const scene = svg.closest(".linked-dequeue");
    const animations = [...scene.querySelectorAll("[data-changed='true']")].map(
      (node) => {
        if (change === "retval" && node.dataset.local === "retval") {
          const source = svg
            .querySelector(
              "[data-node='A'] [data-field='data'] .dequeue-field-value",
            )
            ?.getBoundingClientRect();
          const number = node.querySelector("b");
          const target = number.getBoundingClientRect();
          if (source)
            return number.animate(
              [
                {
                  transform: `translate(${source.x - target.x}px, ${source.y - target.y}px)`,
                  opacity: 0.4,
                },
                { transform: "translate(0,0)", opacity: 1 },
              ],
              { duration: 280, easing: "ease-out" },
            );
        }
        return node.animate(
          [
            { opacity: 0.55, transform: "translateY(-3px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 240, easing: "ease-out" },
        );
      },
    );
    return () => {
      cancelAnimationFrame(frame.current);
      animations.forEach((animation) => animation.cancel());
    };
  }, [state, width, change]);

  const nulls = ["head", "tail"].filter((name) => state[name] === null);
  return (
    <div
      className={`dequeue-diagram-viewport ${state.nodes.length > 1 ? "many-nodes" : state.nodes.length ? "few-nodes" : "no-nodes"}`}
    >
      <svg
        className="linked-queue-diagram"
        ref={svgRef}
        viewBox={`0 0 ${width} ${layout.height}`}
        role="img"
        aria-label="Linked queue pointers"
      >
        <title>Linked queue pointers</title>
        <desc>
          head: {targetName(state.head)}. tail: {targetName(state.tail)}. size:{" "}
          {state.size}.{" "}
          {state.temp !== null
            ? `temp: ${state.temp}${state.nodes.find((n) => n.id === state.temp)?.freed ? ", dangling" : ""}.`
            : ""}{" "}
          {state.nodes
            .map((node) =>
              node.freed
                ? `Node ${node.id} freed; do not use its fields.`
                : `Node ${node.id}: data ${node.value}, next ${targetName(node.next)}, prev ${targetName(node.prev)}.`,
            )
            .join(" ")}
        </desc>
        <defs>
          {["head", "tail", "temp", "link"].map((name) => (
            <marker
              id={`${markerId}-${name}`}
              key={name}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className={`dequeue-arrow-fill arrow-${name}`}
              />
            </marker>
          ))}
        </defs>
        {state.nodes.flatMap((node) =>
          ["next", "prev"].map((field) => {
            const target = node[field];
            if (
              node.freed ||
              target === null ||
              state.nodes.find((n) => n.id === target)?.freed
            )
              return null;
            const link = layout.link(node.id, target, field);
            return (
              <g key={`${node.id}-${field}`} data-link={`${node.id}-${field}`}>
                <path
                  d={pathData(link.points)}
                  className="dequeue-link"
                  markerEnd={`url(#${markerId}-link)`}
                />
                <text
                  x={link.x}
                  y={link.y}
                  textAnchor={link.anchor}
                  className="dequeue-link-label"
                >
                  {field}
                </text>
              </g>
            );
          }),
        )}
        {state.nodes.map((node) => {
          const p = layout.positions[node.id];
          return (
            <g
              key={node.id}
              data-node={node.id}
              data-freed={String(node.freed)}
              data-next={node.freed ? undefined : targetName(node.next)}
              data-prev={node.freed ? undefined : targetName(node.prev)}
              className={node.freed ? "dequeue-node is-freed" : "dequeue-node"}
            >
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="8" />
              {node.freed ? (
                <text
                  x={p.x + p.w / 2}
                  y={p.y + 39}
                  textAnchor="middle"
                  data-changed={change === "free"}
                >
                  Freed · do not use
                </text>
              ) : (
                ["prev", "data", "next"].map((field, i) => (
                  <g
                    key={field}
                    data-field={field}
                    data-changed={
                      change === "prev" &&
                      node.id === state.head &&
                      field === "prev"
                    }
                  >
                    {i > 0 && (
                      <line
                        x1={p.x + (i * p.w) / 3}
                        x2={p.x + (i * p.w) / 3}
                        y1={p.y}
                        y2={p.y + p.h}
                      />
                    )}
                    <text
                      x={p.x + ((i + 0.5) * p.w) / 3}
                      y={p.y + 22}
                      textAnchor="middle"
                      className="dequeue-field-label"
                    >
                      {field}
                    </text>
                    <text
                      x={p.x + ((i + 0.5) * p.w) / 3}
                      y={p.y + 50}
                      textAnchor="middle"
                      className="dequeue-field-value"
                    >
                      {field === "data" ? node.value : targetName(node[field])}
                    </text>
                  </g>
                ))
              )}
              <text
                x={p.x + p.w / 2}
                y={p.y + p.h + 20}
                textAnchor="middle"
                className="dequeue-node-id"
              >
                Node {node.id}
              </text>
            </g>
          );
        })}
        {nulls.map((name) => {
          const x = name === "head" ? 64 : width - 64;
          return (
            <text
              x={x}
              y="82"
              key={name}
              textAnchor="middle"
              className={`dequeue-null pointer-${name}`}
            >
              NULL
            </text>
          );
        })}
        {pointers.map((name) => {
          const x =
            name === "head"
              ? 64
              : name === "tail"
                ? width - 64
                : layout.horizontal && layout.positions.A
                  ? layout.positions.A.x + layout.positions.A.w / 2
                  : width / 2;
          const dangling =
            name === "temp" &&
            state.nodes.find((node) => node.id === state.temp)?.freed;
          return (
            <g
              key={name}
              data-pointer={name}
              data-target={targetName(state[name])}
              className={`dequeue-pointer pointer-${name} ${dangling ? "is-dangling" : ""}`}
            >
              <path
                d={pathData(paths[name])}
                markerEnd={`url(#${markerId}-${name})`}
              />
              <text
                x={x}
                y={name === "temp" ? 65 : 21}
                textAnchor="middle"
                data-changed={change === name}
              >
                {name}
              </text>
              <text
                x={x}
                y={name === "temp" ? 82 : 38}
                textAnchor="middle"
                className="dequeue-pointer-role"
              >
                {name === "head"
                  ? "front"
                  : name === "tail"
                    ? "end"
                    : dangling
                      ? "dangling"
                      : "old head"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
