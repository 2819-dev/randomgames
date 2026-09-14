"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";

type Phase = "idle" | "wait" | "go" | "early" | "round" | "done";

const ROUNDS = 5;

function grade(avg: number) {
  if (avg < 180) return { label: "Lightning", color: "var(--lime)" };
  if (avg < 230) return { label: "Sharp", color: "var(--mint)" };
  if (avg < 280) return { label: "Snappy", color: "var(--sky)" };
  if (avg < 350) return { label: "Solid", color: "var(--butter)" };
  return { label: "Warming up", color: "var(--coral)" };
}

export function ReactionGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const arm = (nextRound: number) => {
    clearTimer();
    setMs(null);
    setRound(nextRound);
    setPhase("wait");
    const delay = 900 + Math.random() * 2400;
    // occasional tease flash — almost green, then back
    if (Math.random() < 0.28) {
      timerRef.current = window.setTimeout(() => {
        setPhase("wait");
        beep(220, 0.04, "sine", 0.02);
        timerRef.current = window.setTimeout(() => {
          startRef.current = performance.now();
          setPhase("go");
          beep(880, 0.05, "square", 0.04);
        }, 500 + Math.random() * 900);
      }, delay * 0.45);
    } else {
      timerRef.current = window.setTimeout(() => {
        startRef.current = performance.now();
        setPhase("go");
        beep(880, 0.05, "square", 0.04);
      }, delay);
    }
  };

  const startRun = () => {
    setTimes([]);
    setMs(null);
    playTap();
    arm(1);
  };

  const click = () => {
    if (phase === "idle" || phase === "done" || phase === "early" || phase === "round") {
      if (phase === "done" || phase === "idle") startRun();
      else if (phase === "early") arm(Math.max(1, round));
      else if (phase === "round" && round < ROUNDS) arm(round + 1);
      return;
    }
    if (phase === "wait") {
      clearTimer();
      setPhase("early");
      setShake(true);
      playBonk();
      window.setTimeout(() => setShake(false), 280);
      return;
    }
    if (phase === "go") {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMs(elapsed);
      setBest((b) => (b === null ? elapsed : Math.min(b, elapsed)));
      const nextTimes = [...times, elapsed];
      setTimes(nextTimes);
      beep(660 - Math.min(200, elapsed / 2), 0.08, "triangle", 0.05);
      if (nextTimes.length >= ROUNDS) {
        const avg = Math.round(nextTimes.reduce((a, b) => a + b, 0) / nextTimes.length);
        setPhase("done");
        if (avg < 250) playWin();
        else playBonk();
      } else {
        setPhase("round");
      }
    }
  };

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const g = avg != null ? grade(avg) : null;

  const label =
    phase === "idle"
      ? "Tap to start a 5-round zap"
      : phase === "wait"
        ? "Wait for green…"
        : phase === "go"
          ? "NOW!"
          : phase === "early"
            ? "Too soon — tap to retry round"
            : phase === "round"
              ? `${ms} ms · Round ${round}/${ROUNDS} — tap for next`
              : `Done · avg ${avg} ms`;

  const bg =
    phase === "go"
      ? "var(--mint)"
      : phase === "wait"
        ? "#1e1b2e"
        : phase === "early"
          ? "var(--coral)"
          : phase === "done"
            ? g?.color || "var(--sky)"
            : "var(--sky)";

  return (
    <GameShell
      title="Zap"
      accent="var(--butter)"
      onBack={onBack}
      stats={
        <span>
          Round {Math.min(round || 1, ROUNDS)}/{ROUNDS} · Best{" "}
          {best === null ? "—" : `${best} ms`}
        </span>
      }
    >
      <div className="relative">
        <Confetti show={phase === "done" && avg != null && avg < 220} />
        <button
          type="button"
          onClick={click}
          className={`chunky-lg flex min-h-[300px] w-full flex-col items-center justify-center rounded-xl px-6 text-center transition-colors ${
            phase === "go" ? "animate-pulse-ring" : ""
          } ${shake ? "animate-wiggle" : ""}`}
          style={{
            background: bg,
            color: phase === "go" || phase === "done" ? "var(--ink)" : "#fff",
          }}
        >
          <span className="font-[family-name:var(--font-display)] text-3xl sm:text-5xl">{label}</span>
          {phase === "round" && ms != null && (
            <span className="mt-3 animate-score-pop text-lg font-bold">
              {ms < 200 ? "Lightning" : ms < 280 ? "Clean" : ms < 360 ? "Okay" : "Keep going"}
            </span>
          )}
          {phase === "done" && g && (
            <span className="mt-3 animate-score-pop text-2xl font-extrabold">{g.label}</span>
          )}
        </button>
      </div>

      {times.length > 0 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: ROUNDS }, (_, i) => {
            const t = times[i];
            const h = t == null ? 8 : Math.max(10, 48 - t / 12);
            return (
              <div key={i} className="flex h-14 w-8 items-end justify-center rounded bg-ink/10 p-1">
                <div
                  className="w-full rounded-sm bg-ink transition-all"
                  style={{
                    height: `${h}px`,
                    opacity: t == null ? 0.2 : 1,
                    background: t != null && t < 220 ? "var(--lime)" : "var(--ink)",
                  }}
                  title={t != null ? `${t} ms` : ""}
                />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-sm text-ink/70">
        Five flashes. Early taps redo the round. Chase a sub-220 average.
      </p>
    </GameShell>
  );
}
