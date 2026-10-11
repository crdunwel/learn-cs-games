import React from "react";

// The same small diagram supports array positions, linked nodes, and worked steps.
export default function TraceVisual({ visual }) {
  if (!visual) return null;
  return (
    <div className={`trace-visual trace-${visual.kind}`}>
      <span className="trace-label eyebrow">{visual.label}</span>
      <div className="trace-items" aria-label={visual.label} tabIndex={0}>
        {visual.items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && visual.kind !== "array" && (
              <span className="trace-arrow" aria-hidden="true">
                →
              </span>
            )}
            <div className="trace-item">
              <span className="trace-value">{item}</span>
              {visual.kind === "array" && (
                <span className="trace-index">{index}</span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
