"use client";

import { useMemo, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { GameShell } from "@/components/GameShell";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { randInt, shuffle } from "@/lib/random";

type Phase = "setup" | "reveal" | "turn" | "task" | "kill" | "meeting" | "vote" | "result";
type RoomId = "cafe" | "med" | "elec" | "engine" | "sec" | "storage";
type TaskKind = "wires" | "tap" | "hold";
type Sabotage = null | { kind: "reactor" | "lights"; turnsLeft: number };

type Player = {
  id: number;
  name: string;
  color: string;
  impostor: boolean;
  alive: boolean;
  room: RoomId;
  tasksDone: number;
  killCd: number;
};

type Body = { victimId: number; room: RoomId };

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#14b8a6"];
const HINTS = ["Red", "Blue", "Lime", "Yellow", "Purple", "Orange", "Pink", "Teal"];

const ROOMS: Record<
  RoomId,
  { label: string; emoji: string; neighbors: RoomId[]; task: string; taskKind: TaskKind }
> = {
  cafe: {
    label: "Cafeteria",
    emoji: "🍽️",
    neighbors: ["med", "storage", "sec"],
    task: "Empty trash",
    taskKind: "tap",
  },
  med: {
    label: "Medbay",
    emoji: "🩺",
    neighbors: ["cafe", "elec"],
    task: "Scan vitals",
    taskKind: "hold",
  },
  elec: {
    label: "Electrical",
    emoji: "⚡",
    neighbors: ["med", "engine", "sec"],
    task: "Fix wiring",
    taskKind: "wires",
  },
  engine: {
    label: "Engines",
    emoji: "🚀",
    neighbors: ["elec", "storage"],
    task: "Align thrusters",
    taskKind: "hold",
  },
  sec: {
    label: "Security",
    emoji: "📹",
    neighbors: ["cafe", "elec"],
    task: "Rewind cams",
    taskKind: "tap",
  },
  storage: {
    label: "Storage",
    emoji: "📦",
    neighbors: ["cafe", "engine"],
    task: "Fuel cans",
    taskKind: "tap",
  },
};

const ROOM_ORDER: RoomId[] = ["cafe", "med", "elec", "engine", "sec", "storage"];

export function CrewCheckGame({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(5);
  const [names, setNames] = useState(() => HINTS.slice(0, 5));
  const [players, setPlayers] = useState<Player[]>([]);
  const [viewer, setViewer] = useState(0);
  const [peeked, setPeeked] = useState(false);
  const [turn, setTurn] = useState(0);
  const [bodies, setBodies] = useState<Body[]>([]);
  const [sabotage, setSabotage] = useState<Sabotage>(null);
  const [log, setLog] = useState("One ship. Hidden traitors. Finish the jobs — or get ejected.");
  const [winner, setWinner] = useState<"crew" | "impostor" | null>(null);
  const [meetingCaller, setMeetingCaller] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<number, number | "skip">>({});
  const [taskRoom, setTaskRoom] = useState<RoomId | null>(null);
  const [taskProg, setTaskProg] = useState(0);
  const [wires, setWires] = useState<[number, number]>([0, 1]);
  const [emergencyLeft, setEmergencyLeft] = useState(1);
  const [round, setRound] = useState(1);
  const holdRef = useRef<number | null>(null);

  const alive = useMemo(() => players.filter((p) => p.alive), [players]);
  const actor = players[turn]?.alive ? players[turn]! : null;
  const tasksNeeded = Math.max(6, (count - 1) * 2);
  const tasksDone = players.filter((p) => !p.impostor).reduce((s, p) => s + p.tasksDone, 0);
  const lightsOut = sabotage?.kind === "lights";

  const syncCount = (n: number) => {
    setCount(n);
    setNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(HINTS[next.length] || `P${next.length + 1}`);
      return next.slice(0, n);
    });
  };

  const setName = (i: number, v: string) => {
    setNames((prev) => {
      const next = [...prev];
      next[i] = v.slice(0, 12);
      return next;
    });
  };

  const checkWins = (list: Player[], done: number, sab: Sabotage) => {
    const imp = list.filter((p) => p.alive && p.impostor).length;
    const crew = list.filter((p) => p.alive && !p.impostor).length;
    if (imp === 0) {
      setWinner("crew");
      setPhase("result");
      setLog("All impostors ejected. Crew wins.");
      playWin();
      return true;
    }
    if (imp >= crew) {
      setWinner("impostor");
      setPhase("result");
      setLog("Impostors match the crew. Ship lost.");
      playBonk();
      return true;
    }
    if (done >= tasksNeeded) {
      setWinner("crew");
      setPhase("result");
      setLog("Critical systems online. Crew wins!");
      playWin();
      return true;
    }
    if (sab?.kind === "reactor" && sab.turnsLeft <= 0) {
      setWinner("impostor");
      setPhase("result");
      setLog("Reactor melted down. Impostor wins.");
      playBonk();
      return true;
    }
    return false;
  };

  const boot = () => {
    const filled = names.slice(0, count).map((n, i) => n.trim() || HINTS[i] || `Player ${i + 1}`);
    const impCount = count >= 6 ? 2 : 1;
    const impSeats = new Set(shuffle([...Array(count).keys()]).slice(0, impCount));
    const list: Player[] = filled.map((name, id) => ({
      id,
      name,
      color: COLORS[id]!,
      impostor: impSeats.has(id),
      alive: true,
      room: "cafe" as RoomId,
      tasksDone: 0,
      killCd: 0,
    }));
    setPlayers(list);
    setViewer(0);
    setPeeked(false);
    setBodies([]);
    setSabotage(null);
    setVotes({});
    setWinner(null);
    setEmergencyLeft(1);
    setRound(1);
    setTurn(0);
    setPhase("reveal");
    setLog("Pass the phone. Peek your role. Trust nobody.");
    playTap();
  };

  const nextReveal = () => {
    setPeeked(false);
    if (viewer + 1 >= players.length) {
      setPhase("turn");
      setLog(`${players[0]!.name}'s turn — move, task, or scheme.`);
      return;
    }
    setViewer(viewer + 1);
  };

  const advanceTurn = (list: Player[], sab: Sabotage, done: number) => {
    if (checkWins(list, done, sab)) return;

    let nextSab = sab;
    if (nextSab) {
      nextSab = { ...nextSab, turnsLeft: nextSab.turnsLeft - 1 };
      setSabotage(nextSab);
      if (checkWins(list, done, nextSab)) return;
    }

    const cooled = list.map((p) => ({ ...p, killCd: Math.max(0, p.killCd - 1) }));
    let idx = turn;
    for (let i = 0; i < cooled.length; i++) {
      idx = (idx + 1) % cooled.length;
      if (cooled[idx]!.alive) break;
    }
    setPlayers(cooled);
    setTurn(idx);
    setRound((r) => r + 1);
    setPhase("turn");
    setLog(`${cooled[idx]!.name}'s turn.`);
  };

  const moveTo = (room: RoomId) => {
    if (!actor || phase !== "turn") return;
    if (!ROOMS[actor.room].neighbors.includes(room)) return;
    setPlayers((prev) => prev.map((p) => (p.id === actor.id ? { ...p, room } : p)));
    playTap();
    setLog(`${actor.name} → ${ROOMS[room].label}`);
  };

  const startTask = () => {
    if (!actor || phase !== "turn" || actor.impostor) return;
    if (lightsOut && actor.room !== "elec") {
      setLog("Lights out — only Electrical works.");
      playBonk();
      return;
    }
    setTaskRoom(actor.room);
    setTaskProg(0);
    setWires([randInt(3), randInt(3)]);
    setPhase("task");
    playTap();
  };

  const fakeTask = () => {
    if (!actor?.impostor || phase !== "turn") return;
    playTap();
    setLog(`${actor.name} pretended to work…`);
    advanceTurn(players, sabotage, tasksDone);
  };

  const finishTask = () => {
    if (!actor || !taskRoom) return;
    let nextSab = sabotage;
    if (sabotage?.kind === "lights" && taskRoom === "elec") {
      nextSab = null;
      setSabotage(null);
      setLog("Lights restored!");
    }
    if (sabotage?.kind === "reactor" && (taskRoom === "engine" || taskRoom === "sec")) {
      nextSab = null;
      setSabotage(null);
      setLog("Reactor stabilized!");
    }
    const next = players.map((p) => (p.id === actor.id ? { ...p, tasksDone: p.tasksDone + 1 } : p));
    const done = next.filter((p) => !p.impostor).reduce((s, p) => s + p.tasksDone, 0);
    setPlayers(next);
    setTaskRoom(null);
    beep(720, 0.08, "triangle", 0.05);
    if (!nextSab) {
      /* already logged fix */
    } else {
      setLog(`${actor.name} finished ${ROOMS[taskRoom].task}. (${done}/${tasksNeeded})`);
    }
    advanceTurn(next, nextSab, done);
  };

  const openKill = () => {
    if (!actor?.impostor || phase !== "turn" || actor.killCd > 0) return;
    const victims = players.filter((p) => p.alive && !p.impostor && p.room === actor.room);
    if (victims.length === 0) {
      setLog("No crew alone with you here.");
      playBonk();
      return;
    }
    setPhase("kill");
  };

  const doKill = (vid: number) => {
    if (!actor) return;
    const victim = players.find((p) => p.id === vid)!;
    const next = players.map((p) =>
      p.id === vid ? { ...p, alive: false } : p.id === actor.id ? { ...p, killCd: 2 } : p,
    );
    setPlayers(next);
    setBodies((b) => [...b, { victimId: vid, room: victim.room }]);
    playBonk();
    setLog("A body hits the floor.");
    advanceTurn(next, sabotage, tasksDone);
  };

  const doSabotage = (kind: "reactor" | "lights") => {
    if (!actor?.impostor || phase !== "turn" || sabotage) return;
    const sab: Sabotage = { kind, turnsLeft: kind === "reactor" ? 4 : 5 };
    setSabotage(sab);
    playBonk();
    setLog(kind === "reactor" ? "🚨 REACTOR — fix Engines or Security!" : "🚨 LIGHTS OUT — fix Electrical!");
    advanceTurn(players, sab, tasksDone);
  };

  const report = () => {
    if (!actor || phase !== "turn") return;
    if (!bodies.some((b) => b.room === actor.room)) return;
    setBodies((b) => b.filter((x) => x.room !== actor.room));
    setMeetingCaller(actor.name);
    setVotes({});
    setPhase("meeting");
    setLog(`${actor.name} reported a body in ${ROOMS[actor.room].label}!`);
    playBonk();
  };

  const callEmergency = () => {
    if (!actor || phase !== "turn" || emergencyLeft <= 0 || actor.room !== "cafe") return;
    setEmergencyLeft((n) => n - 1);
    setMeetingCaller(actor.name);
    setVotes({});
    setPhase("meeting");
    setLog(`${actor.name} hit the emergency button!`);
    playTap();
  };

  const cast = (voter: number, target: number | "skip") => {
    setVotes((v) => ({ ...v, [voter]: target }));
    playTap();
  };

  const resolveVote = () => {
    const tallies = new Map<number | "skip", number>();
    for (const t of Object.values(votes)) tallies.set(t, (tallies.get(t) ?? 0) + 1);
    let best: number | "skip" = "skip";
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
    if (tie || best === "skip" || typeof best !== "number") {
      setLog("No consensus — nobody ejected.");
      setPhase("turn");
      playBonk();
      return;
    }
    const next = players.map((p) => (p.id === best ? { ...p, alive: false } : p));
    setPlayers(next);
    const ejected = next.find((p) => p.id === best)!;
    setLog(`${ejected.name} ejected — ${ejected.impostor ? "was an IMPOSTOR" : "was NOT an impostor"}.`);
    if (!checkWins(next, tasksDone, sabotage)) {
      const living = next.filter((p) => p.alive);
      const idx = next.findIndex((p) => p.id === living[0]?.id);
      setTurn(idx >= 0 ? idx : 0);
      setPhase("turn");
    }
  };

  const roomPlayers = (room: RoomId) =>
    players.filter((p) => p.alive && p.room === room);

  return (
    <GameShell
      title="Crew Check"
      accent="#ef4444"
      ink="#fff"
      onBack={onBack}
      stats={
        <span>
          {tasksDone}/{tasksNeeded} · {alive.length} alive
        </span>
      }
    >
      <Confetti show={winner === "crew"} />
      <p className="mb-3 text-center text-sm font-extrabold">{log}</p>

      {sabotage && phase !== "setup" && phase !== "reveal" && phase !== "result" && (
        <div
          className={`mb-3 rounded-md border-[3px] border-ink px-3 py-2 text-center text-sm font-black ${
            sabotage.kind === "reactor" ? "animate-pulse bg-coral text-white" : "bg-ink text-white"
          }`}
        >
          {sabotage.kind === "reactor" ? "☢ REACTOR" : "💡 LIGHTS"} · {sabotage.turnsLeft} turns
        </div>
      )}

      {phase === "setup" && (
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-center text-sm font-semibold text-ink/70">
            Pass-and-play ship mystery inspired by Among Us: rooms, mini-tasks, kills, bodies, sabotage, meetings, votes.
          </p>
          <label className="block text-center font-bold">
            Crew size: {count}
            <input
              type="range"
              min={4}
              max={8}
              value={count}
              onChange={(e) => syncCount(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <div className="space-y-2">
            {names.slice(0, count).map((n, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full border-2 border-ink" style={{ background: COLORS[i] }} />
                <input
                  value={n}
                  onChange={(e) => setName(i, e.target.value)}
                  className="btn-chunky flex-1 rounded-md bg-white px-3 py-1.5 text-sm"
                  placeholder={`Player ${i + 1}`}
                />
              </div>
            ))}
          </div>
          <p className="text-center text-xs font-bold text-ink/60">
            {count >= 6 ? "2 impostors" : "1 impostor"} · {tasksNeeded} tasks to win
          </p>
          <button type="button" className="btn-chunky mx-auto block rounded-md bg-coral px-6 py-2 text-white" onClick={boot}>
            Launch ship
          </button>
        </div>
      )}

      {phase === "reveal" && players[viewer] && (
        <div className="mx-auto max-w-sm space-y-3 text-center">
          <p className="text-lg font-black">Pass to {players[viewer]!.name}</p>
          {!peeked ? (
            <button type="button" className="btn-chunky rounded-md bg-butter px-5 py-3" onClick={() => setPeeked(true)}>
              Peek role (alone!)
            </button>
          ) : (
            <div className="rounded-xl border-[3px] border-ink p-5" style={{ background: players[viewer]!.color }}>
              <p className="text-4xl">{players[viewer]!.impostor ? "🗡️" : "🧑‍🚀"}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-white drop-shadow">
                {players[viewer]!.impostor ? "IMPOSTOR" : "CREWMATE"}
              </p>
              <p className="mt-2 text-sm font-bold text-white/90">
                {players[viewer]!.impostor
                  ? "Kill when alone. Sabotage. Fake tasks. Survive votes."
                  : "Do tasks. Stick together. Report bodies. Vote smart."}
              </p>
            </div>
          )}
          {peeked && (
            <button type="button" className="btn-chunky rounded-md bg-lime px-5 py-2" onClick={nextReveal}>
              Hide & pass →
            </button>
          )}
        </div>
      )}

      {phase === "turn" && actor && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-[3px] border-ink bg-white px-3 py-2">
            <div className="flex items-center gap-2 font-black">
              <span className="h-5 w-5 rounded-full border-2 border-ink" style={{ background: actor.color }} />
              {actor.name}
              <span className="text-xs font-bold text-ink/50">t{round}</span>
            </div>
            <span className="text-sm font-bold">
              {ROOMS[actor.room].emoji} {ROOMS[actor.room].label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROOM_ORDER.map((id) => {
              const r = ROOMS[id];
              const here = roomPlayers(id);
              const bodyHere = bodies.some((b) => b.room === id);
              const canMove = ROOMS[actor.room].neighbors.includes(id);
              const isHere = actor.room === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!canMove && !isHere}
                  onClick={() => canMove && moveTo(id)}
                  className={`rounded-lg border-[3px] border-ink p-2 text-left disabled:opacity-40 ${
                    isHere ? "bg-butter" : canMove ? "bg-paper hover:bg-lime/40" : "bg-paper-2"
                  }`}
                >
                  <p className="text-sm font-black">
                    {r.emoji} {r.label}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {here.map((p) => (
                      <span
                        key={p.id}
                        title={lightsOut && p.id !== actor.id ? "?" : p.name}
                        className="h-3 w-3 rounded-full border border-ink"
                        style={{ background: lightsOut && p.id !== actor.id ? "#444" : p.color }}
                      />
                    ))}
                    {bodyHere && <span className="text-xs">💀</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {!actor.impostor && (
              <button type="button" className="btn-chunky rounded-md bg-sky px-4 py-2 text-sm text-white" onClick={startTask}>
                Do: {ROOMS[actor.room].task}
              </button>
            )}
            {actor.impostor && (
              <>
                <button type="button" className="btn-chunky rounded-md bg-paper-2 px-4 py-2 text-sm" onClick={fakeTask}>
                  Fake task
                </button>
                <button
                  type="button"
                  className="btn-chunky rounded-md bg-coral px-4 py-2 text-sm text-white disabled:opacity-40"
                  disabled={actor.killCd > 0}
                  onClick={openKill}
                >
                  Kill{actor.killCd > 0 ? ` (${actor.killCd})` : ""}
                </button>
                {!sabotage && (
                  <>
                    <button
                      type="button"
                      className="btn-chunky rounded-md bg-ink px-3 py-2 text-sm text-white"
                      onClick={() => doSabotage("lights")}
                    >
                      Sabotage lights
                    </button>
                    <button
                      type="button"
                      className="btn-chunky rounded-md bg-coral px-3 py-2 text-sm text-white"
                      onClick={() => doSabotage("reactor")}
                    >
                      Sabotage reactor
                    </button>
                  </>
                )}
              </>
            )}
            {bodies.some((b) => b.room === actor.room) && (
              <button type="button" className="btn-chunky rounded-md bg-butter px-4 py-2 text-sm" onClick={report}>
                Report body!
              </button>
            )}
            {actor.room === "cafe" && emergencyLeft > 0 && (
              <button type="button" className="btn-chunky rounded-md bg-lime px-4 py-2 text-sm" onClick={callEmergency}>
                Emergency ({emergencyLeft})
              </button>
            )}
            <button
              type="button"
              className="btn-chunky rounded-md bg-paper px-4 py-2 text-sm"
              onClick={() => advanceTurn(players, sabotage, tasksDone)}
            >
              End turn
            </button>
          </div>
        </div>
      )}

      {phase === "kill" && actor && (
        <div className="mx-auto max-w-sm space-y-3 text-center">
          <p className="font-black">Victim in {ROOMS[actor.room].label}</p>
          {players
            .filter((p) => p.alive && !p.impostor && p.room === actor.room)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn-chunky flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-3 text-white"
                onClick={() => doKill(p.id)}
              >
                <span className="h-4 w-4 rounded-full border-2 border-white" style={{ background: p.color }} />
                Eliminate {p.name}
              </button>
            ))}
          <button type="button" className="btn-chunky rounded-md bg-paper px-4 py-2 text-sm" onClick={() => setPhase("turn")}>
            Cancel
          </button>
        </div>
      )}

      {phase === "task" && actor && taskRoom && (
        <div className="mx-auto max-w-sm space-y-3 text-center">
          <p className="font-black">{ROOMS[taskRoom].task}</p>
          {ROOMS[taskRoom].taskKind === "wires" && (
            <>
              <p className="text-sm font-semibold">Match the wire colors</p>
              <div className="flex justify-center gap-6">
                {[0, 1, 2].map((i) => (
                  <button
                    key={`a-${i}`}
                    type="button"
                    className={`h-10 w-10 rounded-full border-[3px] border-ink ${wires[0] === i ? "ring-4 ring-ink/30" : ""}`}
                    style={{ background: ["#ef4444", "#3b82f6", "#eab308"][i] }}
                    onClick={() => setWires([i, wires[1]])}
                  />
                ))}
              </div>
              <div className="flex justify-center gap-6">
                {[0, 1, 2].map((i) => (
                  <button
                    key={`b-${i}`}
                    type="button"
                    className={`h-10 w-10 rounded-full border-[3px] border-ink ${wires[1] === i ? "ring-4 ring-ink/30" : ""}`}
                    style={{ background: ["#ef4444", "#3b82f6", "#eab308"][i] }}
                    onClick={() => setWires([wires[0], i])}
                  />
                ))}
              </div>
              <button
                type="button"
                disabled={wires[0] !== wires[1]}
                className="btn-chunky rounded-md bg-lime px-5 py-2 disabled:opacity-40"
                onClick={finishTask}
              >
                Connect
              </button>
            </>
          )}
          {ROOMS[taskRoom].taskKind === "tap" && (
            <>
              <p className="text-sm">Tap {5 - taskProg} more times</p>
              <button
                type="button"
                className="btn-chunky mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-butter text-2xl font-black"
                onClick={() => {
                  playTap();
                  const n = taskProg + 1;
                  setTaskProg(n);
                  if (n >= 5) finishTask();
                }}
              >
                TAP
              </button>
            </>
          )}
          {ROOMS[taskRoom].taskKind === "hold" && (
            <>
              <p className="text-sm">Press & hold — release in the green zone</p>
              <div className="relative h-4 overflow-hidden rounded-full border-[3px] border-ink bg-paper-2">
                <div className="absolute inset-y-0 left-[62%] w-[16%] bg-lime/80" />
                <div className="absolute inset-y-0 left-0 bg-sky transition-all" style={{ width: `${taskProg}%` }} />
              </div>
              <button
                type="button"
                className="btn-chunky rounded-md bg-sky px-6 py-3 text-white"
                onPointerDown={() => {
                  setTaskProg(0);
                  holdRef.current = window.setInterval(() => {
                    setTaskProg((p) => Math.min(100, p + 2));
                  }, 30);
                }}
                onPointerUp={() => {
                  if (holdRef.current) window.clearInterval(holdRef.current);
                  holdRef.current = null;
                  setTaskProg((p) => {
                    if (p >= 62 && p <= 78) {
                      window.setTimeout(finishTask, 0);
                    } else {
                      playBonk();
                    }
                    return 0;
                  });
                }}
                onPointerLeave={() => {
                  if (holdRef.current) window.clearInterval(holdRef.current);
                  holdRef.current = null;
                }}
              >
                Hold
              </button>
            </>
          )}
          <button
            type="button"
            className="mx-auto block text-sm font-bold underline"
            onClick={() => {
              setPhase("turn");
              setTaskRoom(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {(phase === "meeting" || phase === "vote") && (
        <div className="space-y-3">
          <p className="text-center text-sm font-bold text-ink/70">
            Called by {meetingCaller}. Argue out loud — then vote.
          </p>
          {phase === "meeting" && (
            <div className="text-center">
              <button type="button" className="btn-chunky rounded-md bg-coral px-5 py-2 text-white" onClick={() => setPhase("vote")}>
                Start voting
              </button>
            </div>
          )}
          {phase === "vote" &&
            alive.map((voter) => (
              <div key={voter.id} className="rounded-lg border-[3px] border-ink bg-white p-3">
                <p className="mb-2 flex items-center gap-2 font-black">
                  <span className="h-4 w-4 rounded-full border border-ink" style={{ background: voter.color }} />
                  {voter.name}
                </p>
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
                  <button
                    type="button"
                    className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${votes[voter.id] === "skip" ? "bg-butter" : "bg-paper"}`}
                    onClick={() => cast(voter.id, "skip")}
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          {phase === "vote" && (
            <div className="text-center">
              <button
                type="button"
                className="btn-chunky rounded-md bg-lime px-5 py-2 disabled:opacity-50"
                disabled={alive.some((p) => votes[p.id] === undefined)}
                onClick={resolveVote}
              >
                Lock votes & eject
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-4 text-center">
          <p className="font-[family-name:var(--font-display)] text-3xl">
            {winner === "crew" ? "Crew victory" : "Impostor victory"}
          </p>
          <ul className="space-y-1 text-sm font-bold">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 rounded-full border border-ink" style={{ background: p.color }} />
                {p.name}: {p.impostor ? "IMPOSTOR" : "crew"}
                {!p.alive ? " · out" : ""}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-chunky rounded-md bg-coral px-5 py-2 text-white" onClick={() => setPhase("setup")}>
            Play again
          </button>
        </div>
      )}
    </GameShell>
  );
}
