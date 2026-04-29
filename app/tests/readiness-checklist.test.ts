/**
 * Readiness checklist tests — V1.x pre-UAT gate.
 */

import { describe, it, expect } from "vitest";
import { buildReadinessReport } from "@logic/readiness/checklist";
import { buildEmptyV2SaveFile } from "./fixtures/save-file";
import { buildClassicEntry } from "./fixtures/builders";

function checkById(report: ReturnType<typeof buildReadinessReport>, id: string) {
  const c = report.checks.find((x) => x.id === id);
  if (!c) throw new Error(`check ${id} not found`);
  return c;
}

describe("buildReadinessReport", () => {
  it("returns single noMeet blocker when no save file", () => {
    const r = buildReadinessReport({
      saveFile: null,
      dirty: false,
      filePath: null,
    });
    expect(r.checks.length).toBe(1);
    expect(r.checks[0]!.id).toBe("meet-name");
    expect(r.summary.canStartJudging).toBe(false);
    expect(r.summary.blockerFails).toBe(1);
  });

  it("flags empty meet name as blocker fail", () => {
    const sf = buildEmptyV2SaveFile();
    sf.meet.name = "";
    const r = buildReadinessReport({ saveFile: sf, dirty: true, filePath: null });
    expect(checkById(r, "meet-name").status).toBe("fail");
    expect(checkById(r, "meet-name").severity).toBe("blocker");
    expect(r.summary.canStartJudging).toBe(false);
  });

  it("passes when meet name is filled", () => {
    const sf = buildEmptyV2SaveFile();
    const r = buildReadinessReport({ saveFile: sf, dirty: true, filePath: null });
    expect(checkById(r, "meet-name").status).toBe("ok");
  });

  it("blocks when no entries exist", () => {
    const sf = buildEmptyV2SaveFile();
    const r = buildReadinessReport({ saveFile: sf, dirty: true, filePath: null });
    const c = checkById(r, "entries");
    expect(c.status).toBe("fail");
    expect(c.severity).toBe("blocker");
    expect(r.summary.canStartJudging).toBe(false);
  });

  it("blocks weigh-ins when at least one entry has no bodyweight", () => {
    const sf = buildEmptyV2SaveFile();
    sf.registration.entries = [
      buildClassicEntry("A", { bodyweightKg: 80 }),
      buildClassicEntry("B", { bodyweightKg: null }),
    ];
    const r = buildReadinessReport({ saveFile: sf, dirty: true, filePath: null });
    expect(checkById(r, "weigh-ins").status).toBe("fail");
    expect(r.summary.canStartJudging).toBe(false);
  });

  it("passes weigh-ins when all entries have bodyweight", () => {
    const sf = buildEmptyV2SaveFile();
    sf.registration.entries = [
      buildClassicEntry("A", { bodyweightKg: 80 }),
      buildClassicEntry("B", { bodyweightKg: 75 }),
    ];
    const r = buildReadinessReport({ saveFile: sf, dirty: true, filePath: null });
    expect(checkById(r, "weigh-ins").status).toBe("ok");
  });

  it("warns on dirty save-file", () => {
    const sf = buildEmptyV2SaveFile();
    const r = buildReadinessReport({
      saveFile: sf,
      dirty: true,
      filePath: "/tmp/x.json",
    });
    expect(checkById(r, "save-file").status).toBe("warn");
  });

  it("ok on saved & clean save-file", () => {
    const sf = buildEmptyV2SaveFile();
    const r = buildReadinessReport({
      saveFile: sf,
      dirty: false,
      filePath: "/tmp/x.json",
    });
    expect(checkById(r, "save-file").status).toBe("ok");
  });

  it("warns category-assignment when partial", () => {
    const sf = buildEmptyV2SaveFile();
    sf.registration.entries = [
      buildClassicEntry("A", {
        bodyweightKg: 80,
        assignedWeightCategoryCode: "m_80",
      }),
      buildClassicEntry("B", { bodyweightKg: 75 }),
    ];
    const r = buildReadinessReport({ saveFile: sf, dirty: true, filePath: null });
    expect(checkById(r, "category-assignment").status).toBe("warn");
  });

  it("canStartJudging requires zero blocker fails, allows warnings", () => {
    const sf = buildEmptyV2SaveFile();
    sf.registration.entries = [
      buildClassicEntry("A", { bodyweightKg: 80 }),
    ];
    const r = buildReadinessReport({ saveFile: sf, dirty: true, filePath: null });
    expect(r.summary.blockerFails).toBe(0);
    expect(r.summary.canStartJudging).toBe(true);
    expect(r.summary.warningFails).toBeGreaterThanOrEqual(1);
  });
});
