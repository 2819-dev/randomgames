"use client";

import { useMemo, useState } from "react";
import { GameShell } from "@/components/GameShell";

type Mark = "X" | "O" | null;
type Board = Mark[];

const WINS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winner(board: Board): Mark | "draw" | null {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

function emptyCells(board: Board) {
  return board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
}

function bestMove(board: Board): number {
  const empties = emptyCells(board);
  for (const i of empties) {
    const next = [...board];
    next[i] = "O";
    if (winner(next) === "O") return i;
  }
  for (const i of empties) {
    const next = [...board];
    next[i] = "X";
    if (winner(next) === "X") return i;
  }
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empties[Math.floor(Math.random() * empties.length)];
}

export function TicTacToeGame({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [thinking, setThinking] = useState(false);
  const result = useMemo(() => winner(board), [board]);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setThinking(false);
  };

  const play = (i: number) => {
    if (result || thinking || board[i]) return;
    const next = [...board];
    next[i] = "X";
    const afterHuman = winner(next);
    setBoard(next);
    if (afterHuman) return;
    setThinking(true);
    window.setTimeout(() => {
      setBoard((cur) => {
        if (winner(cur)) return cur;
        const ai = bestMove(cur);
        const withAi = [...cur];
        withAi[ai] = "O";
        return withAi;
      });
      setThinking(false);
    }, 380);
  };

  const status =
    result === "X"
      ? "You win!"
      : result === "O"
        ? "Computer wins"
        : result === "draw"
          ? "Draw — rematch?"
          : thinking
            ? "Computer is plotting…"
            : "Your turn (X)";

  return (
    <GameShell
      title="Xs & Os"
      accent="var(--coral)"
      ink="#fff"
      onBack={onBack}
      stats={<span>{result ? "Done" : thinking ? "…" : "Play"}</span>}
    >
      <p className="mb-4 text-center font-bold">{status}</p>
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => play(i)}
            disabled={!!cell || !!result || thinking}
            className="btn-chunky aspect-square rounded-lg bg-paper text-4xl font-[family-name:var(--font-display)] disabled:cursor-default disabled:opacity-100"
            style={{
              color: cell === "X" ? "var(--coral)" : "var(--sky)",
            }}
          >
            {cell ?? ""}
          </button>
        ))}
      </div>
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={reset}
          className="btn-chunky rounded-md bg-coral px-5 py-2 text-white"
        >
          New round
        </button>
      </div>
    </GameShell>
  );
}
