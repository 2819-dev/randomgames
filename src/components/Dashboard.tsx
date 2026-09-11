"use client";

import Image from "next/image";
import { useState } from "react";
import { GAMES, TAGLINES, type GameId } from "@/lib/games";
import { playTap } from "@/lib/sfx";
import { SnakeGame } from "@/components/games/Snake";
import { MemoryGame } from "@/components/games/Memory";
import { TicTacToeGame } from "@/components/games/TicTacToe";
import { ReactionGame } from "@/components/games/Reaction";
import { Twenty48Game } from "@/components/games/Twenty48";
import { EchoGame } from "@/components/games/Echo";
import { WhackGame } from "@/components/games/Whack";
import { ShowdownGame } from "@/components/games/Showdown";
import { LightsGame } from "@/components/games/Lights";
import { HangmanGame } from "@/components/games/Hangman";
import { ConnectGame } from "@/components/games/Connect";
import { HigherLowerGame } from "@/components/games/HigherLower";
import { CatchGame } from "@/components/games/Catch";
import { SlitherGame } from "@/components/games/Slither";
import { BreakoutGame } from "@/components/games/Breakout";
import { FlappyGame } from "@/components/games/Flappy";
import { MinesGame } from "@/components/games/Mines";
import { DodgeGame } from "@/components/games/Dodge";

function GameView({ id, onBack }: { id: GameId; onBack: () => void }) {
  switch (id) {
    case "slither":
      return <SlitherGame onBack={onBack} />;
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
    case "echo":
      return <EchoGame onBack={onBack} />;
    case "whack":
      return <WhackGame onBack={onBack} />;
    case "showdown":
      return <ShowdownGame onBack={onBack} />;
    case "lights":
      return <LightsGame onBack={onBack} />;
    case "hangman":
      return <HangmanGame onBack={onBack} />;
    case "connect":
      return <ConnectGame onBack={onBack} />;
    case "higher":
      return <HigherLowerGame onBack={onBack} />;
    case "catch":
      return <CatchGame onBack={onBack} />;
    case "breakout":
      return <BreakoutGame onBack={onBack} />;
    case "flappy":
      return <FlappyGame onBack={onBack} />;
    case "mines":
      return <MinesGame onBack={onBack} />;
    case "dodge":
      return <DodgeGame onBack={onBack} />;
  }
}

export function Dashboard() {
  const [active, setActive] = useState<GameId | null>(null);
  const tagline = TAGLINES[0];

  if (active) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <GameView id={active} onBack={() => setActive(null)} />
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -right-6 top-10 hidden animate-float text-5xl sm:block" aria-hidden>
        ⭐
      </div>
      <div className="pointer-events-none absolute right-16 top-40 hidden animate-float-delayed text-4xl sm:block" aria-hidden>
        🎮
      </div>
      <div className="pointer-events-none absolute bottom-24 left-2 hidden animate-float text-4xl md:block" aria-hidden>
        🎲
      </div>

      <header className="mb-10 max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Bored Box logo"
            width={72}
            height={72}
            className="animate-bounce-soft chunky rounded-2xl bg-paper"
            priority
          />
          <p className="inline-block animate-wiggle rounded-md border-[3px] border-ink bg-butter px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em]">
            Instant boredom relief
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
      </header>

      <section
        aria-label="Games"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {GAMES.map((game, i) => (
          <button
            key={game.id}
            type="button"
            onClick={() => {
              playTap();
              setActive(game.id);
            }}
            className="animate-pop-in group relative flex flex-col items-start overflow-hidden rounded-xl border-[3px] border-ink p-5 text-left transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-[-0.5deg] active:translate-x-1 active:translate-y-1"
            style={{
              background: game.accent,
              color: game.ink ?? "var(--ink)",
              boxShadow: "5px 5px 0 var(--ink)",
              animationDelay: `${100 + i * 45}ms`,
            }}
          >
            <span className="absolute -right-1 -top-1 rotate-12 text-4xl drop-shadow-[2px_2px_0_rgba(22,20,31,0.25)] transition-transform group-hover:scale-110 group-hover:rotate-[18deg]">
              {game.sticker}
            </span>
            <span className="mb-8 text-xs font-extrabold uppercase tracking-[0.16em] opacity-80">
              {game.time}
            </span>
            <span className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
              {game.title}
            </span>
            <span className="mt-2 pr-8 text-sm font-semibold leading-snug opacity-90">
              {game.blurb}
            </span>
            <span className="mt-6 inline-flex items-center gap-2 rounded-md border-[3px] border-ink bg-paper px-3 py-1.5 text-sm font-extrabold text-ink transition-transform group-hover:translate-x-0.5">
              Play →
            </span>
          </button>
        ))}
      </section>

      <footer className="mt-auto pt-12 text-sm font-semibold text-ink/55">
        Local-only fun. Add to Home Screen for pocket arcade mode.
      </footer>
    </main>
  );
}
