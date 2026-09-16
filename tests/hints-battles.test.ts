import { test } from "node:test";
import assert from "node:assert/strict";
import { multiplicationHint } from "../src/hints.ts";
import { mixedDeck, canChallenge, nextBossTables } from "../src/battles.ts";
import { reviewFact, type Attempt, award } from "../src/learning.ts";
const attempt = (a: number, b: number, correct = 1): Attempt => ({
  a,
  b,
  correct,
  elapsed_ms: 2000,
  round_id: "round",
  points: 0,
  answered_at: "",
});
test("all 144 explanations contain valid arithmetic and reach the right product", () => {
  for (let a = 1; a <= 12; a++)
    for (let b = 1; b <= 12; b++) {
      const hint = multiplicationHint(a, b);
      assert.ok(hint.title);
      assert.equal(hint.steps.at(-1)?.result, a * b);
      for (const step of hint.steps) {
        const [left, op, right] = step.expression.split(" "),
          x = Number(left),
          y = Number(right);
        const actual =
          op === "×" ? x * y : op === "+" ? x + y : op === "−" ? x - y : x / y;
        assert.equal(step.result, actual);
      }
    }
  assert.equal(multiplicationHint(9, 9).steps.at(-1)?.expression, "90 − 9");
});
test("a familiar threes fact can anchor a sixes hint", () => {
  assert.equal(multiplicationHint(6, 7).title, "Five groups, plus one");
  assert.equal(
    multiplicationHint(6, 7, [attempt(3, 7), attempt(3, 7), attempt(3, 7)])
      .title,
    "Double three groups",
  );
});
test("mixed battles cover each table evenly with no duplicate questions", () => {
  for (const tables of [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    Array.from({ length: 12 }, (_, i) => i + 1),
  ]) {
    const deck = mixedDeck(tables);
    assert.equal(deck.length, 20);
    assert.equal(new Set(deck.map((q) => `${q.a}:${q.b}`)).size, 20);
    for (const a of tables)
      assert.ok(
        deck.filter((q) => q.a === a).length >= Math.floor(20 / tables.length),
      );
    assert.ok(deck.every((q) => tables.includes(q.a) && q.b >= 1 && q.b <= 12));
  }
});
test("regional and final battles enforce prerequisites independently of points", () => {
  const cert = (table: number) => ({ table, passed: true, fluent: false });
  assert.equal(canChallenge(12, []), true);
  assert.equal(canChallenge(13, []), false);
  assert.equal(canChallenge(13, [1, 2, 3, 4].map(cert)), true);
  assert.equal(canChallenge(13, [1, 2, 3].map(cert)), false);
  assert.equal(
    canChallenge(
      16,
      Array.from({ length: 12 }, (_, i) => cert(i + 1)),
    ),
    false,
  );
  assert.equal(canChallenge(16, [13, 14, 15].map(cert)), true);
  assert.equal(canChallenge(17, []), false);
  assert.deepEqual(nextBossTables([cert(13)]), [5, 6, 7, 8]);
  for (const mode of ["practice", "test"])
    assert.equal(award(true, mode, true), 0);
});
test("missed questions return after three intervening answers, not immediately", () => {
  const answers = [
    attempt(9, 9, 0),
    attempt(2, 3),
    attempt(2, 4),
    attempt(2, 5),
  ];
  assert.equal(reviewFact(answers.slice(0, 3)), null);
  assert.deepEqual(reviewFact(answers), { a: 9, b: 9 });
  assert.equal(reviewFact([...answers, attempt(9, 9)]), null);
});
