"use client";

import { useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
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
  const [lives, setLives] = useState(3);
  const [lost, setLost] = useState(false);
  const [toast, setToast] = useState("Watch the pattern. Repeat it.");
  const lock = useRef(false);
  const speedRef = useRef(300);

  const flash = async (index: number) => {
    setLit(index);
    beep(COLORS[index]!.freq, 0.16, "square", 0.05);
    await new Promise((r) => setTimeout(r, speedRef.current));
    setLit(null);
    await new Promise((r) => setTimeout(r, Math.max(60, speedRef.current * 0.35)));
  };

  const playSequence = async (next: number[]) => {
    setPlaying(true);
    setListening(false);
    lock.current = true;
    await new Promise((r) => setTimeout(r, 380));
    for (const i of next) await flash(i);
    setPlaying(false);
    setListening(true);
    lock.current = false;
    setToast("Your turn");
  };

  const start = () => {
    speedRef.current = 300;
    const first = [randInt(4)];
    setSeq(first);
    setStep(0);
    setScore(0);
    setLives(3);
    setLost(false);
    setToast("Memorize…");
    playTap();
    void playSequence(first);
  };

  const press = (i: number) => {
    if (!listening || lock.current || lost) return;
    void flash(i);
    if (i !== seq[step]) {
      playBonk();
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        setLost(true);
        setListening(false);
        setToast(`Lost the beat at ${score}`);
        return;
      }
      setToast(`Miss — ${nextLives} left. Watch again.`);
      setStep(0);
      void playSequence(seq);
      return;
    }
    if (step + 1 === seq.length) {
      const nextScore = score + 1;
      setScore(nextScore);
      speedRef.current = Math.max(140, 300 - nextScore * 12);
      if (nextScore % 3 === 0) {
        playWin();
        setToast(`Level ${nextScore} — speeding up`);
      } else {
        beep(700, 0.07, "triangle", 0.05);
        setToast(`Nice · ${nextScore}`);
      }
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
      stats={
        <span>
          {score} · ❤{lives}
        </span>
      }
    >
      <div className="relative mx-auto max-w-sm">
        <Confetti show={score > 0 && score % 5 === 0 && !lost && listening} />
        <p className="mb-3 text-center text-sm font-bold text-ink/70">{toast}</p>
        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={playing || lost || (!listening && seq.length > 0)}
              onClick={() => press(i)}
              className="btn-chunky aspect-square rounded-xl transition-transform active:scale-95 disabled:opacity-80"
              style={{
                background: lit === i ? c.lit : c.idle,
                transform: lit === i ? "scale(1.04)" : undefined,
                boxShadow: lit === i ? "0 0 0 4px rgba(255,255,255,0.35)" : undefined,
              }}
              aria-label={`Pad ${i + 1}`}
            />
          ))}
        </div>

        <div className="mt-5 text-center">
          {(lost || seq.length === 0) && (
            <button type="button" onClick={start} className="btn-chunky rounded-md bg-mint px-5 py-2">
              {lost ? "Try again" : "Start"}
            </button>
          )}
          {playing && <p className="text-sm font-semibold">Listen…</p>}
        </div>
      </div>
    </GameShell>
  );
}
