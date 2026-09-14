"use client";

import { useMemo, useState } from "react";
import { GameShell } from "@/components/GameShell";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";
import { pick, randInt, shuffle } from "@/lib/random";

type Phase = "setup" | "secret" | "tasks" | "vote" | "result";

type Player = {
  id: number;
  name: string;
  impostor: boolean;
  alive: boolean;
  tasks: number;
};

const TASKS = [
  "Calibrate the snack portal",
  "Swipe the lobby keycard",
  "Fix the wifi goblin",
  "Water the lobby plant",
  "Reboot the arcade cabinet",
  "Sort the sticker drawer",
  "Align the neon signs",
  "Empty the confetti bin",
];

export function CrewCheckGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(4);
  const [players, setPlayers] = useState<Player[]>([]);
  const [viewer, setViewer] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [task, setTask] = useState(TASKS[0]!);
  const [sabotageUsed, setSabotageUsed] = useState(false);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState("Pass-and-play. Find the impostor.");
  const [winner, setWinner] = useState<"crew" | "impostor" | null>(null);

  const alive = useMemo(() => players.filter((p) => p.alive), [players]);

  const boot = () => {
    const names = shuffle(["Nova", "Pixel", "Mango", "Zig", "Echo", "Bean"].slice(0, count));
    const impostorIndex = randInt(count);
    const list: Player[] = names.map((name, id) => ({
      id,
      name,
      impostor: id === impostorIndex,
      alive: true,
      tasks: 0,
    }));
    setPlayers(list);
    setViewer(0);
    setRevealed(false);
    setVotes({});
    setWinner(null);
    setSabotageUsed(false);
    setTask(pick(TASKS));
    setPhase("secret");
    setMsg("Pass the device. Each player peeks their role, then hides it.");
    playTap();
  };

  const nextViewer = () => {
    setRevealed(false);
    if (viewer + 1 >= players.length) {
      setPhase("tasks");
      setMsg("Crew: finish 2 tasks each. Impostor: sabotage once, then survive votes.");
      playTap();
      return;
    }
    setViewer(viewer + 1);
  };

  const doTask = (pid: number) => {
    if (phase !== "tasks") return;
    const p = players.find((x) => x.id === pid);
    if (!p || !p.alive || p.impostor || p.tasks >= 2) return;
    const next = players.map((x) => (x.id === pid ? { ...x, tasks: x.tasks + 1 } : x));
    setPlayers(next);
    setTask(pick(TASKS));
    playTap();
    const crew = next.filter((x) => x.alive && !x.impostor);
    if (crew.every((c) => c.tasks >= 2)) {
      setWinner("crew");
      setPhase("result");
      setMsg("Tasks complete — crew wins!");
      playWin();
    }
  };

  const doSabotage = () => {
    if (phase !== "tasks" || sabotageUsed) return;
    setSabotageUsed(true);
    setMsg("Lights flicker! Emergency meeting — vote.");
    playBonk();
    setPhase("vote");
    setVotes({});
  };

  const callMeeting = () => {
    setPhase("vote");
    setVotes({});
    setMsg("Emergency meeting! Vote who gets ejected.");
    playTap();
  };

  const cast = (voter: number, target: number) => {
    if (phase !== "vote") return;
    setVotes((v) => ({ ...v, [voter]: target }));
    playTap();
  };

  const resolveVote = () => {
    const tallies = new Map<number, number>();
    for (const t of Object.values(votes)) tallies.set(t, (tallies.get(t) ?? 0) + 1);
    let best = -1;
    let bestN = -1;
    let tie = false;
    for (const [id, n] of tallies) {
      if (n > bestN) {
        best = id;
        bestN = n;
        tie = false;
      } else if (n === bestN) {
        tie = true;
      }
    }
    if (tie || best < 0) {
      setMsg("Vote tied — no ejection. Back to tasks.");
      setPhase("tasks");
      playBonk();
      return;
    }
    const next = players.map((p) => (p.id === best ? { ...p, alive: false } : p));
    setPlayers(next);
    const ejected = next.find((p) => p.id === best)!;
    const impLeft = next.filter((p) => p.alive && p.impostor).length;
    const crewLeft = next.filter((p) => p.alive && !p.impostor).length;
    if (ejected.impostor && impLeft === 0) {
      setWinner("crew");
      setPhase("result");
      setMsg(`${ejected.name} was the impostor. Crew wins!`);
      playWin();
      return;
    }
    if (impLeft >= crewLeft) {
      setWinner("impostor");
      setPhase("result");
      setMsg("Impostors match the crew — sabotage wins.");
      playBonk();
      return;
    }
    setMsg(`${ejected.name} ejected. Not over yet.`);
    setPhase("tasks");
    setSabotageUsed(false);
  };

  return (
    <GameShell title="Crew Check" accent="#ef4444" ink="#fff" onBack={onBack} stats={<span>{alive.length} alive</span>}>
      <Confetti show={winner === "crew"} />
      <p className="mb-4 text-center text-sm font-bold">{msg}</p>

      {phase === "setup" && (
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <p className="font-semibold">Local-only pass-and-play. 4–6 players, one screen. No online needed.</p>
          <label className="block font-bold">
            Players: {count}
            <input
              type="range"
              min={4}
              max={6}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <button type="button" className="btn-chunky rounded-md bg-coral px-5 py-2 text-white" onClick={boot}>
            Deal roles
          </button>
        </div>
      )}

      {phase === "secret" && players[viewer] && (
        <div className="mx-auto max-w-sm space-y-3 text-center">
          <p className="text-lg font-extrabold">Hand to {players[viewer]!.name}</p>
          {!revealed ? (
            <button type="button" className="btn-chunky rounded-md bg-butter px-5 py-3" onClick={() => setRevealed(true)}>
              Reveal my role
            </button>
          ) : (
            <div className="rounded-xl border-[3px] border-ink bg-paper p-4">
              <p className="text-3xl">{players[viewer]!.impostor ? "🕵️" : "🧑‍🚀"}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
                {players[viewer]!.impostor ? "IMPOSTOR" : "CREW"}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink/70">
                {players[viewer]!.impostor
                  ? "Sabotage. Blend in. Don't get voted out."
                  : "Finish 2 tasks. Catch the faker."}
              </p>
            </div>
          )}
          {revealed && (
            <button type="button" className="btn-chunky rounded-md bg-lime px-5 py-2" onClick={nextViewer}>
              Hide & pass →
            </button>
          )}
        </div>
      )}

      {phase === "tasks" && (
        <div className="space-y-4">
          <div className="rounded-md border-[3px] border-ink bg-paper px-3 py-2 text-center font-bold">{task}</div>
          <p className="text-center text-xs font-bold text-ink/60">
            Pass the device to each crewmate for tasks. Impostor: use sabotage when it&apos;s secretly your turn.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {alive.map((p) => (
              <div key={p.id} className="rounded-lg border-[3px] border-ink bg-paper p-3">
                <p className="font-extrabold">
                  {p.name} · {p.tasks}/2 tasks
                </p>
                <button
                  type="button"
                  className="btn-chunky mt-2 rounded-md bg-sky px-3 py-1.5 text-sm text-white"
                  onClick={() => doTask(p.id)}
                  disabled={p.tasks >= 2}
                >
                  Do task (if crew)
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn-chunky rounded-md bg-coral px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={doSabotage}
              disabled={sabotageUsed}
            >
              Impostor sabotage
            </button>
            <button type="button" className="btn-chunky rounded-md bg-butter px-4 py-2 text-sm" onClick={callMeeting}>
              Call meeting
            </button>
          </div>
        </div>
      )}

      {phase === "vote" && (
        <div className="space-y-3">
          {alive.map((voter) => (
            <div key={voter.id} className="rounded-lg border-[3px] border-ink bg-paper p-3">
              <p className="mb-2 font-extrabold">{voter.name} votes:</p>
              <div className="flex flex-wrap gap-2">
                {alive
                  .filter((t) => t.id !== voter.id)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${votes[voter.id] === t.id ? "bg-coral text-white" : "bg-paper"}`}
                      onClick={() => cast(voter.id, t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <div className="text-center">
            <button
              type="button"
              className="btn-chunky rounded-md bg-lime px-5 py-2 disabled:opacity-50"
              disabled={alive.some((p) => votes[p.id] === undefined)}
              onClick={resolveVote}
            >
              Lock votes
            </button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-4 text-center">
          <p className="font-[family-name:var(--font-display)] text-3xl">
            {winner === "crew" ? "Crew victory" : "Impostor victory"}
          </p>
          <ul className="text-sm font-semibold">
            {players.map((p) => (
              <li key={p.id}>
                {p.name}: {p.impostor ? "impostor" : "crew"}
                {p.alive ? "" : " (ejected)"}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-chunky rounded-md bg-coral px-5 py-2 text-white"
            onClick={() => setPhase("setup")}
          >
            Play again
          </button>
        </div>
      )}
    </GameShell>
  );
}
