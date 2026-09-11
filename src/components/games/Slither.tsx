"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Pt = { x: number; y: number };
type Food = { p: Pt; c: string; r: number };
type Worm = {
  id: number;
  body: Pt[];
  angle: number;
  speed: number;
  color: string;
  alive: boolean;
  bot: boolean;
  target: Pt | null;
};

const WORLD = 2400;
const FOOD_N = 200;
const BOTS = 9;
const SEG = 7;
const COLORS = [
  "#c8f542",
  "#ff5a45",
  "#3d7cff",
  "#ffd84d",
  "#6b4de6",
  "#2dd4a8",
  "#ff6bcb",
  "#ff8c42",
  "#7ce7ff",
  "#a78bfa",
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
  return 7 + Math.min(12, len / 16);
}

function makeFood(): Food {
  return {
    p: { x: 80 + randInt(WORLD - 160), y: 80 + randInt(WORLD - 160) },
    c: COLORS[randInt(COLORS.length)],
    r: 3 + randInt(3),
  };
}

function makeWorm(id: number, bot: boolean, color: string, at?: Pt): Worm {
  const start = at ?? {
    x: 200 + randInt(WORLD - 400),
    y: 200 + randInt(WORLD - 400),
  };
  const angle = Math.random() * Math.PI * 2;
  const len = bot ? 12 + randInt(20) : 16;
  const body: Pt[] = [];
  for (let i = 0; i < len; i++) {
    body.push({
      x: start.x - Math.cos(angle) * i * SEG,
      y: start.y - Math.sin(angle) * i * SEG,
    });
  }
  return {
    id,
    body,
    angle,
    speed: bot ? 1.8 + Math.random() * 0.5 : 2.35,
    color,
    alive: true,
    bot,
    target: null,
  };
}

function crumbs(w: Worm): Food[] {
  const out: Food[] = [];
  for (let i = 0; i < w.body.length; i += 2) {
    const b = w.body[i];
    out.push({
      p: { x: b.x + randInt(11) - 5, y: b.y + randInt(11) - 5 },
      c: w.color,
      r: 4 + randInt(3),
    });
  }
  return out;
}

export function SlitherGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [kills, setKills] = useState(0);

  const bag = useRef({
    worms: [] as Worm[],
    foods: [] as Food[],
    pointer: null as Pt | null,
    boost: false,
    cam: { x: WORLD / 2, y: WORLD / 2 },
    nextId: 20,
    kills: 0,
  });

  const start = () => {
    const player = makeWorm(0, false, "#c8f542", { x: WORLD / 2, y: WORLD / 2 });
    player.angle = 0;
    const bots = Array.from({ length: BOTS }, (_, i) =>
      makeWorm(i + 1, true, COLORS[(i + 1) % COLORS.length]),
    );
    bag.current = {
      worms: [player, ...bots],
      foods: Array.from({ length: FOOD_N }, () => makeFood()),
      pointer: null,
      boost: false,
      cam: { x: WORLD / 2, y: WORLD / 2 },
      nextId: 100,
      kills: 0,
    };
    setScore(player.body.length);
    setKills(0);
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
      const h = Math.min(520, Math.max(360, Math.floor(w * 0.72)));
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
      return {
        x: cam.x + (cx - rect.left - rect.width / 2),
        y: cam.y + (cy - rect.top - rect.height / 2),
      };
    };

    const onMove = (e: PointerEvent) => {
      bag.current.pointer = toWorld(e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      bag.current.pointer = toWorld(e.clientX, e.clientY);
      bag.current.boost = true;
      canvas.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      bag.current.boost = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        bag.current.boost = e.type === "keydown";
      }
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    const steerBot = (wrm: Worm) => {
      if (!wrm.target || Math.random() < 0.015 || dist(wrm.body[0], wrm.target) < 40) {
        if (Math.random() < 0.7 && bag.current.foods.length) {
          let nearest = bag.current.foods[0];
          let bestD = Infinity;
          for (const f of bag.current.foods) {
            const dd = dist(wrm.body[0], f.p);
            if (dd < bestD) {
              bestD = dd;
              nearest = f;
            }
          }
          wrm.target = { ...nearest.p };
        } else {
          wrm.target = {
            x: 100 + randInt(WORLD - 200),
            y: 100 + randInt(WORLD - 200),
          };
        }
      }

      for (const other of bag.current.worms) {
        if (!other.alive || other.id === wrm.id) continue;
        const dd = dist(wrm.body[0], other.body[0]);
        if (dd < 100 && other.body.length >= wrm.body.length) {
          wrm.angle =
            Math.atan2(
              wrm.body[0].y - other.body[0].y,
              wrm.body[0].x - other.body[0].x,
            ) +
            (Math.random() - 0.5) * 0.5;
          return;
        }
      }

      const desired = Math.atan2(
        wrm.target.y - wrm.body[0].y,
        wrm.target.x - wrm.body[0].x,
      );
      let diff = desired - wrm.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      wrm.angle += Math.max(-0.1, Math.min(0.1, diff));
    };

    const loop = () => {
      if (!live) return;
      const S = bag.current;
      const player = S.worms.find((w) => w.id === 0);

      for (const wrm of S.worms) {
        if (!wrm.alive) continue;

        if (wrm.bot) steerBot(wrm);
        else if (S.pointer) {
          const desired = Math.atan2(
            S.pointer.y - wrm.body[0].y,
            S.pointer.x - wrm.body[0].x,
          );
          let diff = desired - wrm.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          wrm.angle += Math.max(-0.14, Math.min(0.14, diff));
        }

        const boosting =
          (!wrm.bot && S.boost && wrm.body.length > 10) ||
          (wrm.bot && Math.random() < 0.008 && wrm.body.length > 14);
        const spd = wrm.speed * (boosting ? 1.75 : 1);

        if (boosting && Math.random() < 0.4 && wrm.body.length > 10) {
          const tail = wrm.body.pop();
          if (tail && Math.random() < 0.55) {
            S.foods.push({ p: { ...tail }, c: wrm.color, r: 3 + randInt(2) });
          }
        }

        const next = clamp({
          x: wrm.body[0].x + Math.cos(wrm.angle) * spd,
          y: wrm.body[0].y + Math.sin(wrm.angle) * spd,
        });
        if (next.x <= 51 || next.y <= 51 || next.x >= WORLD - 51 || next.y >= WORLD - 51) {
          wrm.angle += 0.5 + Math.random() * 0.8;
        }
        wrm.body.unshift(next);
        for (let i = 1; i < wrm.body.length; i++) {
          const prev = wrm.body[i - 1];
          const cur = wrm.body[i];
          const dd = dist(prev, cur);
          if (dd > SEG) {
            const a = Math.atan2(prev.y - cur.y, prev.x - cur.x);
            wrm.body[i] = {
              x: prev.x - Math.cos(a) * SEG,
              y: prev.y - Math.sin(a) * SEG,
            };
          }
        }
      }

      for (const wrm of S.worms) {
        if (!wrm.alive) continue;
        const r = rad(wrm.body.length);
        const kept: Food[] = [];
        for (const f of S.foods) {
          if (dist(wrm.body[0], f.p) < r + f.r) {
            wrm.body.push({ ...wrm.body[wrm.body.length - 1] });
            if (!wrm.bot) playTap();
          } else {
            kept.push(f);
          }
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
              wrm.alive = false;
              S.foods.push(...crumbs(wrm));
              if (other.id === 0) {
                S.kills += 1;
                setKills(S.kills);
                playWin();
              } else if (wrm.id === 0) {
                playBonk();
              }
              break outer;
            }
          }
        }
      }

      for (let i = 0; i < S.worms.length; i++) {
        const w = S.worms[i];
        if (!w.alive && w.bot) {
          S.worms[i] = makeWorm(++S.nextId, true, COLORS[randInt(COLORS.length)]);
        }
      }

      if (player?.alive) {
        S.cam.x += (player.body[0].x - S.cam.x) * 0.14;
        S.cam.y += (player.body[0].y - S.cam.y) * 0.14;
        setScore(player.body.length);
        setBest((b) => Math.max(b, player.body.length));
      } else if (player && !player.alive) {
        setDead(true);
        setRunning(false);
        live = false;
        return;
      }

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "#14121c";
      ctx.fillRect(0, 0, cw, ch);

      ctx.save();
      ctx.translate(cw / 2 - S.cam.x, ch / 2 - S.cam.y);

      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD);
        ctx.stroke();
      }
      for (let y = 0; y <= WORLD; y += 90) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "#c8f542";
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, WORLD - 48, WORLD - 48);

      for (const f of S.foods) {
        ctx.beginPath();
        ctx.fillStyle = f.c;
        ctx.arc(f.p.x, f.p.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const wrm of S.worms) {
        if (!wrm.alive) continue;
        const r = rad(wrm.body.length);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = wrm.color;
        ctx.lineWidth = r * 2;
        ctx.beginPath();
        wrm.body.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        const head = wrm.body[0];
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
      stats={
        <span>
          Len {score} · 💀 {kills}
        </span>
      }
    >
      <div className="relative">
        <Confetti show={kills > 0 && kills % 3 === 0 && running} />
        <div className="chunky overflow-hidden rounded-xl bg-ink">
          <canvas ref={canvasRef} className="block w-full touch-none" />
        </div>
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-paper/90 p-4 text-center">
            <p className="mb-2 font-[family-name:var(--font-display)] text-2xl">
              {dead ? "Got nommed." : "Slither Arena"}
            </p>
            <p className="mb-4 max-w-sm text-sm font-semibold text-ink/70">
              {dead
                ? `Length ${score} · best ${best} · bots eaten ${kills}`
                : "Mouse/finger steers. Hold click or space to boost. Eat pellets, cut off bots."}
            </p>
            <button
              type="button"
              onClick={start}
              className="btn-chunky rounded-md bg-lime px-5 py-2"
            >
              {dead ? "Respawn" : "Enter arena"}
            </button>
          </div>
        )}
        {running && (
          <p className="mt-3 text-center text-xs font-semibold text-ink/60">
            Best {best} · boost spends length · {BOTS} hungry bots
          </p>
        )}
      </div>
    </GameShell>
  );
}
