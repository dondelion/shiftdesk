import { NextRequest, NextResponse } from "next/server";
import { getScoreboard } from "@/lib/db";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  if (month && !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  const entries = await getScoreboard(month ?? undefined);
  return NextResponse.json({ entries });
}
