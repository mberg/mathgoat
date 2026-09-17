import { facts, weakness, warmupDifficulty, type Attempt } from "./learning";
export type Certification = { table: number; passed: boolean; fluent: boolean };
export const regions = [
  { id: 13, name: "Regional boss: 1–4", tables: [1, 2, 3, 4], emoji: "🏔️" },
  { id: 14, name: "Regional boss: 5–8", tables: [5, 6, 7, 8], emoji: "🌋" },
  { id: 15, name: "Regional boss: 9–12", tables: [9, 10, 11, 12], emoji: "🏰" },
];
export const finalBoss = {
  id: 16,
  name: "The final boss",
  tables: Array.from({ length: 12 }, (_, i) => i + 1),
  emoji: "👑",
};
export const specialBattles = [...regions, finalBoss];
export const JOURNEY_ORDER = [
  1, 2, 3, 4, 13, 5, 6, 7, 8, 14, 9, 10, 11, 12, 15, 16,
];
export function hasPassed(id: number, certs: Certification[]) {
  return certs.some((c) => c.table === id && c.passed);
}
export function canChallenge(id: number, certs: Certification[]) {
  const index = JOURNEY_ORDER.indexOf(id);
  return (
    index >= 0 &&
    JOURNEY_ORDER.slice(0, index).every((id) => hasPassed(id, certs))
  );
}
export function nextBattle(certs: Certification[]) {
  return JOURNEY_ORDER.find((id) => !hasPassed(id, certs)) ?? null;
}
export function nextBossTables(certs: Certification[]) {
  const next = nextBattle(certs);
  return next === null
    ? finalBoss.tables
    : next <= 12
      ? [next]
      : specialBattles.find((b) => b.id === next)!.tables;
}
export function adventureComplete(certs: Certification[]) {
  return nextBattle(certs) === null;
}
export function mixedDeck(
  tables: number[],
  random = Math.random,
  attempts: Attempt[] = [],
) {
  const shuffle = <T>(xs: T[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  };
  const fs = facts(attempts);
  const order = shuffle([...tables]),
    available = new Map(
      tables.map((a) => [
        a,
        shuffle(Array.from({ length: 12 }, (_, i) => i + 1)).sort(
          (b, c) =>
            weakness(fs[(a - 1) * 12 + c - 1]) -
            weakness(fs[(a - 1) * 12 + b - 1]),
        ),
      ]),
    );
  const deck = Array.from({ length: 20 }, (_, i) => {
    const a = order[i % order.length],
      choices = available.get(a)!;
    const b =
      i < 3
        ? [...choices].sort(
            (b, c) =>
              warmupDifficulty(fs[(a - 1) * 12 + b - 1]) -
              warmupDifficulty(fs[(a - 1) * 12 + c - 1]),
          )[0]
        : choices[0];
    choices.splice(choices.indexOf(b), 1);
    return { a, b };
  });
  return [...deck.slice(0, 3), ...shuffle(deck.slice(3))];
}
