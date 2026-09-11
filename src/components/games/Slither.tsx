"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { pick, randInt } from "@/lib/random";

type Pt = { x: number; y: number };
type FoodKind = "normal" | "magnet" | "shield" | "turbo" | "diamond";
type Food = { p: Pt; c: string; r: number; kind: FoodKind };
type Particle = { p: Pt; v: Pt; life: number; c: string };
type Worm = {
  id: number;
  body: Pt[];
  angle: number;
  speed: number;
  color: string;
  alive: boolean;
  bot: boolean;
  target: Pt | null;
  magnet: number;
  shield: number;
  turbo: number;
  aggression: number;
};

const WORLD = 2600;
const FOOD_N = 220;
const BOTS = 11;
const SEG = 7;
const COLORS = [
  "#c8f542", "#ff5a45", "#3d7cff", "#ffd84d", "#6b4de6",
  "#2dd4a8", "#ff6bcb", "#ff8c42", "#7ce7ff", "#a78bfa",
];

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function clamp(p: Pt): Pt {
  return {
    x: Math.max(50, Math.min(WORLD - 50, p.x)),
    y: Math.max(50, Math.min(WORLD - 50, p.y)),
  };
}
function rad(len: number) {
  return 7 + Math.min(14, len / 14);
}
function makeFood(force?: FoodKind): Food {
  const roll = Math.random();
  const kind: FoodKind =
    force ??
    (roll > 0.97 ? "diamond" : roll > 0.93 ? "shield" : roll > 0.89 ? "magnet" : roll > 0.85 ? "turbo" : "normal");
  const palette: Record<FoodKind, string> = {
    normal: pick(COLORS),
    magnet: "#7ce7ff",
    shield: "#a78bfa",
    turbo: "#ff8c42",
    diamond: "#ffd84d",
  };
  return {
    p: { x: 80 + randInt(WORLD - 160), y: 80 + randInt(WORLD - 160) },
    c: palette[kind],
    r: kind === "normal" ? 3 + randInt(3) : 6 + randInt(2),
    kind,
  };
}
function makeWorm(id: number, bot: boolean, color: string, at?: Pt): Worm {
  const start = at ?? { x: 200 + randInt(WORLD - 400), y: 200 + randInt(WORLD - 400) };
  const angle = Math.random() * Math.PI * 2;
  const len = bot ? 14 + randInt(24) : 18;
  const body: Pt[] = [];
  for (let i = 0; i < len; i++) {
    body.push({ x: start.x - Math.cos(angle) * i * SEG, y: start.y - Math.sin(angle) * i * SEG });
  }
  return {
    id, body, angle,
    speed: bot ? 1.85 + Math.random() * 0.55 : 2.4,
    color, alive: true, bot, target: null,
    magnet: 0, shield: 0, turbo: 0,
    aggression: 0.35 + Math.random() * 0.55,
  };
}
function crumbs(w: Worm): Food[] {
  const out: Food[] = [];
  for (let i = 0; i < w.body.length; i += 2) {
    const b = w.body[i];
    out.push({
      p: { x: b.x + randInt(11) - 5, y: b.y + randInt(11) - 5 },
      c: w.color, r: 4 + randInt(3),
      kind: Math.random() > 0.92 ? "turbo" : "normal",
    });
  }
  return out;
}
function burst(p: Pt, c: string, n = 10): Particle[] {
  return Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 3;
    return { p: { ...p }, v: { x: Math.cos(a) * sp, y: Math.sin(a) * sp }, life: 20 + randInt(18), c };
  });
}

export function SlitherGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [kills, setKills] = useState(0);
  const [streak, setStreak] = useState(0);
  const [buff, setBuff] = useState("—");

  const bag = useRef({
    worms: [] as Worm[],
    foods: [] as Food[],
    parts: [] as Particle[],
    pointer: null as Pt | null,
    boost: false,
    cam: { x: WORLD / 2, y: WORLD / 2 },
    nextId: 20,
    kills: 0,
    streak: 0,
    streakTimer: 0,
    multiplier: 1,
  });

  const start = () => {
    const player = makeWorm(0, false, "#c8f542", { x: WORLD / 2, y: WORLD / 2 });
    player.angle = 0;
    const bots = Array.from({ length: BOTS }, (_, i) => makeWorm(i + 1, true, COLORS[(i + 1) % COLORS.length]));
    bag.current = {
      worms: [player, ...bots],
      foods: Array.from({ length: FOOD_N }, () => makeFood()),
      parts: [],
      pointer: null,
      boost: false,
      cam: { x: WORLD / 2, y: WORLD / 2 },
      nextId: 100,
      kills: 0,
      streak: 0,
      streakTimer: 0,
      multiplier: 1,
    };
    setScore(player.body.length);
    setKills(0);
    setStreak(0);
    setBuff("—");
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
    let live = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const layout = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 640;
      const h = Math.min(540, Math.max(380, Math.floor(w * 0.74)));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    layout();
    window.addEventListener("resize", layout);

    const toWorld = (cx: number, cy: number): Pt => {
      const rect = canvas.getBoundingClientRect();
      const cam = bag.current.cam;
      return { x: cam.x + (cx - rect.left - rect.width / 2), y: cam.y + (cy - rect.top - rect.height / 2) };
    };
    const onMove = (e: PointerEvent) => { bag.current.pointer = toWorld(e.clientX, e.clientY); };
    const onDown = (e: PointerEvent) => {
      bag.current.pointer = toWorld(e.clientX, e.clientY);
      bag.current.boost = true;
      canvas.setPointerCapture(e.pointerId);
    };
    const onUp = () => { bag.current.boost = false; };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); bag.current.boost = e.type === "keydown"; }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    const eat = (wrm: Worm, kind: FoodKind) => {
      const grow = kind === "diamond" ? 6 : kind === "normal" ? 1 : 2;
      for (let i = 0; i < grow; i++) wrm.body.push({ ...wrm.body[wrm.body.length - 1] });
      if (kind === "magnet") wrm.magnet = 240;
      if (kind === "shield") wrm.shield = 280;
      if (kind === "turbo") wrm.turbo = 200;
      if (!wrm.bot) { playTap(); if (kind !== "normal") playWin(); }
    };

    const steerBot = (wrm: Worm) => {
      const head = wrm.body[0];
      let hunt: Worm | null = null;
      let flee: Worm | null = null;
      for (const other of bag.current.worms) {
        if (!other.alive || other.id === wrm.id) continue;
        const dd = dist(head, other.body[0]);
        if (dd < 220) {
          if (other.body.length + 4 < wrm.body.length && Math.random() < wrm.aggression) {
            if (!hunt || dd < dist(head, hunt.body[0])) hunt = other;
          }
          if (other.body.length > wrm.body.length + 2) {
            if (!flee || dd < dist(head, flee.body[0])) flee = other;
          }
        }
        for (let i = 4; i < other.body.length; i += 3) {
          if (dist(head, other.body[i]) < 70) {
            wrm.angle = Math.atan2(head.y - other.body[i].y, head.x - other.body[i].x) + (Math.random() - 0.5) * 0.4;
            return;
          }
        }
      }
      if (flee) { wrm.angle = Math.atan2(head.y - flee.body[0].y, head.x - flee.body[0].x); return; }
      if (hunt) wrm.target = { ...hunt.body[0] };
      else if (!wrm.target || Math.random() < 0.02 || dist(head, wrm.target) < 40) {
        let nearest = bag.current.foods[0];
        let bestD = Infinity;
        for (const f of bag.current.foods) {
          const score = dist(head, f.p) * (f.kind === "diamond" ? 0.55 : f.kind === "normal" ? 1 : 0.75);
          if (score < bestD) { bestD = score; nearest = f; }
        }
        wrm.target = nearest ? { ...nearest.p } : { x: 100 + randInt(WORLD - 200), y: 100 + randInt(WORLD - 200) };
      }
      if (!wrm.target) return;
      const desired = Math.atan2(wrm.target.y - head.y, wrm.target.x - head.x);
      let diff = desired - wrm.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      wrm.angle += Math.max(-0.11, Math.min(0.11, diff));
    };

    const loop = () => {
      if (!live) return;
      const S = bag.current;
      const player = S.worms.find((w) => w.id === 0);

      if (S.streakTimer > 0) S.streakTimer -= 1;
      else { S.streak = 0; S.multiplier = 1; setStreak(0); }

      for (const wrm of S.worms) {
        if (!wrm.alive) continue;
        if (wrm.magnet > 0) wrm.magnet -= 1;
        if (wrm.shield > 0) wrm.shield -= 1;
        if (wrm.turbo > 0) wrm.turbo -= 1;

        if (wrm.bot) steerBot(wrm);
        else if (S.pointer) {
          const desired = Math.atan2(S.pointer.y - wrm.body[0].y, S.pointer.x - wrm.body[0].x);
          let diff = desired - wrm.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          wrm.angle += Math.max(-0.15, Math.min(0.15, diff));
        }

        const boosting = wrm.turbo > 0 || (!wrm.bot && S.boost && wrm.body.length > 12) || (wrm.bot && Math.random() < 0.01 && wrm.body.length > 16);
        const spd = wrm.speed * (boosting ? 1.85 : 1) * (wrm.turbo > 0 ? 1.15 : 1);

        if (boosting && Math.random() < 0.35 && wrm.body.length > 12 && wrm.turbo <= 0) {
          const tail = wrm.body.pop();
          if (tail && Math.random() < 0.5) S.foods.push({ p: { ...tail }, c: wrm.color, r: 3 + randInt(2), kind: "normal" });
        }

        if (wrm.magnet > 0) {
          for (const f of S.foods) {
            const dd = dist(wrm.body[0], f.p);
            if (dd < 160 && dd > 0.1) {
              f.p.x += ((wrm.body[0].x - f.p.x) / dd) * 3.2;
              f.p.y += ((wrm.body[0].y - f.p.y) / dd) * 3.2;
            }
          }
        }

        const next = clamp({
          x: wrm.body[0].x + Math.cos(wrm.angle) * spd,
          y: wrm.body[0].y + Math.sin(wrm.angle) * spd,
        });
        if (next.x <= 51 || next.y <= 51 || next.x >= WORLD - 51 || next.y >= WORLD - 51) wrm.angle += 0.55 + Math.random() * 0.9;
        wrm.body.unshift(next);
        for (let i = 1; i < wrm.body.length; i++) {
          const prev = wrm.body[i - 1];
          const cur = wrm.body[i];
          const dd = dist(prev, cur);
          if (dd > SEG) {
            const a = Math.atan2(prev.y - cur.y, prev.x - cur.x);
            wrm.body[i] = { x: prev.x - Math.cos(a) * SEG, y: prev.y - Math.sin(a) * SEG };
          }
        }
      }

      for (const wrm of S.worms) {
        if (!wrm.alive) continue;
        const r = rad(wrm.body.length);
        const kept: Food[] = [];
        for (const f of S.foods) {
          if (dist(wrm.body[0], f.p) < r + f.r) {
            eat(wrm, f.kind);
            S.parts.push(...burst(f.p, f.c, 6));
          } else kept.push(f);
        }
        S.foods = kept;
      }
      while (S.foods.length < FOOD_N) S.foods.push(makeFood());

      for (const wrm of S.worms) {
        if (!wrm.alive) continue;
        const wr = rad(wrm.body.length) * 0.8;
        outer: for (const other of S.worms) {
          if (!other.alive || other.id === wrm.id) continue;
          const orad = rad(other.body.length) * 0.7;
          for (let i = 5; i < other.body.length; i++) {
            if (dist(wrm.body[0], other.body[i]) < wr + orad) {
              if (wrm.shield > 0) {
                wrm.shield = 0;
                wrm.angle += Math.PI;
                S.parts.push(...burst(wrm.body[0], "#a78bfa", 14));
                break outer;
              }
              wrm.alive = false;
              S.foods.push(...crumbs(wrm));
              S.parts.push(...burst(wrm.body[0], wrm.color, 18));
              if (other.id === 0) {
                S.kills += 1;
                S.streak += 1;
                S.streakTimer = 240;
                S.multiplier = Math.min(5, 1 + S.streak);
                setKills(S.kills);
                setStreak(S.streak);
                playWin();
              } else if (wrm.id === 0) playBonk();
              break outer;
            }
          }
        }
      }

      for (let i = 0; i < S.worms.length; i++) {
        const w = S.worms[i];
        if (!w.alive && w.bot) S.worms[i] = makeWorm(++S.nextId, true, COLORS[randInt(COLORS.length)]);
      }

      S.parts = S.parts
        .map((p) => ({ ...p, p: { x: p.p.x + p.v.x, y: p.p.y + p.v.y }, life: p.life - 1 }))
        .filter((p) => p.life > 0);

      if (player?.alive) {
        S.cam.x += (player.body[0].x - S.cam.x) * 0.14;
        S.cam.y += (player.body[0].y - S.cam.y) * 0.14;
        const display = Math.floor(player.body.length * S.multiplier);
        setScore(display);
        setBest((b) => Math.max(b, display));
        const tags = [];
        if (player.magnet > 0) tags.push("Magnet");
        if (player.shield > 0) tags.push("Shield");
        if (player.turbo > 0) tags.push("Turbo");
        setBuff(tags.length ? tags.join(" · ") : "—");
      } else if (player && !player.alive) {
        setDead(true);
        setRunning(false);
        live = false;
        return;
      }

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "#12101a";
      ctx.fillRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(cw / 2 - S.cam.x, ch / 2 - S.cam.y);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD); ctx.stroke(); }
      for (let y = 0; y <= WORLD; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD, y); ctx.stroke(); }
      ctx.strokeStyle = "#c8f542";
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, WORLD - 48, WORLD - 48);

      for (const f of S.foods) {
        ctx.beginPath();
        ctx.fillStyle = f.c;
        ctx.arc(f.p.x, f.p.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        if (f.kind !== "normal") { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      for (const p of S.parts) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.p.x, p.p.y, 3, 3);
        ctx.globalAlpha = 1;
      }
      for (const wrm of S.worms) {
        if (!wrm.alive) continue;
        const r = rad(wrm.body.length);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = wrm.color;
        ctx.lineWidth = r * 2;
        ctx.beginPath();
        wrm.body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        const head = wrm.body[0];
        if (wrm.shield > 0) {
          ctx.strokeStyle = "rgba(167,139,250,0.85)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(head.x, head.y, r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = wrm.color;
        ctx.beginPath();
        ctx.arc(head.x, head.y, r + 1.5, 0, Math.PI * 2);
        ctx.fill();
        const ex = Math.cos(wrm.angle);
        const ey = Math.sin(wrm.angle);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(head.x + ex * r * 0.3 - ey * r * 0.45, head.y + ey * r * 0.3 + ex * r * 0.45, r * 0.28, 0, Math.PI * 2);
        ctx.arc(head.x + ex * r * 0.3 + ey * r * 0.45, head.y + ey * r * 0.3 - ex * r * 0.45, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(head.x + ex * r * 0.55 - ey * r * 0.45, head.y + ey * r * 0.55 + ex * r * 0.45, r * 0.12, 0, Math.PI * 2);
        ctx.arc(head.x + ex * r * 0.55 + ey * r * 0.45, head.y + ey * r * 0.55 - ex * r * 0.45, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        if (!wrm.bot) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText("YOU", head.x - 14, head.y - r - 10);
        }
      }
      ctx.restore();

      const mm = 96;
      const pad = 12;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(cw - mm - pad, pad, mm, mm);
      ctx.strokeStyle = "#c8f542";
      ctx.strokeRect(cw - mm - pad, pad, mm, mm);
      const scale = mm / WORLD;
      for (const wrm of S.worms) {
        if (!wrm.alive) continue;
        ctx.fillStyle = wrm.bot ? wrm.color : "#fff";
        ctx.beginPath();
        ctx.arc(cw - mm - pad + wrm.body[0].x * scale, pad + wrm.body[0].y * scale, wrm.bot ? 1.6 : 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (S.streak > 1) {
        ctx.fillStyle = "#ffd84d";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`x${S.multiplier} streak ${S.streak}`, 14, 28);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [running]);

  return (
    <GameShell
      title="Slither"
      accent="#c8f542"
      onBack={onBack}
      stats={<span>{score} · 💀{kills}{streak > 1 ? ` · x${Math.min(5, 1 + streak)}` : ""}</span>}
    >
      <div className="relative">
        <Confetti show={kills > 0 && kills % 3 === 0 && running} />
        <div className="chunky overflow-hidden rounded-xl bg-ink">
          <canvas ref={canvasRef} className="block w-full touch-none" />
        </div>
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-paper/90 p-4 text-center">
            <p className="mb-2 font-[family-name:var(--font-display)] text-2xl">{dead ? "Got nommed." : "Slither Arena"}</p>
            <p className="mb-4 max-w-md text-sm font-semibold text-ink/70">
              {dead
                ? `Score ${score} · best ${best} · bots eaten ${kills}`
                : "Steer with mouse/finger. Hold click/space to boost. Grab glowing power pellets — magnet, shield, turbo, diamond. Cut off bots for kill streaks."}
            </p>
            <button type="button" onClick={start} className="btn-chunky rounded-md bg-lime px-5 py-2">
              {dead ? "Respawn" : "Enter arena"}
            </button>
          </div>
        )}
        {running && (
          <p className="mt-3 text-center text-xs font-semibold text-ink/60">
            Buffs: {buff} · best {best} · {BOTS} bots hunting
          </p>
        )}
      </div>
    </GameShell>
  );
}

