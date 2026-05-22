import { NextRequest, NextResponse } from "next/server";
import { getAllBlocked, getAllHolidays, getAllMonthSettings, getAllReservations, getHolidayLimit, getPerPersonLimit, todayStr } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const [reservations, blocked, holidays, monthSettings, limit, holidayLimit] = await Promise.all([
    getAllReservations(),
    getAllBlocked(),
    getAllHolidays(),
    getAllMonthSettings(),
    getPerPersonLimit(),
    getHolidayLimit(),
  ]);
  return NextResponse.json({ reservations, blocked, holidays, monthSettings, limit, holidayLimit, today: todayStr() });
}
