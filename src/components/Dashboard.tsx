"use client";

import Image from "next/image";
import { useState } from "react";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";
import { GAMES, MODE_LABEL, TAGLINES, type GameId } from "@/lib/games";
import { playTap } from "@/lib/sfx";
import { CrewCheckGame } from "@/components/games/CrewCheck";

export function Dashboard() {
  const [active, setActive] = useState<GameId | null>(null);
  const { profile } = useAuth();
  const tagline = TAGLINES[0]!;
  const game = GAMES[0]!;

  if (active === "crewcheck") {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <CrewCheckGame onBack={() => setActive(null)} />
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-md border-[3px] border-ink bg-butter px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em]">
          One game focus · pass & play
        </p>
        <AuthButton />
      </div>

      <header className="mb-8 max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Bored Box logo"
            width={72}
            height={72}
            className="animate-bounce-soft chunky rounded-2xl bg-paper"
            priority
          />
          <p className="inline-block animate-wiggle rounded-md border-[3px] border-ink bg-lime px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em]">
            Better with friends
          </p>
        </div>
        <h1 className="animate-pop-in font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-wide text-ink sm:text-7xl">
          Bored Box
        </h1>
        <p
          className="animate-pop-in mt-4 max-w-lg text-lg font-medium text-ink/80 sm:text-xl"
          style={{ animationDelay: "80ms" }}
        >
          {tagline}
        </p>
        {profile && (
          <p className="mt-3 text-sm font-bold text-ink/70">
            Playing as <span className="underline">{profile.username}</span>
          </p>
        )}
      </header>

      <section aria-label="Games" className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => {
            playTap();
            setActive(game.id);
          }}
          className="animate-pop-in group relative flex w-full flex-col items-start overflow-hidden rounded-xl border-[3px] border-ink p-6 text-left transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-[-0.5deg] active:translate-x-1 active:translate-y-1"
          style={{
            background: game.accent,
            color: game.ink ?? "var(--ink)",
            boxShadow: "5px 5px 0 var(--ink)",
          }}
        >
          <span className="absolute -right-1 -top-1 rotate-12 text-5xl drop-shadow-[2px_2px_0_rgba(22,20,31,0.25)] transition-transform group-hover:scale-110 group-hover:rotate-[18deg]">
            {game.sticker}
          </span>
          <span className="mb-2 inline-flex rounded border-[2px] border-ink bg-paper px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink">
            {MODE_LABEL[game.mode]}
          </span>
          <span className="mb-6 text-xs font-extrabold uppercase tracking-[0.16em] opacity-80">{game.time}</span>
          <span className="font-[family-name:var(--font-display)] text-4xl tracking-wide">{game.title}</span>
          <span className="mt-2 pr-10 text-sm font-semibold leading-snug opacity-90">{game.blurb}</span>
          <span className="mt-6 inline-flex items-center gap-2 rounded-md border-[3px] border-ink bg-paper px-3 py-1.5 text-sm font-extrabold text-ink transition-transform group-hover:translate-x-0.5">
            Play →
          </span>
        </button>
      </section>

      <footer className="mt-auto space-y-2 pt-12 text-sm font-semibold text-ink/55">
        <p>Pass the phone. Find the impostor. More games later — one at a time.</p>
      </footer>
    </main>
  );
}
