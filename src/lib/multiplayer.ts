import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, type Room, type RoomPlayer, type RoomStatus } from "./supabase";

export type RoomBundle = {
  room: Room;
  players: RoomPlayer[];
};

export async function createRoom(gameId: string, maxPlayers: number): Promise<Room> {
  const { data, error } = await supabase.rpc("create_room", {
    p_game_id: gameId,
    p_max_players: maxPlayers,
  });
  if (error) throw error;
  return data as Room;
}

export async function joinRoom(code: string): Promise<Room> {
  const { data, error } = await supabase.rpc("join_room", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as Room;
}

export async function fetchRoom(roomId: string): Promise<Room> {
  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single();
  if (error) throw error;
  return data as Room;
}

export async function fetchPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from("room_players")
    .select("*, profile:profiles(id, username, display_name, created_at)")
    .eq("room_id", roomId)
    .order("seat", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoomPlayer[];
}

export async function fetchRoomBundle(roomId: string): Promise<RoomBundle> {
  const [room, players] = await Promise.all([fetchRoom(roomId), fetchPlayers(roomId)]);
  return { room, players };
}

export async function setReady(roomId: string, userId: string, ready: boolean) {
  const { error } = await supabase
    .from("room_players")
    .update({ ready })
    .eq("room_id", roomId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function applyRoomState(params: {
  roomId: string;
  expectedVersion: number;
  state: Record<string, unknown>;
  status?: RoomStatus;
}): Promise<Room> {
  const { data, error } = await supabase.rpc("apply_room_state", {
    p_room_id: params.roomId,
    p_expected_version: params.expectedVersion,
    p_state: params.state,
    p_status: params.status ?? null,
  });
  if (error) throw error;
  return data as Room;
}

export function subscribeRoom(roomId: string, onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_players",
        filter: `room_id=eq.${roomId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
