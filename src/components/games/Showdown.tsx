"use client";

import { useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { beep, playBonk, playWin } from "@/lib/sfx";
import { pick } from "@/lib/random";

type Choice = "rock" | "paper" | "scissors";
type Mode = "cpu" | "hotseat";

const CHOICES: { id: Choice; label: string; emoji: string }[] = [
  { id: "rock", label: "Rock", emoji: "✊" },
  { id: "paper", label: "Paper", emoji: "✋" },
  { id: "scissors", label: "Scissors", emoji: "✌️" },
];

function beats(a: Choice, b: Choice) {
  return (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  );
}

export function ShowdownGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("cpu");
  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);
  const [left, setLeft] = useState<Choice | null>(null);
  const [right, setRight] = useState<Choice | null>(null);
  const [pending, setPending] = useState<Choice | null>(null);
  const [msg, setMsg] = useState("Pick your fighter");
  const [streak, setStreak] = useState(0);

  const reset = (nextMode = mode) => {
    setMode(nextMode);
    setP1(0);
    setP2(0);
    setLeft(null);
    setRight(null);
    setPending(null);
    setMsg(nextMode === "hotseat" ? "P1 picks secretly — then pass" : "Pick your fighter");
    setStreak(0);
  };

  const resolve = (a: Choice, b: Choice) => {
    setLeft(a);
    setRight(b);
    if (a === b) {
      setMsg("Tie — rematch energy");
      beep(400, 0.08, "triangle", 0.04);
      setStreak(0);
    } else if (beats(a, b)) {
      setP1((n) => n + 1);
      setMsg(mode === "cpu" ? "You win this round!" : "P1 takes the round!");
      playWin();
      setStreak((s) => s + 1);
    } else {
      setP2((n) => n + 1);
      setMsg(mode === "cpu" ? "Computer got it" : "P2 takes the round!");
      playBonk();
      setStreak(0);
    }
  };

  const play = (choice: Choice) => {
    if (mode === "cpu") {
      resolve(choice, pick(CHOICES).id);
      return;
    }
    if (!pending) {
      setPending(choice);
      setMsg("Pass to P2 — don't peek!");
      beep(520, 0.06, "square", 0.03);
      return;
    }
    resolve(pending, choice);
    setPending(null);
  };

  return (
    <GameShell
      title="Showdown"
      accent="#ff6bcb"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {p1}–{p2}
        </span>
      }
    >
      <div className="relative text-center">
        <Confetti show={streak >= 3} />
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${mode === "cpu" ? "bg-[#ff6bcb] text-white" : "bg-paper"}`}
            onClick={() => reset("cpu")}
          >
            vs Computer
          </button>
          <button
            type="button"
            className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${mode === "hotseat" ? "bg-[#ff6bcb] text-white" : "bg-paper"}`}
            onClick={() => reset("hotseat")}
          >
            Hot-seat 2P
          </button>
        </div>
        <div className="mb-6 flex items-center justify-center gap-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest">{mode === "cpu" ? "You" : "P1"}</p>
            <p className="text-5xl">
              {pending && mode === "hotseat" ? "🙈" : left ? CHOICES.find((c) => c.id === left)?.emoji : "❔"}
            </p>
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl">VS</p>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest">{mode === "cpu" ? "Computer" : "P2"}</p>
            <p className="text-5xl">{right ? CHOICES.find((c) => c.id === right)?.emoji : "❔"}</p>
          </div>
        </div>
        <p className="mb-5 font-bold">{msg}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => play(c.id)}
              className="btn-chunky flex min-w-[6.5rem] flex-col items-center rounded-xl bg-paper px-4 py-3"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-sm">{c.label}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => reset()} className="btn-chunky mt-6 rounded-md bg-[#ff6bcb] px-4 py-2 text-sm text-white">
          Reset score
        </button>
      </div>
    </GameShell>
  );
}
