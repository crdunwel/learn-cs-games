export const STORAGE_KEY = "cs-club-progress-v1";
export const freshProgress = () => ({ version: 1, xp: 0, games: {} });
export const freshStats = () => ({
  rounds: 0,
  wins: 0,
  streak: 0,
  best: 0,
  tutorial: false,
});
const nonnegative = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function loadProgress(storage) {
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY));
    if (raw?.version !== 1) return freshProgress();
    const games = {};
    for (const id of [
      "postfix",
      "queue",
      "bigO",
      "recursion",
      "links",
      "search",
      "memory",
      "bases",
    ]) {
      const data = raw.games?.[id];
      if (data)
        games[id] = {
          rounds: nonnegative(data.rounds),
          wins: Math.min(nonnegative(data.wins), nonnegative(data.rounds)),
          streak: nonnegative(data.streak),
          best: nonnegative(data.best),
          tutorial: data.tutorial === true,
        };
    }
    return { version: 1, xp: nonnegative(raw.xp), games };
  } catch {
    return freshProgress();
  }
}
export function saveProgress(storage, progress) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
export function recordRound(progress, id, correct) {
  const previous = progress.games[id] || freshStats();
  const streak = correct ? previous.streak + 1 : 0;
  return {
    ...progress,
    games: {
      ...progress.games,
      [id]: {
        ...previous,
        rounds: previous.rounds + 1,
        wins: previous.wins + Number(correct),
        streak,
        best: Math.max(previous.best, streak),
      },
    },
  };
}
export function finishTutorial(progress, id) {
  return {
    ...progress,
    games: {
      ...progress.games,
      [id]: { ...(progress.games[id] || freshStats()), tutorial: true },
    },
  };
}
export const suggestedLevel = (stats) =>
  Math.min(3, 1 + Math.floor((stats?.wins || 0) / 4));
