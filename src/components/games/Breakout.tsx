"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Props = { onBack: () => void };

const W = 420;
const H = 520;
const BR = 8;
const BLOCK_ROWS = 6;
const BLOCK_COLS = 10;
const BLOCK_H = 18;
const BLOCK_GAP = 4;
const PADDLE_H = 12;
const PADDLE_Y = H - 36;

type PowerKind = "wide" | "multi" | "laser" | "slow" | "life";

type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  points: number;
  power?: PowerKind;
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

type Drop = {
  x: number;
  y: number;
  kind: PowerKind;
};

type Laser = {
  x: number;
  y: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

const POWER_COLORS: Record<PowerKind, string> = {
  wide: "#38bdf8",
  multi: "#a3e635",
  laser: "#f43f5e",
  slow: "#c084fc",
  life: "#fb7185",
};

function makeLevel(level: number): Block[] {
  const margin = 18;
  const usable = W - margin * 2 - BLOCK_GAP * (BLOCK_COLS - 1);
  const bw = usable / BLOCK_COLS;
  const out: Block[] = [];
  for (let r = 0; r < BLOCK_ROWS; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      if (level > 2 && r === 2 && c > 2 && c < 7 && Math.random() < 0.35) continue;
      const tough = r < Math.min(2 + Math.floor(level / 2), 4);
      const hp = tough ? 2 + (level > 3 && r === 0 ? 1 : 0) : 1;
      let power: PowerKind | undefined;
      const roll = Math.random();
      if (roll < 0.045) power = "life";
      else if (roll < 0.1) power = "laser";
      else if (roll < 0.18) power = "multi";
      else if (roll < 0.26) power = "wide";
      else if (roll < 0.32) power = "slow";
      out.push({
        x: margin + c * (bw + BLOCK_GAP),
        y: 54 + r * (BLOCK_H + BLOCK_GAP),
        w: bw,
        h: BLOCK_H,
        hp,
        maxHp: hp,
        points: 10 * hp + level * 2,
        power,
      });
    }
  }
  return out;
}

function spawnBall(x = W / 2, y = PADDLE_Y - 20, angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9): Ball {
  const speed = 4.4;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: BR,
  };
}

function explode(parts: Spark[], x: number, y: number, color: string, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3.5;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.4,
      color,
    });
  }
}

export function BreakoutGame({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1, combo: 0 });
  const [status, setStatus] = useState<"ready" | "play" | "win" | "lose">("ready");
  const [toast, setToast] = useState("");
  const statusRef = useRef(status);
  statusRef.current = status;

  const bag = useRef({
    blocks: [] as Block[],
    balls: [] as Ball[],
    drops: [] as Drop[],
    lasers: [] as Laser[],
    parts: [] as Spark[],
    paddleX: W / 2,
    paddleW: 78,
    wideT: 0,
    laserT: 0,
    slowT: 0,
    score: 0,
    lives: 3,
    level: 1,
    combo: 0,
    bestCombo: 0,
    stuck: true,
    pointerDown: false,
  });

  const syncHud = useCallback(() => {
    const b = bag.current;
    setHud({ score: b.score, lives: b.lives, level: b.level, combo: b.combo });
  }, []);

  const bootLevel = useCallback(
    (level: number, keepScore = false) => {
      const b = bag.current;
      b.level = level;
      b.blocks = makeLevel(level);
      b.balls = [spawnBall()];
      b.drops = [];
      b.lasers = [];
      b.parts = [];
      b.paddleX = W / 2;
      b.paddleW = 78;
      b.wideT = 0;
      b.laserT = 0;
      b.slowT = 0;
      b.combo = 0;
      b.stuck = true;
      if (!keepScore) {
        b.score = 0;
        b.lives = 3;
        b.bestCombo = 0;
      }
      setStatus("ready");
      setToast(level === 1 ? "Click / tap to serve" : `Level ${level} — serve!`);
      syncHud();
    },
    [syncHud],
  );

  useEffect(() => {
    bootLevel(1);
  }, [bootLevel]);

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
      bag.current.pointerDown = true;
      pointer(e.clientX);
      if (statusRef.current === "ready") {
        bag.current.stuck = false;
        setStatus("play");
        setToast("");
        playTap();
      } else if (statusRef.current === "play" && bag.current.laserT > 0) {
        bag.current.lasers.push({ x: bag.current.paddleX - 10, y: PADDLE_Y });
        bag.current.lasers.push({ x: bag.current.paddleX + 10, y: PADDLE_Y });
        beep(880, 0.04, "square", 0.05);
      }
    };
    const onUp = () => {
      bag.current.pointerDown = false;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    const hitBlock = (ball: Ball, block: Block) => {
      const near = ball.x + ball.r > block.x && ball.x - ball.r < block.x + block.w && ball.y + ball.r > block.y && ball.y - ball.r < block.y + block.h;
      if (!near) return false;
      const prevX = ball.x - ball.vx;
      const prevY = ball.y - ball.vy;
      const fromLeft = prevX + ball.r <= block.x;
      const fromRight = prevX - ball.r >= block.x + block.w;
      const fromTop = prevY + ball.r <= block.y;
      const fromBottom = prevY - ball.r >= block.y + block.h;
      if (fromLeft || fromRight) ball.vx *= -1;
      else if (fromTop || fromBottom) ball.vy *= -1;
      else {
        ball.vx *= -1;
        ball.vy *= -1;
      }
      return true;
    };

    const collectPower = (kind: PowerKind) => {
      const b = bag.current;
      if (kind === "wide") {
        b.wideT = 10;
        b.paddleW = 118;
        setToast("WIDE PADDLE");
      } else if (kind === "multi") {
        const base = b.balls[0] ?? spawnBall(b.paddleX, PADDLE_Y - 20);
        b.balls.push(spawnBall(base.x, base.y, -Math.PI / 2 - 0.45));
        b.balls.push(spawnBall(base.x, base.y, -Math.PI / 2 + 0.45));
        setToast("MULTI-BALL");
      } else if (kind === "laser") {
        b.laserT = 8;
        setToast("LASERS — tap to fire");
      } else if (kind === "slow") {
        b.slowT = 7;
        setToast("SLOW-MO");
      } else if (kind === "life") {
        b.lives += 1;
        setToast("+1 LIFE");
      }
      playWin();
      syncHud();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const b = bag.current;
      const playing = statusRef.current === "play";
      const speedMul = b.slowT > 0 ? 0.62 : 1;

      if (playing) {
        if (b.wideT > 0) {
          b.wideT -= dt;
          if (b.wideT <= 0) b.paddleW = 78;
        }
        if (b.laserT > 0) b.laserT -= dt;
        if (b.slowT > 0) b.slowT -= dt;

        if (b.stuck && b.balls[0]) {
          b.balls[0].x = b.paddleX;
          b.balls[0].y = PADDLE_Y - 20;
        } else {
          for (const ball of b.balls) {
            ball.x += ball.vx * speedMul;
            ball.y += ball.vy * speedMul;
            if (ball.x < ball.r || ball.x > W - ball.r) {
              ball.vx *= -1;
              ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
            }
            if (ball.y < ball.r) {
              ball.vy = Math.abs(ball.vy);
              ball.y = ball.r;
            }

            if (
              ball.vy > 0 &&
              ball.y + ball.r >= PADDLE_Y &&
              ball.y - ball.r <= PADDLE_Y + PADDLE_H &&
              ball.x > b.paddleX - b.paddleW / 2 &&
              ball.x < b.paddleX + b.paddleW / 2
            ) {
              const hit = (ball.x - b.paddleX) / (b.paddleW / 2);
              const angle = -Math.PI / 2 + hit * 1.1;
              const speed = Math.min(7.8, Math.hypot(ball.vx, ball.vy) * 1.03 + 0.05);
              ball.vx = Math.cos(angle) * speed;
              ball.vy = Math.sin(angle) * speed;
              ball.y = PADDLE_Y - ball.r - 1;
              b.combo = 0;
              beep(320, 0.04, "triangle", 0.05);
              syncHud();
            }

            for (let i = b.blocks.length - 1; i >= 0; i--) {
              const block = b.blocks[i];
              if (!hitBlock(ball, block)) continue;
              block.hp -= 1;
              explode(b.parts, block.x + block.w / 2, block.y + block.h / 2, block.hp <= 0 ? "#fbbf24" : "#94a3b8", 8);
              if (block.hp <= 0) {
                b.score += block.points + b.combo * 2;
                b.combo += 1;
                b.bestCombo = Math.max(b.bestCombo, b.combo);
                if (block.power) b.drops.push({ x: block.x + block.w / 2, y: block.y + block.h / 2, kind: block.power });
                b.blocks.splice(i, 1);
                beep(520 + Math.min(400, b.combo * 40), 0.05, "square", 0.05);
              } else {
                playBonk();
              }
              syncHud();
              break;
            }
          }

          b.balls = b.balls.filter((ball) => ball.y < H + 30);
          if (b.balls.length === 0) {
            b.lives -= 1;
            b.combo = 0;
            syncHud();
            if (b.lives <= 0) {
              setStatus("lose");
              playBonk();
            } else {
              b.balls = [spawnBall(b.paddleX)];
              b.stuck = true;
              setStatus("ready");
              setToast("Life lost — click to serve");
              playBonk();
            }
          }

          for (const drop of b.drops) drop.y += 110 * dt;
          for (let i = b.drops.length - 1; i >= 0; i--) {
            const drop = b.drops[i];
            if (
              drop.y > PADDLE_Y - 4 &&
              drop.y < PADDLE_Y + PADDLE_H + 8 &&
              drop.x > b.paddleX - b.paddleW / 2 &&
              drop.x < b.paddleX + b.paddleW / 2
            ) {
              collectPower(drop.kind);
              b.drops.splice(i, 1);
            } else if (drop.y > H + 20) {
              b.drops.splice(i, 1);
            }
          }

          for (const laser of b.lasers) laser.y -= 520 * dt;
          for (let i = b.lasers.length - 1; i >= 0; i--) {
            const laser = b.lasers[i];
            let hit = false;
            for (let j = b.blocks.length - 1; j >= 0; j--) {
              const block = b.blocks[j];
              if (laser.x > block.x && laser.x < block.x + block.w && laser.y > block.y && laser.y < block.y + block.h) {
                block.hp -= 1;
                explode(b.parts, block.x + block.w / 2, block.y + block.h / 2, "#fb7185", 6);
                if (block.hp <= 0) {
                  b.score += block.points;
                  if (block.power) b.drops.push({ x: block.x + block.w / 2, y: block.y + block.h / 2, kind: block.power });
                  b.blocks.splice(j, 1);
                }
                hit = true;
                syncHud();
                break;
              }
            }
            if (hit || laser.y < -20) b.lasers.splice(i, 1);
          }

          if (b.blocks.length === 0) {
            playWin();
            setStatus("win");
            setToast(`Level ${b.level} clear! Best combo x${b.bestCombo}`);
          }
        }
      }

      for (let i = b.parts.length - 1; i >= 0; i--) {
        const p = b.parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= dt;
        if (p.life <= 0) b.parts.splice(i, 1);
      }

      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0f172a");
      g.addColorStop(1, "#1e293b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      for (const block of b.blocks) {
        const t = block.hp / block.maxHp;
        ctx.fillStyle = t > 0.66 ? "#f43f5e" : t > 0.33 ? "#fb923c" : "#fbbf24";
        ctx.beginPath();
        ctx.roundRect(block.x, block.y, block.w, block.h, 4);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (block.power) {
          ctx.fillStyle = POWER_COLORS[block.power];
          ctx.beginPath();
          ctx.arc(block.x + block.w / 2, block.y + block.h / 2, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const drop of b.drops) {
        ctx.fillStyle = POWER_COLORS[drop.kind];
        ctx.beginPath();
        ctx.roundRect(drop.x - 9, drop.y - 9, 18, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 10px Rubik, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(drop.kind[0]!.toUpperCase(), drop.x, drop.y + 0.5);
      }

      for (const laser of b.lasers) {
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(laser.x, laser.y);
        ctx.lineTo(laser.x, laser.y - 14);
        ctx.stroke();
      }

      ctx.fillStyle = b.laserT > 0 ? "#fb7185" : "#e2e8f0";
      ctx.beginPath();
      ctx.roundRect(b.paddleX - b.paddleW / 2, PADDLE_Y, b.paddleW, PADDLE_H, 6);
      ctx.fill();
      if (b.wideT > 0) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      for (const ball of b.balls) {
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of b.parts) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 12px Rubik, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Lv ${b.level}`, 12, 22);
      ctx.textAlign = "right";
      if (b.combo > 1) {
        ctx.fillStyle = "#a3e635";
        ctx.fillText(`COMBO x${b.combo}`, W - 12, 22);
      }
      if (b.laserT > 0 || b.slowT > 0 || b.wideT > 0) {
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        const bits = [
          b.wideT > 0 ? `WIDE ${b.wideT.toFixed(0)}` : "",
          b.laserT > 0 ? `LASER ${b.laserT.toFixed(0)}` : "",
          b.slowT > 0 ? `SLOW ${b.slowT.toFixed(0)}` : "",
        ].filter(Boolean);
        ctx.fillText(bits.join(" · "), W / 2, 22);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [syncHud]);

  return (
    <GameShell
      title="Breakout+"
      accent="bg-sky"
      onBack={onBack}
      stats={
        <span>
          {hud.score} · ❤{hud.lives} · Lv{hud.level}
          {hud.combo > 1 ? ` · x${hud.combo}` : ""}
        </span>
      }
    >
      <Confetti show={status === "win"} />
      <div className="mx-auto w-full max-w-md">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="chunky mx-auto block w-full touch-none bg-ink"
        />
        <p className="mt-3 text-center text-sm font-semibold text-ink/70">
          {toast || "Drag to aim the paddle. Catch glowing drops for chaos."}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {status === "lose" && (
            <button type="button" className="btn-chunky bg-sky" onClick={() => bootLevel(1)}>
              Retry run
            </button>
          )}
          {status === "win" && (
            <button
              type="button"
              className="btn-chunky bg-lime"
              onClick={() => bootLevel(bag.current.level + 1, true)}
            >
              Next level
            </button>
          )}
          {(status === "win" || status === "lose") && (
            <button type="button" className="btn-chunky bg-paper" onClick={() => bootLevel(1)}>
              Fresh start
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
