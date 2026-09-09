"use client";

import { useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { beep, playBonk, playWin } from "@/lib/sfx";
import { pick } from "@/lib/random";

type Choice = "rock" | "paper" | "scissors";

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
  const [you, setYou] = useState(0);
  const [cpu, setCpu] = useState(0);
  const [yours, setYours] = useState<Choice | null>(null);
  const [theirs, setTheirs] = useState<Choice | null>(null);
  const [msg, setMsg] = useState("Pick your fighter");
  const [streak, setStreak] = useState(0);

  const play = (choice: Choice) => {
    const opp = pick(CHOICES).id;
    setYours(choice);
    setTheirs(opp);
    if (choice === opp) {
      setMsg("Tie — rematch energy");
      beep(400, 0.08, "triangle", 0.04);
      setStreak(0);
    } else if (beats(choice, opp)) {
      setYou((y) => y + 1);
      setMsg("You win this round!");
      playWin();
      setStreak((s) => s + 1);
    } else {
      setCpu((c) => c + 1);
      setMsg("CPU snagged it");
      playBonk();
      setStreak(0);
    }
  };

  const reset = () => {
    setYou(0);
    setCpu(0);
    setYours(null);
    setTheirs(null);
    setMsg("Pick your fighter");
    setStreak(0);
  };

  return (
    <GameShell
      title="Showdown"
      accent="#ff6bcb"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {you}–{cpu}
        </span>
      }
    >
      <div className="relative text-center">
        <Confetti show={streak >= 3} />
        <div className="mb-6 flex items-center justify-center gap-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest">You</p>
            <p className="text-5xl">{yours ? CHOICES.find((c) => c.id === yours)?.emoji : "❔"}</p>
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl">VS</p>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest">CPU</p>
            <p className="text-5xl">{theirs ? CHOICES.find((c) => c.id === theirs)?.emoji : "❔"}</p>
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
        <button type="button" onClick={reset} className="btn-chunky mt-6 rounded-md bg-[#ff6bcb] px-4 py-2 text-sm text-white">
          Reset score
        </button>
      </div>
    </GameShell>
  );
}
