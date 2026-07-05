'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { CampaignCard } from '@/app/components/campaigns/CampaignCard';
import type {
  Campaign,
  CampaignStatus,
} from '@/app/components/campaigns/campaign-types';
import { formatCurrency } from '@/app/components/campaigns/campaign-utils';

type FilterKey =
  | 'all'
  | 'pending_approval'
  | 'active'
  | 'rejected'
  | 'completed'
  | 'closed';

const filters: { label: string; value: FilterKey }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending_approval' },
  { label: 'Active', value: 'active' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Completed', value: 'completed' },
  { label: 'Expired', value: 'closed' },
];

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 5v14m-7-7h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

export default function CampaignHubPage() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCampaigns() {
      if (!address) {
        setCampaigns([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/shelter/campaigns?walletAddress=${encodeURIComponent(address)}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? 'Unable to load campaigns.');
        }

        setCampaigns(result.campaigns ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load campaigns.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCampaigns();
  }, [address]);

  const filteredCampaigns = useMemo(() => {
    if (activeFilter === 'all') {
      return campaigns;
    }

    return campaigns.filter(
      (campaign) => campaign.campaign_status === activeFilter,
    );
  }, [activeFilter, campaigns]);

  const counts = useMemo(() => {
    return campaigns.reduce(
      (summary, campaign) => {
        summary[campaign.campaign_status] =
          (summary[campaign.campaign_status] ?? 0) + 1;
        summary.all += 1;
        return summary;
      },
      {
        all: 0,
        pending_approval: 0,
        active: 0,
        rejected: 0,
        completed: 0,
        closed: 0,
      } as Record<CampaignStatus | 'all', number>,
    );
  }, [campaigns]);

  const totalGoal = useMemo(
    () =>
      campaigns.reduce(
        (sum, campaign) => sum + Number(campaign.goal_amount || 0),
        0,
      ),
    [campaigns],
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(var(--color-white-rgb),0.98),rgba(var(--color-cream-rgb),0.9)_48%,rgba(var(--color-peach-rgb),0.5))] p-5 shadow-[0_22px_60px_rgba(155,86,20,0.12)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Campaign Hub
            </p>
            <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
              Shelter campaigns
            </h1>
            <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-stone-700">
              Review every campaign your shelter has created and open each one
              to track its milestones.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-80">
            <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-lg shadow-orange-200/30">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                Campaigns
              </p>
              <p className="mt-2 text-3xl font-black text-stone-950">
                {campaigns.length}
              </p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-lg shadow-orange-200/30">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                Total Goal
              </p>
              <p className="mt-2 text-2xl font-black text-stone-950">
                {formatCurrency(totalGoal)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!isConnected ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[var(--color-orange)] ring-1 ring-orange-100">
            <CampaignIcon />
          </span>
          <h2 className="mt-4 text-xl font-black text-stone-950">
            Connect your shelter wallet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-stone-600">
            Campaigns are linked to the wallet used for your shelter profile.
          </p>
          <button
            type="button"
            onClick={() => open()}
            className="mt-5 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)]"
          >
            Connect Wallet
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={[
                  'rounded-full border px-4 py-2 text-sm font-black transition',
                  activeFilter === filter.value
                    ? 'border-[var(--color-orange)] bg-[var(--color-orange)] text-white shadow-lg shadow-orange-200/70'
                    : 'border-orange-100 bg-orange-50/60 text-stone-700 hover:bg-orange-100',
                ].join(' ')}
              >
                {filter.label} ({counts[filter.value]})
              </button>
            ))}
          </div>
          <Link
            href="/Shelter/campaigns/create"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)]"
          >
            <PlusIcon />
            Create Campaign
          </Link>
        </div>

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center text-sm font-black text-stone-600">
            Loading campaigns...
          </div>
        ) : null}

        {!isLoading && filteredCampaigns.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-orange-200 bg-[linear-gradient(135deg,rgba(var(--color-cream-rgb),0.72),rgba(var(--color-peach-rgb),0.22))] p-6 text-center shadow-inner shadow-orange-100/70">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-[var(--color-orange)] shadow-lg shadow-orange-200/50 ring-1 ring-orange-100">
              <CampaignIcon />
            </span>
            <p className="text-sm font-black text-stone-950">
              No campaigns found
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-stone-600">
              Create a campaign or switch filters to review another status.
            </p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              href={`/Shelter/campaigns/${campaign.id}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
