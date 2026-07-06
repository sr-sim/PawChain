import { NextResponse } from "next/server";
import { getActiveDonorCampaigns } from "@/lib/donor-campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const campaigns = await getActiveDonorCampaigns();

    return NextResponse.json({
      campaigns,
      source: campaigns.length > 0 ? "supabase" : "empty",
    });
  } catch (error) {
    return NextResponse.json(
      {
        campaigns: [],
        message:
          error instanceof Error
            ? error.message
            : "Unable to load donor campaigns.",
      },
      { status: 500 },
    );
  }
}
