import { NextRequest, NextResponse } from "next/server";
import { getReservationsByPerson } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { name, personnelNumber } = body as Record<string, unknown>;
  if (typeof name !== "string" || typeof personnelNumber !== "string" || !name.trim() || !personnelNumber.trim()) {
    return NextResponse.json({ error: "Enter both your name and personnel number." }, { status: 400 });
  }
  const reservations = await getReservationsByPerson({ name, personnelNumber });
  return NextResponse.json({ reservations });
}
