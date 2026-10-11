import React from "react";
export default function QueueLine({ items }) {
  return (
    <div className="ordinary-queue">
      <p>
        FRONT · next out <span aria-hidden="true">→</span> REAR · last in
      </p>
      <div
        className="queue-line"
        tabIndex={0}
        aria-label={`Queue from front to rear: ${items.join(", ") || "empty"}`}
      >
        {items.length ? (
          items.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span aria-hidden="true">→</span>}
              <div className="fifo-item">
                <b>{item}</b>
                <small>
                  {i === 0
                    ? "FRONT"
                    : i === items.length - 1
                      ? "REAR"
                      : "\u00a0"}
                </small>
              </div>
            </React.Fragment>
          ))
        ) : (
          <span>Empty queue</span>
        )}
      </div>
      <p>{items.length} items · the oldest leaves first</p>
    </div>
  );
}
