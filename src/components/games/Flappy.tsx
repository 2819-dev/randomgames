"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Pipe = { x: number; gapY: number; passed: boolean };

export function FlappyGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [dead, setDead] = useState(false);
  const state = useRef({
    y: 160,
    vy: 0,
    pipes: [] as Pipe[],
    frame: 0,
    W: 400,
    H: 480,
  });

  const start = () => {
    const W = canvasRef.current?.parentElement?.clientWidth || 400;
    state.current = {
      y: 180,
      vy: 0,
      pipes: [{ x: W + 40, gapY: 160 + randInt(140), passed: false }],
      frame: 0,
      W,
      H: 480,
    };
    setScore(0);
    setDead(false);
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

    const sync = () => {
      const { W, H } = state.current;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sync();

    const flap = () => {
      state.current.vy = -6.2;
      playTap();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    canvas.addEventListener("pointerdown", flap);
    window.addEventListener("keydown", onKey);

    const tick = () => {
      if (!alive) return;
      const S = state.current;
      S.frame += 1;
      S.vy += 0.32;
      S.y += S.vy;

      if (S.frame % 90 === 0) {
        S.pipes.push({ x: S.W + 20, gapY: 120 + randInt(200), passed: false });
      }
      for (const p of S.pipes) p.x -= 2.6;
      S.pipes = S.pipes.filter((p) => p.x > -60);

      const bird = { x: 72, y: S.y, r: 14 };
      const gap = 118;
      for (const p of S.pipes) {
        const hitX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + 52;
        const hitY = bird.y - bird.r < p.gapY || bird.y + bird.r > p.gapY + gap;
        if (hitX && hitY) {
          playBonk();
          setDead(true);
          setRunning(false);
          setBest((b) => Math.max(b, score));
          alive = false;
          return;
        }
        if (!p.passed && p.x + 52 < bird.x) {
          p.passed = true;
          setScore((s) => {
            const n = s + 1;
            if (n % 5 === 0) playWin();
            setBest((b) => Math.max(b, n));
            return n;
          });
        }
      }
      if (S.y > S.H - 30 || S.y < 10) {
        playBonk();
        setDead(true);
        setRunning(false);
        alive = false;
        return;
      }

      // draw
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(0, 0, S.W, S.H);
      // ground
      ctx.fillStyle = "#c8f542";
      ctx.fillRect(0, S.H - 24, S.W, 24);
      ctx.strokeStyle = "#16141f";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, S.H - 24, S.W, 24);

      for (const p of S.pipes) {
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(p.x, 0, 52, p.gapY);
        ctx.fillRect(p.x, p.gapY + gap, 52, S.H - (p.gapY + gap) - 24);
        ctx.strokeRect(p.x, 0, 52, p.gapY);
        ctx.strokeRect(p.x, p.gapY + gap, 52, S.H - (p.gapY + gap) - 24);
      }

      ctx.fillStyle = "#ffd84d";
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#16141f";
      ctx.beginPath();
      ctx.arc(bird.x + 5, bird.y - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff5a45";
      ctx.beginPath();
      ctx.moveTo(bird.x + 10, bird.y);
      ctx.lineTo(bird.x + 20, bird.y + 3);
      ctx.lineTo(bird.x + 10, bird.y + 6);
      ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", flap);
      window.removeEventListener("keydown", onKey);
    };
  }, [running, score]);

  return (
    <GameShell
      title="Flap"
      accent="#7dd3fc"
      onBack={onBack}
      stats={
        <span>
          {score} · best {best}
        </span>
      }
    >
      <div className="relative">
        <Confetti show={score > 0 && score % 10 === 0 && running} />
        <div className="chunky overflow-hidden rounded-xl">
          <canvas ref={canvasRef} className="block w-full touch-none" />
        </div>
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/90 text-center">
            <p className="mb-3 font-bold">
              {dead ? `Bonk! Score ${score}` : "Tap / space to flap. Don't kiss pipes."}
            </p>
            <button type="button" onClick={start} className="btn-chunky rounded-md bg-[#7dd3fc] px-5 py-2">
              {dead ? "Again" : "Flap"}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
