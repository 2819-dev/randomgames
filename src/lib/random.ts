/** Game RNG helpers — kept outside components for eslint purity rules. */
export function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)];
}
