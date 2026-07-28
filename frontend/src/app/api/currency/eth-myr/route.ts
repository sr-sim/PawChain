import { NextResponse } from "next/server";
import { getLatestEthMyrRate } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getLatestEthMyrRate();

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
