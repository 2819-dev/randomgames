"use client";

import type { ReactNode } from "react";

type GameShellProps = {
  title: string;
  accent: string;
  ink?: string;
  onBack: () => void;
  stats?: ReactNode;
  children: ReactNode;
};

export function GameShell({
  title,
  accent,
  ink = "var(--ink)",
  onBack,
  stats,
  children,
}: GameShellProps) {
  return (
    <section className="animate-slide-up mx-auto w-full max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-chunky rounded-md bg-paper px-4 py-2 text-sm"
        >
          ← Lobby
        </button>
        <div
          className="chunky rounded-md px-4 py-2"
          style={{ background: accent, color: ink }}
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl tracking-wide">
            {title}
          </h2>
        </div>
        <div className="min-w-[7rem] text-right text-sm font-semibold">
          {stats}
        </div>
      </div>
      <div className="chunky-lg rounded-xl bg-paper p-4 sm:p-6">{children}</div>
    </section>
  );
}
