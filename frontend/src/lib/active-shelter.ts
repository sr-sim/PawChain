import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleNFTStatus } from "@/lib/role-nft";

export class ShelterAccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
  }
}

export async function requireActiveShelter(walletAddress: string) {
  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, account_status, deactivation_reason")
    .ilike("wallet_address", walletAddress)
    .maybeSingle();

  if (error) throw error;
  if (!profile || profile.role !== "shelter") {
    throw new ShelterAccessError("No shelter account found for this wallet.", 404);
  }
  if (profile.account_status === "deactivated") {
    throw new ShelterAccessError(
      profile.deactivation_reason
        ? `This shelter account is deactivated: ${profile.deactivation_reason}`
        : "This shelter account is deactivated.",
    );
  }

  const { data: application } = await supabase
    .from("shelter_applications")
    .select("status")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (application?.status !== "approved") {
    throw new ShelterAccessError("Shelter approval is required.");
  }

  const roleStatus = await getRoleNFTStatus(walletAddress);
  if (!roleStatus.hasNFT || roleStatus.dbRole !== "shelter") {
    throw new ShelterAccessError("An active Shelter RoleNFT is required.");
  }

  return profile;
}
