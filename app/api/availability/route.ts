import { NextRequest, NextResponse } from "next/server";
import { getHolidayLimit, getMonthData, getPerPersonLimit, monthOpenInfo, todayStr } from "@/lib/db";
import { ensureHolidays } from "@/lib/holidays";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid or missing month (expected YYYY-MM)." }, { status: 400 });
  }
  await ensureHolidays();
  const [{ reservations, blocked, holidays }, openInfo, limit, holidayLimit] = await Promise.all([
    getMonthData(month),
    monthOpenInfo(month),
    getPerPersonLimit(),
    getHolidayLimit(),
  ]);
  return NextResponse.json({
    month,
    today: todayStr(),
    limit,
    holidayLimit,
    reservations,
    blocked,
    holidays,
    open: openInfo.open,
    openMode: openInfo.mode,
    openAt: openInfo.openAt,
    closeAt: openInfo.closeAt,
  });
}
