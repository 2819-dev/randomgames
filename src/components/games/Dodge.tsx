"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Pt = { x: number; y: number };
type EnemyKind = "grunt" | "zig" | "tank" | "dart";
type DropKind = "shield" | "rapid" | "bomb" | "life";

type Enemy = {
  p: Pt;
  v: Pt;
  hp: number;
  kind: EnemyKind;
  r: number;
  worth: number;
  phase: number;
};

type Bullet = { p: Pt; v: Pt; life: number };
type Drop = { p: Pt; kind: DropKind; life: number };
type Spark = { p: Pt; v: Pt; life: number; c: string };

const W = 420;
const H = 520;

function burst(parts: Spark[], p: Pt, c: string, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3.2;
    parts.push({ p: { ...p }, v: { x: Math.cos(a) * s, y: Math.sin(a) * s }, life: 0.3 + Math.random() * 0.35, c });
  }
}

function makeEnemy(wave: number): Enemy {
  const roll = Math.random();
  const kind: EnemyKind =
    wave < 2 ? "grunt" : roll < 0.45 ? "grunt" : roll < 0.7 ? "zig" : roll < 0.88 ? "dart" : "tank";
  const x = 30 + randInt(W - 60);
  const base: Record<EnemyKind, Omit<Enemy, "p" | "v" | "phase">> = {
    grunt: { hp: 1, kind: "grunt", r: 12, worth: 10 },
    zig: { hp: 1, kind: "zig", r: 11, worth: 16 },
    dart: { hp: 1, kind: "dart", r: 9, worth: 22 },
    tank: { hp: 3 + Math.floor(wave / 3), kind: "tank", r: 16, worth: 40 },
  };
  const speed = 40 + wave * 8 + (kind === "dart" ? 50 : kind === "zig" ? 20 : 0);
  return {
    ...base[kind],
    p: { x, y: -20 },
    v: { x: kind === "zig" ? (Math.random() > 0.5 ? 70 : -70) : 0, y: speed },
    phase: Math.random() * Math.PI * 2,
  };
}

export function DodgeGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ score: 0, wave: 1, lives: 3, best: 0 });
  const [status, setStatus] = useState<"ready" | "play" | "dead">("ready");
  const [toast, setToast] = useState("Move to aim. Auto-fires. Grab drops.");
  const statusRef = useRef(status);
  statusRef.current = status;

  const bag = useRef({
    player: { x: W / 2, y: H - 56 },
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    drops: [] as Drop[],
    parts: [] as Spark[],
    score: 0,
    wave: 1,
    lives: 3,
    best: 0,
    shield: 0,
    rapid: 0,
    fireCd: 0,
    spawnCd: 0,
    waveLeft: 8,
    invuln: 0,
    pointer: null as Pt | null,
  });

  const sync = () => {
    const b = bag.current;
    setHud({ score: b.score, wave: b.wave, lives: b.lives, best: b.best });
  };

  const start = () => {
    bag.current = {
      ...bag.current,
      player: { x: W / 2, y: H - 56 },
      enemies: [],
      bullets: [],
      drops: [],
      parts: [],
      score: 0,
      wave: 1,
      lives: 3,
      shield: 0,
      rapid: 0,
      fireCd: 0,
      spawnCd: 0.4,
      waveLeft: 8,
      invuln: 0,
      pointer: null,
    };
    setStatus("play");
    setToast("Wave 1");
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

    const pointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      bag.current.pointer = {
        x: Math.max(18, Math.min(W - 18, (clientX - rect.left) * sx)),
        y: Math.max(40, Math.min(H - 24, (clientY - rect.top) * sy)),
      };
    };

    const onMove = (e: PointerEvent) => pointer(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => {
      pointer(e.clientX, e.clientY);
      if (statusRef.current === "ready" || statusRef.current === "dead") start();
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);

    const hurt = () => {
      const b = bag.current;
      if (b.invuln > 0) return;
      if (b.shield > 0) {
        b.shield = 0;
        b.invuln = 1.1;
        setToast("Shield broke!");
        playBonk();
        return;
      }
      b.lives -= 1;
      b.invuln = 1.4;
      burst(b.parts, { ...b.player }, "#fb7185", 14);
      sync();
      if (b.lives <= 0) {
        b.best = Math.max(b.best, b.score);
        setStatus("dead");
        setToast(`Wiped · wave ${b.wave}`);
        playBonk();
      } else {
        setToast(`Hit! ${b.lives} left`);
        playBonk();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const b = bag.current;
      const playing = statusRef.current === "play";

      if (playing) {
        if (b.pointer) {
          b.player.x += (b.pointer.x - b.player.x) * Math.min(1, 12 * dt);
          b.player.y += (b.pointer.y - b.player.y) * Math.min(1, 12 * dt);
        }
        if (b.shield > 0) b.shield -= dt;
        if (b.rapid > 0) b.rapid -= dt;
        if (b.invuln > 0) b.invuln -= dt;
        b.fireCd -= dt;
        b.spawnCd -= dt;

        const fireRate = b.rapid > 0 ? 0.09 : 0.18;
        if (b.fireCd <= 0) {
          b.fireCd = fireRate;
          const shots = b.rapid > 0 ? 3 : 1;
          for (let i = 0; i < shots; i++) {
            const spread = shots === 1 ? 0 : (i - 1) * 0.18;
            b.bullets.push({
              p: { x: b.player.x + Math.sin(spread) * 8, y: b.player.y - 16 },
              v: { x: Math.sin(spread) * 80, y: -520 },
              life: 1.2,
            });
          }
          beep(760, 0.02, "square", 0.03);
        }

        if (b.spawnCd <= 0 && b.waveLeft > 0) {
          b.enemies.push(makeEnemy(b.wave));
          b.waveLeft -= 1;
          b.spawnCd = Math.max(0.28, 0.85 - b.wave * 0.05);
        }

        if (b.waveLeft <= 0 && b.enemies.length === 0) {
          b.wave += 1;
          b.waveLeft = 6 + b.wave * 2;
          b.score += 50 * b.wave;
          setToast(`Wave ${b.wave}`);
          playWin();
          sync();
        }

        for (const e of b.enemies) {
          e.phase += dt;
          if (e.kind === "zig") {
            e.v.x = Math.cos(e.phase * 3) * (90 + b.wave * 5);
          }
          if (e.kind === "dart" && e.p.y > 80 && Math.abs(e.p.x - b.player.x) > 8) {
            e.v.x += Math.sign(b.player.x - e.p.x) * 180 * dt;
            e.v.x = Math.max(-160, Math.min(160, e.v.x));
          }
          e.p.x += e.v.x * dt;
          e.p.y += e.v.y * dt;
          if (e.p.x < e.r || e.p.x > W - e.r) e.v.x *= -1;
        }

        for (const bullet of b.bullets) {
          bullet.p.x += bullet.v.x * dt;
          bullet.p.y += bullet.v.y * dt;
          bullet.life -= dt;
        }

        for (let i = b.bullets.length - 1; i >= 0; i--) {
          const bullet = b.bullets[i]!;
          let hit = false;
          for (let j = b.enemies.length - 1; j >= 0; j--) {
            const e = b.enemies[j]!;
            if (Math.hypot(bullet.p.x - e.p.x, bullet.p.y - e.p.y) < e.r + 4) {
              e.hp -= 1;
              burst(b.parts, bullet.p, "#fbbf24", 4);
              hit = true;
              if (e.hp <= 0) {
                b.score += e.worth;
                burst(b.parts, e.p, e.kind === "tank" ? "#fb923c" : "#a3e635", 12);
                if (Math.random() < 0.18) {
                  const kinds: DropKind[] = ["shield", "rapid", "bomb", "life"];
                  b.drops.push({ p: { ...e.p }, kind: kinds[randInt(kinds.length)]!, life: 6 });
                }
                b.enemies.splice(j, 1);
                beep(520, 0.04, "triangle", 0.04);
                sync();
              }
              break;
            }
          }
          if (hit || bullet.life <= 0 || bullet.p.y < -20) b.bullets.splice(i, 1);
        }

        for (let i = b.enemies.length - 1; i >= 0; i--) {
          const e = b.enemies[i]!;
          if (e.p.y > H + 30) {
            b.enemies.splice(i, 1);
            hurt();
            continue;
          }
          if (Math.hypot(e.p.x - b.player.x, e.p.y - b.player.y) < e.r + 14) {
            b.enemies.splice(i, 1);
            burst(b.parts, e.p, "#f43f5e", 10);
            hurt();
          }
        }

        for (const drop of b.drops) {
          drop.p.y += 70 * dt;
          drop.life -= dt;
        }
        for (let i = b.drops.length - 1; i >= 0; i--) {
          const drop = b.drops[i]!;
          if (Math.hypot(drop.p.x - b.player.x, drop.p.y - b.player.y) < 22) {
            if (drop.kind === "shield") {
              b.shield = 8;
              setToast("SHIELD");
            } else if (drop.kind === "rapid") {
              b.rapid = 6;
              setToast("RAPID FIRE");
            } else if (drop.kind === "life") {
              b.lives += 1;
              setToast("+1 LIFE");
              sync();
            } else if (drop.kind === "bomb") {
              for (const e of b.enemies) {
                b.score += e.worth;
                burst(b.parts, e.p, "#fb7185", 8);
              }
              b.enemies = [];
              setToast("SCREEN CLEAR");
              sync();
            }
            playWin();
            b.drops.splice(i, 1);
          } else if (drop.life <= 0 || drop.p.y > H + 20) {
            b.drops.splice(i, 1);
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
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1a1030");
      g.addColorStop(1, "#0f172a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      for (let y = 0; y < H; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      for (const drop of b.drops) {
        const colors: Record<DropKind, string> = {
          shield: "#38bdf8",
          rapid: "#a3e635",
          bomb: "#fb7185",
          life: "#f472b6",
        };
        ctx.fillStyle = colors[drop.kind];
        ctx.beginPath();
        ctx.roundRect(drop.p.x - 8, drop.p.y - 8, 16, 16, 4);
        ctx.fill();
      }

      for (const bullet of b.bullets) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(bullet.p.x - 2, bullet.p.y - 6, 4, 10);
      }

      for (const e of b.enemies) {
        ctx.fillStyle =
          e.kind === "tank" ? "#fb923c" : e.kind === "dart" ? "#f43f5e" : e.kind === "zig" ? "#c084fc" : "#94a3b8";
        ctx.beginPath();
        ctx.arc(e.p.x, e.p.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (e.kind === "tank") {
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 10px Rubik, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(e.hp), e.p.x, e.p.y);
        }
      }

      if (b.shield > 0) {
        ctx.strokeStyle = "rgba(56,189,248,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.player.x, b.player.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = b.invuln > 0 && Math.floor(now / 80) % 2 === 0 ? 0.35 : 1;
      ctx.fillStyle = "#a3e635";
      ctx.beginPath();
      ctx.moveTo(b.player.x, b.player.y - 14);
      ctx.lineTo(b.player.x + 12, b.player.y + 12);
      ctx.lineTo(b.player.x - 12, b.player.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      for (const p of b.parts) {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.p.x, p.p.y, 3, 3);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 12px Rubik, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Wave ${b.wave}`, 12, 20);
      ctx.textAlign = "right";
      const buffs = [
        b.shield > 0 ? `SHIELD ${b.shield.toFixed(0)}` : "",
        b.rapid > 0 ? `RAPID ${b.rapid.toFixed(0)}` : "",
      ].filter(Boolean);
      if (buffs.length) ctx.fillText(buffs.join(" · "), W - 12, 20);

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
      title="Dodge+"
      accent="#fb7185"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {hud.score} · W{hud.wave} · ❤{hud.lives}
        </span>
      }
    >
      <Confetti show={status === "dead" && hud.score >= 300} />
      <div className="mx-auto w-full max-w-md">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="chunky mx-auto block w-full touch-none bg-ink"
        />
        <p className="mt-3 text-center text-sm font-semibold text-ink/70">{toast}</p>
        {(status === "ready" || status === "dead") && (
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn-chunky bg-[#fb7185] text-white" onClick={start}>
              {status === "dead" ? `Retry · best ${hud.best}` : "Launch"}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
