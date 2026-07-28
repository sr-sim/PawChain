import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDonorDonations } from "@/lib/donor-donations";

export const dynamic = "force-dynamic";

async function getDonorProfile(walletAddress: string) {
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, wallet_address")
    .ilike("wallet_address", walletAddress)
    .eq("role", "donor")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { supabase, profile };
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0, message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor.profile) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0, message: "No donor account found." },
        { status: 404 },
      );
    }

    await getDonorDonations(walletAddress);

    const { data, error } = await donor.supabase
      .from("donor_notifications")
      .select(
        "id, donor_id, campaign_id, title, message, status, is_read, read_at, created_at",
      )
      .eq("donor_id", donor.profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const notifications = data ?? [];

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((item) => !item.is_read).length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        notifications: [],
        unreadCount: 0,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load donor notifications.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "").trim();
    const notificationId = String(body.notificationId ?? "").trim();

    if (!walletAddress || !notificationId) {
      return NextResponse.json(
        { message: "Wallet address and notification ID are required." },
        { status: 400 },
      );
    }

    const donor = await getDonorProfile(walletAddress);

    if (!donor.profile) {
      return NextResponse.json(
        { message: "No donor account found." },
        { status: 404 },
      );
    }

    const { data, error } = await donor.supabase
      .from("donor_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("donor_id", donor.profile.id)
      .select(
        "id, donor_id, campaign_id, title, message, status, is_read, read_at, created_at",
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      notification: data,
      message: "Notification marked as read.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update donor notification.",
      },
      { status: 500 },
    );
  }
}
