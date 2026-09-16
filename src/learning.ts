export type Attempt = {
  a: number;
  b: number;
  correct: number;
  elapsed_ms: number;
  round_id: string;
  points: number;
  answered_at: string;
};
export type Fact = {
  a: number;
  b: number;
  count: number;
  accuracy: number;
  median: number;
  mastered: boolean;
};
export const TABLE_ORDER = [1, 2, 5, 10, 3, 4, 6, 7, 8, 9, 11, 12];
export function facts(attempts: Attempt[]): Fact[] {
  return Array.from({ length: 144 }, (_, i) => {
    const a = Math.floor(i / 12) + 1,
      b = (i % 12) + 1,
      all = attempts.filter((x) => x.a === a && x.b === b),
      recent = all.slice(-10);
    const times = recent
      .filter((x) => x.correct)
      .map((x) => x.elapsed_ms)
      .sort((x, y) => x - y);
    const median = times.length
      ? (times[Math.floor((times.length - 1) / 2)] +
          times[Math.floor(times.length / 2)]) /
        2
      : 0;
    const accuracy = recent.length
      ? recent.filter((x) => x.correct).length / recent.length
      : 0;
    return {
      a,
      b,
      count: all.length,
      accuracy,
      median,
      mastered:
        recent.length === 10 &&
        accuracy >= 0.9 &&
        new Set(recent.map((x) => x.round_id)).size >= 3 &&
        median <= 6000,
    };
  });
}
export function unlockedTables(fs: Fact[]) {
  let count = 2;
  while (
    count < 12 &&
    fs
      .filter((f) => TABLE_ORDER.slice(0, count).includes(f.a))
      .filter((f) => f.count >= 3 && f.accuracy >= 0.8).length >=
      count * 12 * 0.7
  )
    count++;
  return TABLE_ORDER.slice(0, count);
}
export function chooseFact(
  attempts: Attempt[],
  table: number | null,
  last?: { a: number; b: number },
  random = Math.random,
  targetTables: number[] = [],
) {
  const fs = facts(attempts),
    unlocked = unlockedTables(fs);
  let pool = fs.filter((f) => (table ? f.a === table : unlocked.includes(f.a)));
  if (last) pool = pool.filter((f) => f.a !== last.a || f.b !== last.b);
  const roll = random();
  const category =
    roll < 0.5
      ? pool.filter((f) => f.count > 0 && (f.accuracy < 0.9 || f.median > 6000))
      : roll < 0.75
        ? pool.filter((f) => !f.count)
        : pool.filter((f) => f.count > 0 && f.accuracy >= 0.9);
  if (category.length) pool = category;
  const weighted = pool.flatMap((f) =>
    targetTables.includes(f.a) ? [f, f, f] : [f],
  );
  return weighted[
    Math.min(weighted.length - 1, Math.floor(random() * weighted.length))
  ];
}
export function award(correct: boolean, mode: string, bonus: boolean) {
  return correct && mode === "quest" ? 10 * (bonus ? 2 : 1) : 0;
}
export const ANIMALS = [
  "🐐",
  "🦊",
  "🐼",
  "🐸",
  "🦁",
  "🐨",
  "🐯",
  "🐙",
  "🦉",
  "🐢",
  "🦋",
  "🐉",
];
// A balanced exam covers every multiplier before repeating eight of them.
export function examDeck(random = Math.random) {
  const shuffle = (items: number[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const all = Array.from({ length: 12 }, (_, i) => i + 1);
  return shuffle([...all, ...shuffle([...all]).slice(0, 8)]);
}
export function examResult(
  attempts: Pick<Attempt, "correct" | "elapsed_ms">[],
) {
  const correct = attempts.filter((a) => a.correct),
    times = correct.map((a) => a.elapsed_ms).sort((a, b) => a - b);
  const median = times.length
    ? (times[Math.floor((times.length - 1) / 2)] +
        times[Math.floor(times.length / 2)]) /
      2
    : 0;
  return {
    passed: attempts.length === 20 && correct.length >= 18,
    fluent: attempts.length === 20 && correct.length >= 18 && median <= 6000,
    correct: correct.length,
    median,
  };
}

// Give a missed fact another try after three intervening answers, without its hint.
export function reviewFact(attempts: Attempt[]) {
  for (let i = Math.max(0, attempts.length - 7); i < attempts.length - 3; i++) {
    const missed = attempts[i];
    if (
      !missed.correct &&
      !attempts.slice(i + 1).some((a) => a.a === missed.a && a.b === missed.b)
    )
      return { a: missed.a, b: missed.b };
  }
  return null;
}
