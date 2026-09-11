export type GameId =
  | "slither"
  | "snake"
  | "memory"
  | "tictactoe"
  | "reaction"
  | "twenty48"
  | "echo"
  | "whack"
  | "showdown"
  | "lights"
  | "hangman"
  | "connect"
  | "higher"
  | "catch"
  | "breakout"
  | "flappy"
  | "mines"
  | "dodge"
  | "rumble";

export type GameMeta = {
  id: GameId;
  title: string;
  blurb: string;
  time: string;
  accent: string;
  ink?: string;
  sticker: string;
};

export const GAMES: GameMeta[] = [
  {
    id: "slither",
    title: "Slither",
    blurb: "Power pellets, kill streaks, and bots that hunt back.",
    time: "~5 min",
    accent: "#c8f542",
    sticker: "🪱",
  },
  {
    id: "rumble",
    title: "Rumble",
    blurb: "Arena survivor. Pulse shockwaves. Level up mid-fight.",
    time: "~4 min",
    accent: "#a3e635",
    sticker: "💥",
  },
  {
    id: "dodge",
    title: "Dodge+",
    blurb: "Auto-fire wave shooter. Shields, tanks, screen clears.",
    time: "~3 min",
    accent: "#fb7185",
    ink: "#fff",
    sticker: "🚀",
  },
  {
    id: "breakout",
    title: "Breakout+",
    blurb: "Levels, combos, lasers, multi-ball — brick warfare.",
    time: "~4 min",
    accent: "#ff8c42",
    sticker: "🧱",
  },
  {
    id: "whack",
    title: "Whack+",
    blurb: "Gold moles, bombs, combos, fever mode. Don't whiff.",
    time: "~1 min",
    accent: "#ff8c42",
    sticker: "🔨",
  },
  {
    id: "snake",
    title: "Snek",
    blurb: "Eat dots. Don't hit walls. Classic noodle chaos.",
    time: "~2 min",
    accent: "var(--lime)",
    sticker: "🐍",
  },
  {
    id: "flappy",
    title: "Flap",
    blurb: "Tap to flap. Don't kiss the pipes.",
    time: "~2 min",
    accent: "#7dd3fc",
    sticker: "🐤",
  },
  {
    id: "mines",
    title: "Mines",
    blurb: "Clear the field. Don't boom.",
    time: "~3 min",
    accent: "#94a3b8",
    sticker: "💣",
  },
  {
    id: "memory",
    title: "Matchup",
    blurb: "Flip cards. Find pairs. Flex that short-term memory.",
    time: "~3 min",
    accent: "var(--sky)",
    ink: "#fff",
    sticker: "🃏",
  },
  {
    id: "tictactoe",
    title: "Xs & Os",
    blurb: "Beat a slightly smug computer at recess rules.",
    time: "~1 min",
    accent: "var(--coral)",
    ink: "#fff",
    sticker: "❌",
  },
  {
    id: "reaction",
    title: "Zap",
    blurb: "Wait for green. Click. Don't jump the gun.",
    time: "~1 min",
    accent: "var(--butter)",
    sticker: "⚡",
  },
  {
    id: "twenty48",
    title: "2048",
    blurb: "Slide tiles. Merge numbers. Chase the big one.",
    time: "~5 min",
    accent: "var(--plum)",
    ink: "#fff",
    sticker: "🔢",
  },
  {
    id: "echo",
    title: "Echo",
    blurb: "Watch the lights. Repeat the jam. Don't blank.",
    time: "~2 min",
    accent: "var(--mint)",
    sticker: "🎵",
  },
  {
    id: "showdown",
    title: "Showdown",
    blurb: "Rock, paper, scissors — best of forever.",
    time: "~1 min",
    accent: "#ff6bcb",
    ink: "#fff",
    sticker: "✊",
  },
  {
    id: "lights",
    title: "Lights Out",
    blurb: "Tap tiles to flip neighbors. Kill every light.",
    time: "~3 min",
    accent: "#7ce7ff",
    sticker: "💡",
  },
  {
    id: "hangman",
    title: "Hangman",
    blurb: "Guess the word before the smile becomes a skull.",
    time: "~2 min",
    accent: "#a78bfa",
    ink: "#fff",
    sticker: "🔤",
  },
  {
    id: "connect",
    title: "Connect 4",
    blurb: "Drop discs. Get four. Outsmart the orange CPU.",
    time: "~3 min",
    accent: "#f97316",
    ink: "#fff",
    sticker: "🔴",
  },
  {
    id: "higher",
    title: "Higher?",
    blurb: "Guess if the next card goes up or down.",
    time: "~1 min",
    accent: "#22d3ee",
    sticker: "🃏",
  },
  {
    id: "catch",
    title: "Catch!",
    blurb: "Tap floating snacks before they vanish.",
    time: "~1 min",
    accent: "#f43f5e",
    ink: "#fff",
    sticker: "👾",
  },
];

export const TAGLINES = [
  "Nineteen games. Power-ups. Waves. Zero productivity.",
  "Your brain called — it wants a snack break.",
  "Pick a tile. Become ungovernable for five minutes.",
  "Officially sanctioned time-wasting apparatus.",
  "Caution: may cause sudden grinning.",
  "Now with Rumble, Dodge+, and Breakout+. You're welcome.",
];
