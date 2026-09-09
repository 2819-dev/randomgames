"use client";

import { useState } from "react";
import { GAMES, type GameId } from "@/lib/games";
import { SnakeGame } from "@/components/games/Snake";
import { MemoryGame } from "@/components/games/Memory";
import { TicTacToeGame } from "@/components/games/TicTacToe";
import { ReactionGame } from "@/components/games/Reaction";
import { Twenty48Game } from "@/components/games/Twenty48";

function GameView({ id, onBack }: { id: GameId; onBack: () => void }) {
  switch (id) {
    case "snake":
      return <SnakeGame onBack={onBack} />;
    case "memory":
      return <MemoryGame onBack={onBack} />;
    case "tictactoe":
      return <TicTacToeGame onBack={onBack} />;
    case "reaction":
      return <ReactionGame onBack={onBack} />;
    case "twenty48":
      return <Twenty48Game onBack={onBack} />;
  }
}

export function Dashboard() {
  const [active, setActive] = useState<GameId | null>(null);

  if (active) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <GameView id={active} onBack={() => setActive(null)} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-10 max-w-2xl">
        <p className="mb-3 inline-block rounded-md border-[3px] border-ink bg-butter px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em]">
          Instant boredom relief
        </p>
        <h1 className="animate-pop-in font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-wide text-ink sm:text-7xl">
          Bored Box
        </h1>
        <p
          className="animate-pop-in mt-4 max-w-md text-lg font-medium text-ink/80 sm:text-xl"
          style={{ animationDelay: "80ms" }}
        >
          Five tiny games. Zero accounts. Pick one and stop refreshing the same three tabs.
        </p>
      </header>

      <section
        aria-label="Games"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {GAMES.map((game, i) => (
          <button
            key={game.id}
            type="button"
            onClick={() => setActive(game.id)}
            className="animate-pop-in group flex flex-col items-start rounded-xl border-[3px] border-ink p-5 text-left transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1"
            style={{
              background: game.accent,
              color: game.ink ?? "var(--ink)",
              boxShadow: "5px 5px 0 var(--ink)",
              animationDelay: `${120 + i * 70}ms`,
            }}
          >
            <span className="mb-8 text-xs font-extrabold uppercase tracking-[0.16em] opacity-80">
              {game.time}
            </span>
            <span className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
              {game.title}
            </span>
            <span className="mt-2 text-sm font-semibold leading-snug opacity-90">
              {game.blurb}
            </span>
            <span className="mt-6 inline-flex items-center gap-2 rounded-md border-[3px] border-ink bg-paper px-3 py-1.5 text-sm font-extrabold text-ink transition-transform group-hover:translate-x-0.5">
              Play →
            </span>
          </button>
        ))}
      </section>

      <footer className="mt-auto pt-12 text-sm font-semibold text-ink/55">
        Local-only fun. Scores reset when you leave a game.
      </footer>
    </main>
  );
}
