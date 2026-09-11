"use client";

import { useEffect, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Orb = { id: number; x: number; y: number; vy: number; emoji: string };

const EMOJIS = ["☄️", "🪨", "😈", "💀", "🧨"];

export function DodgeGame({ onBack }: { onBack: () => void }) {
  const [x, setX] = useState(50);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (!running) return;
    let id = 0;
    const spawn = window.setInterval(() => {
      setOrbs((o) => [
        ...o,
        {
          id: ++id,
          x: 8 + randInt(84),
          y: -10,
          vy: 1.6 + Math.random() * 1.8 + score * 0.02,
          emoji: EMOJIS[randInt(EMOJIS.length)],
        },
      ]);
    }, 420);
    const tick = window.setInterval(() => {
      setOrbs((prev) => {
        const next = prev
          .map((o) => ({ ...o, y: o.y + o.vy }))
          .filter((o) => o.y < 110);
        for (const o of next) {
          if (Math.abs(o.x - x) < 7 && o.y > 78 && o.y < 92) {
            setDead(true);
            setRunning(false);
            setBest((b) => Math.max(b, score));
            playBonk();
            return [];
          }
        }
        return next;
      });
      setScore((s) => s + 1);
    }, 50);
    return () => {
      window.clearInterval(spawn);
      window.clearInterval(tick);
    };
  }, [running, x, score]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") setX((v) => Math.max(6, v - 4));
      if (e.key === "ArrowRight" || e.key === "d") setX((v) => Math.min(94, v + 4));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  const start = () => {
    setOrbs([]);
    setScore(0);
    setX(50);
    setDead(false);
    setRunning(true);
    playTap();
  };

  useEffect(() => {
    if (running && score > 0 && score % 100 === 0) playWin();
  }, [score, running]);

  return (
    <GameShell
      title="Dodge"
      accent="#fb7185"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {score} · best {best}
        </span>
      }
    >
      <div className="relative">
        <Confetti show={score >= 200 && !dead && !running} />
        <div
          className="chunky relative mx-auto h-80 w-full max-w-md overflow-hidden rounded-xl bg-[#1e1b2e]"
          onPointerMove={(e) => {
            if (!running) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setX(Math.max(6, Math.min(94, pct)));
          }}
        >
          {orbs.map((o) => (
            <span
              key={o.id}
              className="absolute text-2xl"
              style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%, -50%)" }}
            >
              {o.emoji}
            </span>
          ))}
          <span
            className="absolute text-3xl"
            style={{ left: `${x}%`, top: "85%", transform: "translate(-50%, -50%)" }}
          >
            🛹
          </span>
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/90 p-4 text-center">
              <p className="mb-3 font-bold">
                {dead ? `Wiped out at ${score}` : "Slide to dodge falling chaos."}
              </p>
              <button type="button" onClick={start} className="btn-chunky rounded-md bg-[#fb7185] px-5 py-2 text-white">
                {dead ? "Retry" : "Survive"}
              </button>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
