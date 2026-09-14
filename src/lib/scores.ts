"use client";

import type { GameId } from "@/lib/games";

type ScoreBoard = Record<string, Partial<Record<GameId, number>>>;

const KEY = "boredbox.scores.v1";

function read(): ScoreBoard {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(localStorage.getItem(KEY) || "{}") as ScoreBoard) || {};
  } catch {
    return {};
  }
}

function write(board: ScoreBoard) {
  localStorage.setItem(KEY, JSON.stringify(board));
}

export function getBest(username: string | null | undefined, gameId: GameId): number {
  if (!username) return 0;
  return read()[username]?.[gameId] ?? 0;
}

export function recordScore(username: string | null | undefined, gameId: GameId, score: number) {
  if (!username || score <= 0) return getBest(username, gameId);
  const board = read();
  const user = board[username] ?? {};
  const prev = user[gameId] ?? 0;
  if (score > prev) {
    user[gameId] = score;
    board[username] = user;
    write(board);
    return score;
  }
  return prev;
}

export function topScores(gameId: GameId, limit = 5): { username: string; score: number }[] {
  const board = read();
  return Object.entries(board)
    .map(([username, games]) => ({ username, score: games[gameId] ?? 0 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
