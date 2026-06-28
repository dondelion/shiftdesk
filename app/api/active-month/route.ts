import { featuredMonth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const month = await featuredMonth();
  return Response.json({ month });
}
