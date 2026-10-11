import React from "react";
import Tooltip from "./Tooltip.jsx";

export default function Help({ children, label = "Show hint" }) {
  return (
    <Tooltip
      content={children}
      label={label}
      className="help"
      triggerClassName="help-trigger"
    >
      ?
    </Tooltip>
  );
}
