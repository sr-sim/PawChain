import { NextRequest, NextResponse } from "next/server";
import { getDonorDonations } from "@/lib/donor-donations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? "";

    if (!walletAddress) {
      return NextResponse.json(
        { donations: [], message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const result = await getDonorDonations(walletAddress);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        donations: [],
        message:
          error instanceof Error
            ? error.message
            : "Unable to load donor donations.",
      },
      { status: 500 },
    );
  }
}
