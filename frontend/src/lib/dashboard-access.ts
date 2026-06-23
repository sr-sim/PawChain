import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleNFTStatus, type DbRole } from "./role-nft";

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

  if (!roleStatus.hasNFT || roleStatus.dbRole !== expectedRole) {
    return {
      userId: null,
      profile: null,
      accessMode: "wallet" as const,
      roleNFT: roleStatus.roleNFT,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, wallet_address")
    .ilike("wallet_address", walletAddress)
    .eq("role", expectedRole)
    .maybeSingle();

  return {
    userId: profile?.id ?? null,
    profile,
    accessMode: "wallet" as const,
    roleNFT: roleStatus.roleNFT,
  };
}
