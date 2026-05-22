import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { syncHolidays } from "@/lib/holidays";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  try {
    const count = await syncHolidays();
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Could not reach the Thai holiday calendar. Check the connection and try again.",
      },
      { status: 502 }
    );
  }
}
