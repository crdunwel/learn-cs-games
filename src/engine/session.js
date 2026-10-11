import { emptyBaseWork, checkBaseWork } from "./baseWork.js";
import { equalAnswer, compactAnswer } from "./answerFormats.js";

export const startSession = (question) => ({
  question,
  step: 0,
  round: 0,
  draft: question.steps[0].work
    ? emptyBaseWork(question.steps[0].work)
    : question.steps[0].kind === "stack"
      ? []
      : "",
  status: "answering",
  allCorrect: true,
  earned: 0,
});
export function normalize(value) {
  return String(value).toUpperCase().replace(/\s+/g, "");
}
// Kept for feedback formatting; grading uses the token-aware shared parser.
export const normalizePostfix = compactAnswer;
export function evaluate(step, draft) {
  if (step.work && draft && typeof draft === "object")
    return checkBaseWork(step.work, draft).correct;
  return equalAnswer(step, draft);
}
// Only answering -> checked awards points. Repeated checks/reveals cannot award again.
export function sessionReducer(state, action) {
  if (action.type === "new")
    return { ...startSession(action.question), round: state.round + 1 };
  if (action.type === "draft" && state.status === "answering")
    return { ...state, draft: action.value };
  if (
    ["check", "reveal"].includes(action.type) &&
    state.status === "answering"
  ) {
    const correct =
      action.type === "check" &&
      evaluate(state.question.steps[state.step], state.draft);
    return {
      ...state,
      status: correct
        ? "correct"
        : action.type === "reveal"
          ? "revealed"
          : "incorrect",
      allCorrect: state.allCorrect && correct,
      earned: state.earned + (correct ? 10 : 0),
    };
  }
  if (
    action.type === "next" &&
    state.status !== "answering" &&
    state.step < state.question.steps.length - 1
  ) {
    const step = state.step + 1;
    return {
      ...state,
      step,
      status: "answering",
      draft: state.question.steps[step].kind === "stack" ? [] : "",
    };
  }
  return state;
}
