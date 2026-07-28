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
import { malaysianStates } from "@/app/components/campaigns/campaign-utils";
import type { UrgencyLevel } from "@/app/components/campaigns/campaign-types";
import { demoEthMyrRate } from "@/lib/campaign-blockchain";

type CampaignForm = {
  title: string;
  description: string;
  location: string;
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
  location: "",
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
      <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-600">
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
}: {
  value: string;
  placeholder: string;
  options: SelectOption[];
  onChange: (value: string) => void;
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
          "flex w-full items-center justify-between gap-3 rounded-2xl border bg-orange-50/40 px-4 py-3 text-left text-sm font-black leading-6 text-stone-950 outline-none transition",
          open
            ? "border-[var(--color-orange)] bg-white ring-4 ring-orange-100"
            : "border-orange-100 hover:bg-orange-50",
        ].join(" ")}
      >
        <span>{selectedLabel || placeholder}</span>
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

const stateOptions = malaysianStates.map((state) => ({
  label: state,
  value: state,
}));

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
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 2 }).format(Number(value || 0));
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
  canRemove,
  onUpdate,
  onRemove,
}: {
  milestone: MilestoneForm;
  index: number;
  cumulative: number;
  goalAmount: string;
  canRemove: boolean;
  onUpdate: (key: keyof MilestoneForm, value: string) => void;
  onRemove: () => void;
}) {
  const allocation = Number(goalAmount || 0) * Number(milestone.percentage || 0) / 100;

  return (
    <article className={`relative rounded-2xl border p-4 pl-14 ${index === 0 ? "border-[#FFCD80] bg-[linear-gradient(135deg,#FFFCC9,#FFFFFF)]" : "border-orange-100 bg-white"}`}>
      <span className="absolute left-3 top-5 grid h-8 w-8 place-items-center rounded-full border border-orange-200 bg-orange-50 text-sm font-black text-[var(--color-orange)]">{index + 1}</span>
      <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr_0.6fr_0.75fr_1fr_auto] lg:items-start">
        <div className="space-y-2"><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Milestone title</label><input value={milestone.title} onChange={(event) => onUpdate("title", event.target.value)} placeholder={index === 0 ? "Name the emergency milestone" : `Milestone ${index + 1} title`} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm font-black outline-none focus:border-[var(--color-orange)] focus:ring-2 focus:ring-orange-100" required /><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Description</label><textarea value={milestone.description} onChange={(event) => onUpdate("description", event.target.value)} placeholder="Describe what this milestone will achieve" rows={2} className="w-full resize-none rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold leading-5 outline-none focus:border-[var(--color-orange)]" required />{index === 0 ? <p className="rounded-lg bg-orange-50 px-2 py-1.5 text-[10px] font-bold text-orange-700">Usage proof is uploaded after this fund is withdrawn.</p> : null}</div>
        <div><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Percentage</label><div className="relative mt-2"><input value={milestone.percentage} onChange={(event) => onUpdate("percentage", event.target.value)} min="5" max="100" step="5" type="number" onWheel={preventWheelNumberChange} readOnly={index === 0} className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 pr-7 text-sm font-black outline-none focus:border-[var(--color-orange)]" required /><span className="absolute right-3 top-2 text-xs font-black text-stone-400">%</span></div>{index === 0 ? <span className="mt-2 inline-flex rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">Fixed</span> : null}</div>
        <div><p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Cumulative</p><p className="mt-3 text-sm font-black text-stone-950">{cumulative}%</p></div>
        <div><p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Est. allocation</p><p className="mt-3 text-sm font-black text-stone-950">{formatETH(allocation)}</p><p className="mt-1 text-[10px] font-bold text-stone-400">about {formatMYR(allocation * demoEthMyrRate)}</p></div>
        <div><label className="block text-[10px] font-black uppercase tracking-wide text-stone-500">Proof requirement</label><textarea value={milestone.requirement} onChange={(event) => onUpdate("requirement", event.target.value)} placeholder="Invoices, receipts, reports or photos" rows={3} className="mt-2 w-full resize-none rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold leading-5 outline-none focus:border-[var(--color-orange)]" required /></div>
        <div>{index === 0 ? <span className="inline-flex rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">Locked 5%</span> : <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove milestone ${index + 1}`} className="rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-40">Delete</button>}</div>
      </div>
    </article>
  );
}

export default function CreateCampaignPage() {
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
      !form.location ||
      !form.goalAmount ||
      Number(form.goalAmount) <= 0
    ) {
      setError("Complete the campaign information and enter a positive ETH goal. Values below 1 ETH are allowed.");
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
          location: form.location,
          urgencyLevel: form.urgencyLevel,
          goalAmount: Number(form.goalAmount) * demoEthMyrRate,
          goalEth: form.goalAmount,
          ethMyrRate: demoEthMyrRate,
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
      <section className="flex flex-col gap-5 rounded-3xl border border-orange-100 bg-[linear-gradient(135deg,#FFFFFF,#FFFCC9_160%)] p-5 shadow-[0_18px_45px_rgba(111,69,20,0.08)] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">Create Campaign</p><h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">{step === 1 ? "Campaign Information" : step === 2 ? "Set Milestones" : "Review & Submit"}</h1><p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-stone-600">{step === 1 ? "Create a new campaign and provide the information donors will see." : step === 2 ? "Divide the campaign goal into sequential milestone allocations." : "Review every detail before submitting the campaign for admin approval."}</p></div>
        <div className="shrink-0 rounded-2xl border border-orange-200 bg-white/80 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Network</p><div className="mt-2 flex items-center gap-3 text-xs font-black"><span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700 ring-1 ring-violet-200">Sepolia</span><span>Chain ID: 11155111</span></div></div>
      </section>

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
        <div className="mb-7 grid overflow-hidden rounded-2xl border border-orange-200 sm:grid-cols-3">
          {[
            { label: "Campaign Info", value: 1 },
            { label: "Set Milestones", value: 2 },
            { label: "Review & Submit", value: 3 },
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
                "flex items-center justify-center gap-3 border-orange-100 px-4 py-4 text-sm font-black transition sm:border-r sm:last:border-r-0",
                step === item.value
                  ? "bg-orange-50 text-[var(--color-orange)]"
                  : step > item.value ? "bg-emerald-50/50 text-emerald-700" : "bg-white text-stone-600 hover:bg-orange-50",
              ].join(" ")}
            >
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${step === item.value ? "bg-[var(--color-orange)] text-white" : step > item.value ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-600"}`}>{step > item.value ? "OK" : item.value}</span>{item.label}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-5 rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,#FFFFFF,#FFFDF7)] p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-orange-100 pb-4"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-lg text-[var(--color-orange)] ring-1 ring-orange-100">+</span><div><h2 className="text-xl font-black text-stone-950">Campaign Information</h2><p className="text-xs font-semibold text-stone-500">Fields marked as required must be completed before continuing.</p></div></div>
            <FieldLabel label="Campaign Title *">
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="e.g. Emergency care for street dogs"
                className="w-full rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                required
              />
            </FieldLabel>

            <FieldLabel label="Campaign Description *">
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={5}
                placeholder="Explain the situation, who needs help, and how the funds will be used."
                className="w-full resize-none rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                required
              />
            </FieldLabel>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Location *">
                <ThemedDropdown
                  value={form.location}
                  placeholder="Select state"
                  options={stateOptions}
                  onChange={(location) =>
                    setForm((current) => ({
                      ...current,
                      location,
                    }))
                  }
                />
              </FieldLabel>

              <FieldLabel label="Urgency Level *">
                <ThemedDropdown
                  value={form.urgencyLevel}
                  placeholder="Select urgency"
                  options={urgencyOptions}
                  onChange={(urgencyLevel) =>
                    setForm((current) => ({
                      ...current,
                      urgencyLevel: urgencyLevel as UrgencyLevel,
                    }))
                  }
                />
              </FieldLabel>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Goal Amount (ETH) *">
                <input
                  value={form.goalAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      goalAmount: normalizeEthInput(event.target.value),
                    }))
                  }
                  inputMode="decimal"
                  type="text"
                  placeholder="e.g. 0.5"
                  className="w-full rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                  required
                />
                <p className="mt-2 text-xs font-bold text-stone-500">Approximately {formatMYR(Number(form.goalAmount || 0) * demoEthMyrRate)} at 1 ETH = {formatMYR(demoEthMyrRate)}</p>
              </FieldLabel>

              <FieldLabel label="Campaign Duration *">
                <ThemedDropdown
                  value={form.durationDays}
                  placeholder="Select duration"
                  options={durationOptions}
                  onChange={(durationDays) =>
                    setForm((current) => ({
                      ...current,
                      durationDays: durationDays as CampaignForm["durationDays"],
                    }))
                  }
                />
              </FieldLabel>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-2"><FieldLabel label="Campaign Image"><div className="flex h-full min-h-72 flex-col justify-between rounded-2xl border border-dashed border-orange-300 bg-orange-50/30 p-4 text-center"><div className="grid h-52 place-items-center overflow-hidden rounded-xl bg-white">{form.imageUrl ? <img src={form.imageUrl} alt="Campaign preview" className="max-h-52 w-full object-contain" /> : <p className="text-sm font-black text-stone-600">Upload campaign image<br /><span className="text-xs font-semibold text-stone-400">JPG or PNG</span></p>}</div><input type="file" accept="image/*" onChange={handleImageChange} className="mt-3 w-full text-xs font-semibold file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-orange)] file:px-3 file:py-2 file:font-black file:text-white" /></div></FieldLabel><div className="min-h-72 rounded-2xl border border-[#FFCD80] bg-[#FFFCC9]/45 p-5"><p className="text-sm font-black text-stone-950">Image tips</p><ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-stone-600"><li>Use a clear, high-quality image.</li><li>Images showing the animals usually receive more support.</li><li>Recommended landscape size: 1200 x 800px.</li></ul></div></div>
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
            <section className="rounded-3xl border border-orange-200 bg-[linear-gradient(135deg,#FFFFFF,#FFFCC9_170%)] p-5 shadow-[0_12px_30px_rgba(111,69,20,0.06)] sm:p-6">
              <div className="flex items-center gap-3 border-b border-orange-100 pb-4"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-orange)] text-sm font-black text-white">1</span><div><h2 className="text-xl font-black text-stone-950">Campaign Summary</h2><p className="text-xs font-semibold text-stone-500">Final campaign details before submission</p></div></div>
              <div className="mt-5 grid gap-6 lg:grid-cols-[15rem_1fr_18rem]">
                <div className="grid h-64 place-items-center overflow-hidden rounded-2xl border border-orange-100 bg-orange-50">{form.imageUrl ? <img src={form.imageUrl} alt="Campaign preview" className="max-h-64 w-full object-contain" /> : <div className="grid h-64 place-items-center text-sm font-black text-orange-400">No campaign image</div>}</div>
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-2xl font-black text-stone-950">{form.title}</h3><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black capitalize text-[var(--color-orange)] ring-1 ring-orange-100">{form.urgencyLevel}</span></div><p className="mt-3 text-sm font-semibold leading-6 text-stone-600">{form.description}</p><dl className="mt-5 grid grid-cols-[6rem_1fr] gap-3 text-sm"><dt className="font-bold text-stone-500">Location</dt><dd className="font-black">{form.location}</dd><dt className="font-bold text-stone-500">Goal</dt><dd className="font-black">{formatETH(form.goalAmount)} <span className="block text-xs text-stone-400">about {formatMYR(Number(form.goalAmount || 0) * demoEthMyrRate)}</span></dd><dt className="font-bold text-stone-500">Duration</dt><dd className="font-black">{form.durationDays} days</dd></dl></div>
                <aside className="space-y-4"><div className="rounded-2xl border border-[#FFCD80] bg-[#FFFCC9]/45 p-4"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Connected wallet</p><p className="mt-2 font-mono text-sm font-black">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}</p><span className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-200">Sepolia Network</span></div><div className="rounded-2xl border border-orange-100 bg-white p-4"><p className="text-xs font-black uppercase tracking-wide text-stone-500">Submission status</p><p className="mt-2 text-sm font-black text-stone-950">Pending admin approval</p><p className="mt-1 text-xs font-semibold leading-5 text-stone-500">The campaign contract is created only after approval succeeds.</p></div></aside>
              </div>
            </section>

            <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-[0_12px_30px_rgba(111,69,20,0.06)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-sm font-black text-[var(--color-orange)] ring-1 ring-orange-100">2</span><div><h2 className="text-xl font-black text-stone-950">Milestones Overview</h2><p className="text-xs font-semibold text-stone-500">{milestones.length} milestones in total; the first allocation remains fixed at 5%</p></div></div><span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-200">Total: {totalPercentage}%</span></div>
              <div className="relative mt-5 space-y-3 before:absolute before:bottom-8 before:left-[1.35rem] before:top-8 before:w-px before:bg-orange-200">
                {milestones.map((milestone, index) => {
                  const cumulative = milestones.slice(0, index + 1).reduce((sum, item) => sum + Number(item.percentage || 0), 0);
                  const allocation = Number(form.goalAmount || 0) * Number(milestone.percentage || 0) / 100;
                  return <article key={`review-${index}`} className={`relative grid gap-4 rounded-2xl border p-4 pl-16 md:grid-cols-[1fr_7rem_8rem_10rem] md:items-center ${index === 0 ? "border-[#FFCD80] bg-[#FFFCC9]/35" : "border-orange-100 bg-white"}`}><span className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-orange-200 bg-orange-50 text-base font-black text-[var(--color-orange)]">{index + 1}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-stone-950">{milestone.title}</h3>{index === 0 ? <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">Fixed allocation</span> : null}</div><p className="mt-1 text-xs font-semibold leading-5 text-stone-500">{milestone.description}</p></div><div><p className="text-[10px] font-black uppercase text-stone-400">Percentage</p><p className="mt-1 text-lg font-black text-[var(--color-orange)]">{milestone.percentage}%</p></div><div><p className="text-[10px] font-black uppercase text-stone-400">Cumulative</p><p className="mt-1 text-sm font-black">{cumulative}%</p></div><div><p className="text-[10px] font-black uppercase text-stone-400">Allocation</p><p className="mt-1 text-sm font-black">{formatETH(allocation)}</p><p className="mt-1 text-[10px] font-bold text-stone-400">about {formatMYR(allocation * demoEthMyrRate)}</p><p className="mt-1 line-clamp-2 text-[10px] font-semibold text-stone-500">{milestone.requirement}</p></div></article>;
                })}
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-black text-emerald-800">Milestone configuration is valid</p><p className="mt-1 text-xs font-semibold text-emerald-700">Milestone 1 is 5%, the remaining milestones total 95%, and all allocations total 100%.</p></div>
            </section>

            <section className="rounded-3xl border border-[#FFCD80] bg-[linear-gradient(135deg,#FFFDF8,#FFF4D9)] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-orange)] text-sm font-black text-white">3</span><div><h2 className="text-xl font-black text-stone-950">Final Review & Submit</h2><p className="text-xs font-semibold text-stone-500">Please confirm these checks before submitting.</p></div></div><div className="mt-5 grid gap-3 rounded-2xl border border-orange-100 bg-white/70 p-4 sm:grid-cols-2">{["Campaign information is complete", "Wallet is connected to Sepolia", "Milestones total exactly 100%", "Milestone 1 allocation is fixed at 5%", "Every milestone has a shelter-provided title", "The campaign will enter admin review"].map((item) => <p key={item} className="flex items-center gap-2 text-sm font-bold text-stone-700"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-black text-white">OK</span>{item}</p>)}</div></section>
          </div>
        )}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
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
      </form>
    </div>
  );
}
