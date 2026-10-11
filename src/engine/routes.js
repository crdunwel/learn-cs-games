/**
 * Purpose: Parse safe hash routes and build stable tutorial/exercise links.
 * Find with: tutorial links, deep links, hash navigation
 * Entry points: parseHashRoute, tutorialHash, practiceHash, codingHash
 * Boundaries: Pure routing only; no browser, storage, or progress changes.
 * See also: docs/tutorial-links.md
 * Tests: tests/routes.test.js, tests/browser/tutorial-links.spec.js
 */

const HOME = Object.freeze({ kind: "home" });
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;

export function tutorialHash(gameId, lessonId) {
  return `#${encodeURIComponent(gameId)}/learn/${encodeURIComponent(lessonId)}`;
}

export function practiceHash(gameId) {
  return `#${encodeURIComponent(gameId)}/play`;
}

export function codingHash(exerciseId) {
  return exerciseId ? `#code/${encodeURIComponent(exerciseId)}` : "#code";
}

export function parseHashRoute(hash, games) {
  if (typeof hash !== "string" || hash.length > 1024) return HOME;
  let parts;
  try {
    parts = hash.replace(/^#/, "").split("/").map(decodeURIComponent);
  } catch {
    return HOME;
  }
  if (parts.length === 1 && parts[0] === "") return HOME;
  if (!parts.every((part) => identifier.test(part))) return HOME;
  if (parts[0] === "code") {
    return parts.length <= 2
      ? { kind: "code", exerciseId: parts[1] || null }
      : HOME;
  }
  const game = games.find((item) => item.id === parts[0]);
  if (!game) return HOME;
  const route = { kind: "game", gameId: game.id, mode: null, lessonId: null };
  if (parts.length === 1) return route;
  if (game.kind === "exam") return HOME;
  if (parts.length === 2 && parts[1] === "play")
    return { ...route, mode: "practice" };
  if (parts[1] !== "learn" || parts.length > 3) return HOME;
  const lessonIds = game.lessons?.map((lesson) => lesson.id) || ["basics"];
  const lessonId = parts[2] || lessonIds[0];
  return lessonIds.includes(lessonId)
    ? { ...route, mode: "tutorial", lessonId }
    : HOME;
}
