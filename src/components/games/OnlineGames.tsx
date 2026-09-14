"use client";

import { useEffect, useMemo, useState } from "react";
import { OnlineMatch, type MatchContext, type MatchPlayer } from "@/components/OnlineMatch";
import { Confetti } from "@/components/Confetti";
import { playBonk, playTap, playWin } from "@/lib/sfx";

type Mark = "X" | "O" | null;
type Board = Mark[];

const WINS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winner(board: Board): Mark | "draw" | null {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

type TttState = {
  phase: "playing" | "finished";
  board: Board;
  turnSeat: number;
  seats: { userId: string; seat: number; name: string }[];
  result: Mark | "draw" | null;
};

function parseTtt(state: Record<string, unknown>): TttState {
  return {
    phase: (state.phase as TttState["phase"]) || "playing",
    board: (state.board as Board) || Array(9).fill(null),
    turnSeat: Number(state.turnSeat ?? 0),
    seats: (state.seats as TttState["seats"]) || [],
    result: (state.result as TttState["result"]) ?? null,
  };
}

function OnlineTicTacToeBoard({ room, me, pushState }: MatchContext) {
  const s = parseTtt(room.state);
  const mySeat = me.seat;
  const myMark: Mark = mySeat === 0 ? "X" : "O";
  const result = s.result ?? winner(s.board);
  const myTurn = !result && s.turnSeat === mySeat;

  const play = async (i: number) => {
    if (!myTurn || s.board[i] || result) return;
    const board = [...s.board] as Board;
    board[i] = myMark;
    playTap();
    const w = winner(board);
    if (w === "X" || w === "O") playWin();
    else if (w === "draw") playBonk();
    await pushState(
      {
        ...s,
        board,
        turnSeat: w ? s.turnSeat : mySeat === 0 ? 1 : 0,
        result: w,
        phase: w ? "finished" : "playing",
      },
      w ? "finished" : "playing",
    );
  };

  return (
    <div className="chunky-lg mx-auto max-w-md rounded-xl bg-paper p-5">
      {result && result === myMark && <Confetti show />}
      <p className="mb-3 text-center font-bold">
        You are {myMark}
        {result
          ? result === "draw"
            ? " — draw!"
            : result === myMark
              ? " — you win!"
              : " — you lose"
          : myTurn
            ? " — your turn"
            : " — waiting…"}
      </p>
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {s.board.map((cell, i) => (
          <button
            key={i}
            type="button"
            disabled={!myTurn || !!cell || !!result}
            className="btn-chunky aspect-square rounded-md bg-white text-3xl font-extrabold disabled:opacity-70"
            onClick={() => void play(i)}
          >
            {cell || ""}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OnlineTicTacToe({ onBack }: { onBack: () => void }) {
  return (
    <OnlineMatch
      gameId="tictactoe"
      title="Xs & Os"
      maxPlayers={2}
      minPlayers={2}
      onBack={onBack}
      buildInitialState={(players: MatchPlayer[]) => ({
        phase: "playing",
        board: Array(9).fill(null),
        turnSeat: 0,
        result: null,
        seats: players.map((p) => ({
          userId: p.user_id,
          seat: p.seat,
          name: p.profile.username,
        })),
      })}
      renderGame={(ctx) => <OnlineTicTacToeBoard {...ctx} />}
    />
  );
}

/* ─── Connect 4 ─── */

type Cell = null | "R" | "Y";
type CBoard = Cell[][];
const ROWS = 6;
const COLS = 7;

function emptyBoard(): CBoard {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function drop(board: CBoard, col: number, who: Cell): CBoard | null {
  if (board[0]![col] !== null) return null;
  const next = board.map((r) => [...r]);
  for (let r = ROWS - 1; r >= 0; r--) {
    if (next[r]![col] === null) {
      next[r]![col] = who;
      return next;
    }
  }
  return null;
}

function connectWinner(board: CBoard): Cell | "draw" | null {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const start = board[r]![c];
      if (!start) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr]![cc] !== start) {
            ok = false;
            break;
          }
        }
        if (ok) return start;
      }
    }
  }
  if (board.every((row) => row.every(Boolean))) return "draw";
  return null;
}

type ConnectState = {
  phase: "playing" | "finished";
  board: CBoard;
  turnSeat: number;
  result: Cell | "draw" | null;
  seats: { userId: string; seat: number; name: string }[];
};

function OnlineConnectBoard({ room, me, pushState }: MatchContext) {
  const s = room.state as unknown as ConnectState;
  const board = s.board?.length ? s.board : emptyBoard();
  const myColor: Cell = me.seat === 0 ? "R" : "Y";
  const result = s.result ?? connectWinner(board);
  const myTurn = !result && s.turnSeat === me.seat;

  const play = async (col: number) => {
    if (!myTurn || result) return;
    const next = drop(board, col, myColor);
    if (!next) return;
    playTap();
    const w = connectWinner(next);
    if (w === "R" || w === "Y") playWin();
    else if (w === "draw") playBonk();
    await pushState(
      {
        ...s,
        board: next,
        turnSeat: w ? s.turnSeat : me.seat === 0 ? 1 : 0,
        result: w,
        phase: w ? "finished" : "playing",
      },
      w ? "finished" : "playing",
    );
  };

  return (
    <div className="chunky-lg mx-auto max-w-lg rounded-xl bg-paper p-5">
      {result === myColor && <Confetti show />}
      <p className="mb-3 text-center font-bold">
        You are {myColor === "R" ? "🔴" : "🟡"}
        {result
          ? result === "draw"
            ? " — draw"
            : result === myColor
              ? " — you win!"
              : " — you lose"
          : myTurn
            ? " — drop a disc"
            : " — waiting…"}
      </p>
      <div className="mx-auto grid max-w-md grid-cols-7 gap-1">
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={`h-${c}`}
            type="button"
            disabled={!myTurn || !!result || board[0]![c] !== null}
            className="btn-chunky rounded-md bg-sky/40 py-1 text-xs font-bold disabled:opacity-40"
            onClick={() => void play(c)}
          >
            ▼
          </button>
        ))}
        {board.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className="flex aspect-square items-center justify-center rounded-full border-[3px] border-ink bg-white text-xl"
            >
              {cell === "R" ? "🔴" : cell === "Y" ? "🟡" : ""}
            </div>
          )),
        )}
      </div>
    </div>
  );
}

export function OnlineConnect({ onBack }: { onBack: () => void }) {
  return (
    <OnlineMatch
      gameId="connect"
      title="Connect 4"
      maxPlayers={2}
      minPlayers={2}
      onBack={onBack}
      buildInitialState={(players) => ({
        phase: "playing",
        board: emptyBoard(),
        turnSeat: 0,
        result: null,
        seats: players.map((p) => ({
          userId: p.user_id,
          seat: p.seat,
          name: p.profile.username,
        })),
      })}
      renderGame={(ctx) => <OnlineConnectBoard {...ctx} />}
    />
  );
}

/* ─── Showdown RPS ─── */

type Choice = "rock" | "paper" | "scissors";
const CHOICES: { id: Choice; label: string; emoji: string }[] = [
  { id: "rock", label: "Rock", emoji: "✊" },
  { id: "paper", label: "Paper", emoji: "✋" },
  { id: "scissors", label: "Scissors", emoji: "✌️" },
];

function beats(a: Choice, b: Choice) {
  return (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  );
}

type ShowState = {
  phase: "playing" | "finished";
  scores: number[];
  picks: (Choice | null)[];
  last: (Choice | null)[];
  msg: string;
  seats: { userId: string; seat: number; name: string }[];
  target: number;
};

function OnlineShowdownBoard({ room, me, players, pushState }: MatchContext) {
  const s = room.state as unknown as ShowState;
  const picks = s.picks || [null, null];
  const scores = s.scores || [0, 0];
  const myPick = picks[me.seat];
  const bothPicked = picks[0] && picks[1];

  const choose = async (choice: Choice) => {
    if (myPick || room.status === "finished") return;
    const nextPicks = [...picks] as (Choice | null)[];
    nextPicks[me.seat] = choice;
    playTap();

    if (nextPicks[0] && nextPicks[1]) {
      const a = nextPicks[0];
      const b = nextPicks[1];
      const nextScores = [...scores];
      let msg = "Tie round";
      if (a !== b) {
        if (beats(a, b)) {
          nextScores[0]!++;
          msg = `${s.seats[0]?.name || "P1"} wins round`;
        } else {
          nextScores[1]!++;
          msg = `${s.seats[1]?.name || "P2"} wins round`;
        }
      }
      const target = s.target || 3;
      const finished = nextScores[0]! >= target || nextScores[1]! >= target;
      if (finished) {
        if ((me.seat === 0 && nextScores[0]! >= target) || (me.seat === 1 && nextScores[1]! >= target))
          playWin();
        else playBonk();
      }
      await pushState(
        {
          ...s,
          picks: [null, null],
          last: nextPicks,
          scores: nextScores,
          msg: finished
            ? nextScores[0]! >= target
              ? `${s.seats[0]?.name} wins the match!`
              : `${s.seats[1]?.name} wins the match!`
            : msg,
          phase: finished ? "finished" : "playing",
        },
        finished ? "finished" : "playing",
      );
    } else {
      await pushState({ ...s, picks: nextPicks, msg: "Waiting for rival…" });
    }
  };

  return (
    <div className="chunky-lg mx-auto max-w-md rounded-xl bg-paper p-5">
      <p className="mb-2 text-center text-sm font-bold">
        {players.map((p, i) => `${p.profile.username} ${scores[i] ?? 0}`).join(" · ")} · first to{" "}
        {s.target || 3}
      </p>
      <p className="mb-4 text-center font-extrabold">{s.msg || "Lock in a move"}</p>
      {s.last?.[0] && s.last?.[1] && (
        <p className="mb-3 text-center text-2xl">
          {CHOICES.find((c) => c.id === s.last[0])?.emoji} vs{" "}
          {CHOICES.find((c) => c.id === s.last[1])?.emoji}
        </p>
      )}
      {room.status !== "finished" && (
        <div className="flex justify-center gap-2">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={!!myPick || !!bothPicked}
              className="btn-chunky rounded-md bg-white px-3 py-3 text-2xl disabled:opacity-50"
              onClick={() => void choose(c.id)}
              title={c.label}
            >
              {c.emoji}
            </button>
          ))}
        </div>
      )}
      {myPick && room.status !== "finished" && (
        <p className="mt-3 text-center text-sm font-bold text-ink/60">Locked — waiting for opponent</p>
      )}
    </div>
  );
}

export function OnlineShowdown({ onBack }: { onBack: () => void }) {
  return (
    <OnlineMatch
      gameId="showdown"
      title="Showdown"
      maxPlayers={2}
      minPlayers={2}
      onBack={onBack}
      buildInitialState={(players) => ({
        phase: "playing",
        scores: [0, 0],
        picks: [null, null],
        last: [null, null],
        msg: "First to 3 — lock a move",
        target: 3,
        seats: players.map((p) => ({
          userId: p.user_id,
          seat: p.seat,
          name: p.profile.username,
        })),
      })}
      renderGame={(ctx) => <OnlineShowdownBoard {...ctx} />}
    />
  );
}

/* ─── Claimcraft online (2 players) ─── */

const SIZE = 10;
const TOTAL = SIZE * SIZE;

function at(x: number, y: number) {
  return y * SIZE + x;
}

function neighbors(i: number) {
  const x = i % SIZE;
  const y = (i / SIZE) | 0;
  const out: number[] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) out.push(at(nx, ny));
  }
  return out;
}

type ClaimState = {
  phase: "playing" | "finished";
  grid: number[];
  turnSeat: number;
  msg: string;
  seats: { userId: string; seat: number; name: string }[];
};

function OnlineClaimBoard({ room, me, pushState }: MatchContext) {
  const s = room.state as unknown as ClaimState;
  const grid = s.grid || Array(TOTAL).fill(0);
  const counts = useMemo(() => {
    let a = 0;
    let b = 0;
    for (const c of grid) {
      if (c === 1) a++;
      if (c === 2) b++;
    }
    return { a, b };
  }, [grid]);
  const myOwner = (me.seat + 1) as 1 | 2;
  const myTurn = room.status === "playing" && s.turnSeat === me.seat;

  const claim = async (i: number) => {
    if (!myTurn || grid[i] !== 0) return;
    if (!neighbors(i).some((n) => grid[n] === myOwner)) return;
    const next = [...grid];
    next[i] = myOwner;
    for (const n of neighbors(i)) {
      if (next[n] && next[n] !== myOwner) {
        const press = neighbors(n).filter((x) => next[x] === myOwner).length;
        if (press >= 2) next[n] = myOwner;
      }
    }
    playTap();
    const a = next.filter((c) => c === 1).length;
    const b = next.filter((c) => c === 2).length;
    const filled = next.every((c) => c !== 0) || a + b >= TOTAL;
    let msg = `${s.seats[me.seat === 0 ? 1 : 0]?.name || "Rival"}'s turn`;
    let phase: "playing" | "finished" = "playing";
    if (filled) {
      phase = "finished";
      if (a === b) {
        msg = "Tie claim!";
        playBonk();
      } else if ((a > b && me.seat === 0) || (b > a && me.seat === 1)) {
        msg = "You claimed the realm!";
        playWin();
      } else {
        msg = "Rival owns the map.";
        playBonk();
      }
    }
    await pushState(
      {
        ...s,
        grid: next,
        turnSeat: phase === "finished" ? s.turnSeat : me.seat === 0 ? 1 : 0,
        msg,
        phase,
      },
      phase === "finished" ? "finished" : "playing",
    );
  };

  return (
    <div className="chunky-lg mx-auto max-w-lg rounded-xl bg-paper p-4">
      <p className="mb-2 text-center text-sm font-bold">
        Lime {counts.a} · Coral {counts.b} — {myTurn ? "your claim" : "waiting…"}
      </p>
      <p className="mb-3 text-center font-extrabold">{s.msg}</p>
      <div
        className="mx-auto grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, maxWidth: 360 }}
      >
        {grid.map((owner, i) => (
          <button
            key={i}
            type="button"
            disabled={!myTurn || owner !== 0}
            onClick={() => void claim(i)}
            className="aspect-square rounded-sm border border-ink/40"
            style={{
              background: owner === 1 ? "#c8f542" : owner === 2 ? "#ff6b6b" : "#fff",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function OnlineClaimcraft({ onBack }: { onBack: () => void }) {
  return (
    <OnlineMatch
      gameId="claimcraft"
      title="Claimcraft"
      maxPlayers={2}
      minPlayers={2}
      onBack={onBack}
      buildInitialState={(players) => {
        const grid = Array(TOTAL).fill(0);
        grid[at(1, 1)] = 1;
        grid[at(SIZE - 2, SIZE - 2)] = 2;
        return {
          phase: "playing",
          grid,
          turnSeat: 0,
          msg: "Claim adjacent empty tiles. Flip pressured rivals.",
          seats: players.map((p) => ({
            userId: p.user_id,
            seat: p.seat,
            name: p.profile.username,
          })),
        };
      }}
      renderGame={(ctx) => <OnlineClaimBoard {...ctx} />}
    />
  );
}

/* ─── NEW: Pulse Duel — simultaneous reaction taps ─── */

type PulseState = {
  phase: "countdown" | "playing" | "finished";
  scores: number[];
  round: number;
  maxRounds: number;
  goAt: number | null;
  tapped: (number | null)[];
  msg: string;
  seats: { userId: string; seat: number; name: string }[];
};

function OnlinePulseBoard({ room, me, players, pushState, isHost }: MatchContext) {
  const s = room.state as unknown as PulseState;
  const [now, setNow] = useState(Date.now());
  const scores = s.scores || [0, 0];

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, []);

  // Host advances countdown → go signal
  const armRound = async () => {
    if (!isHost || s.phase === "finished") return;
    const delay = 1200 + Math.floor(Math.random() * 2000);
    await pushState({
      ...s,
      phase: "countdown",
      goAt: Date.now() + delay,
      tapped: [null, null],
      msg: "Wait for PULSE…",
    });
  };

  const tap = async () => {
    if (s.phase === "finished") return;
    if (!s.goAt) return;
    if (s.tapped?.[me.seat] != null) return;
    const t = Date.now();
    if (t < s.goAt) {
      // early — penalize
      const nextScores = [...scores];
      nextScores[me.seat]! = Math.max(0, nextScores[me.seat]! - 1);
      playBonk();
      const nextTapped = [...(s.tapped || [null, null])] as (number | null)[];
      nextTapped[me.seat] = -1;
      await pushState({
        ...s,
        scores: nextScores,
        tapped: nextTapped,
        msg: `${me.profile.username} tapped early (−1)`,
      });
      return;
    }
    const nextTapped = [...(s.tapped || [null, null])] as (number | null)[];
    nextTapped[me.seat] = t - s.goAt;
    playTap();

    const other = me.seat === 0 ? 1 : 0;
    if (nextTapped[other] != null && nextTapped[other]! >= 0) {
      // both valid — award faster
      const nextScores = [...scores];
      const a = nextTapped[0]!;
      const b = nextTapped[1]!;
      let msg = "Tie reaction";
      if (a < b) {
        nextScores[0]!++;
        msg = `${s.seats[0]?.name} was faster`;
      } else if (b < a) {
        nextScores[1]!++;
        msg = `${s.seats[1]?.name} was faster`;
      }
      const round = (s.round || 1) + 1;
      const maxRounds = s.maxRounds || 5;
      const finished = round > maxRounds;
      if (finished) {
        if (
          (nextScores[0]! > nextScores[1]! && me.seat === 0) ||
          (nextScores[1]! > nextScores[0]! && me.seat === 1)
        )
          playWin();
        else playBonk();
      }
      await pushState(
        {
          ...s,
          scores: nextScores,
          tapped: nextTapped,
          round: finished ? s.round : round,
          goAt: null,
          phase: finished ? "finished" : "playing",
          msg: finished
            ? nextScores[0]! === nextScores[1]!
              ? "Match tied!"
              : nextScores[0]! > nextScores[1]!
                ? `${s.seats[0]?.name} wins Pulse Duel!`
                : `${s.seats[1]?.name} wins Pulse Duel!`
            : msg,
        },
        finished ? "finished" : "playing",
      );
    } else if (nextTapped[other] === -1) {
      // other early, I win round
      const nextScores = [...scores];
      nextScores[me.seat]!++;
      const round = (s.round || 1) + 1;
      const maxRounds = s.maxRounds || 5;
      const finished = round > maxRounds;
      await pushState(
        {
          ...s,
          scores: nextScores,
          tapped: nextTapped,
          round: finished ? s.round : round,
          goAt: null,
          phase: finished ? "finished" : "playing",
          msg: finished ? "Match over" : `${me.profile.username} takes the round`,
        },
        finished ? "finished" : "playing",
      );
    } else {
      await pushState({
        ...s,
        tapped: nextTapped,
        msg: `${me.profile.username} locked ${t - s.goAt}ms`,
      });
    }
  };

  const goLive = s.goAt != null && now >= s.goAt;
  const waiting = s.goAt != null && now < s.goAt;

  return (
    <div className="chunky-lg mx-auto max-w-md rounded-xl bg-paper p-5 text-center">
      <p className="mb-2 text-sm font-bold">
        {players.map((p, i) => `${p.profile.username} ${scores[i] ?? 0}`).join(" · ")} · round{" "}
        {s.round || 1}/{s.maxRounds || 5}
      </p>
      <p className="mb-4 font-extrabold">{s.msg}</p>
      {room.status !== "finished" && (
        <>
          {isHost && !s.goAt && (
            <button
              type="button"
              className="btn-chunky mb-3 rounded-md bg-butter px-4 py-2 font-extrabold"
              onClick={() => void armRound()}
            >
              Arm next pulse
            </button>
          )}
          <button
            type="button"
            disabled={!goLive || s.tapped?.[me.seat] != null}
            onClick={() => void tap()}
            className={`btn-chunky mx-auto flex h-36 w-36 items-center justify-center rounded-full text-2xl font-extrabold text-white disabled:opacity-50 ${
              goLive ? "bg-coral animate-bounce-soft" : waiting ? "bg-ink/40" : "bg-sky"
            }`}
          >
            {goLive ? "PULSE!" : waiting ? "…" : "WAIT"}
          </button>
        </>
      )}
    </div>
  );
}

export function OnlinePulseDuel({ onBack }: { onBack: () => void }) {
  return (
    <OnlineMatch
      gameId="pulseduel"
      title="Pulse Duel"
      maxPlayers={2}
      minPlayers={2}
      onBack={onBack}
      buildInitialState={(players) => ({
        phase: "playing",
        scores: [0, 0],
        round: 1,
        maxRounds: 5,
        goAt: null,
        tapped: [null, null],
        msg: "Host arms the pulse. Don't tap early.",
        seats: players.map((p) => ({
          userId: p.user_id,
          seat: p.seat,
          name: p.profile.username,
        })),
      })}
      renderGame={(ctx) => <OnlinePulseBoard {...ctx} />}
    />
  );
}

/* ─── NEW: Gridlock — hot potato cell claims simultaneous ─── */

type GridlockState = {
  phase: "playing" | "finished";
  cells: (number | null)[]; // seat owner
  scores: number[];
  open: number[];
  round: number;
  maxRounds: number;
  msg: string;
  seats: { userId: string; seat: number; name: string }[];
};

function OnlineGridlockBoard({ room, me, players, pushState }: MatchContext) {
  const s = room.state as unknown as GridlockState;
  const cells = s.cells || Array(9).fill(null);
  const open = new Set(s.open || []);
  const scores = s.scores || [0, 0];

  const grab = async (i: number) => {
    if (room.status === "finished") return;
    if (!open.has(i) || cells[i] != null) return;
    const nextCells = [...cells];
    nextCells[i] = me.seat;
    playTap();
    const remaining = (s.open || []).filter((x) => x !== i && nextCells[x] == null);
    const nextScores = [...scores];
    nextScores[me.seat]!++;

    if (remaining.length === 0) {
      const round = (s.round || 1) + 1;
      const maxRounds = s.maxRounds || 3;
      const finished = round > maxRounds;
      // new open set for next round or finish
      const all = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 5);
      if (finished) {
        if (
          (nextScores[0]! > nextScores[1]! && me.seat === 0) ||
          (nextScores[1]! > nextScores[0]! && me.seat === 1)
        )
          playWin();
        else playBonk();
      }
      await pushState(
        {
          ...s,
          cells: finished ? nextCells : Array(9).fill(null),
          open: finished ? [] : shuffled,
          scores: nextScores,
          round: finished ? s.round : round,
          phase: finished ? "finished" : "playing",
          msg: finished
            ? nextScores[0]! === nextScores[1]!
              ? "Gridlock draw!"
              : nextScores[0]! > nextScores[1]!
                ? `${s.seats[0]?.name} locks the grid!`
                : `${s.seats[1]?.name} locks the grid!`
            : `Round ${round} — snatch open cells`,
        },
        finished ? "finished" : "playing",
      );
    } else {
      await pushState({
        ...s,
        cells: nextCells,
        open: remaining,
        scores: nextScores,
        msg: `${me.profile.username} grabbed a cell`,
      });
    }
  };

  return (
    <div className="chunky-lg mx-auto max-w-sm rounded-xl bg-paper p-5">
      <p className="mb-2 text-center text-sm font-bold">
        {players.map((p, i) => `${p.profile.username} ${scores[i] ?? 0}`).join(" · ")} · round{" "}
        {s.round || 1}/{s.maxRounds || 3}
      </p>
      <p className="mb-3 text-center font-extrabold">{s.msg}</p>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((owner, i) => {
          const isOpen = open.has(i) && owner == null && room.status === "playing";
          return (
            <button
              key={i}
              type="button"
              disabled={!isOpen}
              onClick={() => void grab(i)}
              className={`btn-chunky aspect-square rounded-md text-lg font-extrabold disabled:opacity-60 ${
                isOpen ? "bg-lime" : owner === 0 ? "bg-sky text-white" : owner === 1 ? "bg-coral text-white" : "bg-white"
              }`}
            >
              {owner == null ? (isOpen ? "!" : "") : owner === me.seat ? "YOU" : "RIV"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OnlineGridlock({ onBack }: { onBack: () => void }) {
  return (
    <OnlineMatch
      gameId="gridlock"
      title="Gridlock"
      maxPlayers={2}
      minPlayers={2}
      onBack={onBack}
      buildInitialState={(players) => {
        const open = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, 5);
        return {
          phase: "playing",
          cells: Array(9).fill(null),
          scores: [0, 0],
          open,
          round: 1,
          maxRounds: 3,
          msg: "Snatch glowing cells before your rival",
          seats: players.map((p) => ({
            userId: p.user_id,
            seat: p.seat,
            name: p.profile.username,
          })),
        };
      }}
      renderGame={(ctx) => <OnlineGridlockBoard {...ctx} />}
    />
  );
}

/** Mode picker for games that support solo/local AND online */
export function OnlineOrLocal({
  title,
  onBack,
  local,
  online,
}: {
  title: string;
  onBack: () => void;
  local: React.ReactNode;
  online: React.ReactNode;
}) {
  const [mode, setMode] = useState<"pick" | "local" | "online">("pick");
  if (mode === "local") return <>{local}</>;
  if (mode === "online") return <>{online}</>;
  return (
    <div className="chunky-lg mx-auto max-w-md rounded-xl bg-paper p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">{title}</h2>
        <button type="button" className="btn-chunky rounded-md bg-paper px-3 py-1.5 text-sm" onClick={onBack}>
          ← Back
        </button>
      </div>
      <p className="mb-4 text-sm font-semibold text-ink/70">How do you want to play?</p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="btn-chunky rounded-md bg-lime px-4 py-3 font-extrabold"
          onClick={() => {
            playTap();
            setMode("online");
          }}
        >
          With a friend online
        </button>
        <button
          type="button"
          className="btn-chunky rounded-md bg-paper px-4 py-3 font-extrabold"
          onClick={() => {
            playTap();
            setMode("local");
          }}
        >
          Just me on this device
        </button>
      </div>
    </div>
  );
}
