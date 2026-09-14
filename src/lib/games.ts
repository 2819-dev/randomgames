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
  | "rumble"
  | "claimcraft"
  | "crewcheck"
  | "pulseduel"
  | "gridlock";

/** How the game can be played */
export type PlayMode = "solo" | "online" | "both";

export type GameMeta = {
  id: GameId;
  title: string;
  blurb: string;
  time: string;
  accent: string;
  ink?: string;
  sticker: string;
  mode: PlayMode;
};

export const GAMES: GameMeta[] = [
  {
    id: "pulseduel",
    title: "Pulse Duel",
    blurb: "Live reaction war. Wait for the pulse — don't tap early.",
    time: "~3 min",
    accent: "#ef4444",
    ink: "#fff",
    sticker: "💓",
    mode: "online",
  },
  {
    id: "gridlock",
    title: "Gridlock",
    blurb: "Snatch glowing cells before your rival locks the board.",
    time: "~2 min",
    accent: "#22c55e",
    sticker: "🔲",
    mode: "online",
  },
  {
    id: "tictactoe",
    title: "Xs & Os",
    blurb: "Live online duel — or roast the CPU on this device.",
    time: "~1 min",
    accent: "var(--coral)",
    ink: "#fff",
    sticker: "❌",
    mode: "both",
  },
  {
    id: "connect",
    title: "Connect 4",
    blurb: "Drop discs across the net. Real rooms, real rivals.",
    time: "~3 min",
    accent: "#f97316",
    ink: "#fff",
    sticker: "🔴",
    mode: "both",
  },
  {
    id: "showdown",
    title: "Showdown",
    blurb: "Rock-paper-scissors online. First to three wins.",
    time: "~2 min",
    accent: "#ff6bcb",
    ink: "#fff",
    sticker: "✊",
    mode: "both",
  },
  {
    id: "claimcraft",
    title: "Claimcraft",
    blurb: "Paint the grid live. Defend chunks against a real player.",
    time: "~4 min",
    accent: "#65a30d",
    sticker: "⛏️",
    mode: "both",
  },
  {
    id: "crewcheck",
    title: "Crew Check",
    blurb: "Pass-and-play sabotage on one device.",
    time: "~8 min",
    accent: "#ef4444",
    ink: "#fff",
    sticker: "🕵️",
    mode: "solo",
  },
  {
    id: "slither",
    title: "Slither",
    blurb: "Cut bots, stack kill streaks, grab power pellets.",
    time: "~5 min",
    accent: "#c8f542",
    sticker: "🪱",
    mode: "solo",
  },
  {
    id: "rumble",
    title: "Rumble",
    blurb: "Survive the pit. Pulse shockwaves. Level mid-fight.",
    time: "~4 min",
    accent: "#a3e635",
    sticker: "💥",
    mode: "solo",
  },
  {
    id: "dodge",
    title: "Dodge+",
    blurb: "Wave shooter with shields, tanks, and screen clears.",
    time: "~3 min",
    accent: "#fb7185",
    ink: "#fff",
    sticker: "🚀",
    mode: "solo",
  },
  {
    id: "breakout",
    title: "Breakout+",
    blurb: "Combos, lasers, multi-ball — climb the brick ladder.",
    time: "~4 min",
    accent: "#ff8c42",
    sticker: "🧱",
    mode: "solo",
  },
  {
    id: "whack",
    title: "Whack+",
    blurb: "Gold moles, bombs, fever mode. Chase the high score.",
    time: "~1 min",
    accent: "#ff8c42",
    sticker: "🔨",
    mode: "solo",
  },
  {
    id: "snake",
    title: "Snek",
    blurb: "Classic high-score noodle. Don't hit yourself.",
    time: "~2 min",
    accent: "var(--lime)",
    sticker: "🐍",
    mode: "solo",
  },
  {
    id: "flappy",
    title: "Flap",
    blurb: "Pipe gauntlet. Tap rhythm. Beat your ghost score.",
    time: "~2 min",
    accent: "#7dd3fc",
    sticker: "🐤",
    mode: "solo",
  },
  {
    id: "mines",
    title: "Mines",
    blurb: "Solo logic clear. Pure brain sweat.",
    time: "~3 min",
    accent: "#94a3b8",
    sticker: "💣",
    mode: "solo",
  },
  {
    id: "memory",
    title: "Matchup",
    blurb: "Flip fast. Fewest moves wins the board.",
    time: "~3 min",
    accent: "var(--sky)",
    ink: "#fff",
    sticker: "🃏",
    mode: "solo",
  },
  {
    id: "reaction",
    title: "Zap",
    blurb: "Reaction duels against the clock. Pure solo speed.",
    time: "~1 min",
    accent: "var(--butter)",
    sticker: "⚡",
    mode: "solo",
  },
  {
    id: "twenty48",
    title: "2048",
    blurb: "Merge climb. High-score grind.",
    time: "~5 min",
    accent: "var(--plum)",
    ink: "#fff",
    sticker: "🔢",
    mode: "solo",
  },
  {
    id: "echo",
    title: "Echo",
    blurb: "Simon-style memory jam. Solo focus mode.",
    time: "~2 min",
    accent: "var(--mint)",
    sticker: "🎵",
    mode: "solo",
  },
  {
    id: "lights",
    title: "Lights Out",
    blurb: "Puzzle flips. Solo-only brain teaser.",
    time: "~3 min",
    accent: "#7ce7ff",
    sticker: "💡",
    mode: "solo",
  },
  {
    id: "hangman",
    title: "Hangman",
    blurb: "Guess the word before the smile goes skull.",
    time: "~2 min",
    accent: "#a78bfa",
    ink: "#fff",
    sticker: "🔤",
    mode: "solo",
  },
  {
    id: "higher",
    title: "Higher?",
    blurb: "Card streak challenge. Solo gambling vibes.",
    time: "~1 min",
    accent: "#22d3ee",
    sticker: "🃏",
    mode: "solo",
  },
  {
    id: "catch",
    title: "Catch!",
    blurb: "Snack rush. Tap before they vanish.",
    time: "~1 min",
    accent: "#f43f5e",
    ink: "#fff",
    sticker: "👾",
    mode: "solo",
  },
];

export const MODE_LABEL: Record<PlayMode, string> = {
  solo: "Solo",
  online: "Online multiplayer",
  both: "Solo + online",
};

export const TAGLINES = [
  "Log in. Create a room. Play live against real rivals.",
  "Online multiplayer rooms — share a code, start the match.",
  "Pulse Duel, Gridlock, Xs & Os — synced over the wire.",
  "Solo high scores stay local. Multiplayer needs your account.",
  "No placeholders. Real rooms. Real opponents.",
];
