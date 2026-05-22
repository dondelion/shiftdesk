import { NextRequest, NextResponse } from "next/server";
import { deleteMonthSetting, setMonthSetting } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const obj = (body as Record<string, unknown> | null) ?? {};
  const month = obj.month;
  const mode = obj.mode;
  const openAt = obj.openAt ?? null;
  const closeAt = obj.closeAt ?? null;

  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Pick a valid month." }, { status: 400 });
  }
  if (mode !== "open" && mode !== "closed" && mode !== "scheduled") {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }
  if (mode === "scheduled") {
    if (openAt !== null && (typeof openAt !== "string" || !DATETIME_RE.test(openAt))) {
      return NextResponse.json({ error: "Invalid open-at datetime." }, { status: 400 });
    }
    if (closeAt !== null && (typeof closeAt !== "string" || !DATETIME_RE.test(closeAt))) {
      return NextResponse.json({ error: "Invalid close-at datetime." }, { status: 400 });
    }
  }

  await setMonthSetting(
    month,
    mode,
    mode === "scheduled" ? (openAt as string | null) : null,
    mode === "scheduled" ? (closeAt as string | null) : null
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const month = (body as Record<string, unknown> | null)?.month;
  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  await deleteMonthSetting(month);
  return NextResponse.json({ ok: true });
}
