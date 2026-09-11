"use client";

import { useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

export function HigherLowerGame({ onBack }: { onBack: () => void }) {
  const [card, setCard] = useState(() => 2 + randInt(13));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  const face = (n: number) => {
    if (n === 11) return "J";
    if (n === 12) return "Q";
    if (n === 13) return "K";
    if (n === 14) return "A";
    return String(n);
  };

  const pick = (dir: "higher" | "lower") => {
    if (over) return;
    playTap();
    let next = 2 + randInt(13);
    // avoid identical for clarity most of the time
    if (next === card && randInt(3) !== 0) next = ((card - 2 + 1 + randInt(12)) % 13) + 2;
    setFlash(next > card ? "up" : next < card ? "down" : null);
    const ok =
      (dir === "higher" && next > card) ||
      (dir === "lower" && next < card) ||
      next === card;
    setCard(next);
    if (ok) {
      const s = score + 1;
      setScore(s);
      setBest((b) => Math.max(b, s));
      if (s > 0 && s % 5 === 0) playWin();
    } else {
      playBonk();
      setOver(true);
    }
  };

  const reset = () => {
    setCard(2 + randInt(13));
    setScore(0);
    setOver(false);
    setFlash(null);
  };

  return (
    <GameShell
      title="Higher?"
      accent="#22d3ee"
      onBack={onBack}
      stats={
        <span>
          {score} · best {best}
        </span>
      }
    >
      <div className="relative text-center">
        <Confetti show={score > 0 && score % 8 === 0 && !over} />
        <div
          className="chunky mx-auto mb-4 flex h-40 w-28 items-center justify-center rounded-xl bg-white font-[family-name:var(--font-display)] text-5xl"
          style={{ color: flash === "up" ? "#16a34a" : flash === "down" ? "#dc2626" : "var(--ink)" }}
        >
          {face(card)}
        </div>
        <p className="mb-5 font-bold">
          {over ? `Streak ended at ${score}.` : "Will the next card be higher or lower?"}
        </p>
        {!over ? (
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => pick("lower")}
              className="btn-chunky rounded-md bg-[#fda4af] px-5 py-3"
            >
              Lower ↓
            </button>
            <button
              type="button"
              onClick={() => pick("higher")}
              className="btn-chunky rounded-md bg-[#86efac] px-5 py-3"
            >
              Higher ↑
            </button>
          </div>
        ) : (
          <button type="button" onClick={reset} className="btn-chunky rounded-md bg-[#22d3ee] px-5 py-2">
            Again
          </button>
        )}
      </div>
    </GameShell>
  );
}
