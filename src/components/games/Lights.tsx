"use client";

import { useMemo, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

const SIZE = 5;

function neighbors(i: number) {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const ids = [i];
  if (r > 0) ids.push(i - SIZE);
  if (r < SIZE - 1) ids.push(i + SIZE);
  if (c > 0) ids.push(i - 1);
  if (c < SIZE - 1) ids.push(i + 1);
  return ids;
}

function toggle(board: boolean[], i: number) {
  const next = [...board];
  for (const n of neighbors(i)) next[n] = !next[n];
  return next;
}

function scramble(): boolean[] {
  let board = Array(SIZE * SIZE).fill(false) as boolean[];
  for (let k = 0; k < 12; k++) {
    board = toggle(board, randInt(board.length));
  }
  if (board.every((v) => !v)) board = toggle(board, 12);
  return board;
}

export function LightsGame({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState(() => scramble());
  const [moves, setMoves] = useState(0);
  const won = useMemo(() => board.every((v) => !v), [board]);

  const press = (i: number) => {
    if (won) return;
    playTap();
    setBoard((b) => {
      const next = toggle(b, i);
      if (next.every((v) => !v)) playWin();
      return next;
    });
    setMoves((m) => m + 1);
  };

  const reset = () => {
    setBoard(scramble());
    setMoves(0);
  };

  return (
    <GameShell
      title="Lights Out"
      accent="#7ce7ff"
      onBack={onBack}
      stats={<span>Moves {moves}</span>}
    >
      <div className="relative">
        <Confetti show={won && moves > 0} />
        <div
          className="mx-auto grid max-w-sm gap-2"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {board.map((on, i) => (
            <button
              key={i}
              type="button"
              onClick={() => press(i)}
              className="aspect-square rounded-lg border-[3px] border-ink transition-transform active:scale-95"
              style={{
                background: on ? "var(--butter)" : "#2a2735",
                boxShadow: on ? "3px 3px 0 var(--ink)" : "inset 2px 2px 0 #16141f",
              }}
              aria-label={on ? "Light on" : "Light off"}
            />
          ))}
        </div>
        <div className="mt-6 text-center">
          {won ? (
            <p className="mb-3 animate-wiggle font-bold">
              Darkness achieved in {moves} taps. Dramatic.
            </p>
          ) : (
            <p className="mb-3 text-sm font-semibold text-ink/70">
              Tap a tile to flip it and its neighbors.
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="btn-chunky rounded-md bg-[#7ce7ff] px-5 py-2"
          >
            {won ? "New puzzle" : "Shuffle"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
