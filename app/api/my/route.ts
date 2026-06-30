import { NextRequest, NextResponse } from "next/server";
import { getReservationsByPerson } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { firstName, lastName, phone } = body as Record<string, unknown>;
  if (
    typeof firstName !== "string" || !firstName.trim() ||
    typeof lastName !== "string" || !lastName.trim() ||
    typeof phone !== "string" || !phone.trim()
  ) {
    return NextResponse.json({ error: "Enter your first name, last name, and phone number." }, { status: 400 });
  }
  const reservations = await getReservationsByPerson({ firstName, lastName, phone });
  return NextResponse.json({ reservations });
}
