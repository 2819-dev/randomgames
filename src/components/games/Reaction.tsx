"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";

type Phase = "idle" | "wait" | "go" | "early" | "result";

export function ReactionGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
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

  const arm = () => {
    clearTimer();
    setMs(null);
    setPhase("wait");
    const delay = 1200 + Math.random() * 2800;
    timerRef.current = window.setTimeout(() => {
      startRef.current = performance.now();
      setPhase("go");
    }, delay);
  };

  const click = () => {
    if (phase === "idle" || phase === "result" || phase === "early") {
      arm();
      return;
    }
    if (phase === "wait") {
      clearTimer();
      setPhase("early");
      return;
    }
    if (phase === "go") {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMs(elapsed);
      setBest((b) => (b === null ? elapsed : Math.min(b, elapsed)));
      setPhase("result");
    }
  };

  const label =
    phase === "idle"
      ? "Tap to start"
      : phase === "wait"
        ? "Wait for green…"
        : phase === "go"
          ? "NOW!"
          : phase === "early"
            ? "Too soon — tap to retry"
            : `${ms} ms — tap to go again`;

  const bg =
    phase === "go"
      ? "var(--mint)"
      : phase === "wait"
        ? "var(--coral)"
        : phase === "early"
          ? "var(--butter)"
          : "var(--sky)";

  return (
    <GameShell
      title="Zap"
      accent="var(--butter)"
      onBack={onBack}
      stats={<span>Best {best === null ? "—" : `${best} ms`}</span>}
    >
      <button
        type="button"
        onClick={click}
        className={`chunky-lg flex min-h-[280px] w-full flex-col items-center justify-center rounded-xl px-6 text-center transition-colors ${
          phase === "go" ? "animate-pulse-ring" : ""
        }`}
        style={{ background: bg, color: phase === "go" ? "var(--ink)" : "#fff" }}
      >
        <span className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          {label}
        </span>
        {phase === "result" && ms !== null && (
          <span className="mt-3 animate-score-pop text-lg font-bold">
            {ms < 200
              ? "Lightning hands"
              : ms < 300
                ? "Snappy"
                : ms < 400
                  ? "Solid"
                  : "Warm-up lap"}
          </span>
        )}
      </button>
      <p className="mt-4 text-center text-sm text-ink/70">
        Wait for the panel to turn green, then click as fast as you can.
      </p>
    </GameShell>
  );
}
