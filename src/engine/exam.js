import { equalAnswer } from "./answerFormats.js";

export function createExamAttempt(exam, now = Date.now()) {
  return {
    exam,
    startedAt: now,
    deadline: now + exam.durationMinutes * 60_000,
    answers: {},
    status: "running",
    submittedAt: null,
    manualScores: {},
  };
}

export function remainingSeconds(attempt, now = Date.now()) {
  return Math.max(0, Math.ceil((attempt.deadline - now) / 1000));
}

const allParts = (attempt) =>
  attempt.exam.questions.flatMap((question) => question.parts);
const closed = (state, now, expired = false) => ({
  ...state,
  status: expired ? "expired" : "submitted",
  submittedAt: expired ? state.deadline : now,
});

// Deadline is absolute, so background tabs, reloads, or delayed intervals cannot
// add writing time. Only manually marked parts accept self-assessment scores.
export function examReducer(state, action) {
  const now = Number.isFinite(action.now) ? action.now : Date.now();
  if (state.status === "running") {
    if (now >= state.deadline) return closed(state, now, true);
    if (action.type === "submit") return closed(state, now);
    if (
      action.type === "draft" &&
      allParts(state).some((part) => part.id === action.partId)
    ) {
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.partId]: String(action.value ?? ""),
        },
      };
    }
    return state;
  }
  if (action.type === "score") {
    const part = allParts(state).find((part) => part.id === action.partId);
    if (!part || part.auto) return state;
    if (action.value === "" || action.value == null) {
      const manualScores = { ...state.manualScores };
      delete manualScores[part.id];
      return { ...state, manualScores };
    }
    const number = Number(action.value);
    if (!Number.isFinite(number)) return state;
    return {
      ...state,
      manualScores: {
        ...state.manualScores,
        [part.id]: Math.max(0, Math.min(part.points, number)),
      },
    };
  }
  return state;
}

// Free C is reviewed with a rubric. Objective answers share practice's parsers.
export function evaluateExamPart(part, value) {
  return part.auto ? equalAnswer(part, value) : null;
}

export function gradeExam(attempt) {
  const grade = {
    automaticEarned: 0,
    automaticPossible: 0,
    manualEarned: 0,
    manualPossible: 0,
    pendingManual: 0,
    totalEarned: 0,
    totalPossible: 0,
    parts: {},
  };
  for (const part of allParts(attempt)) {
    let correct = null,
      earned = 0,
      pending = false;
    if (part.auto) {
      correct = evaluateExamPart(part, attempt.answers[part.id]);
      earned = correct ? part.points : 0;
      grade.automaticPossible += part.points;
      grade.automaticEarned += earned;
    } else {
      const score = attempt.manualScores[part.id];
      pending = typeof score !== "number" || !Number.isFinite(score);
      earned = pending ? 0 : Math.max(0, Math.min(part.points, score));
      grade.manualPossible += part.points;
      grade.manualEarned += earned;
      if (pending) grade.pendingManual++;
    }
    grade.parts[part.id] = { correct, earned, possible: part.points, pending };
  }
  grade.totalEarned = grade.automaticEarned + grade.manualEarned;
  grade.totalPossible = grade.automaticPossible + grade.manualPossible;
  return grade;
}
