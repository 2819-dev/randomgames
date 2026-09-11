"use client";

import { useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";

type Cell = null | "R" | "Y";
type Board = Cell[][];

const ROWS = 6;
const COLS = 7;

function empty(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function drop(board: Board, col: number, who: Cell): Board | null {
  if (board[0][col] !== null) return null;
  const next = board.map((r) => [...r]);
  for (let r = ROWS - 1; r >= 0; r--) {
    if (next[r][col] === null) {
      next[r][col] = who;
      return next;
    }
  }
  return null;
}

function winner(board: Board): Cell | "draw" | null {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const start = board[r][c];
      if (!start) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr][cc] !== start) {
            ok = false;
            break;
          }
        }
        if (ok) return start;
      }
    }
  }
  if (board.every((row) => row.every(Boolean))) return "draw";
  return null;
}

function cpuMove(board: Board): number {
  for (let c = 0; c < COLS; c++) {
    const tryY = drop(board, c, "Y");
    if (tryY && winner(tryY) === "Y") return c;
  }
  for (let c = 0; c < COLS; c++) {
    const tryR = drop(board, c, "R");
    if (tryR && winner(tryR) === "R") return c;
  }
  const mid = [3, 2, 4, 1, 5, 0, 6].filter((c) => board[0][c] === null);
  return mid[0] ?? 0;
}

export function ConnectGame({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<Board>(() => empty());
  const [busy, setBusy] = useState(false);
  const result = winner(board);

  const reset = () => {
    setBoard(empty());
    setBusy(false);
  };

  const play = (col: number) => {
    if (result || busy) return;
    const after = drop(board, col, "R");
    if (!after) return;
    playTap();
    setBoard(after);
    if (winner(after)) {
      if (winner(after) === "R") playWin();
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setBoard((cur) => {
        const colCpu = cpuMove(cur);
        const next = drop(cur, colCpu, "Y");
        if (!next) return cur;
        const w = winner(next);
        if (w === "Y") playBonk();
        else if (w === "R") playWin();
        return next;
      });
      setBusy(false);
    }, 320);
  };

  return (
    <GameShell
      title="Connect 4"
      accent="#f97316"
      ink="#fff"
      onBack={onBack}
      stats={<span>{result === "R" ? "You!" : result === "Y" ? "CPU" : busy ? "…" : "Drop"}</span>}
    >
      <div className="relative">
        <Confetti show={result === "R"} />
        <p className="mb-3 text-center font-bold">
          {result === "R"
            ? "Four in a row — legend."
            : result === "Y"
              ? "CPU connected. Rematch?"
              : result === "draw"
                ? "Draw. The board is full of drama."
                : "You are red. Drop a disc."}
        </p>
        <div
          className="mx-auto grid max-w-md gap-1.5 rounded-xl border-[3px] border-ink bg-[#2563eb] p-2"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))`, boxShadow: "4px 4px 0 var(--ink)" }}
        >
          {board.flatMap((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => play(c)}
                className="aspect-square rounded-full border-[3px] border-ink"
                style={{
                  background: cell === "R" ? "#ef4444" : cell === "Y" ? "#facc15" : "#dbeafe",
                }}
                aria-label={`Column ${c + 1}`}
              />
            )),
          )}
        </div>
        <div className="mt-5 text-center">
          <button type="button" onClick={reset} className="btn-chunky rounded-md bg-[#f97316] px-5 py-2 text-white">
            New game
          </button>
        </div>
      </div>
    </GameShell>
  );
}
