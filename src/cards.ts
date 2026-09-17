import pack from "../poppop-cards/cards.json";
const images = import.meta.glob("../poppop-cards/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
export const cards = pack.cards.map((card) => ({
  table: Number(card.id),
  name: card.title,
  stage: card.stage,
  type: card.type,
  image: images[`../poppop-cards/${card.file}`],
  // Add the story for each card here when it is ready.
  story: "",
}));
export const cardFor = (id: number) => cards.find((c) => c.table === id)!;
export const adventureCards = pack.adventureOrder.map((id) =>
  cardFor(Number(id)),
);
export { default as boardImage } from "../poppop-board-kit/adventure-board-empty.png";
export { default as logoImage } from "../poppop-board-kit/poppop-math-logo.png";
export { default as playerImage } from "../poppop-board-kit/poppop-player-token.png";
