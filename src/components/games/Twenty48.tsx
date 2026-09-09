"use client";

import { useCallback, useEffect, useState } from "react";
import { GameShell } from "@/components/GameShell";

type Grid = number[][];

function emptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function clone(g: Grid): Grid {
  return g.map((row) => [...row]);
}

function addRandom(g: Grid): Grid {
  const empties: [number, number][] = [];
  g.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) empties.push([r, c]);
    }),
  );
  if (!empties.length) return g;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = clone(g);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter((n) => n !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) {
      const merged = nums[i] * 2;
      out.push(merged);
      gained += merged;
      i++;
    } else {
      out.push(nums[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return { row: out, gained };
}

function rotate(g: Grid): Grid {
  const n = emptyGrid();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) n[c][3 - r] = g[r][c];
  }
  return n;
}

function move(g: Grid, dir: "L" | "R" | "U" | "D"): { grid: Grid; gained: number; moved: boolean } {
  let working = clone(g);
  let rotations = 0;
  if (dir === "U") rotations = 3;
  if (dir === "R") rotations = 2;
  if (dir === "D") rotations = 1;
  for (let i = 0; i < rotations; i++) working = rotate(working);

  let gained = 0;
  const slid = working.map((row) => {
    const res = slideRow(row);
    gained += res.gained;
    return res.row;
  });

  let back = slid;
  for (let i = 0; i < (4 - rotations) % 4; i++) back = rotate(back);

  const moved = JSON.stringify(back) !== JSON.stringify(g);
  return { grid: back, gained, moved };
}

function canMove(g: Grid) {
  for (const dir of ["L", "R", "U", "D"] as const) {
    if (move(g, dir).moved) return true;
  }
  return false;
}

const COLORS: Record<number, { bg: string; fg: string }> = {
  0: { bg: "#d9d2c3", fg: "var(--ink)" },
  2: { bg: "#eee4da", fg: "var(--ink)" },
  4: { bg: "#ede0c8", fg: "var(--ink)" },
  8: { bg: "#f2b179", fg: "#fff" },
  16: { bg: "#f59563", fg: "#fff" },
  32: { bg: "#f67c5f", fg: "#fff" },
  64: { bg: "#f65e3b", fg: "#fff" },
  128: { bg: "#edcf72", fg: "var(--ink)" },
  256: { bg: "#edcc61", fg: "var(--ink)" },
  512: { bg: "#edc850", fg: "var(--ink)" },
  1024: { bg: "#edc53f", fg: "var(--ink)" },
  2048: { bg: "#edc22e", fg: "var(--ink)" },
};

export function Twenty48Game({ onBack }: { onBack: () => void }) {
  const [grid, setGrid] = useState<Grid>(() => addRandom(addRandom(emptyGrid())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [pop, setPop] = useState(false);

  const reset = () => {
    setGrid(addRandom(addRandom(emptyGrid())));
    setScore(0);
    setOver(false);
    setWon(false);
  };

  const apply = useCallback((dir: "L" | "R" | "U" | "D") => {
    setGrid((cur) => {
      if (over) return cur;
      const { grid: next, gained, moved } = move(cur, dir);
      if (!moved) return cur;
      const withTile = addRandom(next);
      if (gained) {
        setScore((s) => {
          const n = s + gained;
          setBest((b) => Math.max(b, n));
          return n;
        });
        setPop(true);
        window.setTimeout(() => setPop(false), 320);
      }
      if (withTile.some((row) => row.includes(2048))) setWon(true);
      if (!canMove(withTile)) setOver(true);
      return withTile;
    });
  }, [over]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "L" | "R" | "U" | "D"> = {
        ArrowLeft: "L",
        ArrowRight: "R",
        ArrowUp: "U",
        ArrowDown: "D",
        a: "L",
        d: "R",
        w: "U",
        s: "D",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        apply(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apply]);

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    const start = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) apply(dx > 0 ? "R" : "L");
      else apply(dy > 0 ? "D" : "U");
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [apply]);

  return (
    <GameShell
      title="2048"
      accent="var(--plum)"
      ink="#fff"
      onBack={onBack}
      stats={
        <span className={pop ? "animate-score-pop inline-block" : ""}>
          Score {score}
        </span>
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold">
        <span>Best {best}</span>
        <button
          type="button"
          onClick={reset}
          className="btn-chunky rounded-md bg-plum px-3 py-1.5 text-white"
        >
          New game
        </button>
      </div>

      <div className="chunky relative mx-auto grid aspect-square w-full max-w-sm grid-cols-4 gap-2 rounded-xl bg-ink p-2">
        {grid.flatMap((row, r) =>
          row.map((val, c) => {
            const tone = COLORS[val] ?? { bg: "#3c3a32", fg: "#fff" };
            return (
              <div
                key={`${r}-${c}`}
                className="flex items-center justify-center rounded-md border-2 border-ink font-[family-name:var(--font-display)] text-xl sm:text-2xl"
                style={{ background: tone.bg, color: tone.fg }}
              >
                {val || ""}
              </div>
            );
          }),
        )}

        {(over || won) && (
          <div className="absolute inset-2 flex flex-col items-center justify-center rounded-lg bg-paper/95 text-center">
            <p className="mb-3 font-[family-name:var(--font-display)] text-2xl">
              {won && !over ? "2048!" : "Game over"}
            </p>
            <button
              type="button"
              onClick={reset}
              className="btn-chunky rounded-md bg-butter px-5 py-2"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">
        <div />
        <button type="button" className="btn-chunky rounded-md bg-paper-2 py-2" onClick={() => apply("U")}>
          ↑
        </button>
        <div />
        <button type="button" className="btn-chunky rounded-md bg-paper-2 py-2" onClick={() => apply("L")}>
          ←
        </button>
        <button type="button" className="btn-chunky rounded-md bg-paper-2 py-2" onClick={() => apply("D")}>
          ↓
        </button>
        <button type="button" className="btn-chunky rounded-md bg-paper-2 py-2" onClick={() => apply("R")}>
          →
        </button>
      </div>
      <p className="mt-3 hidden text-center text-sm text-ink/70 sm:block">
        Arrow keys or WASD to slide.
      </p>
    </GameShell>
  );
}
