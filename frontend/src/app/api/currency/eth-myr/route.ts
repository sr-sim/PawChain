import { NextResponse } from "next/server";
import { getEthMyrHistory, getLatestEthMyrRate } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET() {
  const [result, history] = await Promise.all([
    getLatestEthMyrRate(),
    getEthMyrHistory(),
  ]);

  return NextResponse.json({ ...result, history }, {
    headers: {
      "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
    },
  });
}
