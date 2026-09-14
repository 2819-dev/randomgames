/** Game RNG helpers — kept outside components for eslint purity rules. */
export function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)]!;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
