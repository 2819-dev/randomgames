export type GameId = "crewcheck";

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
    id: "crewcheck",
    title: "Crew Check",
    blurb: "Gumdrop crew on a flat arcade map. Closer, Tech, Glitch, Mimic roles.",
    time: "~20 min",
    accent: "#ef4444",
    ink: "#fff",
    sticker: "🕹️",
    mode: "online",
  },
];

export const MODE_LABEL: Record<PlayMode, string> = {
  solo: "Party",
  online: "Online · 4–8",
  both: "Solo or friends",
};

export const TAGLINES = [
  "One arcade. Hidden glitches. Everyone on their own phone.",
  "Close the night shift — or get deleted from it.",
  "Among Us energy. Box Arcade soul. Real multiplayer.",
];
