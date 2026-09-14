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
    blurb: "Among Us energy: rooms, tasks, kills, sabotage, meetings, votes.",
    time: "~15 min",
    accent: "#ef4444",
    ink: "#fff",
    sticker: "🕵️",
    mode: "solo",
  },
];

export const MODE_LABEL: Record<PlayMode, string> = {
  solo: "Party",
  online: "With friends",
  both: "Solo or friends",
};

export const TAGLINES = [
  "One game. Hidden impostors. Pass the phone.",
  "Rooms, tasks, sabotage, meetings — finish the jobs or get ejected.",
  "Among Us vibes. One screen. Your crew.",
];
