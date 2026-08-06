import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin-wallets";
import { getRoleBadgeSummary } from "@/lib/role-nft";
import { createAdminClient } from "@/lib/supabase/admin";
import { walletSessionMatches } from "@/lib/wallet-session";

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
    if (!walletSessionMatches(request, walletAddress)) {
      return NextResponse.json({ message: "Wallet authentication is required." }, { status: 401 });
    }
    if (!(await isAdminWallet(walletAddress))) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [
      { data: shelters, error: shelterError },
      { data: campaigns, error: campaignError },
      { data: milestones, error: milestoneError },
      { data: donors, error: donorError },
      { data: certificates, error: certificateError },
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
      supabase
        .from("profiles")
        .select("id, full_name, email, wallet_address, updated_at")
        .eq("role", "donor")
        .eq("account_status", "active")
        .not("wallet_address", "is", null),
      supabase
        .from("hero_certificates")
        .select("donor_id, delivery_status"),
    ]);

    if (shelterError) throw shelterError;
    if (campaignError) throw campaignError;
    if (milestoneError) throw milestoneError;
    if (donorError) throw donorError;
    if (certificateError) throw certificateError;

    const sentCertificateDonors = new Set(
      (certificates ?? [])
        .filter((certificate) => certificate.delivery_status === "sent")
        .map((certificate) => certificate.donor_id),
    );

    const heroDonors = (
      await Promise.all(
        (donors ?? []).map(async (donor) => {
          if (sentCertificateDonors.has(donor.id)) return null;
          if (!donor.wallet_address) return null;
          const badge = await getRoleBadgeSummary(donor.wallet_address).catch(
            () => null,
          );
          return badge?.donorLevel === "hero" ? donor : null;
        }),
      )
    ).filter((donor): donor is NonNullable<typeof donor> => donor !== null);

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
      ...heroDonors.map((donor) => ({
        id: `hero-certificate-${donor.id}`,
        title: "Hero Donor certificate reminder",
        message: `${donor.full_name || donor.email || "A donor"} is now a Hero Donor. You can send their certificate from Donor Management.`,
        status: "warning" as const,
        is_read: false as const,
        created_at: donor.updated_at,
        campaign_id: null,
        href: "/Admin/user-management",
      })),
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
