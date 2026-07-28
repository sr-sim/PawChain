import Link from "next/link";
import type { RoleNFTDisplay } from "@/lib/role-nft";

type DonorRoleNFTCardProps = {
  accessMode: string;
  roleNFT: RoleNFTDisplay | null;
  userId: string | null;
  variant?: "compact" | "full";
  walletAddress: string;
};

function formatDonorLevel(level: RoleNFTDisplay["donorLevel"]) {
  if (!level) return "Normal";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function shortenWallet(wallet: string) {
  if (!wallet || wallet === "-") return "-";
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function shortenUri(uri: string) {
  const ipfsPrefix = "https://ipfs.io/ipfs/";

  if (uri.startsWith(ipfsPrefix)) {
    const cid = uri.slice(ipfsPrefix.length);
    return `${cid.slice(0, 8)}...${cid.slice(-6)}`;
  }

  return uri.length > 22 ? `${uri.slice(0, 12)}...${uri.slice(-8)}` : uri;
}

export function DonorRoleNFTCard({
  accessMode,
  roleNFT,
  userId,
  variant = "full",
  walletAddress,
}: DonorRoleNFTCardProps) {
  const nftName =
    typeof roleNFT?.metadata?.name === "string"
      ? roleNFT.metadata.name
      : "Donor Badge";
  const donorLevel = formatDonorLevel(roleNFT?.donorLevel ?? "normal");
  const isWalletVerified = accessMode === "wallet" && Boolean(roleNFT);

  if (variant === "compact") {
    return (
      <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-orange-100 bg-orange-50 text-[var(--color-orange)]">
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
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M12 3 4.5 6v5c0 4.7 3.2 8.1 7.5 10 4.3-1.9 7.5-5.3 7.5-10V6L12 3Z" />
                  <path d="m8.5 12 2.3 2.3L16 9" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Donor credential
              </p>
              <h2 className="mt-1 truncate text-base font-black text-stone-950">
                {isWalletVerified ? "RoleNFT verified" : "Wallet not verified"}
              </h2>
              <p className="mt-1 truncate text-sm font-semibold text-stone-500">
                {shortenWallet(walletAddress)}
                {roleNFT ? ` - Token #${roleNFT.tokenId} - ${donorLevel}` : ""}
              </p>
            </div>
          </div>
          <span
            className={[
              "hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex",
              isWalletVerified
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            ].join(" ")}
          >
            {isWalletVerified ? "Active" : "Check wallet"}
          </span>
        </div>

        <Link
          href="/Donor/profile"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:border-[var(--color-orange)] hover:bg-white"
        >
          View donor profile
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-orange-100 bg-orange-50/55 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
            Donor credential
          </p>
          <h2 className="mt-1 text-base font-black text-stone-950">
            Verified donor passport
          </h2>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            isWalletVerified
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700",
          ].join(" ")}
        >
          {isWalletVerified ? "RoleNFT active" : "Needs wallet"}
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[5rem_1fr] sm:items-center">
        <div className="grid aspect-square w-20 place-items-center overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 text-sm font-black text-[var(--color-orange)]">
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
              className="h-8 w-8"
              aria-hidden="true"
            >
              <path d="M12 3 4.5 6v5c0 4.7 3.2 8.1 7.5 10 4.3-1.9 7.5-5.3 7.5-10V6L12 3Z" />
              <path d="m8.5 12 2.3 2.3L16 9" />
            </svg>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-stone-950">{nftName}</h3>
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-[var(--color-orange)]">
              Donor
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
              {donorLevel}
            </span>
          </div>

          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-orange-50/50 px-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Wallet
              </dt>
              <dd className="mt-1 font-semibold text-stone-950">
                {shortenWallet(walletAddress)}
              </dd>
            </div>
            <div className="rounded-xl bg-orange-50/50 px-3 py-2.5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Token
              </dt>
              <dd className="mt-1 font-semibold text-stone-950">
                {roleNFT ? `#${roleNFT.tokenId}` : "-"}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
            {roleNFT ? (
              <a
                href={roleNFT.tokenURI}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-orange)] transition hover:text-stone-950"
              >
                Metadata {shortenUri(roleNFT.tokenURI)}
              </a>
            ) : (
              <span className="text-stone-500">
                Connect the verified donor wallet to load your RoleNFT.
              </span>
            )}
            {roleNFT?.metadataError ? (
              <span className="text-amber-700">Metadata unavailable</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-orange-100 px-4 py-3">
        <p className="truncate text-xs font-semibold text-stone-500">
          User ID: {userId ?? "RoleNFT wallet access"}
        </p>
      </div>
    </div>
  );
}
