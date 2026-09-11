"use client";

import { useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

const WORDS = [
  "BANANA",
  "PICKLE",
  "ROCKET",
  "PLANET",
  "COOKIE",
  "DRAGON",
  "PUZZLE",
  "BANJO",
  "LLAMA",
  "NINJA",
  "WALRUS",
  "CASTLE",
];

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function HangmanGame({ onBack }: { onBack: () => void }) {
  const [word, setWord] = useState(() => WORDS[randInt(WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);

  const won = word.split("").every((c) => guessed.has(c));
  const lost = misses >= 6;
  const done = won || lost;

  const guess = (letter: string) => {
    if (done || guessed.has(letter)) return;
    playTap();
    const next = new Set(guessed);
    next.add(letter);
    setGuessed(next);
    if (!word.includes(letter)) {
      setMisses((m) => m + 1);
      playBonk();
      return;
    }
    if (word.split("").every((c) => next.has(c))) playWin();
  };

  const reset = () => {
    setWord(WORDS[randInt(WORDS.length)]);
    setGuessed(new Set());
    setMisses(0);
  };

  return (
    <GameShell title="Hangman" accent="#a78bfa" ink="#fff" onBack={onBack} stats={<span>💔 {6 - misses}</span>}>
      <div className="relative text-center">
        <Confetti show={won} />
        <p className="mb-2 font-[family-name:var(--font-display)] text-sm tracking-widest opacity-70">
          {["😀", "🙂", "😐", "😕", "😟", "😵", "💀"][misses]}
        </p>
        <p className="mb-6 font-[family-name:var(--font-display)] text-3xl tracking-[0.35em] sm:text-4xl">
          {word
            .split("")
            .map((c) => (guessed.has(c) || lost ? c : "_"))
            .join(" ")}
        </p>
        {done && (
          <p className="mb-4 font-bold">
            {won ? "You cracked it!" : `It was ${word}. Oof.`}
          </p>
        )}
        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-1.5">
          {ALPHA.map((l) => {
            const used = guessed.has(l);
            const hit = word.includes(l);
            return (
              <button
                key={l}
                type="button"
                disabled={used || done}
                onClick={() => guess(l)}
                className="btn-chunky h-9 w-9 rounded-md text-sm disabled:opacity-40"
                style={{
                  background: used ? (hit ? "var(--mint)" : "#ddd") : "var(--paper)",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={reset} className="btn-chunky mt-6 rounded-md bg-[#a78bfa] px-5 py-2 text-white">
          New word
        </button>
      </div>
    </GameShell>
  );
}
