"use client";

import { useState } from "react";
import { GameShell } from "@/components/GameShell";

const ICONS = ["🦊", "🐸", "🐯", "🦄", "🐙", "🐼", "🐧", "🐰"];

type Card = { id: number; icon: string; flipped: boolean; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): Card[] {
  const pairs = ICONS.flatMap((icon, i) => [
    { id: i * 2, icon, flipped: false, matched: false },
    { id: i * 2 + 1, icon, flipped: false, matched: false },
  ]);
  return shuffle(pairs);
}

export function MemoryGame({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState<Card[]>(() => buildDeck());
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);

  const won = cards.length > 0 && cards.every((c) => c.matched);

  const reset = () => {
    setCards(buildDeck());
    setPicked([]);
    setMoves(0);
    setLock(false);
  };

  const flip = (id: number) => {
    if (lock || won) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (picked.includes(id)) return;

    const nextPicked = [...picked, id];
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)),
    );
    setPicked(nextPicked);

    if (nextPicked.length === 2) {
      setLock(true);
      setMoves((m) => m + 1);
      const [a, b] = nextPicked.map((pid) => cards.find((c) => c.id === pid)!);
      const match = a.icon === b.icon;
      window.setTimeout(() => {
        setCards((prev) =>
          prev.map((c) => {
            if (c.id === a.id || c.id === b.id) {
              return match
                ? { ...c, matched: true, flipped: true }
                : { ...c, flipped: false };
            }
            return c;
          }),
        );
        setPicked([]);
        setLock(false);
      }, match ? 280 : 650);
    }
  };

  return (
    <GameShell
      title="Matchup"
      accent="var(--sky)"
      ink="#fff"
      onBack={onBack}
      stats={<span>Moves {moves}</span>}
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, i) => {
          const show = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card.id)}
              className="animate-pop-in aspect-square rounded-lg border-[3px] border-ink text-3xl transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 sm:text-4xl"
              style={{
                animationDelay: `${i * 25}ms`,
                background: card.matched
                  ? "var(--mint)"
                  : show
                    ? "#fff"
                    : "var(--sky)",
                color: show ? "var(--ink)" : "transparent",
                boxShadow: "3px 3px 0 var(--ink)",
              }}
              aria-label={show ? card.icon : "Hidden card"}
            >
              {show ? card.icon : "?"}
            </button>
          );
        })}
      </div>

      {won && (
        <div className="mt-6 text-center">
          <p className="mb-3 animate-wiggle font-bold">
            Cleared in {moves} moves. Nice brain.
          </p>
          <button
            type="button"
            onClick={reset}
            className="btn-chunky rounded-md bg-sky px-5 py-2 text-white"
          >
            Shuffle again
          </button>
        </div>
      )}

      {!won && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={reset}
            className="btn-chunky rounded-md bg-paper-2 px-4 py-2 text-sm"
          >
            Reset
          </button>
        </div>
      )}
    </GameShell>
  );
}
