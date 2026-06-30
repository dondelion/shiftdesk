import { NextRequest, NextResponse } from "next/server";
import { cancelReservation, createReservation } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { date, firstName, lastName, phone } = body as Record<string, unknown>;
  if (
    typeof date !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof phone !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  const result = await createReservation({ date, firstName, lastName, phone });
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: result.code === "TAKEN" ? 409 : 400 });
  }
  return NextResponse.json({ ok: true, reservation: result.reservation });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { date, firstName, lastName, phone } = body as Record<string, unknown>;
  if (
    typeof date !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string" ||
    typeof phone !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  const result = await cancelReservation({ date, firstName, lastName, phone });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
