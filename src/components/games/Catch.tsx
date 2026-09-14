"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Kind = "snack" | "gold" | "bomb" | "slow";

type Drop = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: Kind;
  r: number;
  rot: number;
  spin: number;
};

type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const W = 420;
const H = 520;
const DURATION = 40_000;
const PADDLE_Y = H - 42;
const PADDLE_H = 14;

const FACE: Record<Kind, string> = {
  snack: "🍩",
  gold: "⭐",
  bomb: "💣",
  slow: "❄️",
};

function rollKind(elapsed: number): Kind {
  const r = Math.random();
  const heat = Math.min(1, elapsed / 25_000);
  if (r < 0.1 + heat * 0.06) return "bomb";
  if (r < 0.18) return "gold";
  if (r < 0.26) return "slow";
  return "snack";
}

export function CatchGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ score: 0, combo: 0, left: 40, lives: 3 });
  const [status, setStatus] = useState<"ready" | "play" | "done">("ready");
  const [toast, setToast] = useState("Catch snacks. Dodge bombs. Stack combos.");
  const statusRef = useRef(status);
  statusRef.current = status;

  const bag = useRef({
    drops: [] as Drop[],
    parts: [] as Spark[],
    paddleX: W / 2,
    paddleW: 86,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: 3,
    slowT: 0,
    shake: 0,
    id: 0,
    spawnAcc: 0,
    start: 0,
    missed: 0,
  });

  const boot = () => {
    const b = bag.current;
    b.drops = [];
    b.parts = [];
    b.paddleX = W / 2;
    b.paddleW = 86;
    b.score = 0;
    b.combo = 0;
    b.bestCombo = 0;
    b.lives = 3;
    b.slowT = 0;
    b.shake = 0;
    b.id = 0;
    b.spawnAcc = 0;
    b.missed = 0;
    b.start = performance.now();
    setHud({ score: 0, combo: 0, left: 40, lives: 3 });
    setToast("Catch the snacks!");
    setStatus("play");
    playTap();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const pointer = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const scale = W / rect.width;
      bag.current.paddleX = Math.max(
        bag.current.paddleW / 2,
        Math.min(W - bag.current.paddleW / 2, (clientX - rect.left) * scale),
      );
    };

    const onMove = (e: PointerEvent) => pointer(e.clientX);
    const onDown = (e: PointerEvent) => {
      pointer(e.clientX);
      if (statusRef.current !== "play") boot();
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);

    const burst = (x: number, y: number, color: string, n = 10) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.2 + Math.random() * 3.5;
        bag.current.parts.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.3 + Math.random() * 0.35,
          color,
        });
      }
    };

    const spawn = (elapsed: number) => {
      const b = bag.current;
      const kind = rollKind(elapsed);
      const r = kind === "gold" ? 16 : kind === "bomb" ? 15 : 14;
      b.drops.push({
        id: ++b.id,
        x: 28 + randInt(W - 56),
        y: -20,
        vx: (Math.random() - 0.5) * (1.2 + elapsed / 18_000),
        vy: 1.6 + Math.random() * 1.4 + elapsed / 14_000,
        kind,
        r,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.18,
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const b = bag.current;
      const playing = statusRef.current === "play";

      if (playing) {
        const elapsed = now - b.start;
        const left = Math.max(0, DURATION - elapsed);
        if (b.slowT > 0) b.slowT = Math.max(0, b.slowT - dt);
        if (b.shake > 0) b.shake = Math.max(0, b.shake - dt);

        const pace = 0.55 - Math.min(0.28, elapsed / 50_000);
        b.spawnAcc += dt;
        while (b.spawnAcc >= pace) {
          b.spawnAcc -= pace;
          spawn(elapsed);
        }

        const fallMul = b.slowT > 0 ? 0.55 : 1;
        for (const d of b.drops) {
          d.x += d.vx * fallMul;
          d.y += d.vy * 60 * dt * fallMul;
          d.rot += d.spin;
          if (d.x < d.r || d.x > W - d.r) d.vx *= -1;
        }

        for (let i = b.drops.length - 1; i >= 0; i--) {
          const d = b.drops[i]!;
          const caught =
            d.y + d.r >= PADDLE_Y &&
            d.y - d.r <= PADDLE_Y + PADDLE_H + 8 &&
            d.x > b.paddleX - b.paddleW / 2 - 4 &&
            d.x < b.paddleX + b.paddleW / 2 + 4;

          if (caught) {
            if (d.kind === "bomb") {
              b.lives -= 1;
              b.combo = 0;
              b.shake = 0.35;
              burst(d.x, d.y, "#f43f5e", 14);
              playBonk();
              setToast("Bomb! Combo reset");
              if (b.lives <= 0) {
                setStatus("done");
                setToast(`Run over — ${b.score} pts · best combo x${b.bestCombo}`);
                playBonk();
              }
            } else if (d.kind === "slow") {
              b.slowT = 4.5;
              b.combo += 1;
              b.score += 8 + b.combo;
              burst(d.x, d.y, "#7dd3fc", 8);
              beep(520, 0.06, "triangle", 0.05);
              setToast("SLOW-MO");
            } else {
              const mult = d.kind === "gold" ? 3 : 1;
              b.combo += 1;
              b.bestCombo = Math.max(b.bestCombo, b.combo);
              b.score += (10 + b.combo * 2) * mult;
              burst(d.x, d.y, d.kind === "gold" ? "#fbbf24" : "#fb7185", 10);
              beep(480 + Math.min(420, b.combo * 35), 0.05, "square", 0.045);
              if (b.combo > 0 && b.combo % 8 === 0) {
                playWin();
                setToast(`FEVER x${b.combo}`);
              } else if (d.kind === "gold") setToast("GOLD CATCH");
            }
            b.drops.splice(i, 1);
            setHud({
              score: b.score,
              combo: b.combo,
              left: Math.ceil(left / 1000),
              lives: b.lives,
            });
            continue;
          }

          if (d.y > H + 30) {
            if (d.kind === "snack" || d.kind === "gold") {
              b.combo = 0;
              b.missed += 1;
              if (b.missed % 3 === 0) {
                b.lives -= 1;
                b.shake = 0.2;
                playBonk();
                setToast("Missed too many!");
                if (b.lives <= 0) {
                  setStatus("done");
                  setToast(`Run over — ${b.score} pts · best combo x${b.bestCombo}`);
                }
              }
            }
            b.drops.splice(i, 1);
            setHud({
              score: b.score,
              combo: b.combo,
              left: Math.ceil(left / 1000),
              lives: b.lives,
            });
          }
        }

        if (left <= 0 && statusRef.current === "play") {
          setStatus("done");
          setToast(`Time! ${b.score} pts · best combo x${b.bestCombo}`);
          if (b.score >= 180) playWin();
          else playBonk();
        } else {
          setHud({
            score: b.score,
            combo: b.combo,
            left: Math.ceil(left / 1000),
            lives: b.lives,
          });
        }
      }

      for (let i = b.parts.length - 1; i >= 0; i--) {
        const p = b.parts[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.life -= dt;
        if (p.life <= 0) b.parts.splice(i, 1);
      }

      const sx = b.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
      const sy = b.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.clearRect(-10, -10, W + 20, H + 20);

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#2a1830");
      g.addColorStop(1, "#1a1020");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,255,255,0.04)";
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.arc((i * 73) % W, (i * 97 + now * 0.02) % H, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#3f2a45";
      ctx.fillRect(0, PADDLE_Y + 18, W, H - PADDLE_Y);

      for (const d of b.drops) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.font = `${d.r * 2}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(FACE[d.kind], 0, 0);
        ctx.restore();
      }

      ctx.fillStyle = b.slowT > 0 ? "#7dd3fc" : "#f43f5e";
      ctx.beginPath();
      ctx.roundRect(b.paddleX - b.paddleW / 2, PADDLE_Y, b.paddleW, PADDLE_H, 8);
      ctx.fill();
      ctx.strokeStyle = "#16141f";
      ctx.lineWidth = 3;
      ctx.stroke();

      for (const p of b.parts) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      }

      if (b.combo > 1) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 18px Rubik, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`x${b.combo}`, W / 2, 36);
      }

      ctx.restore();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <GameShell
      title="Catch!"
      accent="#f43f5e"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {hud.score} · ❤{hud.lives} · {hud.left}s
          {hud.combo > 1 ? ` · x${hud.combo}` : ""}
        </span>
      }
    >
      <div className="relative mx-auto w-full max-w-md">
        <Confetti show={status === "done" && hud.score >= 180} />
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="chunky mx-auto block w-full touch-none rounded-xl"
        />
        <p className="mt-3 text-center text-sm font-semibold text-ink/70">{toast}</p>
        {status !== "play" && (
          <div className="mt-3 flex justify-center">
            <button type="button" onClick={boot} className="btn-chunky rounded-md bg-[#f43f5e] px-5 py-2 text-white">
              {status === "done" ? "Play again" : "Start catching"}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
