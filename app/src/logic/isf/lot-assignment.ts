/**
 * Lot-number assignment — randomized draw with optional seed.
 *
 * Used by Registration "Жеребьёвка" bulk action. With a seed, the shuffle is
 * deterministic so the operator can reproduce a draw if needed.
 */

/** mulberry32 — small fast deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a new array with elements shuffled (Fisher-Yates).
 * If `seed` is provided, the shuffle is deterministic for that seed.
 */
export function shuffle<T>(items: ReadonlyArray<T>, seed?: number): T[] {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmpI = out[i] as T;
    const tmpJ = out[j] as T;
    out[i] = tmpJ;
    out[j] = tmpI;
  }
  return out;
}

/**
 * Assign monotonically increasing lot numbers starting from `startAt` to ids
 * in shuffled order. Returns `{ id → lotNumber }`.
 *
 * @param ids list of entry ids in their original (registration) order
 * @param startAt next free lot number (so lot-numbers stay monotonic across re-runs)
 * @param seed optional — provide for deterministic shuffles
 */
export function assignLotNumbers(
  ids: ReadonlyArray<string>,
  startAt: number,
  seed?: number,
): { lotByEntryId: Record<string, number>; lastLotNumber: number } {
  const order = shuffle(ids, seed);
  const lotByEntryId: Record<string, number> = {};
  let lot = startAt;
  for (const id of order) {
    lot += 1;
    lotByEntryId[id] = lot;
  }
  return { lotByEntryId, lastLotNumber: lot };
}
