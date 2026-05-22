import { NextRequest, NextResponse } from "next/server";
import { addHoliday, removeHoliday } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const obj = (body as Record<string, unknown> | null) ?? {};
  const date = obj.date;
  const name = typeof obj.name === "string" ? obj.name : "";
  if (typeof date !== "string") {
    return NextResponse.json({ error: "Date required." }, { status: 400 });
  }
  if (!(await addHoliday(date, name))) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const date = (body as Record<string, unknown> | null)?.date;
  if (typeof date !== "string") {
    return NextResponse.json({ error: "Date required." }, { status: 400 });
  }
  if (!(await removeHoliday(date))) {
    return NextResponse.json({ error: "That day is not a holiday." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
