import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminNotification = {
  id: string;
  title: string;
  message: string;
  status: "warning";
  is_read: false;
  created_at: string;
  campaign_id: string | null;
  href: string;
};

export async function GET(request: NextRequest) {
  try {
    const walletAddress =
      request.nextUrl.searchParams.get("walletAddress") ?? "";
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [
      { data: shelters, error: shelterError },
      { data: campaigns, error: campaignError },
      { data: milestones, error: milestoneError },
    ] = await Promise.all([
      supabase
        .from("shelter_applications")
        .select("id, shelter_name, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("campaigns")
        .select("id, title, created_at")
        .eq("campaign_status", "pending_approval")
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_milestones")
        .select("id, campaign_id, title, updated_at, campaigns(title)")
        .eq("status", "submitted")
        .order("updated_at", { ascending: false }),
    ]);

    if (shelterError) throw shelterError;
    if (campaignError) throw campaignError;
    if (milestoneError) throw milestoneError;

    const notifications: AdminNotification[] = [
      ...(shelters ?? []).map((item) => ({
        id: `shelter-${item.id}`,
        title: "Shelter verification request",
        message: `${item.shelter_name || "A shelter"} submitted an application for review.`,
        status: "warning" as const,
        is_read: false as const,
        created_at: item.created_at,
        campaign_id: null,
        href: "/Admin/shelter-verification",
      })),
      ...(campaigns ?? []).map((item) => ({
        id: `campaign-${item.id}`,
        title: "Campaign approval request",
        message: `${item.title} is waiting for approval.`,
        status: "warning" as const,
        is_read: false as const,
        created_at: item.created_at,
        campaign_id: item.id,
        href: "/Admin/campaign-management",
      })),
      ...(milestones ?? []).map((item) => {
        const campaignRelation = item.campaigns as
          | { title?: string }
          | { title?: string }[]
          | null;
        const campaignTitle = Array.isArray(campaignRelation)
          ? campaignRelation[0]?.title
          : campaignRelation?.title;
        return {
          id: `milestone-${item.id}`,
          title: "Milestone proof submitted",
          message: `${item.title}${campaignTitle ? ` · ${campaignTitle}` : ""} is ready for review.`,
          status: "warning" as const,
          is_read: false as const,
          created_at: item.updated_at,
          campaign_id: item.campaign_id,
          href: "/Admin/milestone-verification",
        };
      }),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 20);

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        notifications: [],
        unreadCount: 0,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load admin notifications.",
      },
      { status: 500 },
    );
  }
}
