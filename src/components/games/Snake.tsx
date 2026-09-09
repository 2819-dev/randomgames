"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";

type Dir = "U" | "D" | "L" | "R";
type Cell = { x: number; y: number };

const SIZE = 16;
const TICK = 110;

function randFood(snake: Cell[]): Cell {
  while (true) {
    const cell = {
      x: Math.floor(Math.random() * SIZE),
      y: Math.floor(Math.random() * SIZE),
    };
    if (!snake.some((s) => s.x === cell.x && s.y === cell.y)) return cell;
  }
}

export function SnakeGame({ onBack }: { onBack: () => void }) {
  const [snake, setSnake] = useState<Cell[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const [food, setFood] = useState<Cell>({ x: 12, y: 8 });
  const [dir, setDir] = useState<Dir>("R");
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const [running, setRunning] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const dirRef = useRef<Dir>("R");
  const pendingRef = useRef<Dir | null>(null);

  const reset = () => {
    const start = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    setSnake(start);
    setFood(randFood(start));
    setDir("R");
    dirRef.current = "R";
    pendingRef.current = null;
    setScore(0);
    setDead(false);
    setRunning(true);
  };

  const turn = useCallback((next: Dir) => {
    const cur = dirRef.current;
    const opposite =
      (cur === "U" && next === "D") ||
      (cur === "D" && next === "U") ||
      (cur === "L" && next === "R") ||
      (cur === "R" && next === "L");
    if (!opposite) pendingRef.current = next;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "U",
        ArrowDown: "D",
        ArrowLeft: "L",
        ArrowRight: "R",
        w: "U",
        s: "D",
        a: "L",
        d: "R",
      };
      const next = map[e.key];
      if (next) {
        e.preventDefault();
        if (!running && !dead) setRunning(true);
        turn(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dead, running, turn]);

  useEffect(() => {
    if (!running || dead) return;
    const id = window.setInterval(() => {
      if (pendingRef.current) {
        dirRef.current = pendingRef.current;
        setDir(pendingRef.current);
        pendingRef.current = null;
      }
      setSnake((prev) => {
        const head = prev[0];
        const d = dirRef.current;
        const next = {
          x: head.x + (d === "L" ? -1 : d === "R" ? 1 : 0),
          y: head.y + (d === "U" ? -1 : d === "D" ? 1 : 0),
        };
        if (
          next.x < 0 ||
          next.y < 0 ||
          next.x >= SIZE ||
          next.y >= SIZE ||
          prev.some((s) => s.x === next.x && s.y === next.y)
        ) {
          setDead(true);
          setRunning(false);
          return prev;
        }
        const ate = next.x === food.x && next.y === food.y;
        const body = [next, ...prev];
        if (!ate) body.pop();
        else {
          setFood(randFood(body));
          setScore((s) => s + 1);
          setScorePop(true);
          window.setTimeout(() => setScorePop(false), 350);
        }
        return body;
      });
    }, TICK);
    return () => window.clearInterval(id);
  }, [dead, food, running]);

  return (
    <GameShell
      title="Snek"
      accent="var(--lime)"
      onBack={onBack}
      stats={
        <span className={scorePop ? "animate-score-pop inline-block" : ""}>
          Score {score}
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="chunky grid aspect-square w-full max-w-md rounded-lg bg-ink p-1"
          style={{
            gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, i) => {
            const x = i % SIZE;
            const y = Math.floor(i / SIZE);
            const idx = snake.findIndex((s) => s.x === x && s.y === y);
            const isHead = idx === 0;
            const isBody = idx > 0;
            const isFood = food.x === x && food.y === y;
            return (
              <div
                key={i}
                className="rounded-[2px]"
                style={{
                  background: isHead
                    ? "var(--lime)"
                    : isBody
                      ? "#9bc92f"
                      : isFood
                        ? "var(--coral)"
                        : y % 2 === x % 2
                          ? "#1f1c2a"
                          : "#191622",
                }}
              />
            );
          })}
        </div>

        {(dead || !running) && (
          <div className="text-center">
            <p className="mb-3 font-bold">
              {dead ? `Bonk! Final score ${score}` : "Press play or use arrows / WASD"}
            </p>
            <button
              type="button"
              onClick={reset}
              className="btn-chunky rounded-md bg-lime px-5 py-2"
            >
              {dead ? "Play again" : "Start"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <div />
          <button type="button" className="btn-chunky rounded-md bg-paper-2 px-3 py-2" onClick={() => turn("U")}>
            ↑
          </button>
          <div />
          <button type="button" className="btn-chunky rounded-md bg-paper-2 px-3 py-2" onClick={() => turn("L")}>
            ←
          </button>
          <button type="button" className="btn-chunky rounded-md bg-paper-2 px-3 py-2" onClick={() => turn("D")}>
            ↓
          </button>
          <button type="button" className="btn-chunky rounded-md bg-paper-2 px-3 py-2" onClick={() => turn("R")}>
            →
          </button>
        </div>
        <p className="hidden text-sm text-ink/70 sm:block">
          Facing {dir === "U" ? "up" : dir === "D" ? "down" : dir === "L" ? "left" : "right"}
        </p>
      </div>
    </GameShell>
  );
}
