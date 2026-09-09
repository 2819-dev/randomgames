export type GameId =
  | "snake"
  | "memory"
  | "tictactoe"
  | "reaction"
  | "twenty48";

export type GameMeta = {
  id: GameId;
  title: string;
  blurb: string;
  time: string;
  accent: string;
  ink?: string;
};

export const GAMES: GameMeta[] = [
  {
    id: "snake",
    title: "Snek",
    blurb: "Eat dots. Don't hit walls. Classic.",
    time: "~2 min",
    accent: "var(--lime)",
  },
  {
    id: "memory",
    title: "Matchup",
    blurb: "Flip cards. Find pairs. Flex your recall.",
    time: "~3 min",
    accent: "var(--sky)",
    ink: "#fff",
  },
  {
    id: "tictactoe",
    title: "Xs & Os",
    blurb: "Beat a slightly smug computer.",
    time: "~1 min",
    accent: "var(--coral)",
    ink: "#fff",
  },
  {
    id: "reaction",
    title: "Zap",
    blurb: "Wait for green. Click. Don't jump the gun.",
    time: "~1 min",
    accent: "var(--butter)",
  },
  {
    id: "twenty48",
    title: "2048",
    blurb: "Slide tiles. Merge numbers. Chase the tile.",
    time: "~5 min",
    accent: "var(--plum)",
    ink: "#fff",
  },
];
