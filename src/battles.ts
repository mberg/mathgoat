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
export function canChallenge(id: number, certs: Certification[]) {
  if (id >= 1 && id <= 12) return true;
  const needed =
    id === 16 ? [13, 14, 15] : regions.find((r) => r.id === id)?.tables;
  return (
    !!needed &&
    needed.every((t) => certs.some((c) => c.table === t && c.passed))
  );
}
export function nextBossTables(certs: Certification[]) {
  return (
    regions.find((r) => !certs.some((c) => c.table === r.id && c.passed))
      ?.tables || finalBoss.tables
  );
}
export function mixedDeck(tables: number[], random = Math.random) {
  const shuffle = <T>(xs: T[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  };
  const order = shuffle([...tables]),
    available = new Map(
      tables.map((a) => [
        a,
        shuffle(Array.from({ length: 12 }, (_, i) => i + 1)),
      ]),
    );
  return shuffle(
    Array.from({ length: 20 }, (_, i) => {
      const a = order[i % order.length];
      return { a, b: available.get(a)!.pop()! };
    }),
  );
}
