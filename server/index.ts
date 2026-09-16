import {
  canChallenge,
  nextBossTables,
  mixedDeck,
  specialBattles,
} from "../src/battles";
import { multiplicationHint } from "../src/hints";
import {
  chooseFact,
  award,
  facts,
  examDeck,
  examResult,
  type Attempt,
  reviewFact,
} from "../src/learning";
interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
const hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (n) => n.toString(16).padStart(2, "0")).join(
    "",
  );
async function hash(pin: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
async function history(db: D1Database, id: string) {
  return (
    await db
      .prepare(
        "SELECT q.*,q.round_id FROM questions q JOIN rounds r ON r.id=q.round_id WHERE r.kid_id=? AND q.answer IS NOT NULL ORDER BY q.answered_at,q.rowid",
      )
      .bind(id)
      .all<Attempt>()
  ).results;
}
async function certifications(db: D1Database, id: string, attempts: Attempt[]) {
  const rounds = (
    await db
      .prepare(
        "SELECT id,table_number FROM rounds WHERE kid_id=? AND mode='test' AND finished=1",
      )
      .bind(id)
      .all<{ id: string; table_number: number }>()
  ).results;
  return rounds.map((r) => ({
    table: r.table_number,
    ...examResult(attempts.filter((a) => a.round_id === r.id)),
  }));
}
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url),
      path = url.pathname,
      db = env.DB;
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      if (
        req.method !== "GET" &&
        req.headers.get("Origin") &&
        req.headers.get("Origin") !== url.origin
      )
        return json({ error: "Invalid origin" }, 403);
      const body = req.method === "POST" ? ((await req.json()) as any) : {};
      const cookie = req.headers
        .get("Cookie")
        ?.match(/(?:^|; )session=([^;]+)/)?.[1];
      const auth = cookie
        ? await db
            .prepare("SELECT * FROM auth_sessions WHERE token=? AND expires>?")
            .bind(cookie, Date.now())
            .first<{ kid_id: string; is_admin: number }>()
        : null;
      if (path === "/api/status")
        return json({
          setup: !!(await db
            .prepare("SELECT value FROM settings WHERE key='admin_hash'")
            .first()),
          auth: auth ? { kidId: auth.kid_id, admin: !!auth.is_admin } : null,
        });
      if (path === "/api/profiles" && req.method === "GET")
        return json(
          (
            await db
              .prepare("SELECT id,name,avatar FROM kids ORDER BY created_at")
              .all()
          ).results,
        );
      if (path === "/api/setup" && req.method === "POST") {
        if (typeof body.password !== "string" || body.password.length < 8)
          return json(
            { error: "Choose a parent password with at least 8 characters." },
            400,
          );
        const salt = crypto.randomUUID();
        const value = JSON.stringify({
          salt,
          hash: await hash(body.password, salt),
        });
        const result = await db
          .prepare(
            "INSERT OR IGNORE INTO settings(key,value) VALUES('admin_hash',?)",
          )
          .bind(value)
          .run();
        if (!result.meta.changes)
          return json({ error: "Parent account already exists." }, 409);
        return json({ ok: true });
      }
      if (path === "/api/login" && req.method === "POST") {
        const key = `${req.headers.get("CF-Connecting-IP") || "local"}:${body.admin ? "admin" : String(body.id).slice(0, 50)}`;
        const attempt = await db
          .prepare("SELECT * FROM login_attempts WHERE key=?")
          .bind(key)
          .first<{ count: number; reset_at: number }>();
        if (attempt && attempt.reset_at > Date.now() && attempt.count >= 5)
          return json({ error: "Too many tries. Please wait 5 minutes." }, 429);
        await db
          .prepare(
            "INSERT INTO login_attempts(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END",
          )
          .bind(key, Date.now() + 300000, Date.now(), Date.now())
          .run();
        let valid = false;
        if (body.admin) {
          const row = await db
            .prepare("SELECT value FROM settings WHERE key='admin_hash'")
            .first<{ value: string }>();
          if (row) {
            const v = JSON.parse(row.value);
            valid =
              (await hash(String(body.password || ""), v.salt)) === v.hash;
          }
        } else {
          const kid = await db
            .prepare("SELECT * FROM kids WHERE id=?")
            .bind(String(body.id || ""))
            .first<{ salt: string; pin_hash: string }>();
          if (kid)
            valid =
              (await hash(String(body.pin || ""), kid.salt)) === kid.pin_hash;
        }
        if (!valid)
          return json({ error: "That doesn’t match. Try again." }, 401);
        await db
          .prepare("DELETE FROM login_attempts WHERE key=?")
          .bind(key)
          .run();
        const token = crypto.randomUUID();
        await db
          .prepare(
            "INSERT INTO auth_sessions(token,kid_id,is_admin,expires) VALUES(?,?,?,?)",
          )
          .bind(
            token,
            body.admin ? null : body.id,
            body.admin ? 1 : 0,
            Date.now() + 86400000 * 7,
          )
          .run();
        return json({ ok: true }, 200, {
          "Set-Cookie": `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`,
        });
      }
      if (path === "/api/logout") {
        if (cookie)
          await db
            .prepare("DELETE FROM auth_sessions WHERE token=?")
            .bind(cookie)
            .run();
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        });
      }
      if (!auth) return json({ error: "Please sign in." }, 401);
      if (path === "/api/profiles" && req.method === "POST") {
        if (!auth.is_admin)
          return json({ error: "Parent access required." }, 403);
        if (
          typeof body.name !== "string" ||
          !body.name.trim() ||
          body.name.length > 30 ||
          !/^\d{4}$/.test(body.pin) ||
          !Number.isInteger(body.goal) ||
          body.goal < 100 ||
          body.goal > 1000000
        )
          return json(
            {
              error:
                "Enter a name, a 4-digit PIN, and a goal between 100 and 1,000,000.",
            },
            400,
          );
        const salt = crypto.randomUUID();
        await db
          .prepare(
            "INSERT INTO kids(id,name,avatar,salt,pin_hash,goal) VALUES(?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            body.name.trim(),
            ["🐐", "🦊", "🐼", "🐸", "🦁", "🐨"].includes(body.avatar)
              ? body.avatar
              : "🐐",
            salt,
            await hash(body.pin, salt),
            body.goal,
          )
          .run();
        return json({ ok: true });
      }
      if (path === "/api/dashboard") {
        const kids = (
          await db
            .prepare("SELECT id,name,avatar,goal FROM kids ORDER BY created_at")
            .all<{ id: string; name: string; avatar: string; goal: number }>()
        ).results;
        const summaries = await Promise.all(
          kids.map(async (k) => {
            const attempts = await history(db, k.id),
              fs = facts(attempts);
            return {
              ...k,
              points: attempts.reduce((s, a) => s + a.points, 0),
              mastered: fs.filter((f) => f.mastered).length,
              certifications: await certifications(db, k.id, attempts),
              answered: attempts.length,
              attempts: auth.is_admin || auth.kid_id === k.id ? attempts : [],
            };
          }),
        );
        return json(summaries);
      }
      if (path === "/api/goal" && req.method === "POST") {
        if (!auth.is_admin)
          return json({ error: "Parent access required." }, 403);
        if (
          !Number.isInteger(body.goal) ||
          body.goal < 100 ||
          body.goal > 1000000
        )
          return json({ error: "Goal must be 100–1,000,000." }, 400);
        await db
          .prepare("UPDATE kids SET goal=? WHERE id=?")
          .bind(body.goal, body.id)
          .run();
        return json({ ok: true });
      }
      if (path === "/api/round" && req.method === "POST") {
        if (auth.is_admin)
          return json({ error: "Sign in as a learner to practice." }, 400);
        if (
          !(body.mode === "practice" ? [20, 50] : [20]).includes(body.length) ||
          !["quest", "practice", "test"].includes(body.mode) ||
          (body.mode !== "quest" &&
            (!Number.isInteger(body.table) ||
              body.table < 1 ||
              body.table > (body.mode === "test" ? 16 : 12)))
        )
          return json({ error: "Choose a valid practice session." }, 400);
        if (
          body.mode === "test" &&
          !canChallenge(
            body.table,
            await certifications(
              db,
              auth.kid_id,
              await history(db, auth.kid_id),
            ),
          )
        )
          return json(
            { error: "Beat the prerequisite bosses to unlock this battle." },
            403,
          );
        const special = specialBattles.find((b) => b.id === body.table);
        const id = crypto.randomUUID();
        await db
          .prepare(
            "INSERT INTO rounds(id,kid_id,mode,table_number,length,exam_deck) VALUES(?,?,?,?,?,?)",
          )
          .bind(
            id,
            auth.kid_id,
            body.mode,
            body.mode !== "quest" ? body.table : null,
            body.mode === "test" ? 20 : body.length,
            body.mode === "test"
              ? JSON.stringify(special ? mixedDeck(special.tables) : examDeck())
              : null,
          )
          .run();
        return json({ id });
      }
      const match = path.match(/^\/api\/round\/([^/]+)(\/answer)?$/);
      if (match) {
        const round = await db
          .prepare("SELECT * FROM rounds WHERE id=? AND kid_id=?")
          .bind(match[1], auth.kid_id)
          .first<any>();
        if (!round) return json({ error: "Round not found." }, 404);
        if (match[2] && req.method === "POST") {
          const q = await db
            .prepare("SELECT * FROM questions WHERE id=? AND round_id=?")
            .bind(body.questionId, round.id)
            .first<any>();
          if (!q) return json({ error: "Question not found." }, 404);
          if (
            !Number.isInteger(body.answer) ||
            body.answer < 0 ||
            body.answer > 999
          )
            return json({ error: "Enter a number from 0 to 999." }, 400);
          const correct = body.answer === q.a * q.b,
            points = award(correct, round.mode, !!q.bonus),
            elapsed = Math.max(0, Date.now() - q.issued_at);
          await db
            .prepare(
              "UPDATE questions SET answer=?,correct=?,elapsed_ms=?,points=?,answered_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND answer IS NULL",
            )
            .bind(body.answer, correct ? 1 : 0, elapsed, points, q.id)
            .run();
          const saved = await db
            .prepare(
              "SELECT correct,points,elapsed_ms FROM questions WHERE id=?",
            )
            .bind(q.id)
            .first<{ correct: number; points: number; elapsed_ms: number }>();
          let hint = null;
          if (!saved?.correct) {
            const suggested = multiplicationHint(
              q.a,
              q.b,
              await history(db, auth.kid_id),
            );
            await db
              .prepare(
                "INSERT OR IGNORE INTO fact_hints(kid_id,a,b,payload) VALUES(?,?,?,?)",
              )
              .bind(auth.kid_id, q.a, q.b, JSON.stringify(suggested))
              .run();
            const stored = await db
              .prepare(
                "SELECT payload FROM fact_hints WHERE kid_id=? AND a=? AND b=?",
              )
              .bind(auth.kid_id, q.a, q.b)
              .first<{ payload: string }>();
            hint = JSON.parse(stored!.payload);
          }
          return json({ ...saved, product: q.a * q.b, hint });
        }
        const pending = await db
          .prepare(
            "SELECT id,a,b,bonus,position FROM questions WHERE round_id=? AND answer IS NULL",
          )
          .bind(round.id)
          .first();
        if (pending) return json(pending);
        const count = await db
          .prepare(
            "SELECT COUNT(*) AS n,SUM(points) AS points,SUM(correct) AS correct FROM questions WHERE round_id=?",
          )
          .bind(round.id)
          .first<any>();
        if (count.n >= round.length) {
          await db
            .prepare("UPDATE rounds SET finished=1 WHERE id=?")
            .bind(round.id)
            .run();
          const attempts = await history(db, auth.kid_id);
          return json({
            done: true,
            ...count,
            ...(round.mode === "test"
              ? {
                  exam: examResult(
                    attempts.filter((a) => a.round_id === round.id),
                  ),
                  review: attempts
                    .filter((a) => a.round_id === round.id && !a.correct)
                    .map((a) => ({ a: a.a, b: a.b })),
                }
              : {}),
          });
        }
        const attempts = await history(db, auth.kid_id);
        const deckEntry =
          round.mode === "test" ? JSON.parse(round.exam_deck)[count.n] : null;
        const targets =
          round.mode === "quest"
            ? nextBossTables(await certifications(db, auth.kid_id, attempts))
            : [];
        const review =
          round.mode === "quest"
            ? reviewFact(attempts.filter((a) => a.round_id === round.id))
            : null;
        const fact =
          round.mode === "test"
            ? typeof deckEntry === "number"
              ? { a: round.table_number, b: deckEntry }
              : deckEntry
            : review ||
              chooseFact(
                attempts,
                round.table_number,
                attempts.at(-1),
                Math.random,
                targets,
              );
        const id = crypto.randomUUID(),
          bonus = round.mode === "quest" && Math.random() < 0.12 ? 1 : 0;
        await db
          .prepare(
            "INSERT OR IGNORE INTO questions(id,round_id,position,a,b,bonus,issued_at) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(id, round.id, count.n + 1, fact.a, fact.b, bonus, Date.now())
          .run();
        return json(
          await db
            .prepare(
              "SELECT id,a,b,bonus,position FROM questions WHERE round_id=? AND position=?",
            )
            .bind(round.id, count.n + 1)
            .first(),
        );
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  },
};
