/**
 * Timezone helpers using date-fns-tz / Intl. No external APIs.
 */
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addMinutes, isBefore, isAfter, parseISO } from "date-fns";

export function assertValidZone(zone) {
  if (!zone || typeof zone !== "string") throw new Error("timezone is required (IANA, e.g. America/New_York)");
  try {
    // Throws RangeError for invalid IANA zones in modern Node
    Intl.DateTimeFormat(undefined, { timeZone: zone });
  } catch {
    throw new Error(`Invalid IANA timezone: ${zone}`);
  }
  return zone;
}

export function parseWhen(when, zone) {
  if (!when || when === "now") return new Date();
  // If date-only or local-looking string without Z, interpret in zone
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(when)) {
    assertValidZone(zone || "UTC");
    return fromZonedTime(when.length === 16 ? when + ":00" : when, zone || "UTC");
  }
  const d = parseISO(when);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid time: ${when}`);
  return d;
}

export function convertTimezone(args = {}) {
  const fromZone = assertValidZone(args.fromZone || args.from || "UTC");
  const toZone = assertValidZone(args.toZone || args.to);
  const when = args.when || "now";
  const instant = parseWhen(when, fromZone);
  const formattedFrom = formatInTimeZone(instant, fromZone, "yyyy-MM-dd HH:mm:ss zzz");
  const formattedTo = formatInTimeZone(instant, toZone, "yyyy-MM-dd HH:mm:ss zzz");
  return {
    utc: instant.toISOString(),
    from: { zone: fromZone, display: formattedFrom },
    to: { zone: toZone, display: formattedTo },
    epochMs: instant.getTime(),
  };
}

export function whatTimeWhen(args = {}) {
  // “What time is it in X when it’s Y in Z”
  const sourceZone = assertValidZone(args.sourceZone || args.whenZone || args.z);
  const targetZone = assertValidZone(args.targetZone || args.inZone || args.x);
  const localTime = args.localTime || args.y || args.when;
  if (!localTime) throw new Error("Provide localTime (e.g. 2026-09-12T15:00 or 15:00)");
  let local = localTime;
  if (/^\d{1,2}:\d{2}/.test(local) && !local.includes("T")) {
    const day = args.date || formatInTimeZone(new Date(), sourceZone, "yyyy-MM-dd");
    local = `${day}T${local.length === 4 ? "0" + local : local}`;
  }
  const instant = fromZonedTime(local.length === 16 ? local + ":00" : local, sourceZone);
  return {
    question: `When it is ${local} in ${sourceZone}, what time is it in ${targetZone}?`,
    source: {
      zone: sourceZone,
      display: formatInTimeZone(instant, sourceZone, "yyyy-MM-dd HH:mm:ss zzz"),
    },
    target: {
      zone: targetZone,
      display: formatInTimeZone(instant, targetZone, "yyyy-MM-dd HH:mm:ss zzz"),
    },
    utc: instant.toISOString(),
  };
}

/**
 * Find overlapping meeting windows for N participants.
 * Each participant: { zone, workStart: "09:00", workEnd: "17:00" }
 * date: YYYY-MM-DD (interpreted per participant local day — we search that calendar date in UTC span)
 */
export function meetingOverlap(args = {}) {
  const participants = args.participants;
  if (!Array.isArray(participants) || participants.length < 2) {
    throw new Error("participants must be an array of at least 2 { zone, workStart, workEnd }");
  }
  const date = args.date || formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd");
  const durationMin = args.durationMinutes ?? 30;
  const stepMin = args.stepMinutes ?? 15;
  if (durationMin < 5 || durationMin > 480) throw new Error("durationMinutes must be 5–480");

  const windows = participants.map((p, idx) => {
    const zone = assertValidZone(p.zone || p.timezone);
    const start = p.workStart || p.start || "09:00";
    const end = p.workEnd || p.end || "17:00";
    const startLocal = `${date}T${normalizeHm(start)}:00`;
    const endLocal = `${date}T${normalizeHm(end)}:00`;
    const startUtc = fromZonedTime(startLocal, zone);
    const endUtc = fromZonedTime(endLocal, zone);
    if (!isBefore(startUtc, endUtc)) {
      throw new Error(`Participant ${idx} (${zone}): workStart must be before workEnd on ${date}`);
    }
    return { zone, startUtc, endUtc, label: p.name || zone };
  });

  // Intersection of all windows
  let overlapStart = windows[0].startUtc;
  let overlapEnd = windows[0].endUtc;
  for (const w of windows.slice(1)) {
    if (isAfter(w.startUtc, overlapStart)) overlapStart = w.startUtc;
    if (isBefore(w.endUtc, overlapEnd)) overlapEnd = w.endUtc;
  }

  const slots = [];
  if (isBefore(overlapStart, overlapEnd)) {
    let cursor = overlapStart;
    while (true) {
      const slotEnd = addMinutes(cursor, durationMin);
      if (isAfter(slotEnd, overlapEnd)) break;
      slots.push({
        startUtc: cursor.toISOString(),
        endUtc: slotEnd.toISOString(),
        local: windows.map((w) => ({
          zone: w.zone,
          label: w.label,
          start: formatInTimeZone(cursor, w.zone, "yyyy-MM-dd HH:mm zzz"),
          end: formatInTimeZone(slotEnd, w.zone, "yyyy-MM-dd HH:mm zzz"),
        })),
      });
      cursor = addMinutes(cursor, stepMin);
      if (slots.length >= (args.maxSlots ?? 50)) break;
    }
  }

  return {
    date,
    durationMinutes: durationMin,
    stepMinutes: stepMin,
    overlapExists: slots.length > 0,
    overlapUtc:
      isBefore(overlapStart, overlapEnd)
        ? { start: overlapStart.toISOString(), end: overlapEnd.toISOString() }
        : null,
    slotCount: slots.length,
    slots,
  };
}

function normalizeHm(hm) {
  const m = String(hm).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) throw new Error(`Invalid HH:mm time: ${hm}`);
  const h = String(Number(m[1])).padStart(2, "0");
  return `${h}:${m[2]}`;
}

export function listCommonZones() {
  // Small curated list — Intl may not expose all zones in every runtime
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
}
