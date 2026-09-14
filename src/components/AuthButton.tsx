"use client";

import { useEffect, useState } from "react";
import { getSession, register, signIn, signOut, SYNK_ID_URL, type LocalUser } from "@/lib/auth";
import { playTap } from "@/lib/sfx";

type Props = {
  user: LocalUser | null;
  onChange: (user: LocalUser | null) => void;
};

export function AuthButton({ user, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playTap();
          setOpen(true);
        }}
        className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm"
        aria-label={user ? `Account ${user.username}` : "Log in"}
      >
        {user ? `👤 ${user.username}` : "Log in"}
      </button>
      {open && (
        <AuthModal
          user={user}
          onClose={() => setOpen(false)}
          onChange={(next) => {
            onChange(next);
            if (next) setOpen(false);
          }}
        />
      )}
    </>
  );
}

function AuthModal({
  user,
  onClose,
  onChange,
}: {
  user: LocalUser | null;
  onClose: () => void;
  onChange: (user: LocalUser | null) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      const next = mode === "login" ? await signIn(username, password) : await register(username, password);
      playTap();
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Account"
      onClick={onClose}
    >
      <div
        className="chunky-lg w-full max-w-md rounded-xl bg-paper p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {user ? "Your booth" : "Log in"}
            </h2>
            <p className="mt-1 text-sm font-medium text-ink/70">
              Offline accounts live on this device only. Works with no internet.
            </p>
          </div>
          <button type="button" className="btn-chunky rounded-md bg-paper px-2 py-1 text-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            <p className="rounded-md border-[3px] border-ink bg-lime/40 px-3 py-2 font-bold">
              Signed in as <span className="underline">{user.username}</span>
            </p>
            <p className="text-sm font-semibold text-ink/70">
              High scores stick to this username on this device. Add to Home Screen to keep the whole arcade offline.
            </p>
            <button
              type="button"
              className="btn-chunky rounded-md bg-coral px-4 py-2 text-sm text-white"
              onClick={() => {
                signOut();
                onChange(null);
                playTap();
              }}
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
                Create
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
              />
            </label>
            <label className="block text-sm font-bold">
              Password
              <input
                type="password"
                className="mt-1 w-full rounded-md border-[3px] border-ink bg-white px-3 py-2 font-semibold outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
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
              {busy ? "…" : mode === "login" ? "Enter arcade" : "Create local account"}
            </button>
          </form>
        )}

        <div className="mt-5 border-t-[3px] border-ink/15 pt-4">
          <button
            type="button"
            disabled
            className="btn-chunky flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-[#0b1220] px-4 py-2.5 text-sm font-extrabold text-white opacity-90"
            title="Synk ID sign-in is coming soon"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#0b1220]">
              S
            </span>
            Sign in with Synk ID — coming soon
          </button>
          <p className="mt-2 text-center text-xs font-semibold text-ink/55">
            Synk ID sync later via{" "}
            <a className="underline" href={SYNK_ID_URL} target="_blank" rel="noreferrer">
              synkid.netlify.app
            </a>
            . Local login always works offline.
          </p>
        </div>
      </div>
    </div>
  );
}

export function useAuthUser() {
  const [user, setUser] = useState<LocalUser | null>(null);
  useEffect(() => {
    setUser(getSession());
  }, []);
  return [user, setUser] as const;
}
