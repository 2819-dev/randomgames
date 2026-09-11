"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Pt = { x: number; y: number };
type Enemy = { p: Pt; v: Pt; r: number; hp: number; worth: number; tint: string };
type Gem = { p: Pt; value: number };
type Spark = { p: Pt; v: Pt; life: number; c: string };

const W = 420;
const H = 420;
const CX = W / 2;
const CY = H / 2;
const ARENA_R = 178;

function inArena(p: Pt, pad = 0) {
  return Math.hypot(p.x - CX, p.y - CY) < ARENA_R - pad;
}

function burst(parts: Spark[], p: Pt, c: string, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random() * 3.5;
    parts.push({
      p: { ...p },
      v: { x: Math.cos(a) * s, y: Math.sin(a) * s },
      life: 0.3 + Math.random() * 0.4,
      c,
    });
  }
}

function spawnEnemy(level: number): Enemy {
  const a = Math.random() * Math.PI * 2;
  const p = { x: CX + Math.cos(a) * (ARENA_R - 8), y: CY + Math.sin(a) * (ARENA_R - 8) };
  const tough = Math.random() < 0.12 + level * 0.02;
  return {
    p,
    v: { x: 0, y: 0 },
    r: tough ? 14 : 9 + randInt(4),
    hp: tough ? 3 + Math.floor(level / 2) : 1,
    worth: tough ? 25 : 8,
    tint: tough ? "#fb923c" : "#f43f5e",
  };
}

export function RumbleGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ score: 0, level: 1, xp: 0, need: 20, time: 0 });
  const [status, setStatus] = useState<"ready" | "play" | "dead">("ready");
  const [toast, setToast] = useState("Drag to move. Tap / Space to pulse.");
  const statusRef = useRef(status);
  statusRef.current = status;

  const bag = useRef({
    player: { x: CX, y: CY },
    enemies: [] as Enemy[],
    gems: [] as Gem[],
    parts: [] as Spark[],
    score: 0,
    level: 1,
    xp: 0,
    need: 20,
    time: 0,
    pulseCd: 0,
    dashCd: 0,
    spawnCd: 0.5,
    invuln: 0,
    pulseR: 0,
    pulseActive: false,
    pointer: null as Pt | null,
    keys: new Set<string>(),
  });

  const sync = () => {
    const b = bag.current;
    setHud({
      score: b.score,
      level: b.level,
      xp: b.xp,
      need: b.need,
      time: Math.floor(b.time),
    });
  };

  const start = () => {
    bag.current = {
      ...bag.current,
      player: { x: CX, y: CY },
      enemies: [],
      gems: [],
      parts: [],
      score: 0,
      level: 1,
      xp: 0,
      need: 20,
      time: 0,
      pulseCd: 0,
      dashCd: 0,
      spawnCd: 0.4,
      invuln: 0,
      pulseR: 0,
      pulseActive: false,
      pointer: null,
    };
    setStatus("play");
    setToast("Survive the pit");
    sync();
    playTap();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const toLocal = (clientX: number, clientY: number): Pt => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * W,
        y: ((clientY - rect.top) / rect.height) * H,
      };
    };

    const pulse = () => {
      const b = bag.current;
      if (statusRef.current !== "play" || b.pulseCd > 0) return;
      b.pulseCd = Math.max(0.55, 1.1 - b.level * 0.04);
      b.pulseActive = true;
      b.pulseR = 8;
      beep(220, 0.08, "sawtooth", 0.05);
    };

    const onMove = (e: PointerEvent) => {
      bag.current.pointer = toLocal(e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      bag.current.pointer = toLocal(e.clientX, e.clientY);
      if (statusRef.current === "ready" || statusRef.current === "dead") start();
      else pulse();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        pulse();
      }
      bag.current.keys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      bag.current.keys.delete(e.key.toLowerCase());
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    const gainXp = (n: number) => {
      const b = bag.current;
      b.xp += n;
      while (b.xp >= b.need) {
        b.xp -= b.need;
        b.level += 1;
        b.need = Math.floor(b.need * 1.35);
        setToast(`LEVEL ${b.level} — stronger pulse`);
        playWin();
      }
      sync();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const b = bag.current;
      const playing = statusRef.current === "play";

      if (playing) {
        b.time += dt;
        if (b.pulseCd > 0) b.pulseCd -= dt;
        if (b.dashCd > 0) b.dashCd -= dt;
        if (b.invuln > 0) b.invuln -= dt;
        b.spawnCd -= dt;

        let tx = b.player.x;
        let ty = b.player.y;
        if (b.pointer) {
          tx = b.pointer.x;
          ty = b.pointer.y;
        }
        const keys = b.keys;
        if (keys.has("a") || keys.has("arrowleft")) tx -= 200 * dt * 8;
        if (keys.has("d") || keys.has("arrowright")) tx += 200 * dt * 8;
        if (keys.has("w") || keys.has("arrowup")) ty -= 200 * dt * 8;
        if (keys.has("s") || keys.has("arrowdown")) ty += 200 * dt * 8;

        b.player.x += (tx - b.player.x) * Math.min(1, 10 * dt);
        b.player.y += (ty - b.player.y) * Math.min(1, 10 * dt);
        const dCenter = Math.hypot(b.player.x - CX, b.player.y - CY);
        if (dCenter > ARENA_R - 16) {
          const a = Math.atan2(b.player.y - CY, b.player.x - CX);
          b.player.x = CX + Math.cos(a) * (ARENA_R - 16);
          b.player.y = CY + Math.sin(a) * (ARENA_R - 16);
        }

        if (b.spawnCd <= 0) {
          const count = 1 + (Math.random() < 0.25 + b.level * 0.03 ? 1 : 0);
          for (let i = 0; i < count; i++) b.enemies.push(spawnEnemy(b.level));
          b.spawnCd = Math.max(0.35, 1.15 - b.level * 0.06 - b.time * 0.004);
        }

        if (b.pulseActive) {
          b.pulseR += (90 + b.level * 8) * dt;
          const maxR = 70 + b.level * 6;
          for (let i = b.enemies.length - 1; i >= 0; i--) {
            const e = b.enemies[i]!;
            const d = Math.hypot(e.p.x - b.player.x, e.p.y - b.player.y);
            if (d < b.pulseR + e.r && d > b.pulseR - 18) {
              e.hp -= 1;
              burst(b.parts, e.p, "#fbbf24", 5);
              if (e.hp <= 0) {
                b.score += e.worth;
                b.gems.push({ p: { ...e.p }, value: e.worth >= 25 ? 5 : 2 });
                burst(b.parts, e.p, e.tint, 12);
                b.enemies.splice(i, 1);
                beep(480 + randInt(200), 0.04, "triangle", 0.04);
              }
            }
          }
          if (b.pulseR > maxR) {
            b.pulseActive = false;
            b.pulseR = 0;
            sync();
          }
        }

        for (const e of b.enemies) {
          const a = Math.atan2(b.player.y - e.p.y, b.player.x - e.p.x);
          const spd = 55 + b.level * 6 + (e.hp > 1 ? -10 : 12);
          e.v.x = Math.cos(a) * spd;
          e.v.y = Math.sin(a) * spd;
          e.p.x += e.v.x * dt;
          e.p.y += e.v.y * dt;
          if (!inArena(e.p, e.r)) {
            const ang = Math.atan2(e.p.y - CY, e.p.x - CX);
            e.p.x = CX + Math.cos(ang) * (ARENA_R - e.r);
            e.p.y = CY + Math.sin(ang) * (ARENA_R - e.r);
          }
        }

        for (let i = b.gems.length - 1; i >= 0; i--) {
          const g = b.gems[i]!;
          const d = Math.hypot(g.p.x - b.player.x, g.p.y - b.player.y);
          if (d < 60) {
            const pull = Math.min(1, (70 - d) / 70);
            g.p.x += (b.player.x - g.p.x) * pull * 8 * dt;
            g.p.y += (b.player.y - g.p.y) * pull * 8 * dt;
          }
          if (Math.hypot(g.p.x - b.player.x, g.p.y - b.player.y) < 16) {
            gainXp(g.value);
            b.score += g.value;
            b.gems.splice(i, 1);
            beep(900, 0.03, "sine", 0.04);
          }
        }

        if (b.invuln <= 0) {
          for (const e of b.enemies) {
            if (Math.hypot(e.p.x - b.player.x, e.p.y - b.player.y) < e.r + 12) {
              setStatus("dead");
              setToast(`Lasted ${Math.floor(b.time)}s · Lv${b.level}`);
              burst(b.parts, { ...b.player }, "#fb7185", 20);
              playBonk();
              sync();
              break;
            }
          }
        }
      }

      for (let i = b.parts.length - 1; i >= 0; i--) {
        const p = b.parts[i]!;
        p.p.x += p.v.x;
        p.p.y += p.v.y;
        p.life -= dt;
        if (p.life <= 0) b.parts.splice(i, 1);
      }

      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(CX, CY, 20, CX, CY, ARENA_R + 40);
      bg.addColorStop(0, "#1e293b");
      bg.addColorStop(1, "#0f172a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.beginPath();
      ctx.arc(CX, CY, ARENA_R, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.strokeStyle = "#a3e635";
      ctx.lineWidth = 4;
      ctx.stroke();

      for (const g of b.gems) {
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(g.p.x, g.p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (b.pulseActive) {
        ctx.strokeStyle = "rgba(250,204,21,0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(b.player.x, b.player.y, b.pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const e of b.enemies) {
        ctx.fillStyle = e.tint;
        ctx.beginPath();
        ctx.arc(e.p.x, e.p.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = "#a3e635";
      ctx.beginPath();
      ctx.arc(b.player.x, b.player.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(b.player.x - 3, b.player.y - 2, 1.5, 0, Math.PI * 2);
      ctx.arc(b.player.x + 3, b.player.y - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      for (const p of b.parts) {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.p.x, p.p.y, 3, 3);
        ctx.globalAlpha = 1;
      }

      // XP bar
      ctx.fillStyle = "#334155";
      ctx.fillRect(24, H - 18, W - 48, 8);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(24, H - 18, (W - 48) * Math.min(1, b.xp / b.need), 8);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.strokeRect(24, H - 18, W - 48, 8);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 12px Rubik, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Lv ${b.level}`, 12, 20);
      ctx.textAlign = "right";
      ctx.fillText(b.pulseCd > 0 ? `pulse ${b.pulseCd.toFixed(1)}` : "pulse ready", W - 12, 20);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <GameShell
      title="Rumble"
      accent="#a3e635"
      onBack={onBack}
      stats={
        <span>
          {hud.score} · Lv{hud.level} · {hud.time}s
        </span>
      }
    >
      <Confetti show={status === "dead" && hud.time >= 45} />
      <div className="mx-auto w-full max-w-md">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="chunky mx-auto block w-full touch-none bg-ink"
        />
        <p className="mt-3 text-center text-sm font-semibold text-ink/70">{toast}</p>
        {(status === "ready" || status === "dead") && (
          <div className="mt-3 flex justify-center">
            <button type="button" className="btn-chunky bg-lime" onClick={start}>
              {status === "dead" ? "Jump back in" : "Enter the pit"}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
