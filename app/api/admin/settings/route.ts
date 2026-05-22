import { NextRequest, NextResponse } from "next/server";
import { setSetting } from "@/lib/db";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, expectedToken, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const obj = (body as Record<string, unknown> | null) ?? {};

  if (obj.perPersonLimit !== undefined) {
    const limit = Number(obj.perPersonLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 31) {
      return NextResponse.json({ error: "Day limit must be a whole number between 1 and 31." }, { status: 400 });
    }
    await setSetting("per_person_limit", String(limit));
  }

  if (obj.holidayLimit !== undefined) {
    const hLimit = Number(obj.holidayLimit);
    if (!Number.isInteger(hLimit) || hLimit < 0 || hLimit > 31) {
      return NextResponse.json({ error: "Holiday limit must be a whole number between 0 and 31." }, { status: 400 });
    }
    await setSetting("holiday_limit", String(hLimit));
  }

  let passwordChanged = false;
  if (obj.adminPassword !== undefined) {
    const pw = obj.adminPassword;
    if (typeof pw !== "string" || pw.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
    }
    await setSetting("admin_password", pw);
    passwordChanged = true;
  }

  const res = NextResponse.json({ ok: true });
  if (passwordChanged) {
    res.cookies.set(ADMIN_COOKIE, await expectedToken(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_MAX_AGE,
    });
  }
  return res;
}
