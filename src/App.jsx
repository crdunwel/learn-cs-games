import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { games, gameById } from "./games/index.js";
import {
  freshStats,
  loadProgress,
  saveProgress,
  finishTutorial,
  suggestedLevel,
} from "./engine/progress.js";
import { CardArt } from "./components/Visuals.jsx";
import Tutorial from "./components/Tutorial.jsx";
import Practice from "./components/Practice.jsx";
import Help from "./components/Help.jsx";
import Exam from "./components/Exam.jsx";
import PrintPractice from "./components/PrintPractice.jsx";
import CodingStudio from "./components/CodingStudio.jsx";
import { parseHashRoute, tutorialHash, practiceHash } from "./engine/routes.js";
function readRoute() {
  return parseHashRoute(window.location.hash, games);
}
function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function Game({ game, route, progress, onProgress }) {
  const stats = progress.games[game.id] || freshStats();
  const [mode, setMode] = useState(
    route.mode || (stats.tutorial ? "practice" : "tutorial"),
  );
  const [lessonId, setLessonId] = useState(
    route.lessonId || game.lessons?.[0]?.id || "basics",
  );
  useLayoutEffect(() => {
    // Every hash event is authoritative, including a fast Back to the same
    // route before the preceding hashchange event had a chance to render.
    if (route.mode) setMode(route.mode);
    if (route.lessonId) setLessonId(route.lessonId);
  }, [route]);
  function changeMode(nextMode) {
    setMode(nextMode);
    window.location.hash =
      nextMode === "tutorial"
        ? tutorialHash(game.id, lessonId)
        : practiceHash(game.id);
  }
  function changeLesson(nextLessonId) {
    setLessonId(nextLessonId);
    setMode("tutorial");
    window.location.hash = tutorialHash(game.id, nextLessonId);
  }
  const [level, setLevel] = useState(suggestedLevel(stats));
  const [attempt, setAttempt] = useState(0);
  return (
    <main className={`game-page theme-${game.id}`}>
      <a href="#" className="back-link">
        ← All games
      </a>
      <div className="game-heading">
        <div className="game-emblem" aria-hidden="true">
          {game.symbol}
        </div>
        <div>
          <span className="eyebrow">{game.topic}</span>
          <h1>{game.title}</h1>
        </div>
      </div>
      <div className="game-toolbar">
        <div className="mode-tabs" aria-label="Game mode">
          <button
            aria-pressed={mode === "tutorial"}
            onClick={() => changeMode("tutorial")}
          >
            Learn
          </button>
          <button
            aria-pressed={mode === "practice"}
            onClick={() => changeMode("practice")}
          >
            Play
          </button>
        </div>
        <div
          className={`level-control ${mode !== "practice" ? "is-inactive" : ""}`}
          aria-hidden={mode !== "practice"}
        >
          <label htmlFor="level">Level</label>
          <select
            id="level"
            disabled={mode !== "practice"}
            value={level}
            onChange={(e) => {
              setLevel(Number(e.target.value));
              setAttempt((n) => n + 1);
            }}
          >
            <option value="1">1 · Warm-up</option>
            <option value="2">2 · In the groove</option>
            <option value="3">3 · Exam energy</option>
          </select>
        </div>
      </div>
      <div hidden={mode !== "tutorial"}>
        <Tutorial
          game={game}
          lessonId={lessonId}
          onLessonChange={changeLesson}
          onComplete={() => {
            onProgress((p) => finishTutorial(p, game.id));
            changeMode("practice");
          }}
        />
      </div>
      <div hidden={mode !== "practice"}>
        <Practice
          key={`${level}-${attempt}`}
          game={game}
          level={level}
          onProgress={onProgress}
        />
      </div>
      <div className="game-bottom">
        <span>
          <b>{stats.wins}</b> perfect {stats.wins === 1 ? "round" : "rounds"}
        </span>
        <span>
          <b>{stats.streak}</b> streak <span aria-hidden="true">✦</span>
        </span>
        <Help label="About levels and progress">
          Every correct answer earns 10 XP. Four perfect rounds suggest the next
          level on your next visit. You can change levels anytime. Points and
          completed rounds save in this browser; unfinished questions restart
          when you leave.
        </Help>
      </div>
      <p className="gentle-note">A little progress is still progress.</p>
    </main>
  );
}
export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [progress, setProgress] = useState(() => loadProgress(getStorage()));
  const [saved, setSaved] = useState(true);
  const [examPaper, setExamPaper] = useState(null);
  const [examStatus, setExamStatus] = useState("ready");
  const onExamChange = useCallback((paper, status) => {
    setExamPaper(paper);
    setExamStatus(status);
  }, []);
  useEffect(() => {
    const change = () => {
      const next = readRoute();
      setRoute((current) => {
        // Examples share one mounted game: preserve drafts and scroll position.
        if (current.kind !== next.kind || current.gameId !== next.gameId)
          window.scrollTo(0, 0);
        return next;
      });
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    setSaved(saveProgress(getStorage(), progress));
  }, [progress]);
  const game = route.kind === "game" ? gameById(route.gameId) : null;
  const wins = Object.values(progress.games).reduce(
    (sum, stats) => sum + stats.wins,
    0,
  );
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="CS Club home">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>{" "}
          cs club<span className="brand-period">.</span>
        </a>
        <div className="header-right">
          {game && (
            <PrintPractice
              key={game.id}
              game={game}
              exam={game.id === "exam" ? examPaper : null}
              examRunning={game.id === "exam" && examStatus === "running"}
            />
          )}
          <span className="header-caption">THE PRACTICE ARCADE</span>
          <span className="xp-pill">
            <span aria-hidden="true">✦</span>{" "}
            <span className="xp-bump" key={progress.xp}>
              {progress.xp} XP
            </span>
          </span>
        </div>
      </header>
      {route.kind === "code" ? (
        <CodingStudio exerciseId={route.exerciseId} />
      ) : game?.kind === "exam" ? (
        <Exam onExamChange={onExamChange} />
      ) : game ? (
        <Game
          key={game.id}
          game={game}
          route={route}
          progress={progress}
          onProgress={setProgress}
        />
      ) : (
        <main className="home">
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="tiny-dot" /> SMALL GAMES. BIG BRAIN ENERGY.
              </span>
              <h1>
                Less cram.
                <br />
                More <em>“I got this.”</em>
              </h1>
              <p>Your CS practice break. Pick a game. Find your rhythm.</p>
            </div>
            <div className="hero-sticker" aria-hidden="true">
              <span>
                GOOD THINGS
                <br />
                TAKE PRACTICE
              </span>
              <strong>✳</strong>
              <span>YOU’VE GOT THIS</span>
            </div>
          </section>
          <a className="coding-home-card" href="#code">
            <div>
              <span className="eyebrow">C WRITING STUDIO</span>
              <h2>Turn the idea into code.</h2>
              <p>Write C one line at a time, then try it on paper.</p>
            </div>
            <span className="play-link">
              Start writing <span aria-hidden="true">↗</span>
            </span>
          </a>
          <section aria-label="Practice games">
            <div className="section-heading">
              <h2>
                Choose your next little win<span>↘</span>
              </h2>
              <span>01 — {String(games.length).padStart(2, "0")}</span>
            </div>
            <div className="game-grid">
              {games.map((item, i) => (
                <a
                  className={`game-card theme-${item.id}`}
                  key={item.id}
                  href={`#${item.id}`}
                >
                  <div className="card-art-header">
                    <span>{item.label}</span>
                    <span>0{i + 1}</span>
                  </div>
                  <CardArt id={item.id} />
                  <div className="card-copy">
                    <span className="topic">{item.topic}</span>
                    <h3>{item.title}</h3>
                    <p>{item.tagline}</p>
                    <div className="card-bottom">
                      <span>
                        {item.kind === "exam"
                          ? "120 min · 100 points"
                          : progress.games[item.id]?.wins
                            ? `${progress.games[item.id].wins} perfect ${progress.games[item.id].wins === 1 ? "round" : "rounds"}`
                            : "Learn it. Try it. Get it."}
                      </span>
                      <span className="play-link">
                        Play <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
          <div className="home-bottom">
            <span>
              <i aria-hidden="true">✧</i> A little practice. A little progress.
              Every time.
            </span>
            <span>
              {wins
                ? `${wins} little wins & counting`
                : "Your next win starts here"}
            </span>
          </div>
        </main>
      )}
      <footer>
        <span>MADE FOR YOUR NEXT AHA.</span>
        <span>
          {saved
            ? "Progress saved on this browser"
            : "Progress is temporary · browser storage unavailable"}
        </span>
      </footer>
    </div>
  );
}
