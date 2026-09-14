"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { playTap } from "@/lib/sfx";

export function AuthButton() {
  const { user, profile, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          playTap();
        }}
        className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm"
        aria-label={user ? `Signed in as ${profile?.username || ""}` : "Sign in"}
      >
        {user ? `👤 ${profile?.username || "player"}` : "Sign in"}
      </button>
      {open && (
        <AuthModal
          onClose={() => setOpen(false)}
          onLogout={async () => {
            await logout();
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function AuthModal({ onClose, onLogout }: { onClose: () => void; onLogout: () => Promise<void> }) {
  const { user, profile, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password, displayName || username);
      playTap();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Online account"
      onClick={() => {
        if (armed) onClose();
      }}
    >
      <div
        className="chunky-lg w-full max-w-md rounded-xl bg-paper p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {user ? "Your profile" : "Sign in to play with friends"}
            </h2>
            <p className="mt-1 text-sm font-medium text-ink/70">
              Create a free profile to host or join live matches.
            </p>
          </div>
          <button type="button" className="btn-chunky rounded-md bg-paper px-2 py-1 text-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            <p className="rounded-md border-[3px] border-ink bg-lime/40 px-3 py-2 font-bold">
              Signed in as <span className="underline">{profile?.username}</span>
              {profile?.display_name ? ` (${profile.display_name})` : ""}
            </p>
            <button
              type="button"
              className="btn-chunky rounded-md bg-coral px-4 py-2 text-sm text-white"
              onClick={() => void onLogout()}
            >
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn-chunky flex-1 rounded-md px-3 py-2 text-sm ${mode === "login" ? "bg-lime" : "bg-paper"}`}
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`btn-chunky flex-1 rounded-md px-3 py-2 text-sm ${mode === "register" ? "bg-lime" : "bg-paper"}`}
                onClick={() => setMode("register")}
              >
                Join free
              </button>
            </div>
            <label className="block text-sm font-bold">
              Username
              <input
                className="mt-1 w-full rounded-md border-[3px] border-ink bg-white px-3 py-2 font-semibold outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                minLength={3}
                maxLength={16}
                pattern="[A-Za-z0-9_]+"
              />
            </label>
            {mode === "register" && (
              <label className="block text-sm font-bold">
                Display name
                <input
                  className="mt-1 w-full rounded-md border-[3px] border-ink bg-white px-3 py-2 font-semibold outline-none"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                />
              </label>
            )}
            <label className="block text-sm font-bold">
              Password
              <input
                type="password"
                className="mt-1 w-full rounded-md border-[3px] border-ink bg-white px-3 py-2 font-semibold outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
              />
            </label>
            {error && (
              <p className="rounded-md border-[3px] border-ink bg-coral/20 px-3 py-2 text-sm font-bold" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="btn-chunky w-full rounded-md bg-sky px-4 py-2 font-extrabold text-white disabled:opacity-60"
            >
              {busy ? "…" : mode === "login" ? "Let’s play" : "Create profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
