import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleNFTStatus, type DbRole } from "./role-nft";

async function getOptionalShelterImageUrl(
  supabase: ReturnType<typeof createAdminClient>,
  profileId?: string,
) {
  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase
    .from("shelter_profiles")
    .select("shelter_image_url")
    .eq("user_id", profileId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return typeof data?.shelter_image_url === "string"
    ? data.shelter_image_url
    : null;
}

export async function getDashboardProfile(
  expectedRole: DbRole,
  walletAddress?: string,
) {
  const supabase = createAdminClient();

  if (!walletAddress) {
    return {
      userId: null,
      profile: null,
      accessMode: "none" as const,
      roleNFT: null,
    };
  }

  const roleStatus = await getRoleNFTStatus(walletAddress);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, wallet_address")
    .ilike("wallet_address", walletAddress)
    .eq("role", expectedRole)
    .maybeSingle();
  const shelterImageUrl =
    expectedRole === "shelter"
      ? await getOptionalShelterImageUrl(supabase, profile?.id)
      : null;

  return {
    userId: profile?.id ?? null,
    profile: profile ? { ...profile, shelter_image_url: shelterImageUrl } : null,
    accessMode:
      roleStatus.hasNFT && roleStatus.dbRole === expectedRole
        ? ("wallet" as const)
        : ("profile" as const),
    roleNFT: roleStatus.roleNFT,
  };
}
