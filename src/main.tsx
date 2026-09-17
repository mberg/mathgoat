import {
  hasPassed,
  adventureComplete,
  nextBattle,
  JOURNEY_ORDER,
} from "./battles";
import { AdventureBoard } from "./AdventureBoard";
import { Collection } from "./Collection";
import type { Hint } from "./hints";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Plot from "@observablehq/plot";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Flag,
  Home,
  LogOut,
  Plus,
  Shield,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { facts, unlockedTables, type Attempt } from "./learning";
import { cardFor, logoImage, playerImage } from "./cards";
import "./style.css";
type Kid = {
  id: string;
  name: string;
  avatar: string;
  goal: number;
  points: number;
  mastered: number;
  answered: number;
  certifications: { table: number; passed: boolean; fluent: boolean }[];
  attempts: Attempt[];
};
async function api(path: string, data?: unknown) {
  const r = await fetch("/api" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const v: any = await r.json();
  if (!r.ok) throw new Error(v.error || "Request failed");
  return v;
}
function App() {
  const [status, setStatus] = useState<any>(null),
    [profiles, setProfiles] = useState<Kid[]>([]),
    [kids, setKids] = useState<Kid[]>([]),
    [page, setPage] = useState("home"),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [length, setLength] = useState(20),
    [table, setTable] = useState(1),
    [mode, setMode] = useState("quest"),
    [round, setRound] = useState(""),
    [question, setQuestion] = useState<any>(null),
    [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState<any>(null),
    [remainingMs, setRemainingMs] = useState(6000);
  const deadline = useRef(0);
  const submitting = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  async function load() {
    const s = await api("/status");
    const [profiles, dashboard] = await Promise.all([
      api("/profiles"),
      s.auth ? api("/dashboard") : Promise.resolve([]),
    ]);
    setProfiles(profiles);
    setKids(dashboard);
    setStatus(s);
    if (s.auth?.admin) setPage("analytics");
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const admin = status?.auth?.admin,
    kid =
      kids.find((k) => k.id === (admin ? selected : status?.auth?.kidId)) ||
      kids[0];
  useEffect(() => {
    if (page !== "play" || busy || question?.done) return;
    if (!feedback) input.current?.focus();
    else if (!feedback.correct || error) continueButton.current?.focus();
  }, [page, question, feedback, busy, error]);
  useEffect(() => {
    if (page !== "play" || !status?.auth || !feedback?.correct || busy || error)
      return;
    const timer = window.setTimeout(() => {
      void act(() => next());
    }, 650);
    return () => window.clearTimeout(timer);
  }, [page, status?.auth, feedback, busy, error, round, question?.id]);
  async function submitAnswer(timedOut = false) {
    if (submitting.current || busy || feedback) return;
    submitting.current = true;
    try {
      await act(async () => {
        const expired =
          mode === "test" &&
          (timedOut || performance.now() >= deadline.current);
        const result = await api("/round/" + round + "/answer", {
          questionId: question.id,
          answer: expired ? 0 : Number(answer),
          timedOut: expired,
        });
        setFeedback(result);
      });
    } finally {
      submitting.current = false;
    }
  }
  useEffect(() => {
    if (
      page !== "play" ||
      mode !== "test" ||
      !question ||
      question.done ||
      feedback ||
      busy ||
      error
    )
      return;
    const tick = () => {
      const remaining = Math.max(0, deadline.current - performance.now());
      setRemainingMs(remaining);
      if (remaining === 0) void submitAnswer(true);
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [page, mode, question, feedback, busy, error]);
  async function next(id = round) {
    const q = await api("/round/" + id);
    deadline.current = performance.now() + (q.remaining_ms ?? 6000);
    setRemainingMs(q.remaining_ms ?? 6000);
    setQuestion(q);
    setAnswer("");
    setFeedback(null);
    if (q.done) await load();
  }
  async function start() {
    await act(async () => {
      const r = await api("/round", { length, mode, table });
      setRound(r.id);
      await next(r.id);
      setPage("play");
    });
  }
  const fs = facts(kid?.attempts || []),
    masteredTables = Array.from({ length: 12 }, (_, i) => i + 1).filter((t) =>
      kid?.certifications?.some((c) => c.table === t && c.passed),
    );
  const strugglingFacts = fs
    .filter((f) => f.count > 0 && f.accuracy < 1)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 8);
  const finalPassed = adventureComplete(kid?.certifications || []);
  const earnedCards = new Set(
    kid?.certifications.filter((c) => c.passed).map((c) => c.table),
  ).size;
  const availableTables = unlockedTables(fs);
  function challenge(id: number) {
    setTable(id);
    setMode("test");
    setLength(20);
    setPage("choose");
  }
  if (!status)
    return (
      <div className="loading">
        Getting PopPop ready…{error && <p role="alert">{error}</p>}
      </div>
    );
  if (!status.auth)
    return (
      <div className="login">
        <div className="brand">
          <img className="brand-logo" src={logoImage} alt="PopPop Math" />
        </div>
        <div className="login-card">
          <span className="eyebrow">A LITTLE PRACTICE. A BIG ADVENTURE.</span>
          <h1>
            {!status.setup
              ? "Your family’s next adventure."
              : "Ready for your next adventure?"}
          </h1>
          <p>
            Explore the river. Beat the bosses. Discover PopPop’s story, one
            card at a time.
          </p>
          {!status.setup ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                act(async () => {
                  await api("/setup", { password: d.get("password") });
                  await api("/login", {
                    admin: true,
                    password: d.get("password"),
                  });
                  await load();
                });
              }}
            >
              <label>
                Choose a parent password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </label>
              <button disabled={busy} className="primary">
                Create your family <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <>
              <div className="profiles">
                {profiles.map((p) => (
                  <button
                    className={selected === p.id ? "profile active" : "profile"}
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                  >
                    <span>{p.avatar}</span>
                    {p.name}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  act(async () => {
                    await api(
                      "/login",
                      selected === "parent"
                        ? { admin: true, password: d.get("credential") }
                        : { id: selected, pin: d.get("credential") },
                    );
                    setPage("home");
                    setSelected("");
                    await load();
                  });
                }}
              >
                {selected && (
                  <>
                    <label>
                      {selected === "parent"
                        ? "Parent password"
                        : "Your secret 4-digit PIN"}
                      <input
                        key={selected}
                        name="credential"
                        type="password"
                        inputMode={selected === "parent" ? "text" : "numeric"}
                        pattern={selected === "parent" ? undefined : "[0-9]{4}"}
                        maxLength={selected === "parent" ? undefined : 4}
                        required
                        autoFocus
                        autoComplete={
                          selected === "parent" ? "current-password" : "off"
                        }
                      />
                    </label>
                    <button disabled={busy} className="primary">
                      Let’s go <ArrowRight size={18} />
                    </button>
                  </>
                )}
              </form>
              <button
                className="text-button"
                onClick={() => setSelected("parent")}
              >
                <Shield size={15} /> Parent sign in
              </button>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <small>A little practice. A lot of possibilities.</small>
      </div>
    );
  const nav: [string, typeof Home, string][] = admin
    ? [["analytics", BarChart3, "Parent dashboard"]]
    : [
        ["home", Home, "Adventure"],
        ["practice", Zap, "Practice"],
        ["tests", Flag, "Boss battles"],
        ["cards", BookOpen, "My collection"],
        ["leaderboard", Trophy, "Leaderboard"],
      ];
  return (
    <div className="app">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage(admin ? "analytics" : "home");
          }}
        >
          <img className="brand-logo" src={logoImage} alt="PopPop Math" />
        </a>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
              aria-label={label}
              className={page === id ? "nav active" : "nav"}
              onClick={() => {
                if (
                  page === "play" &&
                  !question?.done &&
                  !confirm(
                    "Leave this round? Your answered questions are saved.",
                  )
                )
                  return;
                setPage(id);
              }}
            >
              <Icon size={19} />
              {label}
              {id === "cards" && <span className="badge">{earnedCards}</span>}
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <div className="tip">
            <img className="sidebar-poppop" src={playerImage} alt="PopPop" />
            <strong>
              {admin ? "Your family’s progress." : "One stop at a time."}
            </strong>
            <p>
              {admin
                ? "See what each child knows and where they need help."
                : "Every boss you beat reveals a new chapter."}
            </p>
          </div>
          <button
            className="nav"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await api("/logout", {});
                setRound("");
                setSelected("");
                await load();
              })
            }
          >
            <LogOut size={18} /> Switch child
          </button>
        </div>
      </aside>
      <div className="main">
        <header>
          <div className="header-right">
            {admin && (
              <span className="parent-tag">
                <Shield size={13} /> Parent mode
              </span>
            )}
            <span className="avatar small">{admin ? "🏕️" : kid?.avatar}</span>
            <strong>{admin ? "Family HQ" : kid?.name}</strong>
          </div>
        </header>
        <main>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {(page === "home" || page === "practice") && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">LET’S MAKE A LITTLE PROGRESS</span>
                  <h1>
                    {admin
                      ? "Welcome to PopPop Math."
                      : `Hey ${kid?.name}. Adventure awaits!`}{" "}
                    <span className="wave">✌️</span>
                  </h1>
                  <p>
                    {admin
                      ? "Big breakthroughs start with little daily adventures."
                      : "Your next “I’ve got this!” moment is just a few questions away."}
                  </p>
                </div>
                {admin && (
                  <button
                    className="secondary"
                    onClick={() => setPage("analytics")}
                  >
                    <Plus size={16} /> Add a child
                  </button>
                )}
              </div>
              {!kids.length ? (
                <div className="panel empty">
                  <span>🏕️</span>
                  <h2>Your adventure starts here.</h2>
                  <p>Add your first child and give them a secret PIN.</p>
                  <button
                    className="primary"
                    onClick={() => setPage("analytics")}
                  >
                    Add a child <Plus size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="stats">
                    <Stat
                      icon="⚡"
                      label="TOTAL POINTS"
                      value={kid.points.toLocaleString()}
                      note="Earn points on your quests"
                    />
                    <Stat
                      icon="🎯"
                      label="FACTS MASTERED"
                      value={`${kid.mastered} / 144`}
                      note="Know it. Remember it. Own it."
                    />
                    <Stat
                      icon="🃏"
                      label="CARDS COLLECTED"
                      value={`${earnedCards} / 16`}
                      note="A new story at every stop"
                    />
                  </div>
                  {page === "home" && (
                    <AdventureBoard
                      certifications={kid.certifications}
                      readOnly={!!admin}
                      onChallenge={challenge}
                    />
                  )}
                  <div className="home-grid">
                    <section className="quest-panel">
                      <div className="quest-copy">
                        <span className="pill">✦ YOUR NEXT ADVENTURE</span>
                        <h2>
                          A little practice.
                          <br />A big adventure.
                        </h2>
                        <p>
                          Mix tables {availableTables.join(", ")}.
                          <br />
                          More unlock as you improve, with extra practice on
                          tricky questions.
                        </p>
                        <div className="quest-facts">
                          <span>
                            <Check size={15} /> Just-right questions
                          </span>
                          <span>
                            <Zap size={15} /> 10 points per correct answer
                          </span>
                        </div>
                      </div>
                      <img
                        className="quest-poppop"
                        src={playerImage}
                        alt="PopPop waving you on"
                      />
                      <div className="quest-footer">
                        <div>
                          <strong>20 questions</strong>
                          <p>A short quest. A little progress.</p>
                        </div>
                        <button
                          disabled={busy || admin}
                          className="primary"
                          onClick={() => {
                            setMode("quest");
                            setLength(20);
                            act(async () => {
                              const r = await api("/round", {
                                length: 20,
                                mode: "quest",
                              });
                              setRound(r.id);
                              await next(r.id);
                              setPage("play");
                            });
                          }}
                        >
                          Start a quest <ArrowRight size={18} />
                        </button>
                      </div>
                    </section>
                    <section className="panel goal-panel">
                      <span className="eyebrow">THE NEXT BIG THING</span>
                      <div className="goal-icon">🏁</div>
                      <h2>One step closer.</h2>
                      <p>
                        Keep moving toward your
                        <br />
                        personal points goal.
                      </p>
                      <div className="goal-numbers">
                        <strong>{kid.points.toLocaleString()}</strong>
                        <span>/ {kid.goal.toLocaleString()} pts</span>
                      </div>
                      <Progress value={kid.points / kid.goal} />
                      <small>
                        {Math.max(0, kid.goal - kid.points).toLocaleString()}{" "}
                        points to the finish line
                      </small>
                      <div className="goal-note">
                        {finalPassed
                          ? "👑 Adventure complete!"
                          : "👑 Beat the final boss to finish."}
                        <br />
                        <span>
                          {masteredTables.length} / 12 tables passed ·{" "}
                          {
                            new Set(
                              kid.certifications
                                .filter((c) => c.fluent && c.table <= 12)
                                .map((c) => c.table),
                            ).size
                          }{" "}
                          fluent
                        </span>
                      </div>
                    </section>
                  </div>
                  {admin && (
                    <p className="muted">
                      Sign in with a child’s PIN to start a quest. Parent mode
                      shows {kid.name}’s progress.
                    </p>
                  )}
                  <section className="section-heading">
                    <div>
                      <h2>A little focused practice</h2>
                      <p>
                        Pick a table and get ready for boss battles. No points,
                        no pressure.
                      </p>
                    </div>
                    <span className="subtle-tag">PRACTICE ANY TABLE</span>
                  </section>
                  <div className="table-grid">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        className={
                          "table-card " +
                          (masteredTables.includes(n) ? "mastered" : "")
                        }
                        disabled={admin}
                        aria-label={`Practice ${n}s`}
                        onClick={() => {
                          setTable(n);
                          setMode("practice");
                          setPage("choose");
                        }}
                      >
                        <span>THE</span>
                        <strong>
                          {n}
                          <small>×</small>
                        </strong>
                        <span>
                          TABLE <ChevronRight size={12} />
                        </span>
                        {masteredTables.includes(n) && (
                          <span className="table-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="bottom-note">
                    <Star size={16} /> Mistakes are part of the adventure. No
                    points lost. Ever.
                  </div>
                </>
              )}
            </>
          )}
          {page === "choose" && (
            <section className="panel center-panel">
              <div className="battle-preview">
                {hasPassed(table, kid?.certifications || []) ? (
                  <img src={cardFor(table).image} alt={cardFor(table).name} />
                ) : (
                  <div className="card-back">
                    <img src={logoImage} alt="PopPop Math reward card" />
                    <span>WIN TO REVEAL</span>
                  </div>
                )}
              </div>
              <span className="eyebrow">
                {mode === "test" ? "BOSS BATTLE" : "FOCUSED PRACTICE"}
              </span>
              <h1>
                {mode === "test"
                  ? cardFor(table).name
                  : `The ${table} times table`}
              </h1>
              <p>
                {mode === "test"
                  ? "20 questions, starting with three warm-ups. Six seconds per question. Get 18 right to win your card. If time runs out, we’ll show the answer and a helpful hint."
                  : "No points here—build your confidence for boss battles."}
              </p>
              <div className="segmented">
                {(mode === "test" ? [20] : [20, 50]).map((n) => (
                  <button
                    key={n}
                    className={length === n ? "selected" : ""}
                    onClick={() => setLength(n)}
                  >
                    {n} questions
                  </button>
                ))}
              </div>
              <button className="primary" disabled={busy} onClick={start}>
                {mode === "test" ? "Start battle" : "Let’s practice"}{" "}
                <ArrowRight size={18} />
              </button>
            </section>
          )}
          {page === "play" &&
            question &&
            (question.done ? (
              <section className="panel center-panel">
                <span className="big-emoji">🎉</span>
                <span className="eyebrow">
                  {mode === "test"
                    ? "BATTLE COMPLETE"
                    : mode === "quest"
                      ? "QUEST COMPLETE"
                      : "PRACTICE COMPLETE"}
                </span>
                <h1>
                  {question.exam
                    ? question.exam.passed
                      ? table === 16
                        ? "Adventure complete!"
                        : "Boss battle conquered!"
                      : "A little more practice. You’ll get there."
                    : "Look at you go."}
                </h1>
                {question.exam && (
                  <p>
                    {question.exam.passed
                      ? `Card unlocked! ${question.exam.fluent ? "Fluent badge earned, too. ⚡" : "Keep practicing to earn your fluent badge."}`
                      : "18 out of 20 unlocks your card. Try again whenever you’re ready."}
                  </p>
                )}
                {question.exam?.passed && (
                  <figure className="earned-reveal">
                    <img src={cardFor(table).image} alt={cardFor(table).name} />
                    <figcaption>{cardFor(table).name}</figcaption>
                  </figure>
                )}
                {question.review?.length > 0 && (
                  <p>
                    Worth another look:{" "}
                    {question.review
                      .map((q: any) => `${q.a} × ${q.b} = ${q.a * q.b}`)
                      .join(" · ")}
                  </p>
                )}
                <p>
                  {question.correct} of {question.n} correct. Every try makes a
                  difference.
                </p>
                {mode === "quest" && (
                  <h2 className="points-earned">+{question.points} points</h2>
                )}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await load();
                      setPage("home");
                    })
                  }
                >
                  Back to the board <ArrowRight size={18} />
                </button>
              </section>
            ) : (
              <div className="play-wrap">
                <div className="round-top">
                  <span>
                    {mode === "quest"
                      ? "Adaptive quest"
                      : mode === "test"
                        ? cardFor(table).name
                        : `The ${table} times table`}
                  </span>
                  <strong>
                    {question.position} / {length}
                  </strong>
                </div>
                <Progress value={(question.position - 1) / length} />
                <section
                  key={question.id}
                  className={"flashcard " + (question.bonus ? "bonus" : "")}
                >
                  {question.bonus && (
                    <span className="pill">✦ WILD CARD · DOUBLE POINTS</span>
                  )}
                  {mode === "test" && (
                    <div
                      className={
                        "boss-timer" + (remainingMs <= 2000 ? " urgent" : "")
                      }
                      role="timer"
                      aria-label="Time remaining"
                    >
                      <strong>
                        {feedback?.timedOut
                          ? "Time’s up"
                          : `${(remainingMs / 1000).toFixed(1)}s`}
                      </strong>
                      <Progress value={remainingMs / 6000} />
                    </div>
                  )}
                  <img
                    className="question-poppop"
                    src={playerImage}
                    alt="PopPop"
                  />
                  <h2>
                    {question.a} <span>×</span> {question.b}
                  </h2>
                  <form
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.repeat) e.preventDefault();
                    }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (feedback) {
                        if (!feedback.correct || error) act(() => next());
                      } else if (
                        answer.trim() ||
                        (mode === "test" && remainingMs === 0)
                      )
                        void submitAnswer();
                    }}
                  >
                    <label className="sr-only" htmlFor="answer">
                      Your answer
                    </label>
                    <input
                      ref={input}
                      id="answer"
                      inputMode="numeric"
                      pattern="[0-9]{1,3}"
                      autoComplete="off"
                      value={answer}
                      onChange={(e) =>
                        setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))
                      }
                      disabled={!!feedback || busy}
                      placeholder="?"
                    />
                    {feedback ? (
                      <div
                        className={
                          "feedback " + (feedback.correct ? "correct" : "")
                        }
                        role="status"
                      >
                        <strong>
                          {feedback.correct
                            ? mode === "quest"
                              ? `Nailed it! +${feedback.points} points`
                              : "Nailed it!"
                            : `${feedback.timedOut ? "Time’s up." : "Good try."} ${question.a} × ${question.b} = ${feedback.product}`}
                        </strong>
                        {!feedback.correct && feedback.hint && (
                          <StrategyHint hint={feedback.hint} />
                        )}
                        <p>
                          {feedback.correct
                            ? "One step closer. Here comes the next one."
                            : "Take a look, then press Enter or tap Next."}
                        </p>
                      </div>
                    ) : (
                      <p className="card-caption">
                        {cardFor(question.a).name} · {question.a} times table
                      </p>
                    )}
                    <button
                      ref={continueButton}
                      disabled={
                        busy ||
                        (!feedback &&
                          !answer &&
                          !(mode === "test" && remainingMs === 0)) ||
                        (!!feedback?.correct && !error)
                      }
                      className="primary"
                    >
                      {feedback?.correct && !error
                        ? "Next question…"
                        : feedback
                          ? "Next question"
                          : "Check answer"}{" "}
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </section>
                <p className="bottom-note">
                  {mode === "test"
                    ? "Six seconds per question. Get 18 of 20 right to win."
                    : "Accuracy first. Take your time. We’re on your team."}
                </p>
              </div>
            ))}
          {page === "tests" && (
            <>
              <PageTitle
                eyebrow="ONE PATH. SIXTEEN ADVENTURES."
                title="Boss battles"
                text="Beat each stop in order. Get 18 of 20 correct to reveal its card and unlock the next challenge."
              />
              <AdventureBoard
                certifications={kid?.certifications || []}
                readOnly={!!admin}
                onChallenge={challenge}
              />
              <p className="muted">
                The 1s, 2s, 3s, 4s, then the first regional boss. Keep following
                the path to the final showdown. Earn fluency badges separately
                by passing with a median correct-answer time of six seconds or
                less.
              </p>
            </>
          )}
          {page === "cards" && (
            <>
              <PageTitle
                eyebrow={`${earnedCards} OF 16 DISCOVERED`}
                title="Your PopPop collection"
                text="Each boss holds a new chapter. Win the battle to reveal its illustration."
              />
              <Collection certifications={kid?.certifications || []} />
            </>
          )}
          {page === "leaderboard" && (
            <>
              <PageTitle
                eyebrow="A LITTLE FRIENDLY COMPETITION"
                title="The family leaderboard"
                text="Cheer each other on. There’s room for everyone at the top."
              />
              <section className="panel">
                <Leaderboard kids={kids} />
                {!kids.length && <p>Add a child to get started.</p>}
              </section>
            </>
          )}
          {page === "analytics" && admin && (
            <>
              <PageTitle
                eyebrow="PARENT BASE CAMP"
                title="Little steps, made visible."
                text="See what’s sticking, what’s tricky, and where to go next."
              />
              <div className="child-summaries">
                {kids.map((child) => {
                  const cards = new Set(
                    child.certifications
                      .filter((c) => c.passed)
                      .map((c) => c.table),
                  ).size;
                  return (
                    <button
                      key={child.id}
                      className={
                        "panel child-summary" +
                        (child.id === kid?.id ? " selected" : "")
                      }
                      aria-pressed={child.id === kid?.id}
                      onClick={() => setSelected(child.id)}
                    >
                      <strong>
                        {child.avatar} {child.name}
                      </strong>
                      <span>
                        {child.points.toLocaleString()} /{" "}
                        {child.goal.toLocaleString()} points
                      </span>
                      <Progress value={child.points / child.goal} />
                      <span>{child.mastered} / 144 facts mastered</span>
                      <span>{cards} / 16 cards earned</span>
                      <small>
                        {adventureComplete(child.certifications)
                          ? "Adventure complete!"
                          : "Adventure in progress"}
                      </small>
                    </button>
                  );
                })}
              </div>
              <div className="admin-tools">
                <label>
                  Child
                  <select
                    value={kid?.id || ""}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {kids.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </label>
                {kid && (
                  <form
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.repeat) e.preventDefault();
                    }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const d = new FormData(e.currentTarget);
                      act(async () => {
                        await api("/goal", {
                          id: kid.id,
                          goal: Number(d.get("goal")),
                        });
                        await load();
                      });
                    }}
                  >
                    <label>
                      Points goal
                      <input
                        key={kid.id + ":" + kid.goal}
                        name="goal"
                        type="number"
                        defaultValue={kid.goal}
                        min={100}
                        max={1000000}
                        required
                      />
                    </label>
                    <button className="secondary" disabled={busy}>
                      Save goal
                    </button>
                  </form>
                )}
              </div>
              {kid && (
                <>
                  <div className="stats">
                    <Stat
                      icon="🧠"
                      label="MASTERY"
                      value={`${kid.mastered} / 144`}
                      note="90% accuracy · 3 sessions · ≤6 sec"
                    />
                    <Stat
                      icon="✍️"
                      label="ANSWERS LOGGED"
                      value={kid.answered.toLocaleString()}
                      note="Every response, including mistakes"
                    />
                    <Stat
                      icon="🔓"
                      label="QUEST TABLES"
                      value={availableTables.join(", ")}
                      note="More unlock as confidence grows"
                    />
                  </div>
                  <section className="panel parent-cards">
                    <h2>
                      {kid.name}’s earned cards · {earnedCards} / 16
                    </h2>
                    {earnedCards ? (
                      <Collection
                        key={kid.id}
                        certifications={kid.certifications}
                        earnedOnly
                      />
                    ) : (
                      <p>
                        No cards earned yet. Each boss victory earns a card.
                      </p>
                    )}
                  </section>
                  <section className="panel analytics-panel">
                    <div className="section-heading">
                      <div>
                        <h2>The whole picture</h2>
                        <p>
                          Each square is one multiplication fact. Hover or tap
                          for details.
                        </p>
                      </div>
                    </div>
                    {[
                      {
                        metric: "accuracy",
                        title: "Accuracy",
                        note: "Numbers show total correct answers across all attempts. Colors show accuracy over the last 10 attempts. Gray = not practiced.",
                      },
                      {
                        metric: "count",
                        title: "Practice frequency",
                        note: "Total attempts for each fact. Gray = not practiced.",
                      },
                      {
                        metric: "median",
                        title: "Response speed",
                        note: "Median time for correct answers among the last 10 attempts. Gray = no correct-answer timing data.",
                      },
                    ].map(({ metric, title, note }) => (
                      <section
                        className="heatmap-section"
                        key={metric}
                        aria-labelledby={`heatmap-${metric}`}
                      >
                        <h3 id={`heatmap-${metric}`}>{title}</h3>
                        <p className="muted">{note}</p>
                        {metric === "accuracy" && (
                          <p className="mastery-legend">
                            <span
                              className="mastery-swatch"
                              aria-hidden="true"
                            />
                            Outlined squares = mastered ·{" "}
                            {fs.filter((f) => f.mastered).length} / 144
                          </p>
                        )}
                        <Heatmap attempts={kid.attempts} metric={metric} />
                      </section>
                    ))}
                  </section>
                  <section className="panel">
                    <h2>Worth another look</h2>
                    <p className="muted">
                      Questions with mistakes in their last 10 attempts, lowest
                      accuracy first.
                    </p>
                    <div className="tricky">
                      {strugglingFacts.map((f) => (
                        <div key={`${f.a}-${f.b}`}>
                          <strong>
                            {f.a} × {f.b}
                          </strong>
                          <span>{Math.round(f.accuracy * 100)}% correct</span>
                          <small>
                            {f.median
                              ? `${(f.median / 1000).toFixed(1)}s median`
                              : "No correct answers yet"}
                          </small>
                        </div>
                      ))}
                    </div>
                    {!!kid.answered && !strugglingFacts.length && (
                      <p>No recent mistakes to revisit.</p>
                    )}
                    {!kid.answered && (
                      <p>
                        No answers yet. Their first quest will start filling in
                        the picture.
                      </p>
                    )}
                  </section>
                </>
              )}
              <section className="panel">
                <h2>Add a child</h2>
                <form
                  className="add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      d = new FormData(form);
                    act(async () => {
                      await api("/profiles", {
                        name: d.get("name"),
                        pin: d.get("pin"),
                        avatar: d.get("avatar"),
                        goal: Number(d.get("goal")),
                      });
                      form.reset();
                      await load();
                    });
                  }}
                >
                  <label>
                    Name
                    <input
                      name="name"
                      required
                      maxLength={30}
                      placeholder="First name or nickname"
                    />
                  </label>
                  <label>
                    Secret PIN
                    <input
                      name="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      minLength={4}
                      maxLength={4}
                      required
                      autoComplete="new-password"
                      placeholder="4 digits"
                    />
                  </label>
                  <label>
                    Child icon
                    <select name="avatar">
                      {["🦛", "🦩", "🐊", "🐒", "🦁", "🦋"].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Points goal
                    <input
                      name="goal"
                      type="number"
                      min={100}
                      max={1000000}
                      defaultValue={2000}
                      required
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Add child <Plus size={16} />
                  </button>
                </form>
              </section>
            </>
          )}
          <footer>
            POPPOP MATH · ONE ADVENTURE AT A TIME{" "}
            <span>A little practice. A big adventure.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Heatmap({
  attempts,
  metric,
}: {
  attempts: Attempt[];
  metric: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fs = facts(attempts).map((fact) => ({
      ...fact,
      correctCount: attempts.filter(
        (attempt) =>
          attempt.a === fact.a && attempt.b === fact.b && attempt.correct,
      ).length,
    }));
    const chart = Plot.plot({
      style: { fontSize: "12px" },
      width: 700,
      height: 430,
      marginLeft: 45,
      x: {
        label: "Second number →",
        domain: Array.from({ length: 12 }, (_, i) => i + 1),
      },
      y: {
        label: "First number",
        domain: Array.from({ length: 12 }, (_, i) => i + 1),
      },
      color: {
        scheme: metric === "median" ? "YlOrRd" : "YlGn",
        domain:
          metric === "accuracy"
            ? [0, 1]
            : metric === "median"
              ? [0, 12]
              : [0, Math.max(1, ...fs.map((f) => f.count))],
        legend: true,
        label:
          metric === "accuracy"
            ? "Correct fraction"
            : metric === "median"
              ? "Seconds (correct answers)"
              : "Attempts",
      },
      marks: [
        Plot.cell(fs, {
          x: "b",
          y: "a",
          fill: (f) =>
            !f.count || (metric === "median" && !f.median)
              ? undefined
              : metric === "median"
                ? f.median / 1000
                : metric === "count"
                  ? f.count
                  : f.accuracy,
          inset: 2,
          rx: 5,
          stroke: {
            value: (f) =>
              metric === "accuracy" && f.mastered ? "#a348c4" : "none",
            scale: null,
          },
          strokeWidth: 3,
          title: (f) =>
            `${f.a} × ${f.b}\n${f.correctCount} correct out of ${f.count} total attempts\n${Math.round(f.accuracy * 100)}% correct (last 10 attempts)\n${(f.median / 1000).toFixed(1)}s median${f.mastered ? "\nMastered!" : ""}`,
          tip: true,
        }),
        Plot.cell(
          fs.filter((f) => !f.count || (metric === "median" && !f.median)),
          {
            x: "b",
            y: "a",
            fill: "#e9ece5",
            inset: 2,
            rx: 5,
            title: (f) =>
              `${f.a} × ${f.b}: ${f.count ? "No correct answers yet" : "Not practiced yet"}`,
            tip: true,
          },
        ),
        ...(metric === "accuracy"
          ? [
              Plot.text(
                fs.filter((f) => f.count > 0),
                {
                  x: "b",
                  y: "a",
                  text: (f) => String(f.correctCount),
                  fill: {
                    value: (f) => (f.accuracy >= 0.6 ? "#ffffff" : "#28372a"),
                    scale: null,
                  },
                  fontSize: 14,
                  fontWeight: 700,
                  pointerEvents: "none",
                },
              ),
            ]
          : []),
      ],
    });
    ref.current?.replaceChildren(chart);
    return () => {
      chart.remove();
    };
  }, [attempts, metric]);
  return <div ref={ref} className="chart" />;
}
function Leaderboard({ kids }: { kids: Kid[] }) {
  const ranked = kids
    .map((kid) => ({
      ...kid,
      cards: JOURNEY_ORDER.filter((id) => hasPassed(id, kid.certifications))
        .length,
      next: nextBattle(kid.certifications),
    }))
    .sort(
      (a, b) =>
        b.cards - a.cards ||
        b.points - a.points ||
        a.name.localeCompare(b.name),
    );
  return (
    <div className="journey-leaderboard">
      <p className="muted">
        Earn all 16 cards to complete the adventure. Ranked by cards earned,
        then quest points.
      </p>
      {ranked.map((child, index) => (
        <article
          className="leaderboard-child"
          key={child.id}
          aria-label={child.name}
        >
          <div className="leaderboard-heading">
            <span className="rank">#{index + 1}</span>
            <span className="avatar">{child.avatar}</span>
            <h2>
              {child.name}
              {child.next === null ? " 👑" : ""}
            </h2>
            <strong className="leaderboard-card-count">
              {child.cards} / 16 cards
            </strong>
          </div>
          <div
            className="journey-progress"
            role="progressbar"
            aria-label={child.name + " adventure progress"}
            aria-valuemin={0}
            aria-valuemax={16}
            aria-valuenow={child.cards}
            aria-valuetext={child.cards + " of 16 cards earned"}
          >
            <Progress value={child.cards / 16} />
          </div>
          <p className="leaderboard-next">
            {child.next === null
              ? "Adventure complete! Final boss conquered."
              : "Next battle: " + cardFor(child.next).name}
          </p>
          <div className="leaderboard-secondary">
            <span>{child.points.toLocaleString()} points</span>
            <span>{child.mastered} / 144 questions mastered</span>
          </div>
          {child.cards > 0 && (
            <details className="leaderboard-cards">
              <summary>View earned cards ({child.cards})</summary>
              <Collection certifications={child.certifications} earnedOnly />
            </details>
          )}
        </article>
      ))}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function StrategyHint({ hint }: { hint: Hint }) {
  return (
    <div className="strategy-hint">
      <strong>💡 {hint.title}</strong>
      <p>{hint.explanation}</p>
      <ol>
        {hint.steps.map((step, i) => (
          <li key={i}>
            {step.expression} = <b>{step.result}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}
