import { test } from "node:test";
import assert from "node:assert/strict";
import {
  facts,
  chooseFact,
  award,
  unlockedTables,
  type Attempt,
} from "../src/learning.ts";
const history = (n = 10): Attempt[] =>
  Array.from({ length: n }, (_, i) => ({
    a: 1,
    b: 2,
    correct: 1,
    elapsed_ms: 3000,
    round_id: String(i % 3),
    points: 10,
    answered_at: String(i),
  }));
test("mastery requires enough evidence across sessions, accuracy, and speed", () => {
  assert.equal(
    facts(history()).find((f) => f.a === 1 && f.b === 2)?.mastered,
    true,
  );
  for (const attempts of [
    history(9),
    history().map((a) => ({ ...a, round_id: "one" })),
    history().map((a) => ({ ...a, elapsed_ms: 7000 })),
    history().map((a, i) => ({ ...a, correct: i < 2 ? 0 : 1 })),
  ])
    assert.equal(
      facts(attempts).find((f) => f.a === 1 && f.b === 2)?.mastered,
      false,
    );
  assert.equal(
    facts(history().map((a, i) => ({ ...a, correct: i === 0 ? 0 : 1 }))).find(
      (f) => f.a === 1 && f.b === 2,
    )?.mastered,
    true,
  );
});
test("recent mistakes can remove mastery", () => {
  assert.equal(
    facts([
      ...history(),
      ...history(4).map((a) => ({ ...a, correct: 0 })),
    ]).find((f) => f.a === 1 && f.b === 2)?.mastered,
    false,
  );
});
test("only quests award points; bonuses double and mistakes never penalize", () => {
  assert.equal(award(true, "quest", false), 10);
  assert.equal(award(true, "practice", false), 0);
  assert.equal(award(true, "quest", true), 20);
  assert.equal(award(false, "quest", true), 0);
});
test("new learners begin at 1 and 2 and practice permits every table", () => {
  assert.deepEqual(unlockedTables(facts([])), [1, 2]);
  for (let i = 0; i < 100; i++) {
    assert.ok([1, 2].includes(chooseFact([], null).a));
    assert.equal(chooseFact([], 12).a, 12);
  }
});
test("struggle selection favors weak facts and excludes immediate repeats", () => {
  const a = history().map((a) => ({ ...a, correct: 0 }));
  assert.equal(chooseFact(a, null, undefined, () => 0.1).b, 2);
  const chosen = chooseFact(a, null, { a: 1, b: 2 }, () => 0.1);
  assert.notDeepEqual({ a: chosen.a, b: chosen.b }, { a: 1, b: 2 });
});
test("next tables unlock with demonstrated progress", () => {
  const attempts = Array.from({ length: 72 }, (_, i) => ({
    ...history(1)[0],
    a: Math.floor(i / 36) + 1,
    b: (Math.floor(i / 3) % 12) + 1,
  }));
  assert.deepEqual(unlockedTables(facts(attempts)), [1, 2, 5]);
});
import { examDeck, examResult } from "../src/learning.ts";
test("exam includes all 12 multipliers, with 20 questions and at most two appearances", () => {
  for (let i = 0; i < 30; i++) {
    const deck = examDeck();
    assert.equal(deck.length, 20);
    assert.equal(new Set(deck).size, 12);
    assert.ok(deck.every((n) => deck.filter((x) => x === n).length <= 2));
  }
});
test("exam passing is separate from fluency and demands completion", () => {
  const answers = Array.from({ length: 20 }, (_, i) => ({
    correct: i < 18 ? 1 : 0,
    elapsed_ms: 8000,
  }));
  assert.equal(examResult(answers).passed, true);
  assert.equal(examResult(answers).fluent, false);
  assert.equal(
    examResult(answers.map((a) => ({ ...a, elapsed_ms: 5000 }))).fluent,
    true,
  );
  assert.equal(examResult(answers.slice(0, 19)).passed, false);
  assert.equal(
    examResult(answers.map((a, i) => ({ ...a, correct: i < 17 ? 1 : 0 })))
      .passed,
    false,
  );
  assert.equal(award(true, "test", false), 0);
});
