-- Use on_chain_index as the permanent zero-based milestone sequence.
-- Existing on-chain indexes are preserved; draft milestones are backfilled
-- deterministically in their original creation order.
with ordered as (
  select
    id,
    row_number() over (
      partition by campaign_id
      order by
        on_chain_index asc nulls last,
        created_at asc,
        id asc
    )::integer - 1 as sequence_index
  from public.campaign_milestones
)
update public.campaign_milestones as milestone
set on_chain_index = ordered.sequence_index
from ordered
where milestone.id = ordered.id
  and milestone.on_chain_index is null;

alter table public.campaign_milestones
  alter column on_chain_index set not null;

alter table public.campaign_milestones
  drop constraint if exists campaign_milestones_on_chain_index_nonnegative;

alter table public.campaign_milestones
  add constraint campaign_milestones_on_chain_index_nonnegative
  check (on_chain_index >= 0);

create unique index if not exists
  campaign_milestones_campaign_on_chain_index_unique
on public.campaign_milestones (campaign_id, on_chain_index);
