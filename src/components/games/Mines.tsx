"use client";

import { useMemo, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

const SIZE = 8;
const MINES = 10;

type Cell = {
  mine: boolean;
  open: boolean;
  flag: boolean;
  n: number;
};

function build(): Cell[] {
  const cells: Cell[] = Array.from({ length: SIZE * SIZE }, () => ({
    mine: false,
    open: false,
    flag: false,
    n: 0,
  }));
  let placed = 0;
  while (placed < MINES) {
    const i = randInt(SIZE * SIZE);
    if (cells[i].mine) continue;
    cells[i].mine = true;
    placed += 1;
  }
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].mine) continue;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
        if (cells[rr * SIZE + cc].mine) n += 1;
      }
    }
    cells[i].n = n;
  }
  return cells;
}

export function MinesGame({ onBack }: { onBack: () => void }) {
  const [cells, setCells] = useState<Cell[]>(() => build());
  const [dead, setDead] = useState(false);
  const [flagMode, setFlagMode] = useState(false);

  const won = useMemo(() => {
    if (dead) return false;
    return cells.every((c) => (c.mine ? !c.open : c.open));
  }, [cells, dead]);

  const reset = () => {
    setCells(build());
    setDead(false);
  };

  const flood = (board: Cell[], start: number) => {
    const stack = [start];
    while (stack.length) {
      const i = stack.pop()!;
      const cell = board[i];
      if (cell.open || cell.flag || cell.mine) continue;
      cell.open = true;
      if (cell.n !== 0) continue;
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
          stack.push(rr * SIZE + cc);
        }
      }
    }
  };

  const click = (i: number) => {
    if (dead || won) return;
    setCells((prev) => {
      const board = prev.map((c) => ({ ...c }));
      const cell = board[i];
      if (flagMode) {
        if (!cell.open) {
          cell.flag = !cell.flag;
          playTap();
        }
        return board;
      }
      if (cell.flag || cell.open) return prev;
      if (cell.mine) {
        board.forEach((c) => {
          if (c.mine) c.open = true;
        });
        setDead(true);
        playBonk();
        return board;
      }
      flood(board, i);
      playTap();
      const clear = board.every((c) => (c.mine ? !c.open : c.open));
      if (clear) playWin();
      return board;
    });
  };

  const flags = cells.filter((c) => c.flag).length;

  return (
    <GameShell
      title="Mines"
      accent="#94a3b8"
      onBack={onBack}
      stats={
        <span>
          🚩 {flags}/{MINES}
        </span>
      }
    >
      <div className="relative">
        <Confetti show={won} />
        <div className="mb-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setFlagMode(false)}
            className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${flagMode ? "bg-paper-2" : "bg-lime"}`}
          >
            Dig
          </button>
          <button
            type="button"
            onClick={() => setFlagMode(true)}
            className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${flagMode ? "bg-butter" : "bg-paper-2"}`}
          >
            Flag
          </button>
          <button type="button" onClick={reset} className="btn-chunky rounded-md bg-paper-2 px-3 py-1.5 text-sm">
            Reset
          </button>
        </div>
        <div
          className="mx-auto grid max-w-sm gap-1"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {cells.map((cell, i) => (
            <button
              key={i}
              type="button"
              onClick={() => click(i)}
              className="aspect-square rounded-md border-[2px] border-ink text-sm font-extrabold"
              style={{
                background: cell.open
                  ? cell.mine
                    ? "#ff5a45"
                    : "#e7e1d4"
                  : "#3d7cff",
                color: cell.open ? "var(--ink)" : "#fff",
                boxShadow: cell.open ? "none" : "2px 2px 0 var(--ink)",
              }}
            >
              {cell.open
                ? cell.mine
                  ? "💣"
                  : cell.n || ""
                : cell.flag
                  ? "🚩"
                  : ""}
            </button>
          ))}
        </div>
        {(won || dead) && (
          <p className="mt-4 text-center font-bold">
            {won ? "Field cleared. Nice nerves." : "Boom. Try a softer touch."}
          </p>
        )}
      </div>
    </GameShell>
  );
}
