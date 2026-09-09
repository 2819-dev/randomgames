"use client";

import { useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { beep, playBonk, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

const COLORS = [
  { idle: "#ff5a45", lit: "#ff9a8d", freq: 330 },
  { idle: "#3d7cff", lit: "#8fb3ff", freq: 370 },
  { idle: "#c8f542", lit: "#e4ff9a", freq: 415 },
  { idle: "#ffd84d", lit: "#ffe99a", freq: 466 },
];

export function EchoGame({ onBack }: { onBack: () => void }) {
  const [seq, setSeq] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [listening, setListening] = useState(false);
  const [score, setScore] = useState(0);
  const [lost, setLost] = useState(false);
  const lock = useRef(false);

  const flash = async (index: number) => {
    setLit(index);
    beep(COLORS[index].freq, 0.18, "square", 0.05);
    await new Promise((r) => setTimeout(r, 320));
    setLit(null);
    await new Promise((r) => setTimeout(r, 120));
  };

  const playSequence = async (next: number[]) => {
    setPlaying(true);
    setListening(false);
    lock.current = true;
    await new Promise((r) => setTimeout(r, 400));
    for (const i of next) {
      await flash(i);
    }
    setPlaying(false);
    setListening(true);
    lock.current = false;
  };

  const start = () => {
    const first = [randInt(4)];
    setSeq(first);
    setStep(0);
    setScore(0);
    setLost(false);
    void playSequence(first);
  };

  const press = (i: number) => {
    if (!listening || lock.current || lost) return;
    void flash(i);
    if (i !== seq[step]) {
      playBonk();
      setLost(true);
      setListening(false);
      return;
    }
    if (step + 1 === seq.length) {
      const nextScore = score + 1;
      setScore(nextScore);
      if (nextScore % 3 === 0) playWin();
      const next = [...seq, randInt(4)];
      setSeq(next);
      setStep(0);
      void playSequence(next);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <GameShell
      title="Echo"
      accent="var(--mint)"
      onBack={onBack}
      stats={<span>Round {score}</span>}
    >
      <div className="relative">
        <Confetti show={score > 0 && score % 5 === 0 && !lost && !playing} />
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
          {COLORS.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => press(i)}
              disabled={!listening}
              className="aspect-square rounded-2xl border-[3px] border-ink transition-transform active:scale-95 disabled:cursor-default"
              style={{
                background: lit === i ? c.lit : c.idle,
                boxShadow: lit === i ? "1px 1px 0 var(--ink)" : "4px 4px 0 var(--ink)",
                transform: lit === i ? "translate(2px,2px)" : undefined,
              }}
              aria-label={`Pad ${i + 1}`}
            />
          ))}
        </div>
        <div className="mt-6 text-center">
          {lost ? (
            <>
              <p className="mb-3 animate-wiggle font-bold">Brain buffer overflow at round {score}.</p>
              <button type="button" onClick={start} className="btn-chunky rounded-md bg-mint px-5 py-2">
                Again!
              </button>
            </>
          ) : !seq.length ? (
            <button type="button" onClick={start} className="btn-chunky rounded-md bg-mint px-5 py-2">
              Start the jam
            </button>
          ) : (
            <p className="font-bold">
              {playing ? "Watch…" : listening ? "Your turn — copy that!" : "Ready"}
            </p>
          )}
        </div>
      </div>
    </GameShell>
  );
}
