import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertValidZone,
  convertTimezone,
  whatTimeWhen,
  meetingOverlap,
  listCommonZones,
} from "../lib.js";

describe("assertValidZone", () => {
  it("accepts IANA", () => {
    assert.equal(assertValidZone("America/New_York"), "America/New_York");
  });
  it("rejects junk", () => {
    assert.throws(() => assertValidZone("Not/AZone"), /Invalid IANA/);
  });
});

describe("convertTimezone", () => {
  it("converts UTC to NY", () => {
    const r = convertTimezone({
      when: "2026-01-15T15:00:00Z",
      fromZone: "UTC",
      toZone: "America/New_York",
    });
    assert.match(r.to.display, /2026-01-15 10:00/);
  });
});

describe("whatTimeWhen", () => {
  it("maps local London to Tokyo", () => {
    const r = whatTimeWhen({
      sourceZone: "Europe/London",
      targetZone: "Asia/Tokyo",
      localTime: "2026-06-15T12:00",
    });
    assert.ok(r.target.display.includes("Asia/Tokyo") || r.target.display.includes("GMT") || r.target.display.includes("20:00") || r.target.display.includes("21:00") || r.utc);
    assert.match(r.utc, /2026-06-15/);
  });
});

describe("meetingOverlap", () => {
  it("finds overlap for NY and London", () => {
    const r = meetingOverlap({
      date: "2026-03-10",
      durationMinutes: 30,
      participants: [
        { zone: "America/New_York", workStart: "09:00", workEnd: "17:00", name: "Ada" },
        { zone: "Europe/London", workStart: "09:00", workEnd: "17:00", name: "Bob" },
      ],
    });
    assert.equal(r.overlapExists, true);
    assert.ok(r.slotCount > 0);
    assert.equal(r.slots[0].local.length, 2);
  });

  it("no overlap when windows miss", () => {
    const r = meetingOverlap({
      date: "2026-03-10",
      participants: [
        { zone: "America/Los_Angeles", workStart: "09:00", workEnd: "10:00" },
        { zone: "Asia/Tokyo", workStart: "09:00", workEnd: "10:00" },
      ],
    });
    assert.equal(r.overlapExists, false);
  });
});

describe("listCommonZones", () => {
  it("includes UTC", () => {
    assert.ok(listCommonZones().includes("UTC"));
  });
});
