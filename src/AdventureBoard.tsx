import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import layout from "../poppop-board-kit/board-layout.json";
import { boardImage, cardFor, logoImage, playerImage } from "./cards";
import {
  canChallenge,
  hasPassed,
  nextBattle,
  JOURNEY_ORDER,
  type Certification,
} from "./battles";
export function AdventureBoard({
  certifications,
  onChallenge,
  readOnly = false,
}: {
  certifications: Certification[];
  onChallenge: (id: number) => void;
  readOnly?: boolean;
}) {
  const current = nextBattle(certifications),
    [selected, setSelected] = useState(current ?? 16),
    scroll = useRef<HTMLDivElement>(null);
  function centerStop(id: number) {
    const node = layout.nodes.find((n) => Number(n.cardId) === id),
      el = scroll.current;
    if (node && el)
      el.scrollTo({
        left: (el.scrollWidth * node.xPercent) / 100 - el.clientWidth / 2,
        behavior: "instant",
      });
  }
  useEffect(() => {
    setSelected(current ?? 16);
  }, [current]);
  useEffect(() => {
    centerStop(selected);
    const observer = new ResizeObserver(() => centerStop(selected));
    if (scroll.current) observer.observe(scroll.current);
    return () => observer.disconnect();
  }, [selected]);
  const reward = cardFor(selected),
    passed = hasPassed(selected, certifications),
    available = canChallenge(selected, certifications),
    completed = JOURNEY_ORDER.filter((id) =>
      hasPassed(id, certifications),
    ).length;
  const previous = JOURNEY_ORDER[JOURNEY_ORDER.indexOf(selected) - 1];
  const currentNode = layout.nodes.find(
    (n) => Number(n.cardId) === (current ?? 16),
  )!;
  return (
    <section className="adventure-section" aria-label="Adventure board">
      <div className="board-heading">
        <div>
          <span className="eyebrow">
            FOLLOW THE RIVER. FIND YOUR NEXT CHALLENGE.
          </span>
          <h2>Your PopPop adventure</h2>
        </div>
        <span className="journey-count">
          {completed} <small>/ 16 stops cleared</small>
        </span>
      </div>
      <div
        className="board-progress"
        aria-label={`${completed} of 16 stops cleared`}
      >
        {JOURNEY_ORDER.map((id) => (
          <span
            key={id}
            className={
              hasPassed(id, certifications)
                ? "cleared"
                : id === current
                  ? "current"
                  : ""
            }
          />
        ))}
      </div>
      <div
        className="board-scroll"
        ref={scroll}
        tabIndex={0}
        aria-label="Adventure map; scroll sideways on smaller screens"
      >
        <div className="board-map">
          <img
            className="board-art"
            src={boardImage}
            alt="A winding trail through PopPop’s riverside adventure, from camp to the final fortress"
            fetchPriority="high"
            width={layout.width}
            height={layout.height}
          />
          {layout.nodes.map((n) => {
            const id = Number(n.cardId),
              done = hasPassed(id, certifications),
              open = canChallenge(id, certifications),
              fluent = certifications.some((c) => c.table === id && c.fluent);
            return (
              <button
                key={id}
                data-battle={id}
                className={`board-stop ${done ? "cleared" : open ? "available" : "locked"} ${id === selected ? "selected" : ""} ${n.type}`}
                style={{
                  left: `${n.xPercent}%`,
                  top: `${n.yPercent}%`,
                  width: `${layout.nodeInnerDiameterPercentOfWidth}%`,
                }}
                aria-label={`${n.label}: ${n.title} — ${done ? "Cleared" : open ? "Available" : "Locked"}`}
                aria-pressed={id === selected}
                onClick={() => {
                  setSelected(id);
                  if (open && !done && !readOnly) onChallenge(id);
                }}
              >
                {done ? (
                  <>
                    <img src={cardFor(id).image} alt="" loading="lazy" />
                    <span className="stop-check">
                      <Check size={14} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="stop-number">
                      {id <= 12
                        ? `×${id}`
                        : id === 16
                          ? "FINAL"
                          : id === 13
                            ? "1–4"
                            : id === 14
                              ? "5–8"
                              : "9–12"}
                    </span>
                    {!open ? (
                      <Lock className="stop-lock" size={12} />
                    ) : (
                      <span className="stop-go">GO</span>
                    )}
                  </>
                )}
                {fluent && (
                  <span className="stop-fluent" title="Fluency badge">
                    ⚡
                  </span>
                )}
              </button>
            );
          })}
          <img
            className="board-player"
            src={playerImage}
            alt={
              current
                ? "PopPop is at your next challenge"
                : "PopPop has completed the adventure"
            }
            style={{
              left: `${currentNode.xPercent + 3.4}%`,
              top: `${currentNode.yPercent - 10}%`,
            }}
          />
        </div>
      </div>
      <div className="board-legend">
        <span>
          <i className="legend-current" /> Next challenge
        </span>
        <span>
          <Check size={13} /> Cleared
        </span>
        <span>
          <Lock size={12} /> Beat the earlier stops
        </span>
        <small>Swipe the map to explore →</small>
      </div>
      <div className="board-detail" aria-live="polite">
        <div className={"board-reward " + (passed ? "earned" : "")}>
          <img
            src={passed ? reward.image : logoImage}
            alt={passed ? reward.name : "PopPop Math reward card"}
            loading="lazy"
          />
          {!passed && <Lock size={18} />}
        </div>
        <div className="board-detail-copy">
          <span className="eyebrow">
            {reward.stage} ·{" "}
            {passed
              ? "CARD COLLECTED"
              : available
                ? "YOUR NEXT STOP"
                : "UP AHEAD"}
          </span>
          <h3>{reward.name}</h3>
          <p>
            {!available
              ? `First beat ${cardFor(previous).name} and the earlier stops.`
              : selected === 16
                ? "A mix of all 12 tables. Win to complete the adventure."
                : selected <= 12
                  ? `Take on the ${selected}s. Get 18 of 20 right to earn this card.`
                  : `Mix tables ${selected === 13 ? "1–4" : selected === 14 ? "5–8" : "9–12"}. Get 18 of 20 right to cross into the next chapter.`}
          </p>
          {reward.story && <p>{reward.story}</p>}
        </div>
        <button
          className="primary"
          disabled={!available || readOnly}
          onClick={() => onChallenge(selected)}
        >
          {readOnly
            ? "Sign in as a child"
            : !available
              ? "Locked"
              : passed
                ? "Play again"
                : "Start battle"}
          {available ? <ArrowRight size={17} /> : <Lock size={16} />}
        </button>
      </div>
    </section>
  );
}
