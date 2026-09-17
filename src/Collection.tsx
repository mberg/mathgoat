import { useEffect, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { adventureCards, cardFor, logoImage } from "./cards";
import { hasPassed, type Certification } from "./battles";
export function Collection({
  certifications,
  earnedOnly = false,
}: {
  certifications: Certification[];
  earnedOnly?: boolean;
}) {
  const [opened, setOpened] = useState<number | null>(null);
  return (
    <>
      <div className="reward-collection">
        {adventureCards
          .filter(
            (card) => !earnedOnly || hasPassed(card.table, certifications),
          )
          .map((card) => {
            const earned = hasPassed(card.table, certifications),
              fluent = certifications.some(
                (c) => c.table === card.table && c.fluent,
              );
            return (
              <article
                className={"reward-card " + (earned ? "earned" : "unearned")}
                key={card.table}
              >
                <button
                  className="reward-art"
                  disabled={!earned}
                  aria-label={`View card: ${card.name}`}
                  onClick={() => setOpened(card.table)}
                >
                  {earned ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      loading="lazy"
                      width={1024}
                      height={1536}
                    />
                  ) : (
                    <div className="card-back">
                      <img src={logoImage} alt="PopPop Math" loading="lazy" />
                      <Lock size={24} />
                      <span>{card.stage}</span>
                    </div>
                  )}
                </button>
                <div className="reward-info">
                  <span className="eyebrow">
                    {card.stage} · {earned ? "COLLECTED" : "TO DISCOVER"}
                  </span>
                  <h2>{card.name}</h2>
                  <p>
                    {earned
                      ? fluent
                        ? "⚡ Fluent · Tap to see your card"
                        : "Tap to see your card"
                      : "Win this stop on the board to collect."}
                  </p>
                </div>
              </article>
            );
          })}
      </div>
      {opened !== null && (
        <CardDialog id={opened} onClose={() => setOpened(null)} />
      )}
    </>
  );
}
function CardDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null),
    card = cardFor(id);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="card-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      aria-label={card.name}
    >
      <button
        className="dialog-close"
        aria-label="Close card"
        onClick={() => ref.current?.close()}
      >
        <X size={21} />
      </button>
      <img src={card.image} alt={card.name} />
      {card.story && <p>{card.story}</p>}
    </dialog>
  );
}
