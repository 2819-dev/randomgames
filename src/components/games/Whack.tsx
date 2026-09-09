"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { beep, playBonk, playWin } from "@/lib/sfx";
import { pick, randInt } from "@/lib/random";

const CRITTERS = ["🐹", "🐰", "🐸", "🐥", "🦊"];
const HOLES = 9;
const DURATION = 30_000;

export function WhackGame({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<number | null>(null);
  const [face, setFace] = useState("🐹");
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(30);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const scoreRef = useRef(0);
  const activeRef = useRef<number | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const tick = window.setInterval(() => {
      const remain = Math.max(0, DURATION - (Date.now() - start));
      setLeft(Math.ceil(remain / 1000));
      if (remain <= 0) {
        window.clearInterval(tick);
        setRunning(false);
        setDone(true);
        setActive(null);
        if (scoreRef.current >= 12) playWin();
        else playBonk();
      }
    }, 200);

    let spawnTimer: number;
    const spawn = () => {
      const hole = randInt(HOLES);
      setFace(pick(CRITTERS));
      setActive(hole);
      const up = 550 + randInt(350);
      spawnTimer = window.setTimeout(() => {
        setActive(null);
        spawnTimer = window.setTimeout(spawn, 180 + randInt(280));
      }, up);
    };
    spawn();

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(spawnTimer);
    };
  }, [running]);

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setLeft(30);
    setDone(false);
    setRunning(true);
  };

  const whack = (i: number) => {
    if (!running || activeRef.current !== i) return;
    beep(880, 0.06, "triangle", 0.05);
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setActive(null);
  };

  return (
    <GameShell
      title="Whack"
      accent="#ff8c42"
      onBack={onBack}
      stats={
        <span>
          {score} · {left}s
        </span>
      }
    >
      <div className="relative">
        <Confetti show={done && score >= 12} />
        <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
          {Array.from({ length: HOLES }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => whack(i)}
              className="relative flex aspect-square items-end justify-center overflow-hidden rounded-xl border-[3px] border-ink bg-[#6b4f2a]"
              style={{ boxShadow: "3px 3px 0 var(--ink)" }}
              aria-label={active === i ? "Whack critter" : "Empty hole"}
            >
              <span className="absolute bottom-1 h-5 w-4/5 rounded-full bg-[#3d2a14]" />
              <span
                className={`absolute text-4xl transition-transform duration-150 sm:text-5xl ${
                  active === i ? "translate-y-0" : "translate-y-[120%]"
                }`}
              >
                {face}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 text-center">
          {!running && (
            <>
              <p className="mb-3 font-bold">
                {done ? `Time! You bonked ${score} critters.` : "30 seconds. Smash responsibly."}
              </p>
              <button type="button" onClick={start} className="btn-chunky rounded-md bg-[#ff8c42] px-5 py-2">
                {done ? "Rematch" : "Start whacking"}
              </button>
            </>
          )}
        </div>
      </div>
    </GameShell>
  );
}
