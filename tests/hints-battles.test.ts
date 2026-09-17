import { test } from "node:test";
import assert from "node:assert/strict";
import { multiplicationHint } from "../src/hints.ts";
import {
  mixedDeck,
  canChallenge,
  nextBossTables,
  JOURNEY_ORDER,
  nextBattle,
  adventureComplete,
} from "../src/battles.ts";
import { reviewFact, type Attempt, award, examDeck } from "../src/learning.ts";
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
test("every boss requires all preceding board stops; old earned cards cannot skip gaps", () => {
  const cert = (table: number) => ({ table, passed: true, fluent: false });
  for (let i = 0; i < JOURNEY_ORDER.length; i++) {
    const certs = JOURNEY_ORDER.slice(0, i).map(cert);
    assert.equal(nextBattle(certs), JOURNEY_ORDER[i]);
    assert.equal(canChallenge(JOURNEY_ORDER[i], certs), true);
    for (const locked of JOURNEY_ORDER.slice(i + 1))
      assert.equal(canChallenge(locked, certs), false);
  }
  assert.equal(canChallenge(12, []), false);
  assert.equal(canChallenge(5, [1, 2, 3, 4].map(cert)), false);
  assert.equal(canChallenge(5, [1, 2, 3, 4, 13].map(cert)), true);
  assert.equal(canChallenge(16, [13, 14, 15].map(cert)), false);
  assert.equal(nextBattle([cert(3), cert(16)]), 1);
  assert.equal(adventureComplete([cert(16)]), false);
  assert.equal(adventureComplete(JOURNEY_ORDER.map(cert)), true);
  assert.equal(canChallenge(17, []), false);
  assert.deepEqual(nextBossTables([1, 2, 3, 4].map(cert)), [1, 2, 3, 4]);
  assert.deepEqual(nextBossTables([1, 2, 3, 4, 13].map(cert)), [5]);
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

test("bosses revisit weak facts while covering every table", () => {
  const history = [attempt(3, 7, 0), { ...attempt(3, 9), elapsed_ms: 9000 }];
  for (let i = 0; i < 30; i++) {
    const deck = examDeck(Math.random, history, 3);
    assert.equal(deck.filter((b) => b === 7).length, 2);
    assert.equal(deck.filter((b) => b === 9).length, 2);
    assert.equal(new Set(deck).size, 12);
    const regional = mixedDeck([1, 2, 3, 4], Math.random, history);
    assert.ok(regional.some((q) => q.a === 3 && q.b === 7));
    assert.ok(regional.some((q) => q.a === 3 && q.b === 9));
    const final = mixedDeck(
      Array.from({ length: 12 }, (_, n) => n + 1),
      Math.random,
      history,
    );
    assert.ok(final.some((q) => q.a === 3 && q.b === 7));
    assert.equal(new Set(final.map((q) => q.a)).size, 12);
  }
});

test("bosses begin with three gentler questions without losing coverage", () => {
  for (let i = 0; i < 30; i++) {
    assert.deepEqual(examDeck().slice(0, 3), [1, 2, 5]);
    const history = [attempt(7, 8), attempt(7, 1, 0)];
    const single = examDeck(Math.random, history, 7);
    assert.equal(single[0], 8);
    assert.ok(!single.slice(0, 3).includes(1));
    for (const tables of [
      [1, 2, 3, 4],
      Array.from({ length: 12 }, (_, n) => n + 1),
    ]) {
      const deck = mixedDeck(tables);
      assert.equal(deck.length, 20);
      assert.ok(deck.slice(0, 3).every((q) => [1, 2, 5, 10].includes(q.b)));
      assert.equal(new Set(deck.map((q) => q.a)).size, tables.length);
    }
  }
});
