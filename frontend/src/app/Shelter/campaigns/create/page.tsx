"use client";

import {
  ChangeEvent,
  ReactNode,
  WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import type { UrgencyLevel } from "@/app/components/campaigns/campaign-types";
import { useEthMyrRate } from "@/lib/use-eth-myr-rate";

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

type SelectOption = {
  label: string;
  value: string;
};

const initialCampaignForm: CampaignForm = {
  title: "",
  description: "",
  urgencyLevel: "medium",
  goalAmount: "",
  durationDays: "30",
  imageUrl: "",
};

const initialMilestones: MilestoneForm[] = [
  {
    title: "",
    description: "",
    requirement: "",
    percentage: "5",
  },
  { title: "", description: "", requirement: "", percentage: "95" },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="text-sm font-black uppercase tracking-[0.12em] text-stone-700">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ThemedDropdown({
  value,
  onChange,
  placeholder,
  options,
  leadingIcon,
}: {
  value: string;
  placeholder: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  leadingIcon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex w-full items-center justify-between gap-3 rounded-2xl border bg-orange-50/40 px-4 py-3 text-left text-base font-black leading-6 text-stone-950 outline-none transition",
          open
            ? "border-[var(--color-orange)] bg-white ring-4 ring-orange-100"
            : "border-orange-100 hover:bg-orange-50",
        ].join(" ")}
      >
        <span className="flex items-center gap-3">{leadingIcon}{selectedLabel || placeholder}</span>
        <span
          className={[
            "grid h-5 w-5 shrink-0 place-items-center transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          ].join(" ")}
          aria-hidden="true"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            <path
              d="m5 7.5 5 5 5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_18px_48px_rgba(155,86,20,0.16)]">
          <div className="max-h-72 overflow-y-auto py-2" role="listbox">
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center px-4 py-2.5 text-left text-sm font-black transition",
                    selected
                      ? "bg-[var(--color-orange)] text-white"
                      : "text-stone-800 hover:bg-orange-50 hover:text-stone-950",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const urgencyOptions: SelectOption[] = [
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

const durationOptions: SelectOption[] = [
  { label: "30 days", value: "30" },
  { label: "60 days", value: "60" },
  { label: "90 days", value: "90" },
];

function formatMYR(value: number | string) {
  return `Approx. live MYR: MYR ${new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))}`;
}

function formatETH(value: number | string) {
  const amount = Number(value || 0);
  return `${Number.isFinite(amount) ? amount.toLocaleString("en-MY", { maximumFractionDigits: 8 }) : "0"} ETH`;
}

function normalizeEthInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [wholePart = "", ...decimalParts] = cleaned.split(".");

  if (decimalParts.length === 0) {
    return wholePart;
  }

  return `${wholePart || "0"}.${decimalParts.join("").slice(0, 18)}`;
}

function proofRequirementItems(value: string) {
  const explicitlySeparated = value
    .split(/\r?\n|[,;•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (explicitlySeparated.length > 1) return explicitlySeparated;

  return value
    .split(/\s+(?=[A-Z][A-Za-z-]*(?:\s|$))/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function MilestoneEditorRow({
  milestone,
  index,
  cumulative,
  goalAmount,
  ethMyrRate,
  canRemove,
  onUpdate,
  onRemove,
}: {
  milestone: MilestoneForm;
  index: number;
  cumulative: number;
  goalAmount: string;
  ethMyrRate: number;
  canRemove: boolean;
  onUpdate: (key: keyof MilestoneForm, value: string) => void;
  onRemove: () => void;
}) {
  const allocation = Number(goalAmount || 0) * Number(milestone.percentage || 0) / 100;

  return (
    <article className={`relative rounded-2xl border p-5 pl-16 ${index === 0 ? "border-[#FFCD80] bg-[linear-gradient(135deg,#FFFCC9,#FFFFFF)]" : "border-orange-200 bg-white"}`}>
      <span className="absolute left-3 top-5 grid h-10 w-10 place-items-center rounded-full border border-orange-300 bg-orange-50 text-base font-black text-[var(--color-orange)]">{index + 1}</span>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.55fr_0.6fr_0.8fr_1fr_auto] xl:items-start">
        <div className="space-y-2"><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Milestone title</label><input value={milestone.title} onChange={(event) => onUpdate("title", event.target.value)} placeholder={index === 0 ? "Name the emergency milestone" : `Milestone ${index + 1} title`} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm font-black outline-none focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100" required /><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Description</label><textarea value={milestone.description} onChange={(event) => onUpdate("description", event.target.value)} placeholder="Describe what this milestone will achieve" rows={2} className="w-full resize-none rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold leading-5 outline-none focus:border-[var(--color-orange)]" required />{index === 0 ? <p className="rounded-lg bg-orange-50 px-2 py-1.5 text-[10px] font-bold text-orange-700">Usage proof is uploaded after this fund is withdrawn.</p> : null}</div>
        <div><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Percentage</label><div className="relative mt-2"><input value={milestone.percentage} onChange={(event) => onUpdate("percentage", event.target.value)} min="5" max="100" step="5" type="number" onWheel={preventWheelNumberChange} readOnly={index === 0} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 pr-7 text-sm font-black outline-none focus:border-[var(--color-orange)]" required /><span className="absolute right-3 top-2 text-xs font-black text-stone-400">%</span></div>{index === 0 ? <span className="mt-2 inline-flex rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">Fixed</span> : null}</div>
        <div><p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Cumulative</p><p className="mt-3 text-sm font-black text-stone-950">{cumulative}%</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Est. allocation</p><p className="mt-3 text-sm font-black text-stone-950">{formatETH(allocation)}</p><p className="mt-1 text-[10px] font-bold text-stone-400">{formatMYR(allocation * ethMyrRate)}</p></div>
        <div><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Proof requirements</label><textarea value={milestone.requirement} onChange={(event) => onUpdate("requirement", event.target.value)} placeholder={"Add one proof item per line\ne.g. Veterinary invoice\nMedication receipt"} rows={4} className="mt-2 w-full resize-none rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold leading-5 outline-none focus:border-[var(--color-orange)]" required /><p className="mt-1 text-[10px] font-semibold text-stone-400">Use a new line, comma, or semicolon between items.</p></div>
        <div>{index === 0 ? <span className="inline-flex rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">Locked 5%</span> : <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove milestone ${index + 1}`} className="rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-40">Delete</button>}</div>
      </div>
    </article>
  );
}

export default function CreateCampaignPage() {
  const { rate: ethMyrRate } = useEthMyrRate();
  const demoEthMyrRate = ethMyrRate;
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<CampaignForm>(initialCampaignForm);
  const [milestones, setMilestones] = useState<MilestoneForm[]>(initialMilestones);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");

  useEffect(() => {
    if (!address || !isConnected) return;
    void fetch(`/api/shelter/application-status?walletAddress=${encodeURIComponent(address)}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.accountStatus === "deactivated") {
          setDeactivationReason(result.deactivationReason || "This shelter account is deactivated.");
        }
      })
      .catch(() => undefined);
  }, [address, isConnected]);

  const totalPercentage = useMemo(
    () =>
      milestones.reduce(
        (sum, milestone) => sum + Number(milestone.percentage || 0),
        0,
      ),
    [milestones],
  );

  function validateStepOne() {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.goalAmount ||
      Number(form.goalAmount) <= 0 ||
      !form.imageUrl
    ) {
      setError("Complete every required campaign field, upload a campaign image, and enter a positive ETH goal. Values below 1 ETH are allowed.");
      return false;
    }

    setError("");
    return true;
  }

  function validateMilestones() {
    if (milestones.length < 2 || milestones.length > 5) {
      setError("Add between 2 and 5 milestones.");
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

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Upload an image file.");
      return;
    }

    try {
      const imageUrl = await fileToDataUrl(file);
      setForm((current) => ({ ...current, imageUrl }));
      setError("");
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Unable to read image file.",
      );
    }
  }

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

  async function submitCampaign() {
    if (step !== 3) return;
    if (deactivationReason) {
      setError(`Campaign creation is disabled: ${deactivationReason}`);
      return;
    }

    if (!address) {
      open();
      return;
    }

    if (!validateStepOne() || !validateMilestones()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/shelter/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address,
          title: form.title,
          description: form.description,
          urgencyLevel: form.urgencyLevel,
          goalAmount: Number(form.goalAmount) * ethMyrRate,
          goalEth: form.goalAmount,
          ethMyrRate,
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
        throw new Error(result.message ?? "Unable to submit campaign.");
      }

      router.push("/Shelter/campaigns");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit campaign.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {deactivationReason ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-stone-700">
          <span className="font-black text-[var(--color-orange)]">Account deactivated:</span>{" "}
          {deactivationReason} Campaign creation is disabled.
        </div>
      ) : null}
      {!isConnected ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          <h2 className="text-xl font-black text-stone-950">
            Connect your shelter wallet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-stone-600">
            The campaign will be tied to your shelter profile.
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

      <form
        onSubmit={(event) => event.preventDefault()}
        className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6"
      >
        <div className="mb-7 grid overflow-hidden border-b-2 border-orange-100 sm:grid-cols-3">
          {[
            { label: "Campaign Info", detail: "Tell us about your campaign", value: 1 },
            { label: "Set Milestones", detail: "Define goals and milestones", value: 2 },
            { label: "Review & Submit", detail: "Confirm and launch", value: 3 },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                if (item.value === 1) setStep(1);
                if (item.value === 2 && validateStepOne()) setStep(2);
                if (item.value === 3 && validateStepOne() && validateMilestones()) setStep(3);
              }}
              className={[
                "relative flex items-center justify-center gap-3 px-4 py-4 text-left transition after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full",
                step === item.value
                  ? "bg-orange-50/40 text-[var(--color-orange)] after:bg-[var(--color-orange)]"
                  : step > item.value ? "bg-emerald-50/30 text-emerald-700 after:bg-emerald-400" : "bg-white text-stone-600 after:bg-transparent hover:bg-orange-50",
              ].join(" ")}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${step === item.value ? "bg-[var(--color-orange)] text-white shadow-lg shadow-orange-200" : step > item.value ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-700"}`}>{step > item.value ? "✓" : item.value}</span>
              <span><span className="block text-sm font-black">{item.label}</span><span className="mt-0.5 block text-[11px] font-semibold text-stone-500">{item.detail}</span></span>
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-6 rounded-2xl border border-orange-200 bg-[linear-gradient(135deg,#FFFFFF,#FFFDF7)] p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b-2 border-orange-200 pb-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-[var(--color-orange)] ring-1 ring-orange-100" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none"><path d="M7 3h8l3 3v15H7V3Zm8 0v4h4M10 11h5M10 15h5M10 19h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div><h2 className="text-2xl font-black text-stone-950">Campaign Information</h2><p className="text-sm font-semibold text-stone-600">Fields marked with <span className="text-[var(--color-orange)]">*</span> are required</p></div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.65fr)_minmax(14rem,0.55fr)]">
              <FieldLabel label="Campaign Title *">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-3.5 grid h-6 w-6 place-items-center rounded-lg bg-orange-50" aria-hidden="true"><img src="/images/logo.png" alt="" className="h-5 w-5 object-contain" /></span>
                  <input
                    value={form.title}
                    maxLength={80}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="e.g. Emergency care for street dogs"
                    className="w-full rounded-xl border border-orange-200 bg-white py-3.5 pl-12 pr-14 text-base font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                    required
                  />
                  <span className="absolute right-3 top-4 text-xs font-bold text-stone-500">{form.title.length}/80</span>
                </div>
              </FieldLabel>

              <FieldLabel label="Urgency Level *">
                <ThemedDropdown
                  value={form.urgencyLevel}
                  placeholder="Select urgency"
                  options={urgencyOptions}
                  leadingIcon={<span className="h-2.5 w-2.5 rounded-full bg-[var(--color-orange)]" aria-hidden="true" />}
                  onChange={(urgencyLevel) => setForm((current) => ({ ...current, urgencyLevel: urgencyLevel as UrgencyLevel }))}
                />
              </FieldLabel>

              <aside className="space-y-3 lg:row-span-2">
                <div className="relative min-h-36 overflow-hidden rounded-xl border border-orange-200 bg-[linear-gradient(135deg,#FFFDF8,#FFF4E5)] p-4 pr-24">
                  <p className="flex items-center gap-2 text-sm font-black text-stone-950"><span className="grid h-5 w-5 place-items-center rounded-full bg-violet-700 text-xs text-white">i</span> What&apos;s urgency level?</p>
                  <p className="mt-3 text-xs font-semibold leading-5 text-stone-600">It helps donors understand how time-sensitive your campaign is.</p>
                  <img src="/images/donor-dashboard-pets-transparent.png" alt="" className="absolute -bottom-2 -right-2 h-24 w-24 object-contain" aria-hidden="true" />
                </div>
              </aside>

              <div className="lg:col-span-2">
                <FieldLabel label="Campaign Description *">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-3.5 grid h-6 w-6 place-items-center rounded-lg bg-violet-50" aria-hidden="true"><img src="/images/logo.png" alt="" className="h-5 w-5 object-contain" /></span>
                    <textarea
                      value={form.description}
                      maxLength={1000}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      rows={5}
                      placeholder="Explain the situation, who needs help, and how the funds will be used."
                      className="w-full resize-none rounded-xl border border-orange-200 bg-white py-3 pb-8 pl-12 pr-4 text-base font-bold leading-7 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                      required
                    />
                    <span className="absolute bottom-3 right-3 text-xs font-bold text-stone-500">{form.description.length}/1000</span>
                  </div>
                </FieldLabel>
              </div>

              <div className="lg:col-start-1">
              <FieldLabel label="Goal Amount (ETH) *">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-3.5 grid h-6 w-6 place-items-center rounded-lg bg-violet-50" aria-hidden="true"><img src="/images/ethereum-logo.svg" alt="" className="h-4 w-4 object-contain" /></span>
                  <input
                    value={form.goalAmount}
                    onChange={(event) => setForm((current) => ({ ...current, goalAmount: normalizeEthInput(event.target.value) }))}
                    inputMode="decimal"
                    type="text"
                    placeholder="e.g. 0.5"
                    className="w-full rounded-xl border border-orange-200 bg-white py-3.5 pl-12 pr-14 text-base font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-sm font-black text-stone-600">ETH</span>
                </div>
                <p className="mt-2 text-xs font-bold text-stone-600">{formatMYR(Number(form.goalAmount || 0) * ethMyrRate)} · 1 ETH ≈ MYR {ethMyrRate.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </FieldLabel>
              </div>

              <div>
              <FieldLabel label="Campaign Duration *">
                <ThemedDropdown
                  value={form.durationDays}
                  placeholder="Select duration"
                  options={durationOptions}
                  leadingIcon={<span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-50 text-violet-700" aria-hidden="true"><svg viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="M4 6h12v10H4V6Zm0 3h12M7 3v4m6-4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
                  onChange={(durationDays) => setForm((current) => ({ ...current, durationDays: durationDays as CampaignForm["durationDays"] }))}
                />
              </FieldLabel>
              </div>
            </div>

            <div className="border-t-2 border-orange-200 pt-5">
              <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_1fr]">
                <div className="flex h-full flex-col">
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-stone-700">Campaign Image <span className="text-[var(--color-orange)]">*</span></p>
                  <div className="mt-2 flex min-h-60 flex-1 flex-col justify-between rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/20 p-4 text-center">
                    <div className="grid min-h-36 place-items-center overflow-hidden rounded-xl bg-white">
                      {form.imageUrl ? <img src={form.imageUrl} alt="Campaign preview" className="max-h-44 w-full object-contain" /> : <div><svg viewBox="0 0 24 24" className="mx-auto h-9 w-9 text-stone-600" fill="none"><path d="M7 17H5a4 4 0 0 1-.4-8A6 6 0 0 1 16.2 7 5 5 0 0 1 17 17h-2M12 12v8m0-8-3 3m3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><p className="mt-2 text-base font-black text-stone-800">Upload campaign image</p><p className="mt-1 text-xs font-semibold text-stone-500">JPG or PNG · Landscape recommended</p></div>}
                    </div>
                    <input required type="file" accept="image/*" onChange={handleImageChange} className="mt-3 w-full text-sm font-semibold file:mr-3 file:rounded-lg file:border file:border-orange-300 file:bg-white file:px-3 file:py-2 file:font-black file:text-stone-800" />
                  </div>
                </div>
                <div className="flex h-full flex-col">
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-stone-700">Image Tips</p>
                <div className="mt-2 min-h-60 flex-1 rounded-2xl border-2 border-orange-200 bg-[linear-gradient(135deg,#FFFDF7,#FFF7EA)] p-5">
                  <ul className="space-y-4 text-sm font-semibold leading-6 text-stone-700">
                    {["Use a clear, high-quality image.", "Images showing the animals usually receive more support.", "Recommended landscape size: 1200 × 800px."].map((tip) => <li key={tip} className="flex gap-2"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--color-orange)] text-[9px] font-black text-white">✓</span>{tip}</li>)}
                  </ul>
                  <div className="mt-5 flex justify-end" aria-hidden="true"><img src="/images/logo.png" alt="" className="h-20 w-20 object-contain opacity-10" /></div>
                </div>
                </div>
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,#FFFDF8,#FFFCC9)] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Step 2 of 3</p>
                <h2 className="mt-1 text-2xl font-black text-stone-950">Milestone Guide</h2>
                <p className="text-sm font-bold text-stone-600">
                  Milestones unlock one by one. Milestone 2 cannot start until Milestone 1 is completed. Milestone 1 always receives 5% of the campaign goal.
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
              <div className="mt-5 grid gap-3 border-y border-orange-100 py-4 sm:grid-cols-3"><div className="sm:border-r sm:border-orange-100"><p className="text-xs font-black text-stone-950">Milestone 1</p><p className="mt-1 text-xs font-semibold text-stone-500">First position and 5% allocation are fixed.</p></div><div className="sm:border-r sm:border-orange-100 sm:px-4"><p className="text-xs font-black text-stone-950">Milestones 2-{milestones.length}</p><p className="mt-1 text-xs font-semibold text-stone-500">Together they must equal exactly 95%.</p></div><div className="sm:pl-4"><p className="text-xs font-black text-stone-950">All milestones</p><p className="mt-1 text-xs font-semibold text-stone-500">Together they must equal exactly 100%.</p></div></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-orange-100"><div className={`h-full rounded-full transition-all ${totalPercentage === 100 ? "bg-emerald-500" : "bg-[var(--color-orange)]"}`} style={{ width: `${Math.min(100, totalPercentage)}%` }} /></div>
              <div className="mt-3 flex flex-col gap-1 text-[11px] font-black text-stone-500 sm:flex-row sm:justify-between"><span>Emergency milestone: 5% of goal</span><span>Remaining milestones: {Math.max(0, totalPercentage - 5)}% of 95%</span></div>
              <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-stone-600">The milestone percentages must add up to 100% because together they divide the campaign's full funding goal.</p>
            </div>

            <section className="rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_10px_28px_rgba(111,69,20,0.05)] sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-xl font-black text-stone-950">Milestones</h3><p className="text-xs font-semibold text-stone-500">Between 2 and 5 milestones are allowed.</p></div><div className="text-right"><p className="text-xs font-black text-stone-500">Total Percentage <span className={totalPercentage === 100 ? "text-emerald-600" : "text-[var(--color-orange)]"}>{totalPercentage}%</span></p><p className="mt-1 text-[10px] font-bold text-stone-400">Milestones 2-{milestones.length} must total 95%</p></div></div>
              <div className="relative space-y-3 before:absolute before:bottom-8 before:left-[1.75rem] before:top-8 before:w-px before:bg-orange-200">
                {milestones.map((milestone, index) => (
                  <MilestoneEditorRow
                    key={index}
                    milestone={milestone}
                    index={index}
                    cumulative={milestones.slice(0, index + 1).reduce((sum, item) => sum + Number(item.percentage || 0), 0)}
                    goalAmount={form.goalAmount}
                    ethMyrRate={ethMyrRate}
                    canRemove={milestones.length > 2}
                    onUpdate={(key, value) => updateMilestone(index, key, value)}
                    onRemove={() => setMilestones((current) => current.filter((_, milestoneIndex) => milestoneIndex !== index))}
                  />
                ))}
              </div>

            <button
              type="button"
              onClick={() =>
                setMilestones((current) => [
                  ...current,
                  { title: "", description: "", requirement: "", percentage: "" },
                ])
              }
              disabled={milestones.length >= 5}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-orange)] bg-white px-4 py-2 text-sm font-black text-[var(--color-orange)] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon />
              Add Milestone
            </button>
            {totalPercentage === 100 ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-black text-emerald-800">Milestone configuration is valid</p><p className="mt-1 text-xs font-semibold text-emerald-700">Milestones 2-{milestones.length} total 95%, and all milestones total 100%.</p></div> : null}
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border-2 border-orange-200 bg-[linear-gradient(135deg,#FFFFFF,#FFFDF5)] p-5 shadow-[0_12px_30px_rgba(111,69,20,0.06)] sm:p-6">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-orange)] text-base font-black text-white">1</span><div><h2 className="text-2xl font-black text-stone-950">Campaign Summary</h2><p className="text-sm font-semibold text-stone-500">Final campaign details before submission</p></div></div>
              <div className="mt-5 grid gap-5 xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
                <div className="h-80 overflow-hidden rounded-2xl border-2 border-orange-200 bg-orange-50">{form.imageUrl ? <img src={form.imageUrl} alt="Campaign preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-base font-black text-orange-400">No campaign image</div>}</div>
                <div className="rounded-2xl border border-orange-200 bg-white/70 p-5">
                  <div className="flex flex-wrap items-center gap-3"><h3 className="text-3xl font-black text-stone-950">{form.title}</h3><span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-black capitalize text-[var(--color-orange)] ring-1 ring-orange-200">{form.urgencyLevel}</span></div>
                  <p className="mt-3 line-clamp-3 text-base font-semibold leading-7 text-stone-600">{form.description}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Goal</p><p className="mt-2 text-xl font-black">{formatETH(form.goalAmount)}</p><p className="mt-1 text-xs font-bold text-stone-500">{formatMYR(Number(form.goalAmount || 0) * ethMyrRate)}</p></div>
                    <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Duration</p><p className="mt-2 text-xl font-black">{form.durationDays} days</p><p className="mt-1 text-xs font-bold text-stone-500">Campaign period</p></div>
                  </div>
                </div>
                <aside className="space-y-4">
                  <div className="rounded-2xl border border-orange-200 bg-[#FFFCC9]/35 p-5"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Connected wallet</p><p className="mt-3 font-mono text-base font-black">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}</p><span className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-200">Sepolia Network</span></div>
                  <div className="rounded-2xl border border-orange-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Submission status</p><p className="mt-3 text-base font-black text-[var(--color-orange)]">Pending admin approval</p><p className="mt-2 text-sm font-semibold leading-6 text-stone-500">The campaign contract is created only after approval succeeds.</p></div>
                </aside>
              </div>
            </section>

            <section className="rounded-3xl border-2 border-orange-200 bg-white p-5 shadow-[0_12px_30px_rgba(111,69,20,0.06)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-orange)] text-base font-black text-white">2</span><div><h2 className="text-2xl font-black text-stone-950">Milestones Overview</h2><p className="text-sm font-semibold text-stone-500">{milestones.length} milestones in total; the first allocation remains fixed at 5%</p></div></div><span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-200">Total: {totalPercentage}%</span></div>
              <div className="relative mt-5 space-y-3 before:absolute before:bottom-8 before:left-[1.4rem] before:top-8 before:w-0.5 before:bg-orange-200">
                {milestones.map((milestone, index) => {
                  const cumulative = milestones.slice(0, index + 1).reduce((sum, item) => sum + Number(item.percentage || 0), 0);
                  const allocation = Number(form.goalAmount || 0) * Number(milestone.percentage || 0) / 100;
                  return (
                    <article key={`review-${index}`} className={`relative rounded-2xl border-2 p-4 pl-16 ${index === 0 ? "border-orange-200 bg-[#FFFCC9]/25" : "border-orange-100 bg-white"}`}>
                      <span className="absolute left-3 top-5 grid h-11 w-11 place-items-center rounded-full border border-orange-300 bg-orange-50 text-base font-black text-[var(--color-orange)]">{index + 1}</span>
                      <details open className="group">
                        <summary className="list-none [&::-webkit-details-marker]:hidden">
                          <div className="grid cursor-pointer gap-4 md:grid-cols-[minmax(0,1fr)_7rem_8rem_11rem_auto] md:items-center">
                            <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-black text-stone-950">{milestone.title}</h3>{index === 0 ? <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-200">Fixed allocation</span> : null}</div><p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-stone-500">{milestone.description}</p></div>
                            <div><p className="text-xs font-black uppercase text-stone-400">Percentage</p><p className="mt-1 text-lg font-black text-[var(--color-orange)]">{milestone.percentage}%</p></div>
                            <div><p className="text-xs font-black uppercase text-stone-400">Cumulative</p><p className="mt-1 text-base font-black">{cumulative}%</p></div>
                            <div><p className="text-xs font-black uppercase text-stone-400">Allocation</p><p className="mt-1 text-base font-black">{formatETH(allocation)}</p><p className="mt-1 text-xs font-bold text-stone-500">{formatMYR(allocation * demoEthMyrRate)}</p></div>
                            <span className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-center text-xs font-black text-stone-700 group-open:bg-orange-50">View details</span>
                          </div>
                        </summary>
                        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/55 p-4 text-sm font-semibold leading-6 text-stone-700">
                          <p className="font-black text-stone-950">Proof required</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5">{proofRequirementItems(milestone.requirement).map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-4 border-t-2 border-orange-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          {step === 1 ? (
            <div className="flex items-center gap-3 text-xs font-semibold leading-5 text-stone-500">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-orange-200 bg-orange-50 text-[var(--color-orange)]" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M12 3 5 6v5c0 4.2 2.8 7.3 7 9 4.2-1.7 7-4.8 7-9V6l-7-3Zm-3 9 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <span className="font-black text-[var(--color-orange)]">Powered by PawChain</span>
            </div>
          ) : step === 3 ? (
            <div className="flex items-center gap-3 text-sm font-semibold text-stone-500">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-orange-50 ring-1 ring-orange-200"><img src="/images/logo.png" alt="PawChain" className="h-full w-full object-contain" /></span>
              <span>Powered by <span className="font-black text-[var(--color-orange)]">PawChain</span></span>
            </div>
          ) : <span />}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step === 3 ? 2 : 1)}
              className="rounded-xl border border-orange-200 bg-white px-6 py-3 text-sm font-black text-stone-700 transition hover:bg-orange-50"
            >
              Back
            </button>
          ) : null}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => {
                if (validateStepOne()) {
                  setStep(2);
                }
              }}
              disabled={Boolean(deactivationReason)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-orange)] px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              Next Step
              <ArrowIcon />
            </button>
          ) : step === 2 ? (
            <button
              type="button"
              onClick={() => { if (validateMilestones()) setStep(3); }}
              disabled={Boolean(deactivationReason)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-orange)] px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Review & Next
              <ArrowIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submitCampaign()}
              disabled={isSubmitting || Boolean(deactivationReason)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-orange)] px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Campaign for Approval"}
            </button>
          )}
          </div>
        </div>
      </form>
    </div>
  );
}
