import React from "react";
import Tooltip from "./Tooltip.jsx";

export default function CodeBlock({ code, className = "" }) {
  return (
    <pre className={`code-block ${className}`}>
      <code>
        {String(code)
          .split(/(\bwork\(\))/g)
          .map((part, index) =>
            part === "work()" ? (
              <Tooltip
                key={index}
                label="About work()"
                className="code-tooltip"
                triggerClassName="work-trigger"
                content={
                  <>
                    Here, <b>work()</b> means one constant-time step,{" "}
                    <b>O(1)</b>—such as an assignment or comparison. Its cost
                    stays the same as n grows. It is a placeholder, not a
                    special C function.
                  </>
                }
              >
                work()
              </Tooltip>
            ) : (
              part
            ),
          )}
      </code>
    </pre>
  );
}
