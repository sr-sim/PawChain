import { createAdminClient } from "@/lib/supabase/admin";

type NotificationStatus = "info" | "success" | "warning" | "urgent";

type DonorNotificationInput = {
  donorId: string;
  campaignId?: string | null;
  title: string;
  message: string;
  status?: NotificationStatus;
};

type CampaignNotificationInput = {
  campaignId: string;
  title: string;
  message: string;
  status?: NotificationStatus;
};

export async function createDonorNotification({
  donorId,
  campaignId = null,
  title,
  message,
  status = "info",
}: DonorNotificationInput) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("donor_notifications").insert({
      donor_id: donorId,
      campaign_id: campaignId,
      title,
      message,
      status,
      is_read: false,
    });

    if (error) {
      console.error("Unable to create donor notification:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Unable to create donor notification:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export async function ensureCampaignCompletedNotification({
  donorId,
  campaignId,
  campaignTitle,
}: {
  donorId: string;
  campaignId: string;
  campaignTitle: string;
}) {
  try {
    const supabase = createAdminClient();
    const title = "Campaign completed";
    const { data: existing, error: existingError } = await supabase
      .from("donor_notifications")
      .select("id")
      .eq("donor_id", donorId)
      .eq("campaign_id", campaignId)
      .eq("title", title)
      .limit(1);

    if (existingError) {
      console.error(
        "Unable to check campaign completion notification:",
        existingError.message,
      );
      return false;
    }

    if ((existing ?? []).length > 0) {
      return true;
    }

    return createDonorNotification({
      donorId,
      campaignId,
      title,
      message: `${campaignTitle} is completed. Your donation is now part of a fully completed campaign record.`,
      status: "success",
    });
  } catch (error) {
    console.error(
      "Unable to ensure campaign completion notification:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export async function notifyCampaignDonors({
  campaignId,
  title,
  message,
  status = "info",
}: CampaignNotificationInput) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("donations")
      .select("donor_id")
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "confirmed"]);

    if (error) {
      console.error("Unable to load campaign donors:", error.message);
      return 0;
    }

    const donorIds = [...new Set((data ?? []).map((item) => item.donor_id))];
    if (donorIds.length === 0) {
      return 0;
    }

    const { error: insertError } = await supabase
      .from("donor_notifications")
      .insert(
        donorIds.map((donorId) => ({
          donor_id: donorId,
          campaign_id: campaignId,
          title,
          message,
          status,
          is_read: false,
        })),
      );

    if (insertError) {
      console.error("Unable to notify campaign donors:", insertError.message);
      return 0;
    }

    return donorIds.length;
  } catch (error) {
    console.error(
      "Unable to notify campaign donors:",
      error instanceof Error ? error.message : error,
    );
    return 0;
  }
}
