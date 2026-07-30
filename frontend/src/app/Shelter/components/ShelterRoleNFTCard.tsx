import Link from "next/link";
import type { RoleNFTDisplay } from "@/lib/role-nft";
import { shortAddress } from "@/lib/shelter-portal";

type ShelterRoleNFTCardProps = {
  roleNFT: RoleNFTDisplay | null;
  walletAddress: string | null;
};

export function ShelterRoleNFTCard({
  roleNFT,
  walletAddress,
}: ShelterRoleNFTCardProps) {
  const nftName =
    typeof roleNFT?.metadata?.name === "string"
      ? roleNFT.metadata.name
      : "Shelter RoleNFT";
  const walletExplorerUrl = walletAddress
    ? `https://sepolia.etherscan.io/address/${walletAddress}`
    : "";

  return (
    <div className="overflow-hidden rounded-3xl border border-orange-100 bg-[linear-gradient(135deg,#ffffff,#fff7ec_120%)] shadow-[0_18px_45px_rgba(111,69,20,0.08)]">
      <div className="grid gap-4 p-5 sm:grid-cols-[7rem_1fr] sm:items-center">
        <div className="mx-auto grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-3xl border border-orange-100 bg-white p-2 shadow-[0_16px_34px_rgba(120,72,18,0.12)] sm:mx-0">
          <div className="grid h-full w-full place-items-center overflow-hidden rounded-2xl bg-orange-50 text-[var(--color-orange)]">
            {roleNFT?.imageUrl ? (
              <img
                src={roleNFT.imageUrl}
                alt={nftName}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10"
                aria-hidden="true"
              >
                <path d="M12 3 4.5 6v5c0 4.7 3.2 8.1 7.5 10 4.3-1.9 7.5-5.3 7.5-10V6L12 3Z" />
                <path d="m8.5 12 2.3 2.3L16 9" />
              </svg>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Shelter credential
              </p>
              <h2 className="mt-1 truncate text-xl font-black text-stone-950">
                {roleNFT ? "RoleNFT verified" : "RoleNFT not found"}
              </h2>
              <p className="mt-1 truncate text-sm font-bold text-stone-500">
                {roleNFT ? nftName : "Connect your verified shelter wallet"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                roleNFT
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {roleNFT ? "Active" : "Check wallet"}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-orange-100 bg-white/85 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                Shelter wallet
              </p>
              <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">
                Sepolia
              </span>
            </div>
            <p
              className="mt-2 font-mono text-sm font-black text-stone-950"
              title={walletAddress ?? undefined}
            >
              {shortAddress(walletAddress)}
            </p>
            {walletExplorerUrl ? (
              <a
                href={walletExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs font-black text-[var(--color-orange)] transition hover:text-stone-950 hover:underline"
              >
                View on Sepolia Etherscan ↗
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-orange-100 bg-white/70 p-4">
        <Link
          href="/Shelter/profile"
          className="inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-black text-stone-950 transition hover:-translate-y-0.5 hover:border-[var(--color-orange)] hover:bg-orange-50"
        >
          View shelter profile
        </Link>
      </div>
    </div>
  );
}
