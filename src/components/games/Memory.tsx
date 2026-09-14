"use client";

import { useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";

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

function starsFor(moves: number, streakBest: number) {
  if (moves <= 12 && streakBest >= 3) return 3;
  if (moves <= 16) return 2;
  return 1;
}

export function MemoryGame({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState<Card[]>(() => buildDeck());
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [lock, setLock] = useState(false);
  const [toast, setToast] = useState("");

  const won = cards.length > 0 && cards.every((c) => c.matched);

  const reset = () => {
    setCards(buildDeck());
    setPicked([]);
    setMoves(0);
    setStreak(0);
    setBestStreak(0);
    setScore(0);
    setLock(false);
    setToast("Flip pairs. Chain matches for combo points.");
    playTap();
  };

  const flip = (id: number) => {
    if (lock || won) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (picked.includes(id)) return;

    const nextPicked = [...picked, id];
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setPicked(nextPicked);
    beep(420, 0.04, "triangle", 0.03);

    if (nextPicked.length === 2) {
      setLock(true);
      setMoves((m) => m + 1);
      const [a, b] = nextPicked.map((pid) => cards.find((c) => c.id === pid)!);
      const match = a.icon === b.icon;
      window.setTimeout(() => {
        if (match) {
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          setBestStreak((s) => Math.max(s, nextStreak));
          const gain = 100 + nextStreak * 40;
          setScore((s) => s + gain);
          beep(620 + nextStreak * 40, 0.08, "square", 0.05);
          if (nextStreak >= 2) setToast(`COMBO x${nextStreak} · +${gain}`);
          else setToast(`Match · +${gain}`);
        } else {
          setStreak(0);
          playBonk();
          setToast("Miss");
        }
        setCards((prev) => {
          const next = prev.map((c) => {
            if (c.id === a.id || c.id === b.id) {
              return match ? { ...c, matched: true, flipped: true } : { ...c, flipped: false };
            }
            return c;
          });
          if (match && next.every((c) => c.matched)) playWin();
          return next;
        });
        setPicked([]);
        setLock(false);
      }, match ? 240 : 580);
    }
  };

  const stars = starsFor(moves, bestStreak);

  return (
    <GameShell
      title="Matchup"
      accent="var(--sky)"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {score} · {moves} moves{streak > 1 ? ` · x${streak}` : ""}
        </span>
      }
    >
      <div className="relative mx-auto max-w-lg">
        <Confetti show={won} />
        <p className="mb-3 text-center text-sm font-semibold text-ink/70">{toast || "Find the pairs"}</p>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
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
                  background: card.matched ? "var(--mint)" : show ? "#fff" : "var(--sky)",
                  color: show ? "var(--ink)" : "transparent",
                  boxShadow: "3px 3px 0 var(--ink)",
                  transform: card.matched ? "scale(0.96)" : undefined,
                }}
                aria-label={show ? card.icon : "Hidden card"}
              >
                {show ? card.icon : "?"}
              </button>
            );
          })}
        </div>
      </div>

      {won && (
        <div className="mt-6 text-center">
          <p className="mb-2 animate-wiggle text-2xl font-extrabold">
            {"★".repeat(stars)}
            {"☆".repeat(3 - stars)}
          </p>
          <p className="mb-3 font-bold">
            {score} pts in {moves} moves · best streak x{bestStreak}
          </p>
          <button type="button" onClick={reset} className="btn-chunky rounded-md bg-sky px-5 py-2 text-white">
            Shuffle again
          </button>
        </div>
      )}

      {!won && (
        <div className="mt-5 text-center">
          <button type="button" onClick={reset} className="btn-chunky rounded-md bg-paper-2 px-4 py-2 text-sm">
            Reset
          </button>
        </div>
      )}
    </GameShell>
  );
}
