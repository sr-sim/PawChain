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
      <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Role badge</p>
        <p className="mt-2 text-sm font-bold text-stone-600">No RoleNFT was found for this wallet.</p>
      </div>
    );
  }

  const nftName =
    typeof roleNFT.metadata?.name === "string"
      ? roleNFT.metadata.name
      : `${role ?? "PawChain"} RoleNFT`;
  const donorLevel = formatDonorLevel(roleNFT.donorLevel);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#FFCD80] bg-[linear-gradient(145deg,#FFFDF7,#FFF8E7)] shadow-[0_12px_30px_rgba(255,138,0,0.10)]">
      <div className="flex items-center justify-between border-b border-orange-100 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-600">PawChain verified {role ?? "member"}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
          <span aria-hidden="true">✓</span> Verified
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[5.25rem_1fr] sm:items-center">
        <div className="grid aspect-square w-[5.25rem] place-items-center overflow-hidden rounded-2xl border border-[#FFCD80] bg-[#FFFCC9] text-center text-xs font-black text-orange-600 shadow-inner">
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
        <div className="min-w-0 space-y-1.5 text-sm font-bold text-stone-700">
          <p className="text-base font-black text-stone-950">{nftName}</p>
          <p>Token ID: <span className="text-stone-950">#{roleNFT.tokenId}</span></p>
          {donorLevel ? <p>Level: {donorLevel}</p> : null}
          <p className="truncate">
            <a
              href={roleNFT.tokenURI}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-orange)] underline decoration-orange-300 underline-offset-4 transition hover:text-stone-950"
            >
              View NFT metadata
            </a>
          </p>
          {typeof roleNFT.metadata?.description === "string" ? (
            <p className="line-clamp-2 text-xs font-bold leading-5 text-stone-500">
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
