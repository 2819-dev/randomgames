"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { OnlineMatch, type MatchContext, type MatchPlayer } from "@/components/OnlineMatch";
import type { Room } from "@/lib/supabase";
import { beep, playBonk, playTap, playWin } from "@/lib/sfx";
import { shuffle } from "@/lib/random";

/** Real CSS-3D arcade map + candy gumdrop crew. Among Us DNA — own identity. */

type RoomId = "lobby" | "prizes" | "tickets" | "floor" | "break" | "dock";
type Phase = "play" | "meeting" | "vote" | "done";
type TaskKind = "wires" | "tap" | "hold";
type Team = "staff" | "glitch";
type RoleId = "closer" | "tech" | "glitch" | "mimic";
type Sabotage = null | { kind: "power" | "alarm"; endsAt: number };

type CrewPlayer = {
  userId: string;
  name: string;
  color: string;
  team: Team;
  role: RoleId;
  alive: boolean;
  room: RoomId;
  tasksDone: number;
  killReadyAt: number;
  ventReadyAt: number;
  mimicReadyAt: number;
  lastActionAt: number;
  disguiseAs: string | null;
  disguiseUntil: number;
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
const ACTION_MS = 750;
const KILL_MS = 18_000;
const VENT_MS = 6_000;
const SABOTAGE_MS = 45_000;
const MIMIC_MS = 12_000;
const MIMIC_CD_MS = 28_000;

const ROLE_META: Record<RoleId, { label: string; team: Team; blurb: string }> = {
  closer: { label: "Closer", team: "staff", blurb: "Finish closing jobs before the shift collapses." },
  tech: { label: "Tech", team: "staff", blurb: "Engineer-style — ride service ducts between rooms." },
  glitch: { label: "Glitch", team: "glitch", blurb: "Delete staff and sabotage the arcade." },
  mimic: { label: "Mimic", team: "glitch", blurb: "Shapeshifter — briefly look like another gumdrop." },
};

const ROOMS: Record<RoomId, { label: string; emoji: string; neighbors: RoomId[]; task: string; kind: TaskKind }> = {
  lobby: { label: "Lobby", emoji: "🎟️", neighbors: ["prizes", "tickets", "break"], task: "Wipe front glass", kind: "tap" },
  prizes: { label: "Prize Counter", emoji: "🧸", neighbors: ["lobby", "floor"], task: "Restock plushies", kind: "hold" },
  tickets: { label: "Ticket Booth", emoji: "🧾", neighbors: ["lobby", "floor", "dock"], task: "Balance the till", kind: "wires" },
  floor: { label: "Machine Floor", emoji: "🕹️", neighbors: ["prizes", "tickets", "break", "dock"], task: "Unjam a cabinet", kind: "wires" },
  break: { label: "Break Room", emoji: "☕", neighbors: ["lobby", "floor"], task: "Start the coffee", kind: "tap" },
  dock: { label: "Loading Dock", emoji: "📦", neighbors: ["tickets", "floor"], task: "Sign delivery", kind: "hold" },
};

const DUCTS: Partial<Record<RoomId, RoomId[]>> = {
  tickets: ["floor", "dock"],
  floor: ["tickets", "dock"],
  dock: ["tickets", "floor"],
};

const ROOM_ORDER: RoomId[] = ["lobby", "prizes", "tickets", "floor", "break", "dock"];


const BOT_NAMES = ["Rivet", "Token", "Plush", "Cabinet", "Till", "Dockbot", "Neon", "Joystick"];
const HUMAN_ID = "local-you";

function parse(raw: Record<string, unknown>): CrewState {
  return raw as unknown as CrewState;
}

function isGlitch(p: CrewPlayer) {
  return p.team === "glitch";
}

function canVent(p: CrewPlayer) {
  return p.role === "tech" || p.team === "glitch";
}

function staffTasks(players: CrewPlayer[]) {
  return players.filter((p) => !isGlitch(p)).reduce((n, p) => n + p.tasksDone, 0);
}

function clearExpiredDisguises(s: CrewState, now = Date.now()): CrewState {
  let changed = false;
  const players = s.players.map((p) => {
    if (p.disguiseAs && p.disguiseUntil <= now) {
      changed = true;
      return { ...p, disguiseAs: null, disguiseUntil: 0 };
    }
    return p;
  });
  return changed ? { ...s, players } : s;
}

function withWins(s: CrewState): CrewState {
  const cur = clearExpiredDisguises(s);
  const glitch = cur.players.filter((p) => p.alive && isGlitch(p)).length;
  const staff = cur.players.filter((p) => p.alive && !isGlitch(p)).length;
  if (glitch === 0) return { ...cur, phase: "done", winner: "staff", log: "All glitches ejected. Staff closes the arcade." };
  if (glitch >= staff) return { ...cur, phase: "done", winner: "glitch", log: "Glitches outnumber staff. Night shift collapses." };
  if (staffTasks(cur.players) >= cur.tasksNeeded) return { ...cur, phase: "done", winner: "staff", log: "Closing checklist done. Staff wins!" };
  if (cur.sabotage && cur.sabotage.endsAt <= Date.now()) {
    return {
      ...cur,
      phase: "done",
      winner: "glitch",
      log: cur.sabotage.kind === "alarm" ? "Alarm locked everyone in. Glitches win." : "Power died for good. Glitches win.",
    };
  }
  return cur;
}

function assignRoles(n: number, glitchCount: number): RoleId[] {
  const roles: RoleId[] = Array.from({ length: n }, () => "closer" as RoleId);
  const idxs = shuffle([...Array(n).keys()]);
  const glitchIdxs = idxs.slice(0, glitchCount);
  const staffIdxs = idxs.slice(glitchCount);

  if (glitchCount >= 2) {
    roles[glitchIdxs[0]!] = "glitch";
    roles[glitchIdxs[1]!] = "mimic";
    for (let i = 2; i < glitchIdxs.length; i++) roles[glitchIdxs[i]!] = "glitch";
  } else {
    roles[glitchIdxs[0]!] = Math.random() < 0.45 ? "mimic" : "glitch";
  }

  if (staffIdxs.length >= 2) roles[staffIdxs[0]!] = "tech";
  else if (staffIdxs[0] !== undefined && Math.random() < 0.5) roles[staffIdxs[0]] = "tech";

  return roles;
}

function buildInitialState(players: MatchPlayer[]): Record<string, unknown> {
  const n = players.length;
  const glitchCount = n >= 7 ? 2 : 1;
  const roles = assignRoles(n, glitchCount);
  const crew: CrewPlayer[] = players.map((p, i) => {
    const role = roles[i]!;
    return {
      userId: p.user_id,
      name: p.profile.display_name || p.profile.username,
      color: COLORS[i % COLORS.length]!,
      team: ROLE_META[role].team,
      role,
      alive: true,
      room: "lobby" as RoomId,
      tasksDone: 0,
      killReadyAt: Date.now() + 8_000,
      ventReadyAt: 0,
      mimicReadyAt: 0,
      lastActionAt: 0,
      disguiseAs: null,
      disguiseUntil: 0,
    };
  });
  const state: CrewState = {
    phase: "play",
    players: crew,
    bodies: [],
    sabotage: null,
    tasksNeeded: Math.max(8, (n - glitchCount) * 2),
    emergencyLeft: 1,
    meetingCaller: null,
    votes: {},
    log: "Night shift starts. Finish closing — watch for Mimics in the ducts.",
    winner: null,
  };
  return state as unknown as Record<string, unknown>;
}

function apparent(p: CrewPlayer, all: CrewPlayer[], viewerId: string, now: number) {
  if (p.userId !== viewerId && p.disguiseAs && p.disguiseUntil > now) {
    const target = all.find((x) => x.userId === p.disguiseAs);
    if (target) return { color: target.color, name: target.name };
  }
  return { color: p.color, name: p.name };
}

/** Candy gumdrop — sugar-dome candy, not a crewmate bean. */
function Gumdrop({
  color,
  size = 36,
  dead = false,
  ghost = false,
  label,
}: {
  color: string;
  size?: number;
  dead?: boolean;
  ghost?: boolean;
  label?: string;
}) {
  const h = size;
  const w = Math.round(size * 0.78);
  const fill = dead ? "#9ca3af" : color;
  const gid = `gd-${color.replace("#", "")}-${size}-${dead ? "d" : "a"}-${label ?? "x"}`.replace(/\s+/g, "");
  return (
    <span className="inline-flex flex-col items-center" style={{ opacity: ghost ? 0.45 : 1 }} title={label}>
      <svg width={w} height={h} viewBox="0 0 40 48" aria-hidden>
        <defs>
          <radialGradient id={gid} cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="35%" stopColor={fill} stopOpacity="0.95" />
            <stop offset="100%" stopColor={fill} />
          </radialGradient>
        </defs>
        {/* soft ground shadow */}
        <ellipse cx="20" cy="44" rx="12" ry="3.2" fill="#111" opacity="0.18" />
        {/* classic gumdrop dome */}
        <path
          d="M20 4 C10 4 5 16 5 28 C5 38 11 44 20 44 C29 44 35 38 35 28 C35 16 30 4 20 4 Z"
          fill={`url(#${gid})`}
          stroke="#111"
          strokeWidth="2.2"
        />
        {/* sugar sparkle */}
        {!dead && (
          <>
            <circle cx="14" cy="16" r="1.4" fill="#fff" opacity="0.9" />
            <circle cx="22" cy="12" r="0.9" fill="#fff" opacity="0.7" />
            <circle cx="26" cy="20" r="1.1" fill="#fff" opacity="0.55" />
          </>
        )}
        {/* tiny candy face for readability */}
        {!dead && (
          <>
            <circle cx="15" cy="26" r="1.6" fill="#111" />
            <circle cx="25" cy="26" r="1.6" fill="#111" />
            <path d="M16 32 Q20 35 24 32" fill="none" stroke="#111" strokeWidth="1.4" strokeLinecap="round" />
          </>
        )}
        {dead && <path d="M14 22 L26 34 M26 22 L14 34" stroke="#111" strokeWidth="2.4" strokeLinecap="round" />}
      </svg>
    </span>
  );
}

/** CSS 3D room layout — real perspective scene, not a flat schematic. */
const ROOM_3D: Record<RoomId, { x: number; z: number; w: number; d: number; floor: string; wall: string }> = {
  lobby: { x: -170, z: -140, w: 150, d: 120, floor: "#f5d76e", wall: "#e8b923" },
  prizes: { x: 20, z: -150, w: 140, d: 100, floor: "#f9a8d4", wall: "#db2777" },
  tickets: { x: 190, z: -140, w: 140, d: 120, floor: "#93c5fd", wall: "#2563eb" },
  break: { x: -170, z: 20, w: 130, d: 120, floor: "#86efac", wall: "#16a34a" },
  floor: { x: 0, z: 10, w: 170, d: 150, floor: "#c4b5fd", wall: "#7c3aed" },
  dock: { x: 200, z: 40, w: 140, d: 130, floor: "#fdba74", wall: "#ea580c" },
};

function ArcadeMap({
  s,
  self,
  now,
  powerOut,
  onMove,
  disabled,
}: {
  s: CrewState;
  self: CrewPlayer;
  now: number;
  powerOut: boolean;
  onMove: (id: RoomId) => void;
  disabled: boolean;
}) {
  const [tilt, setTilt] = useState(58);
  const [yaw, setYaw] = useState(-28);
  const groundStyle = {
    width: 520,
    height: 420,
    transform: "translate(-50%, -50%) translateZ(-2px)",
  };
  const worldStyle = {
    transform: `translate(-50%, -50%) rotateX(${tilt}deg) rotateZ(${yaw}deg)`,
  };

  return (
    <div className="overflow-hidden rounded-xl border-[3px] border-ink bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#334155]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-white">
        <p className="text-xs font-black tracking-wide">BOX ARCADE · 3D MAP</p>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <label className="flex items-center gap-1 opacity-80">
            tilt
            <input
              type="range"
              min={40}
              max={70}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
              className="w-16 accent-butter"
            />
          </label>
          <label className="flex items-center gap-1 opacity-80">
            spin
            <input
              type="range"
              min={-50}
              max={10}
              value={yaw}
              onChange={(e) => setYaw(Number(e.target.value))}
              className="w-16 accent-butter"
            />
          </label>
        </div>
      </div>

      <div className="crew-3d-stage relative h-[340px] w-full touch-none sm:h-[400px]">
        <div className="crew-3d-world absolute left-1/2 top-[58%] origin-center" style={worldStyle}>
          <div className="absolute rounded-3xl border-2 border-ink/40 bg-[#0b1220]" style={groundStyle} />

          {ROOM_ORDER.map((id) => {
            const box = ROOM_3D[id];
            const meta = ROOMS[id];
            const here = s.players.filter((p) => p.alive && p.room === id);
            const body = s.bodies.some((b) => b.room === id);
            const canWalk = self.alive && ROOMS[self.room].neighbors.includes(id);
            const isHere = self.room === id;
            const wallH = 48;
            const roomStyle = {
              width: box.w,
              height: box.d,
              transform: `translate(-50%, -50%) translate3d(${box.x}px, ${box.z}px, 0px)`,
            };
            const floorStyle = {
              background: powerOut && !isHere ? "#1f2937" : box.floor,
              boxShadow: isHere ? "0 0 0 4px #22c55e inset" : canWalk ? "0 0 0 3px #fbbf24 inset" : undefined,
              transform: "translateZ(0px)",
            };
            const backWallStyle = {
              height: wallH,
              background: box.wall,
              transformOrigin: "top" as const,
              transform: "rotateX(-90deg)",
              top: 0,
              opacity: 0.92,
            };
            const leftWallStyle = {
              width: wallH,
              background: box.wall,
              transformOrigin: "left" as const,
              transform: "rotateY(90deg)",
              left: 0,
              opacity: 0.85,
              filter: "brightness(0.85)",
            };
            const rightWallStyle = {
              width: wallH,
              background: box.wall,
              transformOrigin: "right" as const,
              transform: "rotateY(-90deg)",
              right: 0,
              opacity: 0.85,
              filter: "brightness(0.75)",
            };

            return (
              <div key={id} className="crew-3d-room absolute" style={roomStyle}>
                <button
                  type="button"
                  disabled={disabled || (!canWalk && !isHere) || !self.alive || s.phase !== "play"}
                  onClick={() => {
                    if (!disabled && canWalk) onMove(id);
                  }}
                  className="crew-3d-face absolute inset-0 border-2 border-ink text-left disabled:cursor-default"
                  style={floorStyle}
                  aria-label={`${meta.label}${canWalk ? " — walk here" : ""}`}
                >
                  <span className="absolute left-2 top-2 rounded border border-ink bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-ink">
                    {meta.emoji} {meta.label}
                  </span>
                  {body ? <span className="absolute right-2 top-2 text-sm">💀</span> : null}
                </button>

                <div className="crew-3d-face absolute left-0 right-0 border-2 border-ink" style={backWallStyle} />
                <div className="crew-3d-face absolute top-0 bottom-0 border-2 border-ink" style={leftWallStyle} />
                <div className="crew-3d-face absolute top-0 bottom-0 border-2 border-ink" style={rightWallStyle} />

                {here.map((p, i) => {
                  const look = apparent(p, s.players, self.userId, now);
                  const hideFace = powerOut && p.userId !== self.userId;
                  const col = i % 3;
                  const row = Math.floor(i / 3);
                  const px = 28 + col * 36;
                  const pz = 30 + row * 34;
                  const pawnStyle = {
                    left: px,
                    top: pz,
                    transform: `translateZ(18px) rotateX(${-tilt}deg) rotateZ(${-yaw}deg)`,
                  };
                  return (
                    <div key={p.userId} className="crew-3d-pawn absolute" style={pawnStyle}>
                      <Gumdrop
                        color={hideFace ? "#475569" : look.color}
                        size={p.userId === self.userId ? 40 : 32}
                        label={look.name}
                      />
                      {p.userId === self.userId ? (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-lime px-1 text-[8px] font-black text-ink">
                          YOU
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/20 px-3 py-2">
        {ROOM_ORDER.filter((id) => ROOMS[self.room].neighbors.includes(id)).map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled || !self.alive || s.phase !== "play"}
            className="rounded-md border-2 border-ink bg-butter px-2 py-1 text-[11px] font-black text-ink disabled:opacity-40"
            onClick={() => onMove(id)}
          >
            Walk → {ROOMS[id].label}
          </button>
        ))}
      </div>
    </div>
  );
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
    players: cur.players.map((p) => (p.userId === best ? { ...p, alive: false, disguiseAs: null } : p)),
    meetingCaller: null,
    votes: {},
    log: `${ejected.name} ejected — ${ROLE_META[ejected.role].label}${isGlitch(ejected) ? " (glitch team)" : " (staff)"}.`,
  };
}

function CrewBoard({ room, me, commit }: MatchContext) {
  const s = withWins(parse(room.state));
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
  const ventCd = Math.max(0, Math.ceil((self.ventReadyAt - now) / 1000));
  const sabLeft = s.sabotage ? Math.max(0, Math.ceil((s.sabotage.endsAt - now) / 1000)) : 0;
  const mimicActive = !!(self.disguiseAs && self.disguiseUntil > now);
  const mimicCd = (() => {
    if (self.role !== "mimic") return 0;
    if (mimicActive) return Math.ceil((self.disguiseUntil - now) / 1000);
    return Math.max(0, Math.ceil((self.mimicReadyAt - now) / 1000));
  })();
  const ductExits = DUCTS[self.room] ?? [];
  const victimsHere = s.players.filter((p) => p.alive && !isGlitch(p) && p.room === self.room && p.userId !== self.userId);
  const roleMeta = ROLE_META[self.role];

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

  const ventTo = (id: RoomId) => {
    if (!self.alive || s.phase !== "play" || localTask || !canVent(self)) return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive || cur.phase !== "play" || !canVent(p)) return null;
      if (Date.now() < p.ventReadyAt) return null;
      if (!(DUCTS[p.room] ?? []).includes(id)) return null;
      return {
        ...cur,
        players: cur.players.map((x) =>
          x.userId === p.userId ? { ...x, room: id, lastActionAt: Date.now(), ventReadyAt: Date.now() + VENT_MS } : x,
        ),
        log: `${p.name} slipped through a service duct…`,
      };
    });
    playTap();
  };

  const startTask = () => {
    if (!self.alive || isGlitch(self) || s.phase !== "play") return;
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
      if (!p?.alive || isGlitch(p) || cur.phase !== "play") return null;
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
    if (!isGlitch(self) || s.phase !== "play") return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p?.alive || !isGlitch(p)) return null;
      return {
        ...cur,
        players: cur.players.map((x) => (x.userId === p.userId ? { ...x, lastActionAt: Date.now() } : x)),
        log: `${p.name} hovered near a machine…`,
      };
    });
    playTap();
  };

  const doKill = (victimId: string) => {
    if (!isGlitch(self) || s.phase !== "play") return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      const v = cur.players.find((x) => x.userId === victimId);
      if (!p || !isGlitch(p) || !p.alive || !v?.alive || isGlitch(v) || p.room !== v.room) return null;
      if (Date.now() < p.killReadyAt) return null;
      const witnesses = cur.players.filter(
        (x) => x.alive && !isGlitch(x) && x.room === p.room && x.userId !== p.userId && x.userId !== v.userId,
      );
      if (witnesses.length > 0) return null;
      return {
        ...cur,
        players: cur.players.map((x) => {
          if (x.userId === v.userId) return { ...x, alive: false, disguiseAs: null };
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
    if (!isGlitch(self) || s.phase !== "play" || s.sabotage) return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      if (!p || !isGlitch(p) || !p.alive || cur.sabotage) return null;
      return {
        ...cur,
        sabotage: { kind, endsAt: Date.now() + SABOTAGE_MS },
        players: cur.players.map((x) => (x.userId === p.userId ? { ...x, lastActionAt: Date.now() } : x)),
        log: kind === "power" ? "🚨 POWER OUT — fix Tickets or Machine Floor!" : "🚨 ALARM — silence it in Lobby or Dock!",
      };
    });
    playBonk();
  };

  const doMimic = (targetId: string) => {
    if (self.role !== "mimic" || s.phase !== "play" || mimicCd > 0 || mimicActive) return;
    void run((cur) => {
      const p = cur.players.find((x) => x.userId === self.userId);
      const t = cur.players.find((x) => x.userId === targetId);
      if (!p || p.role !== "mimic" || !p.alive || !t?.alive || t.userId === p.userId) return null;
      if (Date.now() < p.mimicReadyAt) return null;
      const until = Date.now() + MIMIC_MS;
      return {
        ...cur,
        players: cur.players.map((x) =>
          x.userId === p.userId
            ? {
                ...x,
                disguiseAs: t.userId,
                disguiseUntil: until,
                mimicReadyAt: until + MIMIC_CD_MS - MIMIC_MS,
                lastActionAt: Date.now(),
              }
            : x,
        ),
        log: `${p.name} shimmered… someone looks familiar.`,
      };
    });
    playTap();
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
        players: cur.players.map((x) => ({ ...x, disguiseAs: null, disguiseUntil: 0 })),
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
        players: cur.players.map((x) => ({ ...x, disguiseAs: null, disguiseUntil: 0 })),
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
      return withWins(resolveVotes(cur));
    });
  };

  if (s.phase === "done") {
    return (
      <div className="relative mx-auto max-w-lg space-y-4 overflow-hidden rounded-xl border-[3px] border-ink bg-paper p-6 text-center">
        <Confetti show={s.winner === "staff"} />
        <p className="font-[family-name:var(--font-display)] text-3xl">{s.winner === "staff" ? "Staff wins" : "Glitches win"}</p>
        <p className="font-bold">{s.log}</p>
        <ul className="space-y-2 text-sm font-bold">
          {s.players.map((p) => (
            <li key={p.userId} className="flex items-center justify-center gap-2">
              <Gumdrop color={p.color} size={28} dead={!p.alive} />
              {p.name}: {ROLE_META[p.role].label}
              {!p.alive ? " · out" : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-xl border-[3px] border-ink bg-paper p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-black">
            <Gumdrop color={self.color} size={40} dead={!self.alive} label={self.name} />
            <div>
              <p>{self.name}</p>
              <p className="text-[11px] font-bold text-ink/60">{roleMeta.blurb}</p>
            </div>
            <span
              className={`rounded border-2 border-ink px-2 py-0.5 text-[10px] uppercase ${
                isGlitch(self) ? "bg-coral text-white" : self.role === "tech" ? "bg-sky text-white" : "bg-lime"
              }`}
            >
              {self.alive ? roleMeta.label : "Out"}
            </span>
            {mimicActive && <span className="rounded border-2 border-ink bg-plum px-2 py-0.5 text-[10px] text-white">MIMICKING</span>}
          </div>
          <p className="text-sm font-bold">
            Jobs {done}/{s.tasksNeeded}
          </p>
        </div>
        <p className="text-center text-sm font-extrabold">{s.log}</p>
        {s.sabotage && (
          <div
            className={`mt-2 rounded-md border-[3px] border-ink px-3 py-2 text-center text-sm font-black ${
              s.sabotage.kind === "alarm" ? "animate-pulse bg-coral text-white" : "bg-ink text-white"
            }`}
          >
            {s.sabotage.kind === "power" ? "💡 POWER OUT" : "🚨 ALARM"} · {sabLeft}s
          </div>
        )}
      </div>

      {(s.phase === "play" || localTask) && (
        <>
          <ArcadeMap s={s} self={self} now={now} powerOut={!!powerOut} onMove={moveTo} disabled={localTask || busy || s.phase !== "play"} />

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
                {!isGlitch(self) && (
                  <button
                    type="button"
                    className="btn-chunky rounded-md bg-sky px-4 py-2 text-sm text-white disabled:opacity-40"
                    disabled={busy || (!!powerOut && self.room !== "tickets" && self.room !== "floor")}
                    onClick={startTask}
                  >
                    Do: {ROOMS[self.room].task}
                  </button>
                )}
                {canVent(self) &&
                  ductExits.map((id) => (
                    <button
                      key={`duct-${id}`}
                      type="button"
                      disabled={busy || ventCd > 0}
                      className="btn-chunky rounded-md bg-butter px-3 py-2 text-sm disabled:opacity-40"
                      onClick={() => ventTo(id)}
                    >
                      Duct → {ROOMS[id].label}
                      {ventCd > 0 ? ` (${ventCd})` : ""}
                    </button>
                  ))}
                {isGlitch(self) && (
                  <>
                    <button type="button" className="btn-chunky rounded-md bg-paper px-4 py-2 text-sm" onClick={fakeTask}>
                      Look busy
                    </button>
                    {victimsHere.map((v) => (
                      <button
                        key={v.userId}
                        type="button"
                        disabled={busy || killCd > 0 || victimsHere.length > 1}
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
                {self.role === "mimic" &&
                  s.players
                    .filter((p) => p.alive && p.userId !== self.userId)
                    .map((t) => (
                      <button
                        key={`mimic-${t.userId}`}
                        type="button"
                        disabled={busy || mimicCd > 0 || mimicActive}
                        className="btn-chunky rounded-md bg-plum px-3 py-2 text-sm text-white disabled:opacity-40"
                        onClick={() => doMimic(t.userId)}
                      >
                        Mimic {t.name}
                        {mimicCd > 0 ? ` (${mimicCd})` : ""}
                      </button>
                    ))}
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

          <div className="flex flex-wrap justify-center gap-3">
            {s.players.map((p) => {
              const look = apparent(p, s.players, self.userId, now);
              return (
                <div key={p.userId} className="flex flex-col items-center gap-0.5">
                  <Gumdrop color={look.color} size={32} dead={!p.alive} ghost={!p.alive} label={look.name} />
                  <span className="max-w-[4.5rem] truncate text-[10px] font-bold">{look.name}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(s.phase === "meeting" || s.phase === "vote") && (
        <div className="space-y-3 rounded-xl border-[3px] border-ink bg-paper p-4">
          <p className="text-center text-sm font-bold text-ink/70">Huddle by {s.meetingCaller}. Talk it out — then vote.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {s.players
              .filter((p) => p.alive)
              .map((p) => (
                <div key={p.userId} className="flex flex-col items-center">
                  <Gumdrop color={p.color} size={44} />
                  <span className="text-xs font-bold">{p.name}</span>
                </div>
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
                      className={`btn-chunky flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${
                        s.votes[self.userId] === t.userId ? "bg-coral text-white" : "bg-white"
                      }`}
                      onClick={() => cast(t.userId)}
                    >
                      <Gumdrop color={t.color} size={22} />
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
        Candy gumdrops in a real 3D arcade. Roles: Closer, Tech (ducts), Glitch, Mimic (shapeshift).
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
      <div className="space-y-3 rounded-xl border-[3px] border-ink bg-paper p-4 text-center">
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
      <div className="space-y-3 rounded-xl border-[3px] border-ink bg-paper p-4 text-center">
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
    <div className="space-y-3 rounded-xl border-[3px] border-ink bg-paper p-4 text-center">
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

function pickBotAction(s: CrewState, bot: CrewPlayer): CrewState | null {
  const now = Date.now();
  if (!bot.alive || s.phase === "done") return null;

  if (s.phase === "meeting") {
    if (now - bot.lastActionAt > 2200) return { ...s, phase: "vote", votes: {}, log: "Voting opens." };
    return null;
  }

  if (s.phase === "vote") {
    if (s.votes[bot.userId] !== undefined) return null;
    const aliveOthers = s.players.filter((p) => p.alive && p.userId !== bot.userId);
    let target: string | "skip" = "skip";
    if (isGlitch(bot)) {
      const staff = aliveOthers.filter((p) => !isGlitch(p));
      target = staff[Math.floor(Math.random() * staff.length)]?.userId ?? "skip";
    } else {
      const ranked = [...aliveOthers].sort((a, b) => a.tasksDone - b.tasksDone);
      if (Math.random() < 0.65 && ranked[0]) target = ranked[0].userId;
    }
    const votes = { ...s.votes, [bot.userId]: target };
    const alive = s.players.filter((p) => p.alive);
    if (alive.every((p) => votes[p.userId] !== undefined)) return resolveVotes({ ...s, votes });
    return { ...s, votes };
  }

  if (s.phase !== "play") return null;
  if (now - bot.lastActionAt < ACTION_MS + 200) return null;

  const body = s.bodies.find((b) => b.room === bot.room);
  if (body && !isGlitch(bot)) {
    return {
      ...s,
      phase: "meeting",
      bodies: s.bodies.filter((b) => b.room !== bot.room),
      meetingCaller: bot.name,
      votes: {},
      players: s.players.map((x) => ({ ...x, disguiseAs: null, disguiseUntil: 0 })),
      log: `${bot.name} found ${body.name} in ${ROOMS[bot.room].label}!`,
    };
  }

  if (isGlitch(bot)) {
    if (bot.role === "mimic" && !bot.disguiseAs && now >= bot.mimicReadyAt && Math.random() < 0.2) {
      const targets = s.players.filter((p) => p.alive && p.userId !== bot.userId);
      const t = targets[Math.floor(Math.random() * targets.length)];
      if (t) {
        const until = now + MIMIC_MS;
        return {
          ...s,
          players: s.players.map((x) =>
            x.userId === bot.userId
              ? { ...x, disguiseAs: t.userId, disguiseUntil: until, mimicReadyAt: until + MIMIC_CD_MS - MIMIC_MS, lastActionAt: now }
              : x,
          ),
          log: `${bot.name} shimmered…`,
        };
      }
    }
    const staffHere = s.players.filter((p) => p.alive && !isGlitch(p) && p.room === bot.room);
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
    if (!s.sabotage && Math.random() < 0.1) {
      const kind = Math.random() < 0.5 ? ("power" as const) : ("alarm" as const);
      return {
        ...s,
        sabotage: { kind, endsAt: now + SABOTAGE_MS },
        players: s.players.map((x) => (x.userId === bot.userId ? { ...x, lastActionAt: now } : x)),
        log: kind === "power" ? "🚨 POWER OUT — fix Tickets or Machine Floor!" : "🚨 ALARM — silence it in Lobby or Dock!",
      };
    }
    if (canVent(bot) && now >= bot.ventReadyAt && Math.random() < 0.35) {
      const exits = DUCTS[bot.room] ?? [];
      if (exits.length) {
        const nextRoom = exits[Math.floor(Math.random() * exits.length)]!;
        return {
          ...s,
          players: s.players.map((x) =>
            x.userId === bot.userId ? { ...x, room: nextRoom, lastActionAt: now, ventReadyAt: now + VENT_MS } : x,
          ),
          log: `${bot.name} used a duct → ${ROOMS[nextRoom].label}`,
        };
      }
    }
  } else {
    if (bot.role === "tech" && now >= bot.ventReadyAt && Math.random() < 0.25) {
      const exits = DUCTS[bot.room] ?? [];
      if (exits.length) {
        const nextRoom = exits[Math.floor(Math.random() * exits.length)]!;
        return {
          ...s,
          players: s.players.map((x) =>
            x.userId === bot.userId ? { ...x, room: nextRoom, lastActionAt: now, ventReadyAt: now + VENT_MS } : x,
          ),
          log: `${bot.name} ducted → ${ROOMS[nextRoom].label}`,
        };
      }
    }
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

  let neighbors = ROOMS[bot.room].neighbors;
  if (isGlitch(bot)) {
    const staffRooms = new Set(s.players.filter((p) => p.alive && !isGlitch(p)).map((p) => p.room));
    const chase = neighbors.filter((r) => staffRooms.has(r));
    if (chase.length) neighbors = chase;
  } else if (s.sabotage?.kind === "power") {
    const fix = neighbors.filter((r) => r === "tickets" || r === "floor");
    if (fix.length) neighbors = fix;
  } else if (s.sabotage?.kind === "alarm") {
    const fix = neighbors.filter((r) => r === "lobby" || r === "dock");
    if (fix.length) neighbors = fix;
  }

  const nextRoom = neighbors[Math.floor(Math.random() * neighbors.length)];
  if (!nextRoom) return null;
  return {
    ...s,
    players: s.players.map((x) => (x.userId === bot.userId ? { ...x, room: nextRoom, lastActionAt: now } : x)),
    log: `${bot.name} → ${ROOMS[nextRoom].label}`,
  };
}

function advanceBots(s: CrewState, humanId: string): CrewState {
  if (s.phase === "done") return s;
  let cur = clearExpiredDisguises(s);
  const bots = cur.players.filter((p) => p.userId !== humanId && p.alive);
  for (const bot of shuffle(bots)) {
    const next = pickBotAction(cur, bot);
    if (next) {
      cur = withWins(next);
      break;
    }
  }
  if (cur.phase === "vote") {
    const alive = cur.players.filter((p) => p.alive);
    if (alive.every((p) => cur.votes[p.userId] !== undefined)) cur = withWins(resolveVotes(cur));
  }
  return cur;
}

function OfflineCrewMatch({ onBack, totalPlayers }: { onBack: () => void; totalPlayers: number }) {
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
    async (mutate: (state: Record<string, unknown>) => Record<string, unknown> | null, status?: Room["status"]) => {
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

  useEffect(() => {
    const id = window.setInterval(() => {
      setRoom((prev) => {
        if (prev.status !== "playing") return prev;
        const cur = parse(prev.state);
        if (cur.phase === "done") return prev;
        const next = advanceBots(cur, HUMAN_ID);
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
      <CrewBoard room={room} players={matchPlayers} me={me} isHost pushState={async () => {}} commit={commit} />
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
      <div className="mx-auto max-w-lg rounded-xl border-[3px] border-ink bg-paper p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Offline with bots</h2>
          <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={() => setMode("pick")}>
            ← Back
          </button>
        </div>
        <p className="mb-4 text-sm font-semibold text-ink/70">You plus gumdrop bots. Roles include Tech (ducts) and Mimic (shapeshift).</p>
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
    <div className="mx-auto max-w-lg rounded-xl border-[3px] border-ink bg-paper p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Crew Check</h2>
        <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={onBack}>
          ← Back
        </button>
      </div>
      <div className="mb-4 flex justify-center gap-2">
        {COLORS.slice(0, 5).map((c) => (
          <Gumdrop key={c} color={c} size={34} />
        ))}
      </div>
      <p className="mb-5 text-sm font-semibold text-ink/70">Real 3D arcade. Candy gumdrop crew. Roles: Closer, Tech, Glitch, Mimic.</p>
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
          <span className="block text-xs font-semibold opacity-80">Public lobbies or invite code</span>
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
          <span className="block text-xs font-semibold opacity-80">Practice roles — no account</span>
        </button>
      </div>
    </div>
  );
}
