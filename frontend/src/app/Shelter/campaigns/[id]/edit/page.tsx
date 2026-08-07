"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  WheelEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import type {
  Campaign,
  CampaignMilestone,
  UrgencyLevel,
} from "@/app/components/campaigns/campaign-types";
import { demoEthMyrRate } from "@/lib/campaign-blockchain";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";
import { formatEther } from "viem";

type CampaignForm = {
  title: string;
  description: string;
  urgencyLevel: UrgencyLevel;
  goalAmount: string;
  durationDays: "30" | "60" | "90";
  imageUrl: string;
};

type MilestoneForm = {
  title: string;
  description: string;
  requirement: string;
  percentage: string;
};

const blankMilestone: MilestoneForm = {
  title: "",
  description: "",
  requirement: "",
  percentage: "",
};

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-600">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </div>
  );
}

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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function preventWheelNumberChange(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

function normalizeEthInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [wholePart = "", ...decimalParts] = cleaned.split(".");

  if (decimalParts.length === 0) {
    return wholePart;
  }

  return `${wholePart || "0"}.${decimalParts.join("").slice(0, 18)}`;
}

function toCampaignForm(campaign: Campaign): CampaignForm {
  const rate = Number(campaign.eth_myr_rate ?? demoEthMyrRate) || demoEthMyrRate;
  const goalEth = campaign.goal_wei
    ? formatEther(BigInt(campaign.goal_wei))
    : String(Number(campaign.goal_amount || 0) / rate);
  return {
    title: campaign.title,
    description: campaign.description,
    urgencyLevel: campaign.urgency_level,
    goalAmount: goalEth,
    durationDays: String(campaign.duration_days) as CampaignForm["durationDays"],
    imageUrl: campaign.image_url ?? "",
  };
}

function toMilestoneForm(milestone: CampaignMilestone): MilestoneForm {
  return {
    title: milestone.title,
    description: milestone.description,
    requirement: milestone.requirement,
    percentage: String(milestone.percentage),
  };
}

function orderMilestones(items: CampaignMilestone[]) {
  return [...items].sort((left, right) => {
    if (left.on_chain_index != null && right.on_chain_index != null) return left.on_chain_index - right.on_chain_index;
    const leftEmergency = left.on_chain_index === 0 || (Number(left.percentage) === 5 && /emergency|initial release/i.test(left.title));
    const rightEmergency = right.on_chain_index === 0 || (Number(right.percentage) === 5 && /emergency|initial release/i.test(right.title));
    if (leftEmergency !== rightEmergency) return leftEmergency ? -1 : 1;
    return String(left.created_at ?? "").localeCompare(String(right.created_at ?? ""));
  });
}

export default function EditCampaignPage() {
  const { rate: liveEthMyrRate } = useEthMyrRate();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [form, setForm] = useState<CampaignForm | null>(null);
  const [milestones, setMilestones] = useState<MilestoneForm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPercentage = useMemo(
    () =>
      milestones.reduce(
        (sum, milestone) => sum + Number(milestone.percentage || 0),
        0,
      ),
    [milestones],
  );

  useEffect(() => {
    async function loadCampaign() {
      if (!address || !params.id) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/shelter/campaigns/${params.id}?walletAddress=${encodeURIComponent(address)}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load campaign.");
        }

        if (!["pending_approval", "rejected"].includes(result.campaign.campaign_status) || result.campaign.contract_address) {
          throw new Error("Only pending or rejected campaigns can be edited before approval.");
        }

        setForm(toCampaignForm(result.campaign));
        setMilestones(orderMilestones(result.milestones ?? []).map(toMilestoneForm));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load campaign.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCampaign();
  }, [address, params.id]);

  function updateMilestone(
    index: number,
    key: keyof MilestoneForm,
    value: string,
  ) {
    setMilestones((current) =>
      current.map((milestone, milestoneIndex) =>
        milestoneIndex === index ? { ...milestone, [key]: value } : milestone,
      ),
    );
  }

  function validateForm() {
    if (!form) {
      setError("Campaign details are still loading.");
      return false;
    }

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      Number(form.goalAmount) <= 0
    ) {
      setError("Complete campaign info and enter a positive ETH goal. Values below 1 ETH are allowed.");
      return false;
    }

    if (milestones.length < 2 || milestones.length > 5) {
      setError("Add at least 2 milestones. Campaigns must have between 2 and 5 milestones.");
      return false;
    }

    const hasEmptyMilestone = milestones.some(
      (milestone) =>
        !milestone.title.trim() ||
        !milestone.description.trim() ||
        !milestone.requirement.trim() ||
        !milestone.percentage ||
        Number(milestone.percentage) <= 0,
    );

    if (hasEmptyMilestone) {
      setError("Complete every milestone field before submitting.");
      return false;
    }

    if (Number(milestones[0]?.percentage) !== 5) {
      setError("Milestone 1 must remain the fixed 5% emergency release.");
      return false;
    }

    if (totalPercentage !== 100) {
      setError("Milestone percentages must total exactly 100%.");
      return false;
    }

    setError("");
    return true;
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !form) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Upload an image file.");
      return;
    }

    try {
      const imageUrl = await fileToDataUrl(file);
      setForm({ ...form, imageUrl });
      setError("");
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Unable to read image file.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!address) {
      open();
      return;
    }

    if (!validateForm() || !form) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/shelter/campaigns/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address,
          title: form.title,
          description: form.description,
          urgencyLevel: form.urgencyLevel,
          goalAmount: Number(form.goalAmount) * liveEthMyrRate,
          goalEth: form.goalAmount,
          ethMyrRate: liveEthMyrRate,
          durationDays: Number(form.durationDays),
          imageUrl: form.imageUrl,
          milestones: milestones.map((milestone) => ({
            ...milestone,
            percentage: Number(milestone.percentage),
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to resubmit campaign.");
      }

      router.replace("/Shelter/campaigns?status=pending_approval");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to resubmit campaign.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/Shelter/campaigns/${params.id}`}
        className="inline-flex rounded-full border border-orange-100 bg-white px-4 py-2 text-sm font-black text-stone-700 shadow-sm shadow-orange-100 transition hover:bg-orange-50"
      >
        Campaign Detail
      </Link>

      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(var(--color-white-rgb),0.98),rgba(var(--color-cream-rgb),0.9)_48%,rgba(var(--color-peach-rgb),0.5))] p-5 shadow-[0_22px_60px_rgba(155,86,20,0.12)] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Edit Campaign
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
          Update campaign details
        </h1>
        <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-stone-700">
          Update campaign information and milestones while it is awaiting admin
          approval. Approved campaigns remain locked.
        </p>
      </section>

      {!isConnected ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          <h2 className="text-xl font-black text-stone-950">
            Connect your shelter wallet
          </h2>
          <button
            type="button"
            onClick={() => open()}
            className="mt-5 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)]"
          >
            Connect Wallet
          </button>
        </section>
      ) : null}

      {isLoading ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center text-sm font-black text-stone-600 shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          Loading campaign...
        </section>
      ) : null}

      {form ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldLabel label="Title">
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                required
              />
            </FieldLabel>

          </div>

          <FieldLabel label="Description">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={5}
              className="w-full resize-none rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
              required
            />
          </FieldLabel>

          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Urgency">
              <select
                value={form.urgencyLevel}
                onChange={(event) =>
                  setForm({
                    ...form,
                    urgencyLevel: event.target.value as UrgencyLevel,
                  })
                }
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-black text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
              >
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </FieldLabel>

            <FieldLabel label="Goal Amount (ETH)">
              <input
                value={form.goalAmount}
                onChange={(event) =>
                  setForm({
                    ...form,
                    goalAmount: normalizeEthInput(event.target.value),
                  })
                }
                inputMode="decimal"
                type="text"
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                required
              />
              <p className="mt-2 text-xs font-bold text-stone-500">≈ live MYR {new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(form.goalAmount || 0) * liveEthMyrRate)}</p>
            </FieldLabel>

            <FieldLabel label="Duration">
              <select
                value={form.durationDays}
                onChange={(event) =>
                  setForm({
                    ...form,
                    durationDays: event.target.value as CampaignForm["durationDays"],
                  })
                }
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-black text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </FieldLabel>
          </div>

          <FieldLabel label="Image Upload">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
            />
          </FieldLabel>

          {form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt=""
              className="aspect-[16/9] w-full rounded-2xl border border-orange-100 object-cover"
            />
          ) : null}

          <div className="border-t border-orange-100 pt-5">
            <div className="rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,#FFFDF8,#FFFCC9)] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Fund release plan</p>
                <h2 className="mt-1 text-2xl font-black text-stone-950">Set Milestones</h2>
                <p className="text-sm font-bold text-stone-600">
                  Add between 2 and 5 milestones. They unlock one by one, and Milestone 1 always receives 5% of the campaign goal.
                </p>
              </div>
              <span
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-black",
                  totalPercentage === 100
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                Allocation used: {totalPercentage}%
              </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-orange-100"><div className={`h-full rounded-full transition-all ${totalPercentage === 100 ? "bg-emerald-500" : "bg-[var(--color-orange)]"}`} style={{ width: `${Math.min(100, totalPercentage)}%` }} /></div>
              <div className="mt-3 flex flex-col gap-1 text-[11px] font-black text-stone-500 sm:flex-row sm:justify-between"><span>Emergency milestone: 5% of goal</span><span>Remaining milestones: {Math.max(0, totalPercentage - 5)}% of 95%</span></div>
              <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-stone-600">The milestone percentages must add up to 100% because together they divide the campaign's full funding goal.</p>
            </div>

            <div className="mt-5 space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`relative overflow-hidden rounded-2xl border p-5 transition focus-within:border-[var(--color-orange)] focus-within:shadow-[0_12px_30px_rgba(255,138,0,0.12)] ${index === 0 ? "border-[#FFCD80] bg-[linear-gradient(135deg,#FFFCC9,#FFFFFF)]" : "border-orange-100 bg-white shadow-[0_8px_24px_rgba(111,69,20,0.05)]"}`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${index === 0 ? "bg-[var(--color-orange)]" : "bg-[#F4B738]"}`} />
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-50 text-sm font-black text-[var(--color-orange)] ring-1 ring-orange-200">{index + 1}</span>
                    <div className="min-w-0 flex-1"><h3 className="text-sm font-black text-stone-950">{milestone.title || (index === 0 ? "Name your emergency milestone" : `Milestone ${index + 1}`)}</h3><p className="mt-1 text-xs font-semibold text-stone-500">{index === 0 ? "The title is editable; only the 5% allocation and first position are fixed." : "Released after proof approval and funding threshold"}</p></div>
                    {index === 0 ? <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">Locked 5%</span> : <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-[var(--color-orange)]">{milestone.percentage || 0}%</span>}
                    <button
                      type="button"
                      onClick={() =>
                        setMilestones((current) =>
                          current.filter(
                            (_, milestoneIndex) => milestoneIndex !== index,
                          ),
                        )
                      }
                      disabled={index === 0 || milestones.length <= 2}
                      className="rounded-full border border-red-100 bg-white px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {index === 0 ? "Fixed" : "Remove"}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldLabel label="Title">
                      <input
                        value={milestone.title}
                        onChange={(event) =>
                          updateMilestone(index, "title", event.target.value)
                        }
                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                        placeholder={index === 0 ? "e.g. Emergency Veterinary Deposit" : `Enter title for Milestone ${index + 1}`}
                        required
                      />
                    </FieldLabel>

                    <FieldLabel label="Percentage">
                      <input
                        value={milestone.percentage}
                        onChange={(event) =>
                          updateMilestone(
                            index,
                            "percentage",
                            event.target.value,
                          )
                        }
                        min="5"
                        max="100"
                        step="5"
                        type="number"
                        readOnly={index === 0}
                        onWheel={preventWheelNumberChange}
                        className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                        required
                      />
                    </FieldLabel>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FieldLabel label="Description">
                      <textarea
                        value={milestone.description}
                        onChange={(event) =>
                          updateMilestone(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                        required
                      />
                    </FieldLabel>

                    <FieldLabel label="Requirement">
                      <textarea
                        value={milestone.requirement}
                        onChange={(event) =>
                          updateMilestone(
                            index,
                            "requirement",
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                        required
                      />
                    </FieldLabel>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setMilestones((current) => [...current, blankMilestone])
              }
              disabled={milestones.length >= 5}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-black text-[var(--color-orange)] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon />
              Add Milestone
            </button>
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/Shelter/campaigns/${params.id}`}
              className="rounded-full border border-orange-100 bg-white px-5 py-3 text-center text-sm font-black text-stone-700 transition hover:bg-orange-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Campaign for Approval"}
            </button>
          </div>
        </form>
      ) : null}

      {!isLoading && !form && error ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
