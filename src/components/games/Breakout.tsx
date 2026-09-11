"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";

type Brick = { x: number; y: number; hp: number; color: string };

const COLS = 8;
const ROWS = 5;
const COLORS = ["#ff5a45", "#ff8c42", "#ffd84d", "#c8f542", "#3d7cff"];

export function BreakoutGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const state = useRef({
    paddleX: 0,
    ball: { x: 0, y: 0, vx: 3.2, vy: -3.4 },
    bricks: [] as Brick[],
    W: 480,
    H: 360,
    pointer: null as number | null,
  });

  const buildBricks = (W: number) => {
    const bw = W / COLS - 6;
    const bricks: Brick[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: c * (bw + 6) + 3,
          y: 40 + r * 22,
          hp: 1,
          color: COLORS[r % COLORS.length],
        });
      }
    }
    return bricks;
  };

  const start = () => {
    const canvas = canvasRef.current;
    const W = canvas?.parentElement?.clientWidth || 480;
    const H = 360;
    state.current.W = W;
    state.current.H = H;
    state.current.paddleX = W / 2 - 40;
    state.current.ball = { x: W / 2, y: H - 60, vx: 3.2, vy: -3.4 };
    state.current.bricks = buildBricks(W);
    setScore(0);
    setLives(3);
    setWon(false);
    setLost(false);
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let alive = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncSize = () => {
      const W = state.current.W;
      const H = state.current.H;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.current.pointer = e.clientX - rect.left;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);

    const tick = () => {
      if (!alive) return;
      const S = state.current;
      const paddleW = 84;
      const paddleH = 12;
      if (S.pointer != null) {
        S.paddleX = Math.max(0, Math.min(S.W - paddleW, S.pointer - paddleW / 2));
      }
      S.ball.x += S.ball.vx;
      S.ball.y += S.ball.vy;

      if (S.ball.x < 8 || S.ball.x > S.W - 8) S.ball.vx *= -1;
      if (S.ball.y < 8) S.ball.vy *= -1;

      // paddle
      if (
        S.ball.y > S.H - 28 &&
        S.ball.y < S.H - 10 &&
        S.ball.x > S.paddleX &&
        S.ball.x < S.paddleX + paddleW
      ) {
        S.ball.vy = -Math.abs(S.ball.vy);
        const hit = (S.ball.x - (S.paddleX + paddleW / 2)) / (paddleW / 2);
        S.ball.vx = hit * 4.2;
        playTap();
      }

      // bricks
      for (const b of S.bricks) {
        if (b.hp <= 0) continue;
        const bw = S.W / COLS - 6;
        if (
          S.ball.x > b.x &&
          S.ball.x < b.x + bw &&
          S.ball.y > b.y &&
          S.ball.y < b.y + 16
        ) {
          b.hp = 0;
          S.ball.vy *= -1;
          setScore((s) => s + 10);
          playTap();
          break;
        }
      }

      if (S.bricks.every((b) => b.hp <= 0)) {
        setWon(true);
        setRunning(false);
        playWin();
        alive = false;
        return;
      }

      if (S.ball.y > S.H + 10) {
        setLives((L) => {
          const next = L - 1;
          if (next <= 0) {
            setLost(true);
            setRunning(false);
            playBonk();
            alive = false;
          } else {
            S.ball = { x: S.W / 2, y: S.H - 60, vx: 3.2, vy: -3.4 };
            playBonk();
          }
          return next;
        });
        if (!alive) return;
      }

      // draw
      ctx.fillStyle = "#1a1520";
      ctx.fillRect(0, 0, S.W, S.H);
      for (const b of S.bricks) {
        if (b.hp <= 0) continue;
        const bw = S.W / COLS - 6;
        ctx.fillStyle = b.color;
        ctx.strokeStyle = "#16141f";
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, bw, 16);
        ctx.strokeRect(b.x, b.y, bw, 16);
      }
      ctx.fillStyle = "#c8f542";
      ctx.fillRect(S.paddleX, S.H - 22, paddleW, paddleH);
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.arc(S.ball.x, S.ball.y, 7, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
    };
  }, [running]);

  return (
    <GameShell
      title="Breakout"
      accent="#ff8c42"
      onBack={onBack}
      stats={
        <span>
          {score} · ❤️ {lives}
        </span>
      }
    >
      <div className="relative">
        <Confetti show={won} />
        <div className="chunky overflow-hidden rounded-xl">
          <canvas ref={canvasRef} className="block w-full touch-none bg-ink" />
        </div>
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/90 text-center">
            <p className="mb-3 font-bold">
              {won ? "Cleared the wall!" : lost ? "Ball escaped." : "Bounce the ball. Smash bricks."}
            </p>
            <button type="button" onClick={start} className="btn-chunky rounded-md bg-[#ff8c42] px-5 py-2">
              {won || lost ? "Again" : "Serve"}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
