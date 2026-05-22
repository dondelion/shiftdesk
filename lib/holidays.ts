import { holidayCount, replaceAllHolidays } from "./db";

const THAI_HOLIDAY_ICS =
  "https://calendar.google.com/calendar/ical/" +
  "en.th%23holiday%40group.v.calendar.google.com/public/basic.ics";

const globalForSync = globalThis as unknown as { _holidaySync?: number };
const RETRY_MS = 5 * 60 * 1000;

export function parseHolidayICS(text: string): { date: string; name: string }[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const out: { date: string; name: string }[] = [];
  let inEvent = false;
  let date = "";
  let name = "";
  let desc = "";
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { inEvent = true; date = ""; name = ""; desc = ""; continue; }
    if (line === "END:VEVENT") {
      if (inEvent && date && desc.startsWith("Public holiday")) {
        out.push({ date, name: name || "Public holiday" });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    if (line.startsWith("DTSTART")) {
      const m = line.match(/:(\d{8})/);
      if (m) date = `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`;
    } else if (line.startsWith("DESCRIPTION")) {
      const idx = line.indexOf(":");
      if (idx >= 0) desc = line.slice(idx + 1);
    } else if (line.startsWith("SUMMARY")) {
      const idx = line.indexOf(":");
      if (idx >= 0) {
        name = line.slice(idx + 1).replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
      }
    }
  }
  return out;
}

export async function syncHolidays(): Promise<number> {
  const res = await fetch(THAI_HOLIDAY_ICS, { cache: "no-store" });
  if (!res.ok) throw new Error(`Holiday feed returned ${res.status}`);
  const text = await res.text();
  const list = parseHolidayICS(text);
  if (list.length === 0) throw new Error("Holiday feed contained no events");
  await replaceAllHolidays(list);
  globalForSync._holidaySync = Date.now();
  return list.length;
}

export async function ensureHolidays(): Promise<void> {
  if ((await holidayCount()) > 0) return;
  const last = globalForSync._holidaySync ?? 0;
  if (Date.now() - last < RETRY_MS) return;
  globalForSync._holidaySync = Date.now();
  try {
    await syncHolidays();
  } catch (err) {
    console.error("[holidays] sync failed:", err);
  }
}
