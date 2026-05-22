import { NextRequest, NextResponse } from "next/server";
import { adminDeleteReservation } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const date = (body as Record<string, unknown> | null)?.date;
  if (typeof date !== "string") {
    return NextResponse.json({ error: "Date required." }, { status: 400 });
  }
  const removed = await adminDeleteReservation(date);
  if (!removed) {
    return NextResponse.json({ error: "No reservation on that day." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
