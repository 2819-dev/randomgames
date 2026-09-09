export type GameId =
  | "snake"
  | "memory"
  | "tictactoe"
  | "reaction"
  | "twenty48"
  | "echo"
  | "whack"
  | "showdown"
  | "lights";

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
    id: "snake",
    title: "Snek",
    blurb: "Eat dots. Don't hit walls. Classic noodle chaos.",
    time: "~2 min",
    accent: "var(--lime)",
    sticker: "🐍",
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
    id: "whack",
    title: "Whack",
    blurb: "Bonk the critters. Miss and they giggle at you.",
    time: "~1 min",
    accent: "#ff8c42",
    sticker: "🔨",
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
];

export const TAGLINES = [
  "Nine tiny games. Zero productivity. Maximum vibes.",
  "Your brain called — it wants a snack break.",
  "Pick a tile. Become ungovernable for five minutes.",
  "Officially sanctioned time-wasting apparatus.",
  "Caution: may cause sudden grinning.",
];
