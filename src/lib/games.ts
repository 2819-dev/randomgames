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
  | "crewcheck";

/** How the game can be played on one device */
export type PlayMode = "solo" | "local-multi" | "both";

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
    id: "slither",
    title: "Slither",
    blurb: "Cut bots, stack kill streaks, grab power pellets. Arena energy.",
    time: "~5 min",
    accent: "#c8f542",
    sticker: "🪱",
    mode: "solo",
  },
  {
    id: "crewcheck",
    title: "Crew Check",
    blurb: "Pass-and-play sabotage. Find the impostor before tasks flop.",
    time: "~8 min",
    accent: "#ef4444",
    ink: "#fff",
    sticker: "🕵️",
    mode: "local-multi",
  },
  {
    id: "claimcraft",
    title: "Claimcraft",
    blurb: "Paint the grid. Defend chunks. Race bots — or a friend beside you.",
    time: "~4 min",
    accent: "#65a30d",
    sticker: "⛏️",
    mode: "both",
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
    id: "tictactoe",
    title: "Xs & Os",
    blurb: "Duel a friend hot-seat, or roast the CPU.",
    time: "~1 min",
    accent: "var(--coral)",
    ink: "#fff",
    sticker: "❌",
    mode: "both",
  },
  {
    id: "connect",
    title: "Connect 4",
    blurb: "Drop discs. Best of friends — or beat the orange CPU.",
    time: "~3 min",
    accent: "#f97316",
    ink: "#fff",
    sticker: "🔴",
    mode: "both",
  },
  {
    id: "showdown",
    title: "Showdown",
    blurb: "Rock-paper-scissors face-off. CPU or couch rival.",
    time: "~1 min",
    accent: "#ff6bcb",
    ink: "#fff",
    sticker: "✊",
    mode: "both",
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
    blurb: "Solo logic clear. No multiplayer — pure brain sweat.",
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
    blurb: "Merge climb. Offline high-score grind.",
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
  solo: "Solo · offline",
  "local-multi": "Local multi only",
  both: "Solo + local multi",
};

export const TAGLINES = [
  "Twenty-one games. Couch rivals. Fully offline.",
  "Competitive energy. Zero servers required.",
  "Log in locally. Flex high scores. Sabotage friends.",
  "Install it. Play on a plane. Still win.",
  "Synk ID coming soon — local login works today.",
  "Crew Check, Claimcraft, Slither chaos. Pick a fight.",
];
