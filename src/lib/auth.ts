"use client";

import { supabase, type Profile, type Session, type User } from "@/lib/supabase";

const FUNCTIONS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function callAuthFunction(name: "register" | "login", body: Record<string, string>) {
  const res = await fetch(`${FUNCTIONS}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Auth request failed");
  return data as {
    ok: boolean;
    session: Session;
    user: User;
    profile?: Profile;
    email?: string;
  };
}

export async function registerOnline(username: string, password: string, displayName?: string) {
  const data = await callAuthFunction("register", {
    username,
    password,
    displayName: displayName || username,
  });
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }
  return data;
}

export async function loginOnline(username: string, password: string) {
  const data = await callAuthFunction("login", { username, password });
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }
  return data;
}

export async function logoutOnline() {
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}
