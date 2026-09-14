"use client";

import { createClient, type Session, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  created_at?: string;
};

export type RoomStatus = "lobby" | "playing" | "finished";

export type Room = {
  id: string;
  code: string;
  game_id: string;
  host_id: string;
  status: RoomStatus;
  max_players: number;
  state: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
};

export type RoomPlayer = {
  room_id: string;
  user_id: string;
  seat: number;
  ready: boolean;
  joined_at: string;
  profile?: Profile;
};

export type { Session, User };
