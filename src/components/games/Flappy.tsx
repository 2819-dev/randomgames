"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Pipe = { x: number; gapY: number; passed: boolean; gap: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number };

export function FlappyGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [dead, setDead] = useState(false);
  const [toast, setToast] = useState("");
  const scoreRef = useRef(0);

  const state = useRef({
    y: 160,
    vy: 0,
    pipes: [] as Pipe[],
    parts: [] as Spark[],
    frame: 0,
    W: 400,
    H: 480,
    shake: 0,
    trail: [] as { x: number; y: number }[],
  });

  const start = () => {
    const W = canvasRef.current?.parentElement?.clientWidth || 400;
    scoreRef.current = 0;
    state.current = {
      y: 200,
      vy: 0,
      pipes: [{ x: W + 40, gapY: 140 + randInt(120), passed: false, gap: 138 }],
      parts: [],
      frame: 0,
      W,
      H: 480,
      shake: 0,
      trail: [],
    };
    setScore(0);
    setDead(false);
    setToast("");
    setRunning(true);
    playTap();
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
      state.current.vy = -7.1;
      playTap();
      const S = state.current;
      for (let i = 0; i < 5; i++) {
        S.parts.push({
          x: 72,
          y: S.y + 8,
          vx: -1 - Math.random() * 2,
          vy: Math.random() * 2,
          life: 0.25 + Math.random() * 0.2,
        });
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    canvas.addEventListener("pointerdown", flap);
    window.addEventListener("keydown", onKey);

    const die = (msg: string) => {
      playBonk();
      setDead(true);
      setRunning(false);
      setToast(msg);
      setBest((b) => Math.max(b, scoreRef.current));
      state.current.shake = 0.4;
      alive = false;
    };

    const tick = () => {
      if (!alive) return;
      const S = state.current;
      S.frame += 1;
      S.vy = Math.min(11, S.vy + 0.38);
      S.y += S.vy;
      if (S.shake > 0) S.shake -= 0.016;

      S.trail.push({ x: 72, y: S.y });
      if (S.trail.length > 8) S.trail.shift();

      const spawnEvery = Math.max(70, 95 - Math.floor(scoreRef.current * 1.5));
      if (S.frame % spawnEvery === 0) {
        const gap = Math.max(96, 138 - scoreRef.current * 2.2);
        S.pipes.push({
          x: S.W + 20,
          gapY: 90 + randInt(Math.max(40, S.H - 140 - gap)),
          passed: false,
          gap,
        });
      }

      const speed = 2.5 + Math.min(2.2, scoreRef.current * 0.08);
      for (const p of S.pipes) p.x -= speed;
      S.pipes = S.pipes.filter((p) => p.x > -70);

      for (const p of S.parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.016;
      }
      S.parts = S.parts.filter((p) => p.life > 0);

      const bird = { x: 72, y: S.y, r: 13 };
      for (const p of S.pipes) {
        const hitX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + 52;
        const topEdge = Math.abs(bird.y - bird.r - p.gapY);
        const botEdge = Math.abs(bird.y + bird.r - (p.gapY + p.gap));
        const hitY = bird.y - bird.r < p.gapY || bird.y + bird.r > p.gapY + p.gap;
        if (hitX && hitY) {
          die(`Bonk! Score ${scoreRef.current}`);
          return;
        }
        if (hitX && !hitY && Math.min(topEdge, botEdge) < 10 && !p.passed) {
          // near-miss juice once approaching pass
        }
        if (!p.passed && p.x + 52 < bird.x) {
          p.passed = true;
          const near = Math.min(topEdge, botEdge) < 14;
          const gain = near ? 2 : 1;
          scoreRef.current += gain;
          setScore(scoreRef.current);
          beep(560 + scoreRef.current * 12, 0.06, "triangle", 0.05);
          if (near) {
            setToast("NEAR MISS +2");
            beep(920, 0.05, "square", 0.04);
          }
          if (scoreRef.current % 5 === 0) playWin();
          setBest((b) => Math.max(b, scoreRef.current));
        }
      }

      if (S.y > S.H - 34 || S.y < 12) {
        die(`Floor/ceiling — ${scoreRef.current}`);
        return;
      }

      const sx = S.shake > 0 ? (Math.random() - 0.5) * 7 : 0;
      const sy = S.shake > 0 ? (Math.random() - 0.5) * 5 : 0;
      ctx.save();
      ctx.translate(sx, sy);

      const sky = ctx.createLinearGradient(0, 0, 0, S.H);
      sky.addColorStop(0, "#5ec8ff");
      sky.addColorStop(1, "#b8ecff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, S.W, S.H);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 110 - S.frame * (0.4 + i * 0.1)) % (S.W + 80)) - 40;
        ctx.beginPath();
        ctx.ellipse(cx, 50 + i * 18, 36, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#c8f542";
      ctx.fillRect(0, S.H - 28, S.W, 28);
      ctx.strokeStyle = "#16141f";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, S.H - 28, S.W, 28);

      for (const p of S.pipes) {
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(p.x, 0, 52, p.gapY);
        ctx.fillRect(p.x, p.gapY + p.gap, 52, S.H - (p.gapY + p.gap) - 28);
        ctx.strokeRect(p.x, 0, 52, p.gapY);
        ctx.strokeRect(p.x, p.gapY + p.gap, 52, S.H - (p.gapY + p.gap) - 28);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(p.x - 4, p.gapY - 14, 60, 14);
        ctx.fillRect(p.x - 4, p.gapY + p.gap, 60, 14);
        ctx.strokeRect(p.x - 4, p.gapY - 14, 60, 14);
        ctx.strokeRect(p.x - 4, p.gapY + p.gap, 60, 14);
      }

      for (let i = 0; i < S.trail.length; i++) {
        const t = S.trail[i]!;
        ctx.globalAlpha = (i + 1) / S.trail.length / 3;
        ctx.fillStyle = "#ffd84d";
        ctx.beginPath();
        ctx.arc(t.x - (S.trail.length - i) * 4, t.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const p of S.parts) {
        ctx.globalAlpha = Math.max(0, p.life * 3);
        ctx.fillStyle = "#fff";
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;

      const tilt = Math.max(-0.6, Math.min(0.8, S.vy * 0.06));
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(tilt);
      ctx.fillStyle = "#ffd84d";
      ctx.beginPath();
      ctx.ellipse(0, 0, bird.r + 2, bird.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#16141f";
      ctx.beginPath();
      ctx.arc(5, -3, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff5a45";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(20, 3);
      ctx.lineTo(10, 6);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#16141f";
      ctx.font = "bold 28px Rubik, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(scoreRef.current), S.W / 2, 48);

      ctx.restore();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", flap);
      window.removeEventListener("keydown", onKey);
    };
  }, [running]);

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
              {dead ? toast || `Bonk! Score ${score}` : "Tap / space to flap. Graze pipes for bonus points."}
            </p>
            <button type="button" onClick={start} className="btn-chunky rounded-md bg-[#7dd3fc] px-5 py-2">
              {dead ? "Again" : "Flap"}
            </button>
          </div>
        )}
        {running && toast && (
          <p className="pointer-events-none absolute left-0 right-0 top-3 text-center text-sm font-extrabold text-ink">
            {toast}
          </p>
        )}
      </div>
    </GameShell>
  );
}
