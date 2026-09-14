"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { OnlineMatch, type MatchContext, type MatchPlayer } from "@/components/OnlineMatch";
import type { Room } from "@/lib/supabase";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { shuffle } from "@/lib/random";

/** Live multiplayer night-shift mystery at Box Arcade. Among Us DNA — own world. */

type RoomId = "lobby" | "prizes" | "tickets" | "floor" | "break" | "dock";
type Phase = "play" | "meeting" | "vote" | "done";
type TaskKind = "wires" | "tap" | "hold";
type Sabotage = null | { kind: "power" | "alarm"; endsAt: number };

type CrewPlayer = {
  userId: string;
  name: string;
  color: string;
  glitch: boolean;
  alive: boolean;
  room: RoomId;
  tasksDone: number;
  killReadyAt: number;
  lastActionAt: number;
};

type Body = { victimId: string; room: RoomId; name: string };

type CrewState = {
  phase: Phase;
  players: CrewPlayer[];
  bodies: Body[];
  sabotage: Sabotage;
  tasksNeeded: number;
  emergencyLeft: number;
  meetingCaller: string | null;
  votes: Record<string, string | "skip">;
  log: string;
  winner: "staff" | "glitch" | null;
};

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#14b8a6"];
const ACTION_MS = 850;
const KILL_MS = 18_000;
const SABOTAGE_MS = 45_000;

const ROOMS: Record<RoomId, { label: string; emoji: string; neighbors: RoomId[]; task: string; kind: TaskKind }> = {
  lobby: { label: "Lobby", emoji: "🎟️", neighbors: ["prizes", "tickets", "break"], task: "Wipe front glass", kind: "tap" },
  prizes: { label: "Prize Counter", emoji: "🧸", neighbors: ["lobby", "floor"], task: "Restock plushies", kind: "hold" },
  tickets: { label: "Ticket Booth", emoji: "🧾", neighbors: ["lobby", "floor", "dock"], task: "Balance the till", kind: "wires" },
  floor: { label: "Machine Floor", emoji: "🕹️", neighbors: ["prizes", "tickets", "break", "dock"], task: "Unjam a cabinet", kind: "wires" },
  break: { label: "Break Room", emoji: "☕", neighbors: ["lobby", "floor"], task: "Start the coffee", kind: "tap" },
  dock: { label: "Loading Dock", emoji: "📦", neighbors: ["tickets", "floor"], task: "Sign delivery", kind: "hold" },
};

const ROOM_ORDER: RoomId[] = ["lobby", "prizes", "tickets", "floor", "break", "dock"];

function parse(raw: Record<string, unknown>): CrewState {
  return raw as unknown as CrewState;
}

function staffTasks(players: CrewPlayer[]) {
  return players.filter((p) => !p.glitch).reduce((n, p) => n + p.tasksDone, 0);
}

function withWins(s: CrewState): CrewState {
  const glitch = s.players.filter((p) => p.alive && p.glitch).length;
  const staff = s.players.filter((p) => p.alive && !p.glitch).length;
  if (glitch === 0) return { ...s, phase: "done", winner: "staff", log: "All glitches ejected. Staff closes the arcade." };
  if (glitch >= staff) return { ...s, phase: "done", winner: "glitch", log: "Glitches outnumber staff. Night shift collapses." };
  if (staffTasks(s.players) >= s.tasksNeeded) return { ...s, phase: "done", winner: "staff", log: "Closing checklist done. Staff wins!" };
  if (s.sabotage && s.sabotage.endsAt <= Date.now()) {
    return {
      ...s,
      phase: "done",
      winner: "glitch",
      log: s.sabotage.kind === "alarm" ? "Alarm locked everyone in. Glitches win." : "Power died for good. Glitches win.",
    };
  }
  return s;
}

function buildInitialState(players: MatchPlayer[]): Record<string, unknown> {
  const n = players.length;
  const glitchCount = n >= 7 ? 2 : 1;
  const picks = new Set(shuffle([...Array(n).keys()]).slice(0, glitchCount));
  const crew: CrewPlayer[] = players.map((p, i) => ({
    userId: p.user_id,
    name: p.profile.display_name || p.profile.username,
    color: COLORS[i % COLORS.length]!,
    glitch: picks.has(i),
    alive: true,
    room: "lobby" as RoomId,
    tasksDone: 0,
    killReadyAt: Date.now() + 8_000,
    lastActionAt: 0,
  }));
  const state: CrewState = {
    phase: "play",
    players: crew,
    bodies: [],
    sabotage: null,
    tasksNeeded: Math.max(8, (n - glitchCount) * 2),
    emergencyLeft: 1,
    meetingCaller: null,
    votes: {},
    log: "Night shift starts. Finish closing jobs — or get deleted.",
    winner: null,
  };
  return state as unknown as Record<string, unknown>;
}

function CrewBoard({ room, me, commit }: MatchContext) {
  const s = parse(room.state);
  const self = s.players.find((p) => p.userId === me.user_id) ?? null;
  const [busy, setBusy] = useState(false);
  const [localTask, setLocalTask] = useState(false);
  const [taskProg, setTaskProg] = useState(0);
  const [wires, setWires] = useState<[number, number]>([0, 1]);
  const holdRef = useRef<number | null>(null);
  const holdProg = useRef(0);
  const [now, setNow] = useState(Date.now());
  const celebrated = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (s.phase === "done" && s.winner === "staff" && !celebrated.current) {
      celebrated.current = true;
      playWin();
    }
  }, [s.phase, s.winner]);

  const run = useCallback(
    async (fn: (cur: CrewState) => CrewState | null) => {
      if (busy) return;
      setBusy(true);
      try {
        await commit((raw) => {
          const cur = parse(raw);
          const next = fn(cur);
          if (!next) return null;
          return withWins(next) as unknown as Record<string, unknown>;
        });
      } catch {
        playBonk();
      } finally {
        setBusy(false);
      }
    },
    [busy, commit],
  );

  useEffect(() => {
    if (s.phase === "done" || !s.sabotage) return;
    if (s.sabotage.endsAt > now) return;
    void run((cur) => withWins(cur));
  }, [now, s.sabotage, s.phase, run]);

  if (!self) return <p className="text-center font-bold">Syncing your seat…</p>;

  const powerOut = s.sabotage?.kind === "power";
  const done = staffTasks(s.players);
  const killCd = Math.max(0, Math.ceil((self.killReadyAt - now) / 1000));
  const sabLeft = s.sabotage ? Math.max(0, Math.ceil((s.sabotage.endsAt - now) / 1000)) : 0;

  const moveTo = (id: RoomId) => {
    if (!self.alive || s.phase !== "play" || localTask) return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive || cur.phase !== "play") return null;
      if (Date.now() - p.lastActionAt < ACTION_MS) return null;
      if (!ROOMS[p.room].neighbors.includes(id)) return null;
      return {
        ...cur,
        players: cur.players.map((x) => (x.userId === p.userId ? { ...x, room: id, lastActionAt: Date.now() } : x)),
        log: `${p.name} → ${ROOMS[id].label}`,
      };
    });
    playTap();
  };

  const startTask = () => {
    if (!self.alive || self.glitch || s.phase !== "play") return;
    if (powerOut && self.room !== "tickets" && self.room !== "floor") {
      playBonk();
      return;
    }
    setTaskProg(0);
    holdProg.current = 0;
    setWires([Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)]);
    setLocalTask(true);
    playTap();
  };

  const finishTask = () => {
    setLocalTask(false);
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive || p.glitch || cur.phase !== "play") return null;
      let sab = cur.sabotage;
      let log = `${p.name} finished ${ROOMS[p.room].task}.`;
      if (sab?.kind === "power" && (p.room === "tickets" || p.room === "floor")) {
        sab = null;
        log = `${p.name} restored power!`;
      }
      if (sab?.kind === "alarm" && (p.room === "dock" || p.room === "lobby")) {
        sab = null;
        log = `${p.name} silenced the alarm!`;
      }
      return {
        ...cur,
        sabotage: sab,
        players: cur.players.map((x) =>
          x.userId === p.userId ? { ...x, tasksDone: x.tasksDone + 1, lastActionAt: Date.now() } : x,
        ),
        log,
      };
    });
    beep(720, 0.08, "triangle", 0.05);
  };

  const fakeTask = () => {
    if (!self.glitch || s.phase !== "play") return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive || !p.glitch) return null;
      return {
        ...cur,
        players: cur.players.map((x) => (x.userId === p.userId ? { ...x, lastActionAt: Date.now() } : x)),
        log: `${p.name} hovered near a machine…`,
      };
    });
    playTap();
  };

  const doKill = (victimId: string) => {
    if (!self.glitch || s.phase !== "play") return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      const v = cur.players.find((x) => x.userId === victimId);
      if (!p?.glitch || !p.alive || !v?.alive || v.glitch || p.room !== v.room) return null;
      if (Date.now() < p.killReadyAt) return null;
      const witnesses = cur.players.filter(
        (x) => x.alive && !x.glitch && x.room === p.room && x.userId !== p.userId && x.userId !== v.userId,
      );
      if (witnesses.length > 0) return null;
      return {
        ...cur,
        players: cur.players.map((x) => {
          if (x.userId === v.userId) return { ...x, alive: false };
          if (x.userId === p.userId) return { ...x, killReadyAt: Date.now() + KILL_MS, lastActionAt: Date.now() };
          return x;
        }),
        bodies: [...cur.bodies, { victimId: v.userId, room: v.room, name: v.name }],
        log: "Someone was deleted from the shift…",
      };
    });
    playBonk();
  };

  const doSabotage = (kind: "power" | "alarm") => {
    if (!self.glitch || s.phase !== "play" || s.sabotage) return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.glitch || !p.alive || cur.sabotage) return null;
      return {
        ...cur,
        sabotage: { kind, endsAt: Date.now() + SABOTAGE_MS },
        players: cur.players.map((x) => (x.userId === p.userId ? { ...x, lastActionAt: Date.now() } : x)),
        log: kind === "power" ? "🚨 POWER OUT — fix Tickets or Machine Floor!" : "🚨 ALARM — silence it in Lobby or Dock!",
      };
    });
    playBonk();
  };

  const report = () => {
    if (!self.alive || s.phase !== "play") return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive || cur.phase !== "play") return null;
      const body = cur.bodies.find((b) => b.room === p.room);
      if (!body) return null;
      return {
        ...cur,
        phase: "meeting",
        bodies: cur.bodies.filter((b) => b.room !== p.room),
        meetingCaller: p.name,
        votes: {},
        log: `${p.name} found ${body.name} in ${ROOMS[p.room].label}! Staff huddle.`,
      };
    });
    playBonk();
  };

  const emergency = () => {
    if (!self.alive || s.phase !== "play" || self.room !== "lobby" || s.emergencyLeft <= 0) return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive || p.room !== "lobby" || cur.emergencyLeft <= 0) return null;
      return {
        ...cur,
        phase: "meeting",
        emergencyLeft: cur.emergencyLeft - 1,
        meetingCaller: p.name,
        votes: {},
        log: `${p.name} slammed the lobby button! Emergency huddle.`,
      };
    });
    playTap();
  };

  const startVote = () => {
    void run((cur) => (cur.phase === "meeting" ? { ...cur, phase: "vote", votes: {} } : null));
  };

  const cast = (target: string | "skip") => {
    void run((cur) => {
      if (cur.phase !== "vote") return null;
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive) return null;
      return { ...cur, votes: { ...cur.votes, [p.userId]: target } };
    });
    playTap();
  };

  const lockVotes = () => {
    void run((cur) => {
      if (cur.phase !== "vote") return null;
      const alive = cur.players.filter((p) => p.alive);
      if (alive.some((p) => cur.votes[p.userId] === undefined)) return null;
      const tallies = new Map<string, number>();
      for (const t of Object.values(cur.votes)) tallies.set(t, (tallies.get(t) ?? 0) + 1);
      let best = "skip";
      let bestN = -1;
      let tie = false;
      for (const [id, n] of tallies) {
        if (n > bestN) {
          best = id;
          bestN = n;
          tie = false;
        } else if (n === bestN) tie = true;
      }
      if (tie || best === "skip") {
        return { ...cur, phase: "play", meetingCaller: null, votes: {}, log: "No consensus — back to closing." };
      }
      const ejected = cur.players.find((p) => p.userId === best);
      if (!ejected) return null;
      return {
        ...cur,
        phase: "play",
        players: cur.players.map((p) => (p.userId === best ? { ...p, alive: false } : p)),
        meetingCaller: null,
        votes: {},
        log: `${ejected.name} ejected — ${ejected.glitch ? "was a GLITCH" : "was staff"}.`,
      };
    });
  };

  if (s.phase === "done") {
    return (
      <div className="chunky-lg relative mx-auto max-w-lg space-y-4 overflow-hidden rounded-xl bg-paper p-6 text-center">
        <Confetti show={s.winner === "staff"} />
        <p className="font-[family-name:var(--font-display)] text-3xl">{s.winner === "staff" ? "Staff wins" : "Glitches win"}</p>
        <p className="font-bold">{s.log}</p>
        <ul className="space-y-1 text-sm font-bold">
          {s.players.map((p) => (
            <li key={p.userId} className="flex items-center justify-center gap-2">
              <span className="h-3 w-3 rounded-full border border-ink" style={{ background: p.color }} />
              {p.name}: {p.glitch ? "GLITCH" : "staff"}
              {!p.alive ? " · out" : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const victimsHere = s.players.filter((p) => p.alive && !p.glitch && p.room === self.room && p.userId !== self.userId);
  const otherStaffHere = victimsHere;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="chunky-lg rounded-xl bg-paper p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-black">
            <span className="h-5 w-5 rounded-full border-2 border-ink" style={{ background: self.color }} />
            {self.name}
            <span className={`rounded border-2 border-ink px-2 py-0.5 text-[10px] uppercase ${self.glitch ? "bg-coral text-white" : "bg-lime"}`}>
              {self.alive ? (self.glitch ? "Glitch" : "Staff") : "Out"}
            </span>
          </div>
          <p className="text-sm font-bold">
            Jobs {done}/{s.tasksNeeded}
          </p>
        </div>
        <p className="text-center text-sm font-extrabold">{s.log}</p>
        {s.sabotage && (
          <div className={`mt-2 rounded-md border-[3px] border-ink px-3 py-2 text-center text-sm font-black ${s.sabotage.kind === "alarm" ? "animate-pulse bg-coral text-white" : "bg-ink text-white"}`}>
            {s.sabotage.kind === "power" ? "💡 POWER OUT" : "🚨 ALARM"} · {sabLeft}s
          </div>
        )}
        {!self.alive && <p className="mt-2 text-center text-sm font-bold text-ink/60">You&apos;re out — spectate and vote in huddles.</p>}
      </div>

      {(s.phase === "play" || localTask) && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROOM_ORDER.map((id) => {
              const r = ROOMS[id];
              const here = s.players.filter((p) => p.alive && p.room === id);
              const body = s.bodies.some((b) => b.room === id);
              const canMove = self.alive && ROOMS[self.room].neighbors.includes(id);
              const isHere = self.room === id;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={(!canMove && !isHere) || localTask || busy || !self.alive || s.phase !== "play"}
                  onClick={() => canMove && moveTo(id)}
                  className={`rounded-lg border-[3px] border-ink p-2 text-left disabled:opacity-40 ${isHere ? "bg-butter" : canMove ? "bg-white hover:bg-lime/40" : "bg-paper"}`}
                >
                  <p className="text-sm font-black">
                    {r.emoji} {r.label}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {here.map((p) => (
                      <span
                        key={p.userId}
                        title={powerOut && p.userId !== self.userId ? "?" : p.name}
                        className="h-3 w-3 rounded-full border border-ink"
                        style={{ background: powerOut && p.userId !== self.userId ? "#444" : p.color }}
                      />
                    ))}
                    {body && <span className="text-xs">💀</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {localTask && self.alive ? (
            <TaskPanel
              room={self.room}
              prog={taskProg}
              setProg={setTaskProg}
              wires={wires}
              setWires={setWires}
              holdRef={holdRef}
              holdProg={holdProg}
              onDone={finishTask}
              onCancel={() => setLocalTask(false)}
            />
          ) : (
            self.alive &&
            s.phase === "play" && (
              <div className="flex flex-wrap justify-center gap-2">
                {!self.glitch && (
                  <button
                    type="button"
                    className="btn-chunky rounded-md bg-sky px-4 py-2 text-sm text-white disabled:opacity-40"
                    disabled={busy || (powerOut && self.room !== "tickets" && self.room !== "floor")}
                    onClick={startTask}
                  >
                    Do: {ROOMS[self.room].task}
                  </button>
                )}
                {self.glitch && (
                  <>
                    <button type="button" className="btn-chunky rounded-md bg-paper px-4 py-2 text-sm" onClick={fakeTask}>
                      Look busy
                    </button>
                    {victimsHere.map((v) => (
                      <button
                        key={v.userId}
                        type="button"
                        disabled={busy || killCd > 0 || otherStaffHere.length > 1}
                        className="btn-chunky rounded-md bg-coral px-3 py-2 text-sm text-white disabled:opacity-40"
                        onClick={() => doKill(v.userId)}
                      >
                        Delete {v.name}
                        {killCd > 0 ? ` (${killCd})` : ""}
                      </button>
                    ))}
                    {!s.sabotage && (
                      <>
                        <button type="button" className="btn-chunky rounded-md bg-ink px-3 py-2 text-sm text-white" onClick={() => doSabotage("power")}>
                          Kill power
                        </button>
                        <button type="button" className="btn-chunky rounded-md bg-coral px-3 py-2 text-sm text-white" onClick={() => doSabotage("alarm")}>
                          Trip alarm
                        </button>
                      </>
                    )}
                  </>
                )}
                {s.bodies.some((b) => b.room === self.room) && (
                  <button type="button" className="btn-chunky rounded-md bg-butter px-4 py-2 text-sm" onClick={report}>
                    Report!
                  </button>
                )}
                {self.room === "lobby" && s.emergencyLeft > 0 && (
                  <button type="button" className="btn-chunky rounded-md bg-lime px-4 py-2 text-sm" onClick={emergency}>
                    Emergency ({s.emergencyLeft})
                  </button>
                )}
              </div>
            )
          )}
        </>
      )}

      {(s.phase === "meeting" || s.phase === "vote") && (
        <div className="chunky-lg space-y-3 rounded-xl bg-paper p-4">
          <p className="text-center text-sm font-bold text-ink/70">Huddle by {s.meetingCaller}. Talk it out — then vote.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {s.players
              .filter((p) => p.alive)
              .map((p) => (
                <span key={p.userId} className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-white px-2 py-1 text-xs font-bold">
                  <span className="h-3 w-3 rounded-full border border-ink" style={{ background: p.color }} />
                  {p.name}
                </span>
              ))}
          </div>
          {s.phase === "meeting" && (
            <div className="text-center">
              <button type="button" className="btn-chunky rounded-md bg-coral px-5 py-2 text-white" onClick={startVote}>
                Start voting
              </button>
            </div>
          )}
          {s.phase === "vote" && self.alive && (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                {s.players
                  .filter((p) => p.alive && p.userId !== self.userId)
                  .map((t) => (
                    <button
                      key={t.userId}
                      type="button"
                      className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${s.votes[self.userId] === t.userId ? "bg-coral text-white" : "bg-white"}`}
                      onClick={() => cast(t.userId)}
                    >
                      {t.name}
                    </button>
                  ))}
                <button
                  type="button"
                  className={`btn-chunky rounded-md px-3 py-1.5 text-sm ${s.votes[self.userId] === "skip" ? "bg-butter" : "bg-white"}`}
                  onClick={() => cast("skip")}
                >
                  Skip
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  className="btn-chunky rounded-md bg-lime px-5 py-2 disabled:opacity-50"
                  disabled={s.players.filter((p) => p.alive).some((p) => s.votes[p.userId] === undefined)}
                  onClick={lockVotes}
                >
                  Lock votes & eject
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <p className="text-center text-xs font-semibold text-ink/55">
        Staff finish closing jobs. Glitches delete the shift. Move, task, report, vote.
      </p>
    </div>
  );
}

function TaskPanel({
  room,
  prog,
  setProg,
  wires,
  setWires,
  holdRef,
  holdProg,
  onDone,
  onCancel,
}: {
  room: RoomId;
  prog: number;
  setProg: (n: number) => void;
  wires: [number, number];
  setWires: (w: [number, number]) => void;
  holdRef: React.MutableRefObject<number | null>;
  holdProg: React.MutableRefObject<number>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const meta = ROOMS[room];

  if (meta.kind === "wires") {
    return (
      <div className="chunky-lg space-y-3 rounded-xl bg-paper p-4 text-center">
        <p className="font-black">{meta.task}</p>
        <p className="text-sm font-semibold">Match the cable colors</p>
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
        <button type="button" disabled={wires[0] !== wires[1]} className="btn-chunky rounded-md bg-lime px-5 py-2 disabled:opacity-40" onClick={onDone}>
          Connect
        </button>
        <button type="button" className="mx-auto block text-sm font-bold underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  if (meta.kind === "hold") {
    return (
      <div className="chunky-lg space-y-3 rounded-xl bg-paper p-4 text-center">
        <p className="font-black">{meta.task}</p>
        <p className="text-sm">Hold — release in the green zone</p>
        <div className="relative h-4 overflow-hidden rounded-full border-[3px] border-ink bg-paper">
          <div className="absolute inset-y-0 left-[62%] w-[16%] bg-lime/80" />
          <div className="absolute inset-y-0 left-0 bg-sky" style={{ width: `${prog}%` }} />
        </div>
        <button
          type="button"
          className="btn-chunky rounded-md bg-sky px-6 py-3 text-white"
          onPointerDown={() => {
            holdProg.current = 0;
            setProg(0);
            holdRef.current = window.setInterval(() => {
              holdProg.current = Math.min(100, holdProg.current + 2);
              setProg(holdProg.current);
            }, 30);
          }}
          onPointerUp={() => {
            if (holdRef.current) window.clearInterval(holdRef.current);
            holdRef.current = null;
            const p = holdProg.current;
            if (p >= 62 && p <= 78) onDone();
            else {
              playBonk();
              setProg(0);
              holdProg.current = 0;
            }
          }}
        >
          Hold
        </button>
        <button type="button" className="mx-auto block text-sm font-bold underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="chunky-lg space-y-3 rounded-xl bg-paper p-4 text-center">
      <p className="font-black">{meta.task}</p>
      <p className="text-sm">Tap {5 - prog} more times</p>
      <button
        type="button"
        className="btn-chunky mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-butter text-2xl font-black"
        onClick={() => {
          playTap();
          const n = prog + 1;
          setProg(n);
          if (n >= 5) onDone();
        }}
      >
        TAP
      </button>
      <button type="button" className="mx-auto block text-sm font-bold underline" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

const BOT_NAMES = ["Rivet", "Token", "Plush", "Cabinet", "Till", "Dockbot", "Neon", "Joystick"];
const HUMAN_ID = "local-you";

function pickBotAction(s: CrewState, bot: CrewPlayer): CrewState | null {
  const now = Date.now();
  if (!bot.alive || s.phase === "done") return null;

  if (s.phase === "meeting") {
    // Any seat can open voting after a short huddle.
    if (now - (bot.lastActionAt || 0) > 2200) {
      return { ...s, phase: "vote", votes: {}, log: "Voting opens." };
    }
    return null;
  }

  if (s.phase === "vote") {
    if (s.votes[bot.userId] !== undefined) return null;
    const aliveOthers = s.players.filter((p) => p.alive && p.userId !== bot.userId);
    let target: string | "skip" = "skip";
    if (bot.glitch) {
      // Glitches try to eject staff, prefer someone not themselves.
      const staff = aliveOthers.filter((p) => !p.glitch);
      target = staff[Math.floor(Math.random() * staff.length)]?.userId ?? "skip";
    } else {
      // Staff: slight bias toward quieter / less-tasked players as "suspicious".
      const ranked = [...aliveOthers].sort((a, b) => a.tasksDone - b.tasksDone);
      if (Math.random() < 0.65 && ranked[0]) target = ranked[0].userId;
      else target = "skip";
    }
    const votes = { ...s.votes, [bot.userId]: target };
    const alive = s.players.filter((p) => p.alive);
    if (alive.every((p) => votes[p.userId] !== undefined)) {
      return resolveVotes({ ...s, votes });
    }
    return { ...s, votes };
  }

  if (s.phase !== "play") return null;
  if (now - bot.lastActionAt < ACTION_MS + 200) return null;

  // Report body in room
  const body = s.bodies.find((b) => b.room === bot.room);
  if (body && !bot.glitch) {
    return {
      ...s,
      phase: "meeting",
      bodies: s.bodies.filter((b) => b.room !== bot.room),
      meetingCaller: bot.name,
      votes: {},
      log: `${bot.name} found ${body.name} in ${ROOMS[bot.room].label}!`,
    };
  }

  if (bot.glitch) {
    const staffHere = s.players.filter((p) => p.alive && !p.glitch && p.room === bot.room);
    if (staffHere.length === 1 && now >= bot.killReadyAt) {
      const v = staffHere[0]!;
      return {
        ...s,
        players: s.players.map((x) => {
          if (x.userId === v.userId) return { ...x, alive: false };
          if (x.userId === bot.userId) return { ...x, killReadyAt: now + KILL_MS, lastActionAt: now };
          return x;
        }),
        bodies: [...s.bodies, { victimId: v.userId, room: v.room, name: v.name }],
        log: "Someone was deleted from the shift…",
      };
    }
    if (!s.sabotage && Math.random() < 0.12) {
      const kind = Math.random() < 0.5 ? ("power" as const) : ("alarm" as const);
      return {
        ...s,
        sabotage: { kind, endsAt: now + SABOTAGE_MS },
        players: s.players.map((x) => (x.userId === bot.userId ? { ...x, lastActionAt: now } : x)),
        log: kind === "power" ? "🚨 POWER OUT — fix Tickets or Machine Floor!" : "🚨 ALARM — silence it in Lobby or Dock!",
      };
    }
  } else {
    // Staff tasks / fix sabotage
    const powerOut = s.sabotage?.kind === "power";
    const canTask = !(powerOut && bot.room !== "tickets" && bot.room !== "floor");
    if (canTask && Math.random() < 0.55) {
      let sab = s.sabotage;
      let log = `${bot.name} finished ${ROOMS[bot.room].task}.`;
      if (sab?.kind === "power" && (bot.room === "tickets" || bot.room === "floor")) {
        sab = null;
        log = `${bot.name} restored power!`;
      }
      if (sab?.kind === "alarm" && (bot.room === "dock" || bot.room === "lobby")) {
        sab = null;
        log = `${bot.name} silenced the alarm!`;
      }
      return {
        ...s,
        sabotage: sab,
        players: s.players.map((x) =>
          x.userId === bot.userId ? { ...x, tasksDone: x.tasksDone + 1, lastActionAt: now } : x,
        ),
        log,
      };
    }
  }

  // Move
  let neighbors = ROOMS[bot.room].neighbors;
  if (bot.glitch) {
    // Chase nearest staff room if possible
    const staffRooms = new Set(s.players.filter((p) => p.alive && !p.glitch).map((p) => p.room));
    const chase = neighbors.filter((r) => staffRooms.has(r));
    if (chase.length) neighbors = chase;
  } else if (s.sabotage?.kind === "power") {
    const fix = neighbors.filter((r) => r === "tickets" || r === "floor");
    if (fix.length) neighbors = fix;
    else if (bot.room !== "tickets" && bot.room !== "floor") {
      // Prefer moving toward floor/tickets via any neighbor
      neighbors = [...neighbors].sort((a, b) => {
        const score = (id: RoomId) => (id === "tickets" || id === "floor" ? 0 : 1);
        return score(a) - score(b);
      });
    }
  } else if (s.sabotage?.kind === "alarm") {
    const fix = neighbors.filter((r) => r === "lobby" || r === "dock");
    if (fix.length) neighbors = fix;
  } else if (s.bodies.length && !bot.glitch) {
    const bodyRooms = new Set(s.bodies.map((b) => b.room));
    const toward = neighbors.filter((r) => bodyRooms.has(r));
    if (toward.length) neighbors = toward;
  }

  const nextRoom = neighbors[Math.floor(Math.random() * neighbors.length)];
  if (!nextRoom) return null;
  return {
    ...s,
    players: s.players.map((x) =>
      x.userId === bot.userId ? { ...x, room: nextRoom, lastActionAt: now } : x,
    ),
    log: `${bot.name} → ${ROOMS[nextRoom].label}`,
  };
}

function resolveVotes(cur: CrewState): CrewState {
  const tallies = new Map<string, number>();
  for (const t of Object.values(cur.votes)) tallies.set(t, (tallies.get(t) ?? 0) + 1);
  let best = "skip";
  let bestN = -1;
  let tie = false;
  for (const [id, n] of tallies) {
    if (n > bestN) {
      best = id;
      bestN = n;
      tie = false;
    } else if (n === bestN) tie = true;
  }
  if (tie || best === "skip") {
    return { ...cur, phase: "play", meetingCaller: null, votes: {}, log: "No consensus — back to closing." };
  }
  const ejected = cur.players.find((p) => p.userId === best);
  if (!ejected) return { ...cur, phase: "play", meetingCaller: null, votes: {}, log: "Vote fizzled." };
  return {
    ...cur,
    phase: "play",
    players: cur.players.map((p) => (p.userId === best ? { ...p, alive: false } : p)),
    meetingCaller: null,
    votes: {},
    log: `${ejected.name} ejected — ${ejected.glitch ? "was a GLITCH" : "was staff"}.`,
  };
}

function advanceBots(s: CrewState, humanId: string): CrewState {
  if (s.phase === "done") return s;
  let cur = s;
  const bots = cur.players.filter((p) => p.userId !== humanId && p.alive);
  // One action per tick from a random bot (keeps pace readable)
  const order = shuffle(bots);
  for (const bot of order) {
    const next = pickBotAction(cur, bot);
    if (next) {
      cur = withWins(next);
      break;
    }
  }
  // Auto-resolve votes if everyone but somehow stuck
  if (cur.phase === "vote") {
    const alive = cur.players.filter((p) => p.alive);
    if (alive.every((p) => cur.votes[p.userId] !== undefined)) {
      cur = withWins(resolveVotes(cur));
    }
  }
  return cur;
}

function OfflineCrewMatch({
  onBack,
  totalPlayers,
}: {
  onBack: () => void;
  totalPlayers: number;
}) {
  const matchPlayers: MatchPlayer[] = useMemo(() => {
    const list: MatchPlayer[] = [
      {
        user_id: HUMAN_ID,
        seat: 0,
        ready: true,
        profile: { id: HUMAN_ID, username: "you", display_name: "You" },
      },
    ];
    for (let i = 1; i < totalPlayers; i++) {
      const name = BOT_NAMES[(i - 1) % BOT_NAMES.length]!;
      list.push({
        user_id: `bot-${i}`,
        seat: i,
        ready: true,
        profile: { id: `bot-${i}`, username: name.toLowerCase(), display_name: name },
      });
    }
    return list;
  }, [totalPlayers]);

  const [room, setRoom] = useState<Room>(() => {
    const initial = buildInitialState(matchPlayers);
    return {
      id: "offline",
      code: "OFFLIN",
      game_id: "crewcheck",
      host_id: HUMAN_ID,
      status: "playing",
      max_players: totalPlayers,
      is_public: false,
      state: initial,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const me = matchPlayers[0]!;

  const commit = useCallback(
    async (
      mutate: (state: Record<string, unknown>) => Record<string, unknown> | null,
      status?: Room["status"],
    ) => {
      setRoom((prev) => {
        const nextState = mutate(structuredClone(prev.state) as Record<string, unknown>);
        if (!nextState) return prev;
        return {
          ...prev,
          state: withWins(parse(nextState)) as unknown as Record<string, unknown>,
          status: status ?? prev.status,
          version: prev.version + 1,
          updated_at: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const pushState = useCallback(async (state: Record<string, unknown>, status?: Room["status"]) => {
    setRoom((prev) => ({
      ...prev,
      state: withWins(parse(state)) as unknown as Record<string, unknown>,
      status: status ?? prev.status,
      version: prev.version + 1,
      updated_at: new Date().toISOString(),
    }));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRoom((prev) => {
        if (prev.status !== "playing") return prev;
        const cur = parse(prev.state);
        if (cur.phase === "done") return prev;
        const next = advanceBots(cur, HUMAN_ID);
        if (next === cur) {
          // Still check sabotage timeout
          const checked = withWins(cur);
          if (checked === cur) return prev;
          return {
            ...prev,
            state: checked as unknown as Record<string, unknown>,
            version: prev.version + 1,
            updated_at: new Date().toISOString(),
          };
        }
        return {
          ...prev,
          state: next as unknown as Record<string, unknown>,
          version: prev.version + 1,
          updated_at: new Date().toISOString(),
        };
      });
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={onBack}>
          ← Leave game
        </button>
        <p className="text-sm font-bold">Crew Check · Offline bots</p>
      </div>
      <CrewBoard
        room={room}
        players={matchPlayers}
        me={me}
        isHost
        pushState={pushState}
        commit={commit}
      />
    </div>
  );
}

export function CrewCheckGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"pick" | "online" | "offline-setup" | "offline">("pick");
  const [botPlayers, setBotPlayers] = useState(5);

  if (mode === "online") {
    return (
      <OnlineMatch
        gameId="crewcheck"
        title="Crew Check"
        minPlayers={4}
        maxPlayers={8}
        onBack={() => setMode("pick")}
        buildInitialState={buildInitialState}
        renderGame={(ctx) => <CrewBoard {...ctx} />}
      />
    );
  }

  if (mode === "offline") {
    return <OfflineCrewMatch onBack={() => setMode("pick")} totalPlayers={botPlayers} />;
  }

  if (mode === "offline-setup") {
    return (
      <div className="chunky-lg mx-auto max-w-lg rounded-xl bg-paper p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Offline with bots</h2>
          <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={() => setMode("pick")}>
            ← Back
          </button>
        </div>
        <p className="mb-4 text-sm font-semibold text-ink/70">
          You plus bots on one device. Practice the night shift without a lobby.
        </p>
        <label className="mb-2 block text-sm font-extrabold">Players (you + bots)</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {[4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              type="button"
              className={`btn-chunky rounded-md px-4 py-2 font-extrabold ${botPlayers === n ? "bg-lime" : "bg-white"}`}
              onClick={() => setBotPlayers(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs font-semibold text-ink/55">
          {botPlayers - 1} bots · {botPlayers >= 7 ? "2 glitches" : "1 glitch"}
        </p>
        <button
          type="button"
          className="btn-chunky w-full rounded-md bg-coral px-4 py-3 font-extrabold text-white"
          onClick={() => {
            playTap();
            setMode("offline");
          }}
        >
          Start shift
        </button>
      </div>
    );
  }

  return (
    <div className="chunky-lg mx-auto max-w-lg rounded-xl bg-paper p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Crew Check</h2>
        <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={onBack}>
          ← Back
        </button>
      </div>
      <p className="mb-5 text-sm font-semibold text-ink/70">
        Box Arcade night shift — finish closing jobs, or get deleted by glitches.
      </p>
      <div className="space-y-3">
        <button
          type="button"
          className="btn-chunky w-full rounded-md bg-lime px-4 py-3 text-left font-extrabold"
          onClick={() => {
            playTap();
            setMode("online");
          }}
        >
          <span className="block text-base">Online multiplayer</span>
          <span className="block text-xs font-semibold opacity-80">Create, browse public servers, or join a code</span>
        </button>
        <button
          type="button"
          className="btn-chunky w-full rounded-md bg-butter px-4 py-3 text-left font-extrabold"
          onClick={() => {
            playTap();
            setMode("offline-setup");
          }}
        >
          <span className="block text-base">Offline with bots</span>
          <span className="block text-xs font-semibold opacity-80">Solo practice — no account needed</span>
        </button>
      </div>
    </div>
  );
}
