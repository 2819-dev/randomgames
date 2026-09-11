"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Mole = { x: number; y: number; id: number };

export function CatchGame({ onBack }: { onBack: () => void }) {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(20);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [done, setDone] = useState(false);
  const idRef = useRef(0);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const clock = window.setInterval(() => {
      const rem = Math.max(0, 20_000 - (Date.now() - start));
      setLeft(Math.ceil(rem / 1000));
      if (rem <= 0) {
        window.clearInterval(clock);
        setRunning(false);
        setDone(true);
        setMoles([]);
        if (scoreRef.current >= 15) playWin();
        else playBonk();
      }
    }, 200);

    const spawn = window.setInterval(() => {
      const id = ++idRef.current;
      const mole = { id, x: 8 + randInt(84), y: 8 + randInt(74) };
      setMoles((m) => [...m.slice(-4), mole]);
      window.setTimeout(() => {
        setMoles((m) => m.filter((x) => x.id !== id));
      }, 900 + randInt(500));
    }, 420);

    return () => {
      window.clearInterval(clock);
      window.clearInterval(spawn);
    };
  }, [running]);

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setLeft(20);
    setDone(false);
    setMoles([]);
    setRunning(true);
  };

  const catchOne = (id: number) => {
    if (!running) return;
    playTap();
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setMoles((m) => m.filter((x) => x.id !== id));
  };

  return (
    <GameShell
      title="Catch!"
      accent="#f43f5e"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {score} · {left}s
        </span>
      }
    >
      <div className="relative">
        <Confetti show={done && score >= 15} />
        <div
          className="chunky relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-xl bg-[#1e1b2e] sm:h-80"
        >
          {moles.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => catchOne(m.id)}
              className="absolute text-3xl transition-transform hover:scale-110 active:scale-90"
              style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)" }}
              aria-label="Catch"
            >
              {["👾", "⭐", "🍩", "🎯", "🐸"][m.id % 5]}
            </button>
          ))}
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/90 p-4 text-center">
              <p className="mb-3 font-bold">
                {done ? `Caught ${score}!` : "Tap the floating things. 20 seconds. Go wild."}
              </p>
              <button type="button" onClick={start} className="btn-chunky rounded-md bg-[#f43f5e] px-5 py-2 text-white">
                {done ? "Again" : "Start"}
              </button>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
