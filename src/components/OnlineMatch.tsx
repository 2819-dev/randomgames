"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  applyRoomState,
  commitRoomState,
  createRoom,
  fetchRoomBundle,
  joinRoom,
  setReady,
  subscribeRoom,
} from "@/lib/multiplayer";
import type { Profile, Room, RoomStatus } from "@/lib/supabase";
import { playTap } from "@/lib/sfx";

export type MatchPlayer = {
  user_id: string;
  seat: number;
  ready: boolean;
  profile: Profile;
};

export type MatchContext = {
  room: Room;
  players: MatchPlayer[];
  me: MatchPlayer;
  isHost: boolean;
  pushState: (state: Record<string, unknown>, status?: RoomStatus) => Promise<void>;
  commit: (
    mutate: (state: Record<string, unknown>) => Record<string, unknown> | null,
    status?: RoomStatus,
  ) => Promise<void>;
};

type Props = {
  gameId: string;
  title: string;
  maxPlayers?: number;
  minPlayers?: number;
  onBack: () => void;
  buildInitialState: (players: MatchPlayer[]) => Record<string, unknown>;
  renderGame: (ctx: MatchContext) => React.ReactNode;
};

function asProfile(raw: unknown, userId: string): Profile {
  if (raw && typeof raw === "object" && "username" in raw) {
    const p = raw as Profile;
    return {
      id: p.id || userId,
      username: p.username,
      display_name: p.display_name || p.username,
      created_at: p.created_at,
    };
  }
  return { id: userId, username: "player", display_name: "Player" };
}

export function OnlineMatch({
  gameId,
  title,
  maxPlayers = 2,
  minPlayers = 2,
  onBack,
  buildInitialState,
  renderGame,
}: Props) {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (roomId: string) => {
    const bundle = await fetchRoomBundle(roomId);
    setRoom(bundle.room);
    setPlayers(
      bundle.players.map((r) => ({
        user_id: r.user_id,
        seat: r.seat,
        ready: r.ready,
        profile: asProfile(r.profile, r.user_id),
      })),
    );
  }, []);

  useEffect(() => {
    if (!room?.id) return;
    const roomId = room.id;
    const unsub = subscribeRoom(roomId, () => {
      void refresh(roomId);
    });
    void refresh(roomId);
    const poll = window.setInterval(() => {
      void refresh(roomId);
    }, 2000);
    return () => {
      unsub();
      window.clearInterval(poll);
    };
  }, [room?.id, refresh]);

  const me = useMemo(
    () => players.find((p) => p.user_id === user?.id) || null,
    [players, user?.id],
  );
  const isHost = room?.host_id === user?.id;

  const hostCreate = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const created = await createRoom(gameId, maxPlayers);
      setRoom(created);
      await refresh(created.id);
      playTap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  };

  const guestJoin = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const joined = await joinRoom(codeInput);
      setRoom(joined);
      await refresh(joined.id);
      playTap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join room");
    } finally {
      setBusy(false);
    }
  };

  const toggleReady = async () => {
    if (!room || !user || !me) return;
    await setReady(room.id, user.id, !me.ready);
    await refresh(room.id);
    playTap();
  };

  const startMatch = async () => {
    if (!room || !isHost) return;
    setBusy(true);
    setError("");
    try {
      const bundle = await fetchRoomBundle(room.id);
      const mapped = bundle.players.map((r) => ({
        user_id: r.user_id,
        seat: r.seat,
        ready: r.ready,
        profile: asProfile(r.profile, r.user_id),
      }));
      if (mapped.length < minPlayers) {
        throw new Error(`Need at least ${minPlayers} players`);
      }
      const next = await applyRoomState({
        roomId: bundle.room.id,
        expectedVersion: bundle.room.version,
        state: buildInitialState(mapped),
        status: "playing",
      });
      setRoom(next);
      playTap();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  };

  const pushState = async (state: Record<string, unknown>, status?: RoomStatus) => {
    if (!room) return;
    const fresh = await fetchRoomBundle(room.id);
    const next = await applyRoomState({
      roomId: fresh.room.id,
      expectedVersion: fresh.room.version,
      state,
      status,
    });
    setRoom(next);
  };

  const commit = async (
    mutate: (state: Record<string, unknown>) => Record<string, unknown> | null,
    status?: RoomStatus,
  ) => {
    if (!room) return;
    const next = await commitRoomState(room.id, mutate, status);
    setRoom(next);
  };

  if (!user || !profile) {
    return (
      <div className="chunky-lg rounded-xl bg-paper p-6 text-center">
        <p className="font-bold">Sign in to play {title} with a friend.</p>
        <button type="button" className="btn-chunky mt-4 rounded-md bg-paper px-4 py-2" onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="chunky-lg mx-auto max-w-lg rounded-xl bg-paper p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{title} with friends</h2>
          <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={onBack}>
            ← Back
          </button>
        </div>
        <p className="mb-4 text-sm font-semibold text-ink/70">
          Start a match and share the invite code — or jump into a friend&apos;s game.
        </p>
        <button
          type="button"
          disabled={busy}
          className="btn-chunky w-full rounded-md bg-lime px-4 py-3 font-extrabold disabled:opacity-50"
          onClick={() => void hostCreate()}
        >
          Start a match
        </button>
        <div className="mt-4 flex gap-2">
          <input
            className="w-full rounded-md border-[3px] border-ink bg-white px-3 py-2 font-bold uppercase tracking-widest outline-none"
            placeholder="INVITE CODE"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            type="button"
            disabled={busy || codeInput.length < 4}
            className="btn-chunky rounded-md bg-sky px-4 py-2 font-extrabold text-white disabled:opacity-50"
            onClick={() => void guestJoin()}
          >
            Join
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-md border-[3px] border-ink bg-coral/20 px-3 py-2 text-sm font-bold">{error}</p>
        )}
      </div>
    );
  }

  if (room.status === "lobby") {
    return (
      <div className="chunky-lg mx-auto max-w-lg rounded-xl bg-paper p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{title}</h2>
          <button
            type="button"
            className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm"
            onClick={() => {
              setRoom(null);
              setPlayers([]);
              onBack();
            }}
          >
            Leave
          </button>
        </div>
        <p className="mb-4 text-center text-sm font-bold">
          Invite code{" "}
          <span className="rounded-md border-[3px] border-ink bg-butter px-2 py-1 font-[family-name:var(--font-display)] text-xl tracking-widest">
            {room.code}
          </span>
        </p>
        <ul className="mb-4 space-y-2">
          {players.map((p) => (
            <li
              key={p.user_id}
              className="flex items-center justify-between rounded-md border-[3px] border-ink bg-white px-3 py-2 font-bold"
            >
              <span>
                Player {p.seat + 1}: {p.profile.display_name || p.profile.username}
                {p.user_id === room.host_id ? " · host" : ""}
                {p.user_id === user.id ? " · you" : ""}
              </span>
              <span className={p.ready || p.user_id === room.host_id ? "text-lime-700" : "text-ink/50"}>
                {p.user_id === room.host_id ? "Host" : p.ready ? "Ready" : "…"}
              </span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
            <li
              key={`empty-${i}`}
              className="rounded-md border-[3px] border-dashed border-ink/40 px-3 py-2 text-ink/50"
            >
              Waiting for a friend…
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-center gap-2">
          {user.id !== room.host_id && (
            <button
              type="button"
              className="btn-chunky rounded-md bg-butter px-4 py-2 font-extrabold"
              onClick={() => void toggleReady()}
            >
              {me?.ready ? "Not ready" : "I’m ready"}
            </button>
          )}
          {isHost && (
            <button
              type="button"
              disabled={busy || players.length < minPlayers}
              className="btn-chunky rounded-md bg-coral px-4 py-2 font-extrabold text-white disabled:opacity-50"
              onClick={() => void startMatch()}
            >
              Let’s go ({players.length}/{minPlayers}+)
            </button>
          )}
        </div>
        {error && (
          <p className="mt-3 rounded-md border-[3px] border-ink bg-coral/20 px-3 py-2 text-sm font-bold">{error}</p>
        )}
        {players.length >= minPlayers && !isHost && (
          <p className="mt-3 text-center text-xs font-semibold text-ink/60">Almost — waiting for the host…</p>
        )}
      </div>
    );
  }

  if (!me) {
    return (
      <div className="chunky-lg rounded-xl bg-paper p-6 text-center font-bold">One moment — catching up…</div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={onBack}>
          ← Leave game
        </button>
        <p className="text-sm font-bold">
          {title} · {room.code}
        </p>
      </div>
      {renderGame({ room, players, me, isHost, pushState, commit })}
    </div>
  );
}
