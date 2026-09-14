"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";

type Dir = "U" | "D" | "L" | "R";
type Cell = { x: number; y: number };
type FoodKind = "normal" | "gold" | "shrink";

const SIZE = 16;

function randCell(blocked: Cell[]): Cell {
  while (true) {
    const cell = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!blocked.some((s) => s.x === cell.x && s.y === cell.y)) return cell;
  }
}

function rollFood(snake: Cell[]): { pos: Cell; kind: FoodKind } {
  const r = Math.random();
  const kind: FoodKind = r < 0.12 ? "gold" : r < 0.2 ? "shrink" : "normal";
  return { pos: randCell(snake), kind };
}

export function SnakeGame({ onBack }: { onBack: () => void }) {
  const [snake, setSnake] = useState<Cell[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const [food, setFood] = useState<{ pos: Cell; kind: FoodKind }>({
    pos: { x: 12, y: 8 },
    kind: "normal",
  });
  const [dir, setDir] = useState<Dir>("R");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [dead, setDead] = useState(false);
  const [running, setRunning] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [toast, setToast] = useState("");
  const [pulse, setPulse] = useState(false);
  const [tickMs, setTickMs] = useState(120);

  const dirRef = useRef<Dir>("R");
  const pendingRef = useRef<Dir | null>(null);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const foodRef = useRef(food);
  const wrapRef = useRef(wrap);
  const snakeLen = useRef(3);

  foodRef.current = food;
  wrapRef.current = wrap;

  const reset = () => {
    const start = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    const nextFood = rollFood(start);
    setSnake(start);
    setFood(nextFood);
    foodRef.current = nextFood;
    setDir("R");
    dirRef.current = "R";
    pendingRef.current = null;
    setScore(0);
    scoreRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    snakeLen.current = 3;
    setTickMs(120);
    setDead(false);
    setToast(wrap ? "Wrap walls on — eat the glow" : "Eat fast for combos");
    setRunning(true);
    playTap();
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
        const head = prev[0]!;
        const d = dirRef.current;
        let next = {
          x: head.x + (d === "L" ? -1 : d === "R" ? 1 : 0),
          y: head.y + (d === "U" ? -1 : d === "D" ? 1 : 0),
        };

        if (wrapRef.current) {
          next = { x: (next.x + SIZE) % SIZE, y: (next.y + SIZE) % SIZE };
        } else if (next.x < 0 || next.y < 0 || next.x >= SIZE || next.y >= SIZE) {
          setDead(true);
          setRunning(false);
          playBonk();
          setToast(`Wall bonk — ${scoreRef.current} pts`);
          return prev;
        }

        if (prev.some((s) => s.x === next.x && s.y === next.y)) {
          setDead(true);
          setRunning(false);
          playBonk();
          setToast(`Tangled — ${scoreRef.current} pts`);
          return prev;
        }

        const f = foodRef.current;
        const ate = next.x === f.pos.x && next.y === f.pos.y;
        let body = [next, ...prev];

        if (!ate) {
          body.pop();
          comboRef.current = Math.max(0, comboRef.current - 0.15);
          setCombo(Math.floor(comboRef.current));
        } else {
          const chain = Math.floor(comboRef.current) + 1;
          comboRef.current = chain;
          setCombo(chain);
          let gain = 10 + chain * 3;
          if (f.kind === "gold") {
            gain *= 3;
            setToast("GOLD BITE");
            playWin();
          } else if (f.kind === "shrink" && body.length > 4) {
            body = body.slice(0, Math.max(3, body.length - 3));
            setToast("TRIMMED");
            beep(700, 0.08, "triangle", 0.05);
          } else {
            beep(500 + Math.min(400, chain * 40), 0.06, "square", 0.045);
            if (chain >= 5 && chain % 5 === 0) setToast(`COMBO x${chain}`);
          }
          scoreRef.current += gain;
          setScore(scoreRef.current);
          setPulse(true);
          window.setTimeout(() => setPulse(false), 220);
          snakeLen.current = body.length;
          const nextFood = rollFood(body);
          foodRef.current = nextFood;
          setFood(nextFood);
          setTickMs((t) => Math.max(62, t - (f.kind === "gold" ? 6 : 2)));
        }
        return body;
      });
    }, tickMs);
    return () => window.clearInterval(id);
  }, [dead, running, tickMs]);

  return (
    <GameShell
      title="Snek"
      accent="var(--lime)"
      onBack={onBack}
      stats={
        <span className={pulse ? "animate-score-pop inline-block" : ""}>
          {score} pts{combo > 1 ? ` · x${combo}` : ""}
        </span>
      }
    >
      <div className="relative flex flex-col items-center gap-4">
        <Confetti show={dead && score >= 120} />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={running}
            onClick={() => setWrap((w) => !w)}
            className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${wrap ? "bg-lime" : "bg-paper-2"}`}
          >
            Walls: {wrap ? "wrap" : "solid"}
          </button>
          {toast && <span className="text-sm font-bold text-ink/70">{toast}</span>}
        </div>

        <div
          className={`chunky grid aspect-square w-full max-w-md rounded-lg bg-ink p-1 transition-transform ${pulse ? "scale-[1.02]" : ""}`}
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
            const isFood = food.pos.x === x && food.pos.y === y;
            let bg =
              y % 2 === x % 2 ? "#1f1c2a" : "#191622";
            if (isFood) {
              bg = food.kind === "gold" ? "#fbbf24" : food.kind === "shrink" ? "#7dd3fc" : "var(--coral)";
            } else if (isHead) bg = "var(--lime)";
            else if (isBody) bg = `color-mix(in srgb, var(--lime) ${Math.max(35, 90 - idx * 3)}%, #3a4a12)`;
            return <div key={i} className="rounded-[2px]" style={{ background: bg }} />;
          })}
        </div>

        {(dead || !running) && (
          <div className="text-center">
            <p className="mb-3 font-bold">
              {dead ? `Game over — ${score} pts` : "Arrows / WASD. Chain bites for combos."}
            </p>
            <button type="button" onClick={reset} className="btn-chunky rounded-md bg-lime px-5 py-2">
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
          Facing {dir === "U" ? "up" : dir === "D" ? "down" : dir === "L" ? "left" : "right"} · length{" "}
          {snake.length}
        </p>
      </div>
    </GameShell>
  );
}
