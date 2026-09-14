"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt } from "@/lib/random";

type Mode = "solo" | "duo";
type Owner = 0 | 1 | 2;

const SIZE = 12;
const TOTAL = SIZE * SIZE;

function at(x: number, y: number) {
  return y * SIZE + x;
}

function neighbors(i: number) {
  const x = i % SIZE;
  const y = (i / SIZE) | 0;
  const out: number[] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) out.push(at(nx, ny));
  }
  return out;
}

export function ClaimcraftGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [grid, setGrid] = useState<Owner[]>(() => Array(TOTAL).fill(0));
  const [turn, setTurn] = useState<1 | 2>(1);
  const [msg, setMsg] = useState("Claim tiles. Own the majority.");
  const [over, setOver] = useState(false);
  const botTimer = useRef(0);

  const counts = useMemo(() => {
    let a = 0;
    let b = 0;
    for (const c of grid) {
      if (c === 1) a++;
      if (c === 2) b++;
    }
    return { a, b };
  }, [grid]);

  const start = (m: Mode) => {
    const next = Array(TOTAL).fill(0) as Owner[];
    next[at(1, 1)] = 1;
    next[at(SIZE - 2, SIZE - 2)] = 2;
    setGrid(next);
    setMode(m);
    setTurn(1);
    setOver(false);
    setMsg(m === "solo" ? "You (lime) vs bots (coral)." : "P1 lime · P2 coral — alternate claims.");
    playTap();
  };

  const applyClaim = (current: Owner[], i: number, who: 1 | 2): Owner[] | null => {
    if (current[i] !== 0) return null;
    if (!neighbors(i).some((n) => current[n] === who)) return null;
    const next = [...current];
    next[i] = who;
    for (const n of neighbors(i)) {
      if (next[n] && next[n] !== who) {
        const press = neighbors(n).filter((x) => next[x] === who).length;
        if (press >= 2) next[n] = who;
      }
    }
    return next;
  };

  const finishIfNeeded = (next: Owner[], m: Mode) => {
    const a = next.filter((c) => c === 1).length;
    const b = next.filter((c) => c === 2).length;
    if (!(next.every((c) => c !== 0) || a + b >= TOTAL)) return false;
    setOver(true);
    if (a === b) {
      setMsg("Tie claim!");
      playBonk();
    } else if (a > b) {
      setMsg(m === "duo" ? "Player 1 rules the map!" : "You claimed the realm!");
      playWin();
    } else {
      setMsg(m === "duo" ? "Player 2 takes the crown!" : "Bots ate the map.");
      playBonk();
    }
    return true;
  };

  const onCell = (i: number) => {
    if (!mode || over) return;
    if (mode === "duo") {
      setGrid((cur) => {
        const next = applyClaim(cur, i, turn);
        if (!next) {
          playBonk();
          return cur;
        }
        playTap();
        if (!finishIfNeeded(next, mode)) setTurn(turn === 1 ? 2 : 1);
        return next;
      });
      return;
    }
    if (turn !== 1) return;
    setGrid((cur) => {
      const next = applyClaim(cur, i, 1);
      if (!next) {
        playBonk();
        return cur;
      }
      playTap();
      if (!finishIfNeeded(next, mode)) setTurn(2);
      return next;
    });
  };

  useEffect(() => {
    if (mode !== "solo" || turn !== 2 || over) return;
    botTimer.current = window.setTimeout(() => {
      setGrid((cur) => {
        const options: number[] = [];
        for (let i = 0; i < TOTAL; i++) {
          if (cur[i] !== 0) continue;
          if (neighbors(i).some((n) => cur[n] === 2)) options.push(i);
        }
        if (!options.length) {
          setTurn(1);
          return cur;
        }
        options.sort((a, b) => {
          const score = (i: number) => neighbors(i).filter((n) => cur[n] === 1).length;
          return score(b) - score(a);
        });
        const pick = options[Math.min(options.length - 1, randInt(3))] ?? options[0]!;
        const next = applyClaim(cur, pick, 2);
        if (!next) {
          setTurn(1);
          return cur;
        }
        if (!finishIfNeeded(next, "solo")) setTurn(1);
        return next;
      });
    }, 420);
    return () => window.clearTimeout(botTimer.current);
  }, [turn, mode, over]);

  return (
    <GameShell
      title="Claimcraft"
      accent="#65a30d"
      onBack={onBack}
      stats={
        <span>
          {counts.a}–{counts.b}
        </span>
      }
    >
      <Confetti show={over && counts.a > counts.b} />
      {!mode ? (
        <div className="space-y-4 text-center">
          <p className="font-bold">Expand from your base. Flank enemies to flip tiles.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-chunky rounded-md bg-lime px-4 py-2" onClick={() => start("solo")}>
              Solo vs bots
            </button>
            <button
              type="button"
              className="btn-chunky rounded-md bg-coral px-4 py-2 text-white"
              onClick={() => start("duo")}
            >
              Local 2P duel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-center text-sm font-bold">{msg}</p>
          {!over && (
            <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-wide text-ink/60">
              {mode === "duo" ? `Player ${turn}'s turn` : turn === 1 ? "Your turn" : "Bot thinking…"}
            </p>
          )}
          <div
            className="mx-auto grid max-w-md gap-0.5 rounded-lg border-[3px] border-ink bg-ink p-1"
            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
          >
            {grid.map((cell, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onCell(i)}
                className="aspect-square rounded-[3px]"
                style={{
                  background: cell === 1 ? "#a3e635" : cell === 2 ? "#fb7185" : "#1e293b",
                }}
                aria-label={`Tile ${i}`}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-chunky rounded-md bg-paper px-4 py-2 text-sm" onClick={() => setMode(null)}>
              Modes
            </button>
            <button type="button" className="btn-chunky rounded-md bg-lime px-4 py-2 text-sm" onClick={() => start(mode)}>
              Rematch
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
