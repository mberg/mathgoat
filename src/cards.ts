import { ANIMALS } from "./learning";
const names = [
  "The Alarmingly Confident Goat",
  "Tax-Evasion Fox",
  "Panda of Procrastination",
  "Sir Croaks-a-Lot",
  "The Mane Character",
  "Koala-fied Genius",
  "Captain Wrong Stripes",
  "Eight Arms, Zero Chill",
  "Professor Actually",
  "Turbo-ish Turtle",
  "The Drama Moth",
  "Final Boss of Homework",
];
const lines = [
  "Ate the homework. Still got full marks.",
  "Has 12 snacks. Declares 3.",
  "Will solve it. After this nap.",
  "Corrects your maths. Loudly.",
  "Thinks every leaderboard is about him.",
  "Certified in advanced hanging around.",
  "All bite. Surprisingly good at times tables.",
  "Counts on fingers. Has an unfair advantage.",
  "Says “technically” before every sentence.",
  "Arrives eventually. Answers correctly.",
  "Made one mistake. Needs a minute.",
  "Breathes fire. Fears long division.",
];
export const cards = names.map((name, i) => ({
  name,
  line: lines[i],
  emoji: ANIMALS[i],
  table: i + 1,
}));
