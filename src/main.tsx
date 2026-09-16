import { specialBattles, canChallenge } from "./battles";
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
  Mountain,
  Plus,
  Shield,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { facts, unlockedTables, type Attempt } from "./learning";
import { cards } from "./cards";
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
    [metric, setMetric] = useState("accuracy");
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
  async function next(id = round) {
    const q = await api("/round/" + id);
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
  const special = specialBattles.find((b) => b.id === table);
  const finalPassed = !!kid?.certifications.some(
    (c) => c.table === 16 && c.passed,
  );
  const earnedCards = new Set(
    kid?.certifications.filter((c) => c.passed).map((c) => c.table),
  ).size;
  const specialCards = (
    <div className="collection special-battles">
      {specialBattles.map((b) => {
        const passed = kid?.certifications.some(
          (c) => c.table === b.id && c.passed,
        );
        const unlocked = canChallenge(b.id, kid?.certifications || []);
        return (
          <article
            className={"animal-card " + (passed ? "unlocked" : "locked")}
            key={b.id}
          >
            <span className="eyebrow">
              {b.id === 16 ? "COMPLETE THE ADVENTURE" : "MIXED-TABLE CHALLENGE"}
            </span>
            <span className="big-emoji">{b.emoji}</span>
            <h2>{b.name}</h2>
            <p>
              {passed
                ? b.id === 16
                  ? "Adventure complete!"
                  : "✓ Boss card collected"
                : b.id === 16
                  ? "Beat all three regional bosses to unlock."
                  : `Beat table bosses ${b.tables.join(", ")} to unlock.`}
            </p>
            {page === "tests" ? (
              <button
                className="primary"
                disabled={admin || !unlocked}
                onClick={() => {
                  setTable(b.id);
                  setMode("test");
                  setLength(20);
                  setPage("choose");
                }}
              >
                {unlocked ? "Challenge" : "Locked"}
                <ArrowRight size={15} />
              </button>
            ) : (
              <span className="card-status">
                {passed ? "Collected" : "Beat this boss to collect"}
              </span>
            )}
          </article>
        );
      })}
    </div>
  );
  if (!status)
    return (
      <div className="loading">
        🐐 Gathering the goats…{error && <p role="alert">{error}</p>}
      </div>
    );
  if (!status.auth)
    return (
      <div className="login">
        <div className="brand">
          <span>🐐</span> mathgoat<span className="dot">.</span>
        </div>
        <div className="login-card">
          <span className="eyebrow">SMALL STEPS. BIG GOAT ENERGY.</span>
          <h1>
            {!status.setup
              ? "Your family’s next adventure."
              : "Who’s ready to climb?"}
          </h1>
          <p>
            Times tables, tiny victories, and some deeply unserious animals.
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
  const nav: [string, typeof Home, string][] = [
    ["home", Home, "Base camp"],
    ["practice", Zap, "Practice"],
    ["tests", Flag, "Boss battles"],
    ["cards", BookOpen, "My collection"],
    ["leaderboard", Trophy, "Leaderboard"],
    ...(admin
      ? [
          ["analytics", BarChart3, "Parent dashboard"] as [
            string,
            typeof Home,
            string,
          ],
        ]
      : []),
  ];
  return (
    <div className="app">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("home");
          }}
        >
          <span>🐐</span> mathgoat<span className="dot">.</span>
        </a>
        <div className="family-label">THE FAMILY ADVENTURE</div>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
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
            <span>🐐</span>
            <strong>Greatness takes practice.</strong>
            <p>So does not eating your homework.</p>
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
            <LogOut size={18} /> Switch explorer
          </button>
        </div>
      </aside>
      <div className="main">
        <header>
          <span>
            <span className="status-dot" /> Every little step counts
          </span>
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
                      ? "Welcome to base camp."
                      : `Hey ${kid?.name}. Ready to level up?`}{" "}
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
                    <Plus size={16} /> Add an explorer
                  </button>
                )}
              </div>
              {!kids.length ? (
                <div className="panel empty">
                  <span>🏕️</span>
                  <h2>Your adventure starts here.</h2>
                  <p>Add your first explorer and give them a secret PIN.</p>
                  <button
                    className="primary"
                    onClick={() => setPage("analytics")}
                  >
                    Add an explorer <Plus size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="stats">
                    <Stat
                      icon="⚡"
                      label="TOTAL POINTS"
                      value={kid.points.toLocaleString()}
                      note="Every answer adds up"
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
                      note="A wonderfully weird collection"
                    />
                  </div>
                  <div className="home-grid">
                    <section className="quest-panel">
                      <div className="quest-copy">
                        <span className="pill">✦ YOUR NEXT ADVENTURE</span>
                        <h2>
                          Small questions.
                          <br />
                          Big goat energy.
                        </h2>
                        <p>
                          A little familiar. A little challenging.
                          <br />A quest that grows right along with you.
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
                      <div className="mountain-scene" aria-hidden="true">
                        <div className="sun" />
                        <span className="cloud c1">☁</span>
                        <span className="cloud c2">☁</span>
                        <div className="peak back" />
                        <div className="peak front" />
                        <span className="summit-flag">⚑</span>
                        <span className="goat">🐐</span>
                        <span className="spark s1">✦</span>
                        <span className="spark s2">✧</span>
                        <span className="scene-label">
                          THE ONLY WAY IS UP. ISH.
                        </span>
                      </div>
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
                        Keep climbing toward your
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
                    <span className="subtle-tag">ALL TABLES WELCOME</span>
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
              <span className="big-emoji">
                {special?.emoji || cards[table - 1]?.emoji}
              </span>
              <span className="eyebrow">
                {mode === "test" ? "BOSS BATTLE" : "FOCUSED PRACTICE"}
              </span>
              <h1>{special?.name || `The ${table} times table`}</h1>
              <p>
                {mode === "test"
                  ? "20 questions. Get 18 right to win your card. We’ll show you the answer if you miss one."
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
                Let’s practice <ArrowRight size={18} />
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
                  Back to base camp <ArrowRight size={18} />
                </button>
              </section>
            ) : (
              <div className="play-wrap">
                <div className="round-top">
                  <span>
                    {mode === "quest"
                      ? "Adaptive quest"
                      : mode === "test"
                        ? special?.name || `Boss battle: ${table}s`
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
                  <span className="pill">
                    {question.bonus
                      ? "✦ WILD CARD · DOUBLE POINTS"
                      : "ONE LITTLE QUESTION. YOU’VE GOT THIS."}
                  </span>
                  <span className="card-animal">
                    {cards[question.a - 1].emoji}
                  </span>
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
                      } else if (answer.trim())
                        act(async () => {
                          const result = await api(
                            "/round/" + round + "/answer",
                            { questionId: question.id, answer: Number(answer) },
                          );
                          setFeedback(result);
                        });
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
                            : `Good try. ${question.a} × ${question.b} = ${feedback.product}`}
                        </strong>
                        {!feedback.correct && feedback.hint && (
                          <StrategyHint hint={feedback.hint} />
                        )}
                        <p>
                          {feedback.correct
                            ? "The goat is mildly impressed."
                            : "Take a look, then press Enter or tap Next."}
                        </p>
                      </div>
                    ) : (
                      <p className="card-caption">
                        {cards[question.a - 1].line}
                      </p>
                    )}
                    <button
                      ref={continueButton}
                      disabled={
                        busy ||
                        (!feedback && !answer) ||
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
                  Accuracy first. Take your time. We’re on your team.
                </p>
              </div>
            ))}
          {page === "tests" && (
            <>
              <PageTitle
                eyebrow="TIME TO FACE THE WEIRDOS"
                title="Boss battles"
                text="Beat table bosses, then the three regional bosses. Defeat the final boss to complete your adventure. Every battle: 20 questions, 18 correct to pass."
              />
              <div className="collection">
                {cards.map((c) => (
                  <article className="animal-card" key={c.table}>
                    <span className="eyebrow">THE {c.table} TIMES TABLE</span>
                    <span className="big-emoji">{c.emoji}</span>
                    <h2>{c.name}</h2>
                    <p>
                      {masteredTables.includes(c.table)
                        ? kid?.certifications.some(
                            (x) => x.table === c.table && x.fluent,
                          )
                          ? "⚡ Passed + fluent"
                          : "✓ Passed · Card collected"
                        : c.line}
                    </p>
                    <button
                      className="primary"
                      disabled={admin}
                      onClick={() => {
                        setTable(c.table);
                        setMode("test");
                        setLength(20);
                        setPage("choose");
                      }}
                    >
                      Challenge <ArrowRight size={15} />
                    </button>
                  </article>
                ))}
              </div>
              <section className="section-heading">
                <div>
                  <h2>Regional bosses & the final challenge</h2>
                  <p>Bosses earn cards. Only quests earn points.</p>
                </div>
              </section>
              {specialCards}
              <p className="muted">
                No points or random bonuses during battles. Fluent = 18/20
                correct and median correct-answer time ≤ 6 seconds. Practice
                mastery remains a separate, ongoing measure.
              </p>
            </>
          )}
          {page === "cards" && (
            <>
              <PageTitle
                eyebrow="THE WEIRD AND WONDERFUL"
                title="Your collection"
                text="Pass a table’s 20-question boss battle with 18 correct to collect its resident weirdo."
              />
              <div className="collection">
                {cards.map((c) => {
                  const unlocked = masteredTables.includes(c.table);
                  return (
                    <article
                      className={
                        "animal-card " + (unlocked ? "unlocked" : "locked")
                      }
                      key={c.table}
                    >
                      <span className="eyebrow">
                        {unlocked ? "✦ COLLECTED" : `MASTER THE ${c.table}s`}
                      </span>
                      <span className="big-emoji">{c.emoji}</span>
                      <h2>{c.name}</h2>
                      <p>{c.line}</p>
                      <span className="card-status">
                        {unlocked
                          ? kid?.certifications.some(
                              (x) => x.table === c.table && x.fluent,
                            )
                            ? "⚡ Fluent · Officially part of the herd"
                            : "Officially part of the herd"
                          : "Pass the boss battle to unlock"}
                      </span>
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {page === "cards" && specialCards}
          {page === "leaderboard" && (
            <>
              <PageTitle
                eyebrow="A LITTLE FRIENDLY COMPETITION"
                title="The family leaderboard"
                text="Cheer each other on. There’s room for everyone at the top."
              />
              <section className="panel">
                <Leaderboard kids={kids} />
                <div className="rank-list">
                  {[...kids]
                    .sort((a, b) => b.points - a.points)
                    .map((k, i) => (
                      <div key={k.id}>
                        <span className="rank">{i + 1}</span>
                        <span className="avatar">{k.avatar}</span>
                        <strong>
                          {k.name}
                          {k.certifications.some(
                            (c) => c.table === 16 && c.passed,
                          )
                            ? " 👑"
                            : ""}
                        </strong>
                        <span>{k.mastered} / 144 mastered</span>
                        <b>{k.points.toLocaleString()} pts</b>
                      </div>
                    ))}
                </div>
                {!kids.length && <p>Add an explorer to get started.</p>}
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
              <div className="admin-tools">
                <label>
                  Explorer
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
                      value={unlockedTables(fs).join(", ")}
                      note="More unlock as confidence grows"
                    />
                  </div>
                  <section className="panel analytics-panel">
                    <div className="section-heading">
                      <div>
                        <h2>The whole picture</h2>
                        <p>
                          Each square is one multiplication fact. Hover or tap
                          for details.
                        </p>
                      </div>
                      <select
                        aria-label="Heatmap metric"
                        value={metric}
                        onChange={(e) => setMetric(e.target.value)}
                      >
                        <option value="accuracy">Accuracy</option>
                        <option value="count">Practice frequency</option>
                        <option value="median">Response speed</option>
                      </select>
                    </div>
                    <Heatmap attempts={kid.attempts} metric={metric} />
                    <p className="muted">
                      Gray = not practiced. Accuracy and speed use the last 10
                      attempts; frequency uses all attempts. Speed is the median
                      of correct answers.
                    </p>
                  </section>
                  <section className="panel">
                    <h2>Worth another look</h2>
                    <div className="tricky">
                      {fs
                        .filter((f) => f.count && !f.mastered)
                        .sort(
                          (a, b) =>
                            a.accuracy - b.accuracy || b.median - a.median,
                        )
                        .slice(0, 8)
                        .map((f) => (
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
                <h2>Add an explorer</h2>
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
                    Animal
                    <select name="avatar">
                      {["🐐", "🦊", "🐼", "🐸", "🦁", "🐨"].map((a) => (
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
                    Add explorer <Plus size={16} />
                  </button>
                </form>
              </section>
            </>
          )}
          <footer>
            MADE FOR LITTLE BREAKTHROUGHS{" "}
            <span>Stay curious. Be a little GOAT.</span>
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
    const fs = facts(attempts);
    const chart = Plot.plot({
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
          title: (f) =>
            `${f.a} × ${f.b}\n${f.count} attempts\n${Math.round(f.accuracy * 100)}% correct\n${(f.median / 1000).toFixed(1)}s median${f.mastered ? "\nMastered!" : ""}`,
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!kids.length) return;
    const chart = Plot.plot({
      width: 850,
      height: Math.max(180, kids.length * 65),
      marginLeft: 110,
      x: { label: "Total points", grid: true },
      y: { label: null },
      color: { range: ["#68834d"] },
      marks: [
        Plot.barX(
          [...kids].sort((a, b) => b.points - a.points),
          {
            x: "points",
            y: (k) => `${k.avatar} ${k.name}`,
            fill: "#68834d",
            rx: 5,
            tip: true,
          },
        ),
      ],
    });
    ref.current?.replaceChildren(chart);
    return () => {
      chart.remove();
    };
  }, [kids]);
  return <div className="chart" ref={ref} />;
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
