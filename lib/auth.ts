import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getSetting } from "./db";

const SALT = "shift-reservations-admin-v1";
export const ADMIN_COOKIE = "admin_session";
export const ADMIN_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function expectedToken(): Promise<string> {
  const pw = (await getSetting("admin_password")) ?? "admin123";
  return createHash("sha256").update(pw + SALT).digest("hex");
}

export async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  return !!token && token === (await expectedToken());
}
