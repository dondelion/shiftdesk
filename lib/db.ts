import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";

// Singleton — survives Next.js hot reload in dev.
const g = globalThis as unknown as { _db?: Client; _dbInit?: Promise<void> };

function getClient(): Client {
  if (!g._db) {
    g._db = createClient({
      url: process.env.TURSO_URL ?? "file:data.db",
      ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
    });
  }
  return g._db;
}

async function runSchema(db: Client): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      personnel_number TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS blocked_days (
      date TEXT PRIMARY KEY,
      reason TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS holidays (
      date TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Public holiday'
    );
    CREATE TABLE IF NOT EXISTS month_settings (
      month TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      open_at TEXT,
      close_at TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  await db.executeMultiple(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('per_person_limit', '3');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('holiday_limit', '1');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', 'admin123');
  `);
  try { await db.execute("ALTER TABLE month_settings ADD COLUMN close_at TEXT"); } catch { /* already exists */ }
}

export async function getDb(): Promise<Client> {
  const db = getClient();
  if (!g._dbInit) g._dbInit = runSchema(db);
  await g._dbInit;
  return db;
}

// ---- Types ----
export type Reservation = {
  id: number;
  date: string;
  name: string;
  personnel_number: string;
  created_at: string;
};

export type MonthSetting = {
  month: string;
  mode: "open" | "closed" | "scheduled";
  open_at: string | null;
  close_at: string | null;
};

export type MonthOpenInfo = {
  open: boolean;
  mode: "default" | "open" | "closed" | "scheduled";
  openAt: string | null;
  closeAt: string | null;
};

export type ReserveResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; code: ReserveError; message: string };

export type ReserveError =
  | "INVALID"
  | "PAST"
  | "CLOSED"
  | "BLOCKED"
  | "TAKEN"
  | "LIMIT"
  | "HOLIDAY_LIMIT";

// ---- Helpers ----
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowLocalString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function toReservation(r: Record<string, unknown>): Reservation {
  return {
    id: r.id as number,
    date: r.date as string,
    name: r.name as string,
    personnel_number: r.personnel_number as string,
    created_at: r.created_at as string,
  };
}

// ---- Settings ----
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: [key] });
  return res.rows.length ? res.rows[0].value as string : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, value],
  });
}

export async function getPerPersonLimit(): Promise<number> {
  const v = Number(await getSetting("per_person_limit"));
  return Number.isFinite(v) && v > 0 ? v : 3;
}

export async function getHolidayLimit(): Promise<number> {
  const v = Number(await getSetting("holiday_limit"));
  return Number.isFinite(v) && v >= 0 ? v : 1;
}

// ---- Holidays ----
export async function getAllHolidays(): Promise<{ date: string; name: string }[]> {
  const db = await getDb();
  const res = await db.execute("SELECT date, name FROM holidays ORDER BY date ASC");
  return res.rows.map((r) => ({ date: r.date as string, name: r.name as string }));
}

export async function holidayCount(): Promise<number> {
  const db = await getDb();
  const res = await db.execute("SELECT COUNT(*) AS c FROM holidays");
  return res.rows[0].c as number;
}

export async function replaceAllHolidays(list: { date: string; name: string }[]): Promise<void> {
  const db = await getDb();
  const valid = list.filter((h) => isValidDate(h.date));
  await db.batch(
    [
      { sql: "DELETE FROM holidays" },
      ...valid.map((h) => ({
        sql: "INSERT OR REPLACE INTO holidays (date, name) VALUES (?, ?)",
        args: [h.date, h.name || "Public holiday"],
      })),
    ],
    "write"
  );
}

export async function addHoliday(date: string, name: string): Promise<boolean> {
  if (!isValidDate(date)) return false;
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO holidays (date, name) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET name = excluded.name",
    args: [date, name.trim() || "Public holiday"],
  });
  return true;
}

export async function removeHoliday(date: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM holidays WHERE date = ?", args: [date] });
  return res.rowsAffected > 0;
}

// ---- Month settings ----
export async function getMonthSetting(month: string): Promise<MonthSetting | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT month, mode, open_at, close_at FROM month_settings WHERE month = ?",
    args: [month],
  });
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return {
    month: r.month as string,
    mode: r.mode as MonthSetting["mode"],
    open_at: r.open_at as string | null,
    close_at: r.close_at as string | null,
  };
}

export async function getAllMonthSettings(): Promise<MonthSetting[]> {
  const db = await getDb();
  const res = await db.execute("SELECT month, mode, open_at, close_at FROM month_settings ORDER BY month ASC");
  return res.rows.map((r) => ({
    month: r.month as string,
    mode: r.mode as MonthSetting["mode"],
    open_at: r.open_at as string | null,
    close_at: r.close_at as string | null,
  }));
}

export async function setMonthSetting(
  month: string,
  mode: "open" | "closed" | "scheduled",
  openAt: string | null,
  closeAt: string | null
): Promise<void> {
  const db = await getDb();
  const isScheduled = mode === "scheduled";
  await db.execute({
    sql: "INSERT INTO month_settings (month, mode, open_at, close_at) VALUES (?, ?, ?, ?) " +
      "ON CONFLICT(month) DO UPDATE SET mode = excluded.mode, open_at = excluded.open_at, close_at = excluded.close_at",
    args: [month, mode, isScheduled ? openAt : null, isScheduled ? closeAt : null],
  });
}

export async function deleteMonthSetting(month: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM month_settings WHERE month = ?", args: [month] });
}

// Default (no row) = closed.
export async function monthOpenInfo(month: string): Promise<MonthOpenInfo> {
  const s = await getMonthSetting(month);
  if (!s) return { open: false, mode: "default", openAt: null, closeAt: null };
  if (s.mode === "open") return { open: true, mode: "open", openAt: null, closeAt: null };
  if (s.mode === "closed") return { open: false, mode: "closed", openAt: null, closeAt: null };
  const now = nowLocalString();
  const afterOpen = !s.open_at || now >= s.open_at;
  const beforeClose = !s.close_at || now < s.close_at;
  return { open: afterOpen && beforeClose, mode: "scheduled", openAt: s.open_at, closeAt: s.close_at };
}

// ---- Month view ----
export async function getMonthData(month: string): Promise<{
  reservations: Record<string, string>;
  blocked: Record<string, string>;
  holidays: Record<string, string>;
}> {
  const db = await getDb();
  const like = `${month}-%`;
  const [resRes, blkRes, holRes] = await Promise.all([
    db.execute({ sql: "SELECT date, name FROM reservations WHERE date LIKE ?", args: [like] }),
    db.execute({ sql: "SELECT date, reason FROM blocked_days WHERE date LIKE ?", args: [like] }),
    db.execute({ sql: "SELECT date, name FROM holidays WHERE date LIKE ?", args: [like] }),
  ]);
  const reservations: Record<string, string> = {};
  const blocked: Record<string, string> = {};
  const holidays: Record<string, string> = {};
  for (const r of resRes.rows) reservations[r.date as string] = r.name as string;
  for (const r of blkRes.rows) blocked[r.date as string] = r.reason as string;
  for (const r of holRes.rows) holidays[r.date as string] = r.name as string;
  return { reservations, blocked, holidays };
}

// ---- Reserve a day (atomic, first-come-first-served) ----
export async function createReservation(input: {
  date: string;
  name: string;
  personnelNumber: string;
}): Promise<ReserveResult> {
  const date = input.date.trim();
  const name = input.name.trim();
  const personnelNumber = input.personnelNumber.trim();

  if (!isValidDate(date) || !name || !personnelNumber) {
    return { ok: false, code: "INVALID", message: "Missing or invalid fields." };
  }
  if (date < todayStr()) {
    return { ok: false, code: "PAST", message: "That day is in the past." };
  }

  const month = date.slice(0, 7);
  const [openInfo, limit, holidayLimit] = await Promise.all([
    monthOpenInfo(month),
    getPerPersonLimit(),
    getHolidayLimit(),
  ]);

  if (!openInfo.open) {
    return { ok: false, code: "CLOSED", message: "Reservations for this month are not open." };
  }

  const db = await getDb();
  const tx = await db.transaction("write");
  try {
    const blocked = await tx.execute({ sql: "SELECT 1 FROM blocked_days WHERE date = ?", args: [date] });
    if (blocked.rows.length) {
      await tx.rollback();
      return { ok: false, code: "BLOCKED", message: "That day is not available for shifts." };
    }

    const total = await tx.execute({
      sql: "SELECT COUNT(*) AS c FROM reservations WHERE personnel_number = ? AND substr(date,1,7) = ?",
      args: [personnelNumber, month],
    });
    if ((total.rows[0].c as number) >= limit) {
      await tx.rollback();
      return { ok: false, code: "LIMIT", message: `You already have ${limit} day(s) booked this month (the limit).` };
    }

    const isHoliday = await tx.execute({ sql: "SELECT 1 FROM holidays WHERE date = ?", args: [date] });
    if (isHoliday.rows.length) {
      const hol = await tx.execute({
        sql: "SELECT COUNT(*) AS c FROM reservations WHERE personnel_number = ? AND substr(date,1,7) = ? AND date IN (SELECT date FROM holidays)",
        args: [personnelNumber, month],
      });
      if ((hol.rows[0].c as number) >= holidayLimit) {
        await tx.rollback();
        return { ok: false, code: "HOLIDAY_LIMIT", message: `You can book at most ${holidayLimit} holiday day(s) per month.` };
      }
    }

    await tx.execute({
      sql: "INSERT INTO reservations (date, name, personnel_number) VALUES (?, ?, ?)",
      args: [date, name, personnelNumber],
    });
    await tx.commit();
  } catch {
    await tx.rollback();
    return { ok: false, code: "TAKEN", message: "Sorry — that day was just taken by someone else." };
  }

  const res = await db.execute({ sql: "SELECT * FROM reservations WHERE date = ?", args: [date] });
  return { ok: true, reservation: toReservation(res.rows[0] as Record<string, unknown>) };
}

// ---- Cancel a reservation ----
export async function cancelReservation(input: {
  date: string;
  name: string;
  personnelNumber: string;
}): Promise<{ ok: boolean; message: string }> {
  const date = input.date.trim();
  const name = input.name.trim().toLowerCase();
  const personnelNumber = input.personnelNumber.trim();

  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM reservations WHERE date = ?", args: [date] });
  if (!res.rows.length) return { ok: false, message: "No reservation found for that day." };
  const row = res.rows[0];
  if (
    row.personnel_number !== personnelNumber ||
    (row.name as string).trim().toLowerCase() !== name
  ) {
    return { ok: false, message: "Name and personnel number do not match this reservation." };
  }
  await db.execute({ sql: "DELETE FROM reservations WHERE date = ?", args: [date] });
  return { ok: true, message: "Reservation cancelled." };
}

// ---- Look up a person's reservations ----
export async function getReservationsByPerson(input: {
  name: string;
  personnelNumber: string;
}): Promise<Reservation[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM reservations WHERE personnel_number = ? AND lower(trim(name)) = lower(trim(?)) ORDER BY date ASC",
    args: [input.personnelNumber.trim(), input.name.trim()],
  });
  return res.rows.map((r) => toReservation(r as Record<string, unknown>));
}

// ---- Admin ----
export async function getAllReservations(): Promise<Reservation[]> {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM reservations ORDER BY date ASC");
  return res.rows.map((r) => toReservation(r as Record<string, unknown>));
}

export async function adminDeleteReservation(date: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM reservations WHERE date = ?", args: [date] });
  return res.rowsAffected > 0;
}

export async function getAllBlocked(): Promise<{ date: string; reason: string }[]> {
  const db = await getDb();
  const res = await db.execute("SELECT date, reason FROM blocked_days ORDER BY date ASC");
  return res.rows.map((r) => ({ date: r.date as string, reason: r.reason as string }));
}

export async function addBlockedDay(date: string, reason: string): Promise<boolean> {
  if (!isValidDate(date)) return false;
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO blocked_days (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason",
    args: [date, reason.trim()],
  });
  return true;
}

export async function removeBlockedDay(date: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM blocked_days WHERE date = ?", args: [date] });
  return res.rowsAffected > 0;
}
