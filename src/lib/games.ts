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
    blurb: "Wait for the flash. Tap first. Don't jump the gun.",
    time: "~3 min",
    accent: "#ef4444",
    ink: "#fff",
    sticker: "💓",
    mode: "online",
  },
  {
    id: "gridlock",
    title: "Gridlock",
    blurb: "Grab the glowing tiles before your friend cleans the board.",
    time: "~2 min",
    accent: "#22c55e",
    sticker: "🔲",
    mode: "online",
  },
  {
    id: "tictactoe",
    title: "Xs & Os",
    blurb: "Classic three-in-a-row — vs a friend online, or the computer here.",
    time: "~1 min",
    accent: "var(--coral)",
    ink: "#fff",
    sticker: "❌",
    mode: "both",
  },
  {
    id: "connect",
    title: "Connect 4",
    blurb: "Drop discs, block lines, and race a friend to four.",
    time: "~3 min",
    accent: "#f97316",
    ink: "#fff",
    sticker: "🔴",
    mode: "both",
  },
  {
    id: "showdown",
    title: "Showdown",
    blurb: "Rock, paper, scissors — first to three takes the bragging rights.",
    time: "~2 min",
    accent: "#ff6bcb",
    ink: "#fff",
    sticker: "✊",
    mode: "both",
  },
  {
    id: "claimcraft",
    title: "Claimcraft",
    blurb: "Paint the map, flip territory, and outclaim your rival.",
    time: "~4 min",
    accent: "#65a30d",
    sticker: "⛏️",
    mode: "both",
  },
  {
    id: "crewcheck",
    title: "Crew Check",
    blurb: "Pass the phone, find the impostor, finish the jobs.",
    time: "~8 min",
    accent: "#ef4444",
    ink: "#fff",
    sticker: "🕵️",
    mode: "solo",
  },
  {
    id: "slither",
    title: "Slither",
    blurb: "Grow longer, cut closer, and chase a wild high score.",
    time: "~5 min",
    accent: "#c8f542",
    sticker: "🪱",
    mode: "solo",
  },
  {
    id: "rumble",
    title: "Rumble",
    blurb: "Survive the chaos, ride the shockwaves, keep leveling up.",
    time: "~4 min",
    accent: "#a3e635",
    sticker: "💥",
    mode: "solo",
  },
  {
    id: "dodge",
    title: "Dodge+",
    blurb: "Weave through waves, grab shields, and clear the screen.",
    time: "~3 min",
    accent: "#fb7185",
    ink: "#fff",
    sticker: "🚀",
    mode: "solo",
  },
  {
    id: "breakout",
    title: "Breakout+",
    blurb: "Smash bricks, stack combos, and keep the ball flying.",
    time: "~4 min",
    accent: "#ff8c42",
    sticker: "🧱",
    mode: "solo",
  },
  {
    id: "whack",
    title: "Whack+",
    blurb: "Hit the gold, skip the bombs, ride the fever streak.",
    time: "~1 min",
    accent: "#ff8c42",
    sticker: "🔨",
    mode: "solo",
  },
  {
    id: "snake",
    title: "Snek",
    blurb: "Eat, grow, don't crash. Simple. Addictive.",
    time: "~2 min",
    accent: "var(--lime)",
    sticker: "🐍",
    mode: "solo",
  },
  {
    id: "flappy",
    title: "Flap",
    blurb: "Find the rhythm, clear the pipes, beat your best.",
    time: "~2 min",
    accent: "#7dd3fc",
    sticker: "🐤",
    mode: "solo",
  },
  {
    id: "mines",
    title: "Mines",
    blurb: "Clear the field with calm clicks and sharp instincts.",
    time: "~3 min",
    accent: "#94a3b8",
    sticker: "💣",
    mode: "solo",
  },
  {
    id: "memory",
    title: "Matchup",
    blurb: "Flip pairs fast. Fewer moves, bigger win.",
    time: "~3 min",
    accent: "var(--sky)",
    ink: "#fff",
    sticker: "🃏",
    mode: "solo",
  },
  {
    id: "reaction",
    title: "Zap",
    blurb: "When it flashes, tap. How sharp is your timing?",
    time: "~1 min",
    accent: "var(--butter)",
    sticker: "⚡",
    mode: "solo",
  },
  {
    id: "twenty48",
    title: "2048",
    blurb: "Slide, merge, climb. One more try always calls.",
    time: "~5 min",
    accent: "var(--plum)",
    ink: "#fff",
    sticker: "🔢",
    mode: "solo",
  },
  {
    id: "echo",
    title: "Echo",
    blurb: "Watch the pattern. Repeat it. Don't lose the beat.",
    time: "~2 min",
    accent: "var(--mint)",
    sticker: "🎵",
    mode: "solo",
  },
  {
    id: "lights",
    title: "Lights Out",
    blurb: "Flip the lights. Solve the board. Feel clever.",
    time: "~3 min",
    accent: "#7ce7ff",
    sticker: "💡",
    mode: "solo",
  },
  {
    id: "hangman",
    title: "Hangman",
    blurb: "Guess the word before the grin turns grim.",
    time: "~2 min",
    accent: "#a78bfa",
    ink: "#fff",
    sticker: "🔤",
    mode: "solo",
  },
  {
    id: "higher",
    title: "Higher?",
    blurb: "Higher or lower? Ride the streak while luck lasts.",
    time: "~1 min",
    accent: "#22d3ee",
    sticker: "🃏",
    mode: "solo",
  },
  {
    id: "catch",
    title: "Catch!",
    blurb: "Snacks falling fast. Tap them before they're gone.",
    time: "~1 min",
    accent: "#f43f5e",
    ink: "#fff",
    sticker: "👾",
    mode: "solo",
  },
];

export const MODE_LABEL: Record<PlayMode, string> = {
  solo: "Solo",
  online: "With friends",
  both: "Solo or friends",
};

export const TAGLINES = [
  "Tiny games. Big energy. Challenge a friend in seconds.",
  "Share a code, jump in together, and play for real.",
  "Solo when you want quiet. Live when you want a rival.",
  "Quick matches, sharp vibes, and plenty of rematch energy.",
  "Bored? Pick a game. Better with a friend.",
];
