import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/db";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, expectedToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = (body as Record<string, unknown> | null)?.password;
  if (typeof password !== "string") {
    return NextResponse.json({ error: "Password required." }, { status: 400 });
  }
  const actual = (await getSetting("admin_password")) ?? "admin123";
  if (password !== actual) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}
