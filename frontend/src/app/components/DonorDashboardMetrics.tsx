type DonorDashboardMetricsProps = {
  verifiedActions: number;
  smartCampaigns: number;
};

export function DonorDashboardMetrics({
  verifiedActions,
  smartCampaigns,
}: DonorDashboardMetricsProps) {
  return (
    <div className="relative min-w-64 overflow-visible text-xs">
      <img
        src="/images/donor-dashboard-pets-transparent.png"
        alt=""
        aria-hidden="true"
        className="donor-dashboard-pet-float pointer-events-none absolute right-3 top-[-4.75rem] z-0 h-20 w-auto opacity-45"
      />

      <div className="donor-premium-metric relative z-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-orange-100 bg-white/85 p-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-950">
            Verified actions
          </p>
          <p className="mt-1 text-2xl font-black text-stone-950">
            {verifiedActions}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-stone-950">
            confirmed records
          </p>
        </div>

        <div className="border-l border-orange-100 pl-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-950">
            Smart campaigns
          </p>
          <p className="mt-1 text-2xl font-black text-stone-950">
            {smartCampaigns}
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-stone-950">
            contract linked
          </p>
        </div>
      </div>
    </div>
  );
}
