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
                  {items.length === 1
                    ? "FRONT + REAR"
                    : i === 0
                      ? "FRONT"
                      : i === items.length - 1
                        ? "REAR"
                        : "\u00a0"}
                </small>
              </div>
            </React.Fragment>
          ))
        ) : (
          <div className="fifo-empty">
            <b>Empty queue</b>
            <span>FRONT: no item</span>
            <span>REAR: no item</span>
          </div>
        )}
      </div>
      <p>{items.length} items · the oldest leaves first</p>
    </div>
  );
}
