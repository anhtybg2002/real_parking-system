export function keyOf(r, c) {
  return `${r}-${c}`;
}
export function parseKey(k) {
  const [r, c] = String(k).split("-").map((x) => Number(x));
  return { r, c };
}
export function isAdjacent(k1, k2) {
  if (!k1 || !k2) return false;
  const a = parseKey(k1);
  const b = parseKey(k2);
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}
