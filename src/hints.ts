import { facts, type Attempt } from "./learning";
export type Hint = {
  title: string;
  explanation: string;
  steps: { expression: string; result: number }[];
};
type Strategy = Hint & { needs: [number, number][] };
export function multiplicationHint(
  a: number,
  b: number,
  attempts: Attempt[] = [],
): Hint {
  const candidates: Strategy[] = [];
  const add = (
    title: string,
    explanation: string,
    steps: [string, number][],
    needs: [number, number][] = [],
  ) =>
    candidates.push({
      title,
      explanation,
      steps: steps.map(([expression, result]) => ({ expression, result })),
      needs,
    });
  function strategies(n: number, x: number) {
    switch (n) {
      case 1:
        add("One group stays the same", `One group of ${x} is just ${x}.`, [
          [`1 × ${x}`, x],
        ]);
        break;
      case 2:
        add("Double it", `Two groups of ${x} means ${x} plus ${x}.`, [
          [`${x} + ${x}`, 2 * x],
        ]);
        break;
      case 3:
        add(
          "Double, then add one more",
          `Start with two groups of ${x}, then add another ${x}.`,
          [
            [`2 × ${x}`, 2 * x],
            [`${2 * x} + ${x}`, 3 * x],
          ],
          [[2, x]],
        );
        break;
      case 4:
        add(
          "Double twice",
          `Double ${x}, then double the answer.`,
          [
            [`${x} + ${x}`, 2 * x],
            [`${2 * x} + ${2 * x}`, 4 * x],
          ],
          [[2, x]],
        );
        break;
      case 5:
        add(
          "Half of ten groups",
          `Ten groups of ${x} is ${10 * x}. Five groups is half as much.`,
          [
            [`10 × ${x}`, 10 * x],
            [`${10 * x} ÷ 2`, 5 * x],
          ],
          [[10, x]],
        );
        break;
      case 6:
        add(
          "Five groups, plus one",
          `Six groups is five groups of ${x}, plus one more ${x}.`,
          [
            [`5 × ${x}`, 5 * x],
            [`${5 * x} + ${x}`, 6 * x],
          ],
          [[5, x]],
        );
        add(
          "Double three groups",
          `Six groups is twice three groups of ${x}.`,
          [
            [`3 × ${x}`, 3 * x],
            [`${3 * x} + ${3 * x}`, 6 * x],
          ],
          [[3, x]],
        );
        break;
      case 7:
        add(
          "Split seven into five and two",
          `Add five groups of ${x} and two groups of ${x}.`,
          [
            [`5 × ${x}`, 5 * x],
            [`2 × ${x}`, 2 * x],
            [`${5 * x} + ${2 * x}`, 7 * x],
          ],
          [
            [5, x],
            [2, x],
          ],
        );
        add(
          "Six groups, plus one",
          `Start with six groups of ${x}, then add another ${x}.`,
          [
            [`6 × ${x}`, 6 * x],
            [`${6 * x} + ${x}`, 7 * x],
          ],
          [[6, x]],
        );
        break;
      case 8:
        add(
          "Double three times",
          `Double ${x}, double again, then double once more.`,
          [
            [`${x} + ${x}`, 2 * x],
            [`${2 * x} + ${2 * x}`, 4 * x],
            [`${4 * x} + ${4 * x}`, 8 * x],
          ],
          [[2, x]],
        );
        add(
          "Double four groups",
          `Eight groups is twice four groups of ${x}.`,
          [
            [`4 × ${x}`, 4 * x],
            [`${4 * x} + ${4 * x}`, 8 * x],
          ],
          [[4, x]],
        );
        break;
      case 9:
        add(
          "Ten groups, take away one",
          `Ten groups of ${x} is ${10 * x}. Take away one group of ${x} to get nine groups.`,
          [
            [`10 × ${x}`, 10 * x],
            [`${10 * x} − ${x}`, 9 * x],
          ],
          [[10, x]],
        );
        break;
      case 10:
        add("Think in tens", `${x} groups of ten is ${10 * x}.`, [
          [`${x} × 10`, 10 * x],
        ]);
        break;
      case 11:
        add(
          "Ten groups, plus one",
          `Eleven groups is ten groups of ${x}, plus another ${x}.`,
          [
            [`10 × ${x}`, 10 * x],
            [`${10 * x} + ${x}`, 11 * x],
          ],
          [[10, x]],
        );
        break;
      case 12:
        add(
          "Split twelve into ten and two",
          `Add ten groups of ${x} and two groups of ${x}.`,
          [
            [`10 × ${x}`, 10 * x],
            [`2 × ${x}`, 2 * x],
            [`${10 * x} + ${2 * x}`, 12 * x],
          ],
          [
            [10, x],
            [2, x],
          ],
        );
        break;
    }
  }
  strategies(a, b);
  const fs = facts(attempts);
  const score = (s: Strategy) =>
    s.needs.length
      ? s.needs.reduce((sum, [n, x]) => {
          const f = fs.find((f) => f.a === n && f.b === x)!;
          return sum + (f.count >= 3 ? f.accuracy : 0);
        }, 0) / s.needs.length
      : 1;
  const best = candidates.reduce((best, s) =>
    score(s) > score(best) ? s : best,
  );
  const { needs, ...hint } = best;
  return hint;
}
