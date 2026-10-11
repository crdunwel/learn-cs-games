import React from "react";
import { postfixRules } from "../games/postfix.js";

export default function PostfixRules() {
  return (
    <div className="postfix-rules" aria-label="Infix to postfix rules">
      <p>
        <strong>Postfix</strong> is the output you are building. The{" "}
        <strong>stack</strong> holds operators that are waiting.
      </p>
      <p className="postfix-precedence">
        <code>* /</code> have higher precedence than <code>+ -</code>. Operators
        in the same pair have equal precedence and run left to right.
      </p>
      <ol>
        {postfixRules.map((rule) => (
          <li key={rule.symbol}>
            <strong>{rule.symbol}</strong>
            <p>{rule.instruction}</p>
          </li>
        ))}
      </ol>
      <p className="postfix-push-pop">
        <strong>Push</strong> = put on the stack top. <strong>Pop</strong> =
        remove the top and append it to postfix. Discarding <code>(</code> is
        the exception: it is removed without being output.
      </p>
    </div>
  );
}
