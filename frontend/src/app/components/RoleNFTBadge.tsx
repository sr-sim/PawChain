import type { ContractRole, RoleNFTDisplay } from "@/lib/role-nft";

type RoleNFTBadgeProps = {
  role: ContractRole | null;
  roleNFT: RoleNFTDisplay | null;
};

function formatDonorLevel(level: RoleNFTDisplay["donorLevel"]) {
  if (!level) return null;
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function RoleNFTBadge({ role, roleNFT }: RoleNFTBadgeProps) {
  if (!roleNFT) {
    return (
      <div className="mt-5 border-t border-orange-100 pt-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
          RoleNFT badge
        </p>
        <p className="mt-2 text-sm font-bold text-stone-500">
          No RoleNFT found for this wallet.
        </p>
      </div>
    );
  }

  const nftName =
    typeof roleNFT.metadata?.name === "string"
      ? roleNFT.metadata.name
      : `${role ?? "PawChain"} RoleNFT`;
  const donorLevel = formatDonorLevel(roleNFT.donorLevel);

  return (
    <div className="mt-5 border-t border-orange-100 pt-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
        RoleNFT badge
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-[8rem_1fr] sm:items-center">
        <div className="grid aspect-square w-32 place-items-center overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 text-center text-xs font-black text-orange-500 shadow-inner">
          {roleNFT.imageUrl ? (
            <img
              src={roleNFT.imageUrl}
              alt={nftName}
              className="h-full w-full object-cover"
            />
          ) : (
            "NFT"
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-lg font-black text-stone-950">{nftName}</p>
          <p>Role: {role ?? "-"}</p>
          {donorLevel ? <p>Donor level: {donorLevel}</p> : null}
          <p>Token ID: {roleNFT.tokenId}</p>
          <p className="break-all">
            Token URI:{" "}
            <a
              href={roleNFT.tokenURI}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-orange)] underline decoration-orange-300 underline-offset-4 transition hover:text-stone-950"
            >
              {roleNFT.tokenURI}
            </a>
          </p>
          {typeof roleNFT.metadata?.description === "string" ? (
            <p className="text-sm font-bold leading-6 text-stone-600">
              {roleNFT.metadata.description}
            </p>
          ) : null}
          {roleNFT.metadataError && (
            <p className="text-xs font-black text-amber-700">
              NFT metadata unavailable: {roleNFT.metadataError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
