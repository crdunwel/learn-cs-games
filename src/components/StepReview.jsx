import React, { useState } from "react";
export default function StepReview({ steps }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  if (!step) return null;
  return (
    <div className="step-review" aria-label="Step-by-step solution">
      <div className="review-step-heading">
        <b>
          Step {index + 1} / {steps.length}
        </b>
        <span>{step.title}</span>
      </div>
      {step.detail && <p>{step.detail}</p>}
      {step.math && <pre tabIndex={0}>{step.math}</pre>}
      <div className="review-step-controls">
        <button
          type="button"
          className="quiet-button"
          disabled={!index}
          onClick={() => setIndex(index - 1)}
        >
          ← Back one step
        </button>
        <button
          type="button"
          className="quiet-button"
          disabled={index === steps.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Continue solution →
        </button>
      </div>
    </div>
  );
}
