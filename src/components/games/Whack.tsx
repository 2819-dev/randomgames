"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { pick, randInt } from "@/lib/random";

type MoleKind = "normal" | "gold" | "bomb" | "swift";

type Mole = {
  hole: number;
  kind: MoleKind;
  face: string;
  born: number;
  life: number;
};

const FACES: Record<MoleKind, string[]> = {
  normal: ["🐹", "🐰", "🐸", "🐥", "🦊"],
  gold: ["👑", "⭐", "💎"],
  bomb: ["💣", "🧨"],
  swift: ["⚡", "🐿️"],
};

const HOLES = 9;
const DURATION = 35_000;

function rollKind(fever: boolean): MoleKind {
  const r = Math.random();
  if (fever) {
    if (r < 0.12) return "bomb";
    if (r < 0.38) return "gold";
    if (r < 0.55) return "swift";
    return "normal";
  }
  if (r < 0.1) return "bomb";
  if (r < 0.22) return "gold";
  if (r < 0.34) return "swift";
  return "normal";
}

export function WhackGame({ onBack }: { onBack: () => void }) {
  const [moles, setMoles] = useState<Mole[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [left, setLeft] = useState(35);
  const [fever, setFever] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState("");

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const feverRef = useRef(false);
  const feverUntil = useRef(0);
  const molesRef = useRef<Mole[]>([]);
  const missStreak = useRef(0);

  useEffect(() => {
    molesRef.current = moles;
  }, [moles]);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    let spawnTimer = 0;

    const tick = window.setInterval(() => {
      const now = Date.now();
      const remain = Math.max(0, DURATION - (now - start));
      setLeft(Math.ceil(remain / 1000));

      if (feverRef.current && now > feverUntil.current) {
        feverRef.current = false;
        setFever(false);
        setToast("");
      }

      setMoles((prev) => prev.filter((m) => now - m.born < m.life));

      if (remain <= 0) {
        window.clearInterval(tick);
        window.clearTimeout(spawnTimer);
        setRunning(false);
        setDone(true);
        setMoles([]);
        if (scoreRef.current >= 40) playWin();
        else playBonk();
      }
    }, 100);

    const spawnOne = () => {
      const now = Date.now();
      const elapsed = now - start;
      const occupied = new Set(molesRef.current.map((m) => m.hole));
      const free = Array.from({ length: HOLES }, (_, i) => i).filter((i) => !occupied.has(i));
      if (free.length === 0) return;

      const kind = rollKind(feverRef.current);
      const hole = free[randInt(free.length)]!;
      const life =
        kind === "swift"
          ? 420 + randInt(180)
          : kind === "gold"
            ? 700 + randInt(250)
            : kind === "bomb"
              ? 900 + randInt(300)
              : 650 + randInt(350) - Math.min(220, elapsed / 80);

      const mole: Mole = {
        hole,
        kind,
        face: pick(FACES[kind]),
        born: now,
        life: Math.max(320, life),
      };
      setMoles((prev) => [...prev.filter((m) => now - m.born < m.life), mole]);
    };

    const schedule = () => {
      const now = Date.now();
      const elapsed = now - start;
      const base = feverRef.current ? 220 : 380;
      const gap = Math.max(feverRef.current ? 140 : 200, base - elapsed / 90);
      spawnTimer = window.setTimeout(() => {
        spawnOne();
        if (feverRef.current || Math.random() < 0.28 + elapsed / 80_000) spawnOne();
        if (Math.random() < 0.12) spawnOne();
        schedule();
      }, gap + randInt(120));
    };
    spawnOne();
    schedule();

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(spawnTimer);
    };
  }, [running]);

  const start = () => {
    scoreRef.current = 0;
    comboRef.current = 0;
    feverRef.current = false;
    feverUntil.current = 0;
    missStreak.current = 0;
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setLeft(35);
    setFever(false);
    setDone(false);
    setToast("");
    setMoles([]);
    setRunning(true);
    playTap();
  };

  const whack = (hole: number) => {
    if (!running) return;
    const target = molesRef.current.find((m) => m.hole === hole);
    if (!target) {
      missStreak.current += 1;
      if (missStreak.current >= 2) {
        comboRef.current = 0;
        setCombo(0);
      }
      playBonk();
      return;
    }

    missStreak.current = 0;
    setMoles((prev) => prev.filter((m) => m.hole !== hole));

    if (target.kind === "bomb") {
      comboRef.current = 0;
      setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current - 8);
      setScore(scoreRef.current);
      setToast("BOMB −8");
      playBonk();
      return;
    }

    const mult = 1 + Math.floor(comboRef.current / 4);
    const base = target.kind === "gold" ? 5 : target.kind === "swift" ? 3 : 1;
    const gained = base * mult + (feverRef.current ? 2 : 0);
    scoreRef.current += gained;
    comboRef.current += 1;
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setBestCombo((b) => Math.max(b, comboRef.current));

    if (target.kind === "gold") {
      setToast(`GOLD +${gained}`);
      playWin();
    } else {
      beep(640 + Math.min(420, comboRef.current * 35), 0.05, "triangle", 0.05);
      if (target.kind === "swift") setToast(`SWIFT +${gained}`);
      else if (mult > 1) setToast(`x${mult} HIT +${gained}`);
      else setToast("");
    }

    if (comboRef.current >= 8 && !feverRef.current) {
      feverRef.current = true;
      feverUntil.current = Date.now() + 6500;
      setFever(true);
      setToast("FEVER MODE");
      playWin();
    }
  };

  return (
    <GameShell
      title="Whack+"
      accent="#ff8c42"
      onBack={onBack}
      stats={
        <span>
          {score} · x{combo || 1} · {left}s
        </span>
      }
    >
      <div className="relative">
        <Confetti show={done && score >= 40} />
        {fever && (
          <div className="mb-3 animate-wiggle rounded-md border-[3px] border-ink bg-butter px-3 py-1 text-center text-xs font-extrabold uppercase tracking-wide">
            Fever — gold rush, faster pops
          </div>
        )}
        <div className={`mx-auto grid max-w-md grid-cols-3 gap-3 ${fever ? "brightness-110" : ""}`}>
          {Array.from({ length: HOLES }, (_, i) => {
            const mole = moles.find((m) => m.hole === i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => whack(i)}
                className="relative flex aspect-square items-end justify-center overflow-hidden rounded-xl border-[3px] border-ink bg-[#6b4f2a]"
                style={{
                  boxShadow: "3px 3px 0 var(--ink)",
                  outline: mole?.kind === "gold" ? "3px solid #fbbf24" : mole?.kind === "bomb" ? "3px solid #f43f5e" : undefined,
                }}
                aria-label={mole ? `Whack ${mole.kind}` : "Empty hole"}
              >
                <span className="absolute bottom-1 h-5 w-4/5 rounded-full bg-[#3d2a14]" />
                <span
                  className={`absolute text-4xl transition-transform duration-100 sm:text-5xl ${
                    mole ? "translate-y-0" : "translate-y-[120%]"
                  }`}
                >
                  {mole?.face ?? "🐹"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 min-h-[1.25rem] text-center text-sm font-bold text-ink/70">
          {toast || "Gold = big points · Bombs hurt · Chain hits for fever"}
        </p>
        <div className="mt-4 text-center">
          {!running && (
            <>
              <p className="mb-3 font-bold">
                {done
                  ? `Time! ${score} pts · best combo x${bestCombo}`
                  : "35s of chaos. Skip bombs. Chase fever."}
              </p>
              <button type="button" onClick={start} className="btn-chunky rounded-md bg-[#ff8c42] px-5 py-2">
                {done ? "Rematch" : "Start whacking"}
              </button>
            </>
          )}
        </div>
      </div>
    </GameShell>
  );
}
