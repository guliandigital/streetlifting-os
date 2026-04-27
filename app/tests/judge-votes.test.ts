/**
 * Unit tests for judge-votes module — D15.
 *
 * Required test groups per blueprint v2 §17:
 * - 3-0 (unanimous good lift) → success
 * - 0-3 (unanimous no lift) → fail
 * - 2-1 → success + isSplitDecision === true
 * - 1-2 → fail + isSplitDecision === true
 * - any pending vote → "pending" status
 * - all pending → "pending" status, isSplitDecision === false
 */

import { describe, it, expect } from "vitest";
import {
  attemptStatusFromVotes,
  isSplitDecision,
  votesCast,
  aggregateVote,
} from "@logic/isf/judge-votes";
import { PENDING_VOTES } from "@domain/models";
import type { JudgeVotes } from "@domain/models";

describe("attemptStatusFromVotes", () => {
  it("returns 'pending' when all three judges are null", () => {
    expect(attemptStatusFromVotes(PENDING_VOTES)).toBe("pending");
  });

  it("returns 'pending' when only one judge has decided", () => {
    expect(
      attemptStatusFromVotes({ left: true, center: null, right: null }),
    ).toBe("pending");
    expect(
      attemptStatusFromVotes({ left: null, center: false, right: null }),
    ).toBe("pending");
  });

  it("returns 'success' on unanimous good lift (3-0)", () => {
    expect(
      attemptStatusFromVotes({ left: true, center: true, right: true }),
    ).toBe("success");
  });

  it("returns 'fail' on unanimous no lift (0-3)", () => {
    expect(
      attemptStatusFromVotes({ left: false, center: false, right: false }),
    ).toBe("fail");
  });

  it("returns 'success' on 2-1 majority good lift", () => {
    const cases: JudgeVotes[] = [
      { left: true, center: true, right: false },
      { left: true, center: false, right: true },
      { left: false, center: true, right: true },
    ];
    for (const v of cases) {
      expect(attemptStatusFromVotes(v)).toBe("success");
    }
  });

  it("returns 'fail' on 1-2 majority no lift", () => {
    const cases: JudgeVotes[] = [
      { left: false, center: false, right: true },
      { left: false, center: true, right: false },
      { left: true, center: false, right: false },
    ];
    for (const v of cases) {
      expect(attemptStatusFromVotes(v)).toBe("fail");
    }
  });

  it("returns 'success' on 2-0 with one pending (early decision)", () => {
    expect(
      attemptStatusFromVotes({ left: true, center: true, right: null }),
    ).toBe("success");
  });

  it("returns 'fail' on 0-2 with one pending (early decision)", () => {
    expect(
      attemptStatusFromVotes({ left: false, center: false, right: null }),
    ).toBe("fail");
  });

  it("returns 'pending' on 1-1 with one pending (no majority yet)", () => {
    expect(
      attemptStatusFromVotes({ left: true, center: false, right: null }),
    ).toBe("pending");
  });
});

describe("isSplitDecision", () => {
  it("returns false when any judge is pending", () => {
    expect(isSplitDecision(PENDING_VOTES)).toBe(false);
    expect(
      isSplitDecision({ left: true, center: true, right: null }),
    ).toBe(false);
  });

  it("returns false on unanimous decisions (3-0 and 0-3)", () => {
    expect(
      isSplitDecision({ left: true, center: true, right: true }),
    ).toBe(false);
    expect(
      isSplitDecision({ left: false, center: false, right: false }),
    ).toBe(false);
  });

  it("returns true on 2-1 majority good lift", () => {
    expect(
      isSplitDecision({ left: true, center: true, right: false }),
    ).toBe(true);
  });

  it("returns true on 1-2 majority no lift", () => {
    expect(
      isSplitDecision({ left: false, center: true, right: false }),
    ).toBe(true);
  });
});

describe("votesCast", () => {
  it("counts decided votes", () => {
    expect(votesCast(PENDING_VOTES)).toBe(0);
    expect(votesCast({ left: true, center: null, right: null })).toBe(1);
    expect(votesCast({ left: true, center: false, right: null })).toBe(2);
    expect(votesCast({ left: true, center: false, right: true })).toBe(3);
  });
});

describe("aggregateVote", () => {
  it("sets all three judges to the same decision", () => {
    expect(aggregateVote(true)).toEqual({
      left: true,
      center: true,
      right: true,
    });
    expect(aggregateVote(false)).toEqual({
      left: false,
      center: false,
      right: false,
    });
  });

  it("aggregateVote(true) produces unanimous-success status", () => {
    expect(attemptStatusFromVotes(aggregateVote(true))).toBe("success");
  });

  it("aggregateVote(false) produces unanimous-fail status", () => {
    expect(attemptStatusFromVotes(aggregateVote(false))).toBe("fail");
  });
});
