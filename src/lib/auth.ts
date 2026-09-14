"use client";

export type LocalUser = {
  username: string;
  createdAt: number;
};

type StoredAccount = {
  username: string;
  salt: string;
  hash: string;
  createdAt: number;
};

const ACCOUNTS_KEY = "boredbox.accounts.v1";
const SESSION_KEY = "boredbox.session.v1";

function bufToHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out.buffer;
}

async function derive(password: string, saltHex: string) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBuf(saltHex),
      iterations: 120_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return bufToHex(bits);
}

function readAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(list: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export function getSession(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalUser;
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

export async function register(username: string, password: string): Promise<LocalUser> {
  const name = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,16}$/.test(name)) {
    throw new Error("Username: 3–16 chars, letters/numbers/_ only");
  }
  if (password.length < 4) throw new Error("Password needs at least 4 characters");
  const accounts = readAccounts();
  if (accounts.some((a) => a.username === name)) throw new Error("That username is taken on this device");
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bufToHex(saltBytes.buffer);
  const hash = await derive(password, salt);
  const createdAt = Date.now();
  accounts.push({ username: name, salt, hash, createdAt });
  writeAccounts(accounts);
  const user = { username: name, createdAt };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function signIn(username: string, password: string): Promise<LocalUser> {
  const name = username.trim().toLowerCase();
  const account = readAccounts().find((a) => a.username === name);
  if (!account) throw new Error("No local account with that username");
  const hash = await derive(password, account.salt);
  if (hash !== account.hash) throw new Error("Wrong password");
  const user = { username: account.username, createdAt: account.createdAt };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export const SYNK_ID_URL = "https://synkid.netlify.app";
