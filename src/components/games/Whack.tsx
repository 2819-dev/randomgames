"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { pick, randInt } from "@/lib/random";

/** Among Us DNA: asymmetric targets, stakes, punishment for wrong calls. */

type Kind = "crew" | "impostor" | "engineer" | "bomb";

type Pop = {
  hole: number;
  kind: Kind;
  face: string;
  born: number;
  life: number;
};

const FACES: Record<Kind, string[]> = {
  crew: ["🔴", "🔵", "🟢", "🟡", "🟣"],
  impostor: ["🗡️", "😈", "🕶️"],
  engineer: ["🛠️", "🧰"],
  bomb: ["💣", "🚨"],
};

const HOLES = 9;
const DURATION = 40_000;

function roll(fever: boolean): Kind {
  const r = Math.random();
  if (fever) {
    if (r < 0.08) return "bomb";
    if (r < 0.42) return "impostor";
    if (r < 0.55) return "engineer";
    return "crew";
  }
  if (r < 0.1) return "bomb";
  if (r < 0.32) return "impostor";
  if (r < 0.42) return "engineer";
  return "crew";
}

export function WhackGame({ onBack }: { onBack: () => void }) {
  const [pops, setPops] = useState<Pop[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [left, setLeft] = useState(40);
  const [fever, setFever] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState("Hit impostors. Miss crew. Find the fakers.");

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const feverRef = useRef(false);
  const feverUntil = useRef(0);
  const popsRef = useRef<Pop[]>([]);

  useEffect(() => {
    popsRef.current = pops;
  }, [pops]);

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
      }
      setPops((prev) => prev.filter((m) => now - m.born < m.life));
      if (remain <= 0 || livesRef.current <= 0) {
        window.clearInterval(tick);
        window.clearTimeout(spawnTimer);
        setRunning(false);
        setDone(true);
        setPops([]);
        if (scoreRef.current >= 50) playWin();
        else playBonk();
        setToast(
          livesRef.current <= 0
            ? `Crew turned on you — ${scoreRef.current} pts`
            : `Shift over — ${scoreRef.current} pts`,
        );
      }
    }, 100);

    const schedule = () => {
      const elapsed = Date.now() - start;
      const delay = Math.max(280, 700 - elapsed / 60 - (feverRef.current ? 120 : 0));
      spawnTimer = window.setTimeout(() => {
        const now = Date.now();
        const occupied = new Set(popsRef.current.map((m) => m.hole));
        const free = Array.from({ length: HOLES }, (_, i) => i).filter((i) => !occupied.has(i));
        if (free.length) {
          const kind = roll(feverRef.current);
          const hole = free[randInt(free.length)]!;
          const life =
            kind === "impostor"
              ? 520 + randInt(220)
              : kind === "engineer"
                ? 700 + randInt(200)
                : kind === "bomb"
                  ? 900
                  : 650 + randInt(280);
          setPops((prev) => [
            ...prev.filter((m) => now - m.born < m.life),
            { hole, kind, face: pick(FACES[kind]), born: now, life },
          ]);
        }
        if (Date.now() - start < DURATION && livesRef.current > 0) schedule();
      }, delay);
    };
    schedule();

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(spawnTimer);
    };
  }, [running]);

  const start = () => {
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = 3;
    feverRef.current = false;
    setScore(0);
    setCombo(0);
    setLives(3);
    setLeft(40);
    setFever(false);
    setDone(false);
    setPops([]);
    setToast("Impostors = points. Crew = you lose a life.");
    setRunning(true);
    playTap();
  };

  const hit = (hole: number) => {
    if (!running) return;
    const m = popsRef.current.find((x) => x.hole === hole);
    if (!m) return;
    setPops((prev) => prev.filter((x) => x.hole !== hole));

    if (m.kind === "impostor") {
      comboRef.current += 1;
      const gain = 10 + comboRef.current * 3;
      scoreRef.current += gain;
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      beep(520 + comboRef.current * 40, 0.05, "square", 0.045);
      if (comboRef.current >= 4 && !feverRef.current) {
        feverRef.current = true;
        feverUntil.current = Date.now() + 6000;
        setFever(true);
        playWin();
        setToast("EMERGENCY FEVER — impostors everywhere");
      } else setToast(`Caught! +${gain}`);
    } else if (m.kind === "engineer") {
      livesRef.current = Math.min(5, livesRef.current + 1);
      setLives(livesRef.current);
      scoreRef.current += 5;
      setScore(scoreRef.current);
      playTap();
      setToast("Engineer assist +1 life");
    } else if (m.kind === "bomb") {
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      playBonk();
      setToast("Sabotage! −1 life");
    } else {
      comboRef.current = 0;
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
      playBonk();
      setToast("Wrong! That was crew.");
    }
  };

  return (
    <GameShell
      title="Sus Hunt"
      accent="#ef4444"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {score} · ❤{lives} · {left}s{combo > 1 ? ` · x${combo}` : ""}
        </span>
      }
    >
      <div className="relative mx-auto max-w-md">
        <Confetti show={done && score >= 50} />
        {fever && (
          <p className="mb-2 animate-pulse text-center text-sm font-black text-coral">FEVER — eject impostors!</p>
        )}
        <div className={`grid grid-cols-3 gap-3 ${fever ? "rounded-xl bg-coral/20 p-2" : ""}`}>
          {Array.from({ length: HOLES }, (_, hole) => {
            const m = pops.find((x) => x.hole === hole);
            return (
              <button
                key={hole}
                type="button"
                onClick={() => hit(hole)}
                className="btn-chunky relative flex aspect-square items-center justify-center rounded-xl bg-ink text-4xl"
                aria-label={m ? m.kind : "empty vent"}
              >
                <span className="absolute inset-x-2 bottom-2 h-3 rounded-full bg-paper/20" />
                {m && <span className="animate-bounce-soft relative z-10">{m.face}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-ink/70">{toast}</p>
        {!running && (
          <div className="mt-4 text-center">
            <button type="button" onClick={start} className="btn-chunky rounded-md bg-coral px-5 py-2 text-white">
              {done ? "Another shift" : "Start hunt"}
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
