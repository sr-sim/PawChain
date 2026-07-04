import type { ReactNode } from "react";
import Link from "next/link";
import type { Campaign } from "./campaign-types";
import { formatCurrency, getProgress } from "./campaign-utils";
import { StatusBadge } from "./StatusBadge";

type CampaignCardProps = {
  campaign: Campaign;
  href: string;
  actions?: ReactNode;
};

function CampaignIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M5 14V8.5l10-3v13L5 14Zm10-6h2a3 3 0 0 1 0 6h-2M7 14l1.5 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CampaignCardContent({ campaign }: { campaign: Campaign }) {
  const progress = getProgress(campaign.current_amount, campaign.goal_amount);

  return (
    <>
      {campaign.image_url ? (
        <img
          src={campaign.image_url}
          alt=""
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[16/9] place-items-center bg-[linear-gradient(135deg,rgba(var(--color-cream-rgb),0.92),rgba(var(--color-peach-rgb),0.44))] text-[var(--color-orange)]">
          <CampaignIcon />
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={campaign.campaign_status} />
          <span className="rounded-full border border-orange-100 bg-white px-3 py-1 text-xs font-black text-stone-600">
            {campaign.location}
          </span>
        </div>
        <h2 className="mt-3 text-lg font-black text-stone-950">
          {campaign.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-stone-600">
          {campaign.description}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-sm font-black">
            <span className="text-stone-950">
              {formatCurrency(campaign.current_amount)}
            </span>
            <span className="text-stone-500">
              {formatCurrency(campaign.goal_amount)}
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-orange-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-gold),var(--color-orange))]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-black text-stone-500">
            {progress}% funded
          </p>
        </div>
      </div>
    </>
  );
}

export function CampaignCard({ campaign, href, actions }: CampaignCardProps) {
  const cardClassName =
    "group block overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,var(--color-white),rgba(var(--color-cream-rgb),0.58))] shadow-[0_16px_42px_rgba(155,86,20,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-orange)] hover:shadow-[0_24px_58px_rgba(155,86,20,0.16)]";

  if (actions) {
    return (
      <article className={cardClassName}>
        <Link href={href} className="block">
          <CampaignCardContent campaign={campaign} />
        </Link>
        <div className="border-t border-orange-100 px-4 py-3">{actions}</div>
      </article>
    );
  }

  return (
    <Link href={href} className={cardClassName}>
      <CampaignCardContent campaign={campaign} />
    </Link>
  );
}
