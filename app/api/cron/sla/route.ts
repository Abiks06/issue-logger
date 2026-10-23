import { NextResponse } from "next/server";
import { sweepSla } from "@/lib/sla-sweep";
import { bearerToken } from "@/lib/tokens";

/**
 * GET /api/cron/sla — run the SLA alert sweep. Point a scheduler (Vercel Cron,
 * GitHub Actions, cron + curl) at it with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || bearerToken(request.headers.get("authorization")) !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await sweepSla());
}
