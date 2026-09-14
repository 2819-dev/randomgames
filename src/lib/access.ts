/** Who can see the live game catalog while Bored Box is in maintenance mode. */
const DEFAULT_OWNERS = ["vision"];

export function ownerUsernames(): string[] {
  const fromEnv = (process.env.NEXT_PUBLIC_OWNER_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_OWNERS;
}

export function isOwnerUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return ownerUsernames().includes(username.trim().toLowerCase());
}
