/**
 * Lot-assignment tests — deterministic with seed; full coverage; monotonic.
 */

import { describe, it, expect } from "vitest";
import { assignLotNumbers, shuffle } from "@logic/isf/lot-assignment";

describe("shuffle", () => {
  it("returns a permutation of input (no losses, no duplicates)", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g"];
    const out = shuffle(input, 42);
    expect(out.length).toBe(input.length);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("is deterministic with the same seed", () => {
    const input = ["a", "b", "c", "d", "e"];
    const o1 = shuffle(input, 12345);
    const o2 = shuffle(input, 12345);
    expect(o1).toEqual(o2);
  });

  it("differs across seeds (high probability)", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const o1 = shuffle(input, 1);
    const o2 = shuffle(input, 2);
    expect(o1).not.toEqual(o2);
  });

  it("does not mutate input", () => {
    const input = ["a", "b", "c"];
    const copy = input.slice();
    shuffle(input, 7);
    expect(input).toEqual(copy);
  });

  it("handles empty input", () => {
    expect(shuffle([], 1)).toEqual([]);
  });

  it("handles single element", () => {
    expect(shuffle(["only"], 1)).toEqual(["only"]);
  });
});

describe("assignLotNumbers", () => {
  it("produces consecutive lot numbers starting from startAt+1", () => {
    const ids = ["x1", "x2", "x3"];
    const { lotByEntryId, lastLotNumber } = assignLotNumbers(ids, 0, 1);
    const values = Object.values(lotByEntryId).sort((a, b) => a - b);
    expect(values).toEqual([1, 2, 3]);
    expect(lastLotNumber).toBe(3);
  });

  it("respects startAt — assigns from N+1", () => {
    const ids = ["a", "b"];
    const { lotByEntryId, lastLotNumber } = assignLotNumbers(ids, 10, 1);
    const values = Object.values(lotByEntryId).sort((a, b) => a - b);
    expect(values).toEqual([11, 12]);
    expect(lastLotNumber).toBe(12);
  });

  it("returns identical maps for identical seeds", () => {
    const ids = ["a", "b", "c", "d"];
    const r1 = assignLotNumbers(ids, 0, 999);
    const r2 = assignLotNumbers(ids, 0, 999);
    expect(r1.lotByEntryId).toEqual(r2.lotByEntryId);
  });

  it("assigns each id exactly one lot number", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const { lotByEntryId } = assignLotNumbers(ids, 0, 7);
    const keys = Object.keys(lotByEntryId);
    expect(keys.sort()).toEqual([...ids].sort());
  });

  it("handles empty ids", () => {
    const { lotByEntryId, lastLotNumber } = assignLotNumbers([], 5);
    expect(lotByEntryId).toEqual({});
    expect(lastLotNumber).toBe(5);
  });
});
