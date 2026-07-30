import { NextRequest, NextResponse } from "next/server";
import { syncShelterNotifications } from "@/lib/shelter-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const notificationFields =
  "id, shelter_id, campaign_id, title, message, status, is_read, read_at, created_at";

async function getShelterProfile(walletAddress: string) {
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, wallet_address")
    .ilike("wallet_address", walletAddress)
    .eq("role", "shelter")
    .maybeSingle();

  if (error) throw error;
  return { supabase, profile };
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get("walletAddress")?.trim();
    if (!walletAddress) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0, message: "Wallet address is required." },
        { status: 400 },
      );
    }

    const shelter = await getShelterProfile(walletAddress);
    if (!shelter.profile) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0, message: "No shelter account found." },
        { status: 404 },
      );
    }

    await syncShelterNotifications(shelter.profile.id);
    const { data, error } = await shelter.supabase
      .from("shelter_notifications")
      .select(notificationFields)
      .eq("shelter_id", shelter.profile.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
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
        message: error instanceof Error ? error.message : "Unable to load shelter notifications.",
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
    const markAll = Boolean(body.markAll);

    if (!walletAddress || (!notificationId && !markAll)) {
      return NextResponse.json(
        { message: "Wallet address and notification selection are required." },
        { status: 400 },
      );
    }

    const shelter = await getShelterProfile(walletAddress);
    if (!shelter.profile) {
      return NextResponse.json({ message: "No shelter account found." }, { status: 404 });
    }

    const readAt = new Date().toISOString();
    if (markAll) {
      const { data, error } = await shelter.supabase
        .from("shelter_notifications")
        .update({ is_read: true, read_at: readAt })
        .eq("shelter_id", shelter.profile.id)
        .eq("is_read", false)
        .select(notificationFields);
      if (error) throw error;
      return NextResponse.json({ notifications: data ?? [], message: "All notifications marked as read." });
    }

    const { data, error } = await shelter.supabase
      .from("shelter_notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("id", notificationId)
      .eq("shelter_id", shelter.profile.id)
      .select(notificationFields)
      .single();
    if (error) throw error;
    return NextResponse.json({ notification: data, message: "Notification marked as read." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update shelter notification." },
      { status: 500 },
    );
  }
}

