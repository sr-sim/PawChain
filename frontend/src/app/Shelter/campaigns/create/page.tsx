"use client";

import {
  ChangeEvent,
  FormEvent,
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
    title: "Emergency Initial Release",
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

const minimumGoalAmount = 1000;
const goalAmountStep = 100;

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

export default function CreateCampaignPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [step, setStep] = useState<1 | 2>(1);
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
      Number(form.goalAmount) < minimumGoalAmount
    ) {
      setError("Complete campaign info with a goal amount of at least RM 1,000.");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (deactivationReason) {
      setError(`Campaign creation is disabled: ${deactivationReason}`);
      return;
    }

    if (!address) {
      open();
      return;
    }

    if (!validateMilestones()) {
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
          goalAmount: form.goalAmount,
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
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(var(--color-white-rgb),0.98),rgba(var(--color-cream-rgb),0.9)_48%,rgba(var(--color-peach-rgb),0.5))] p-5 shadow-[0_22px_60px_rgba(155,86,20,0.12)] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Create Campaign
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
          Submit a campaign for approval
        </h1>
        <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-stone-700">
          Campaigns start as pending approval. Milestones define how funds are
          reviewed and released after the campaign is approved.
        </p>
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
        onSubmit={handleSubmit}
        className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6"
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {[
            { label: "Campaign Info", value: 1 },
            { label: "Milestones Setup", value: 2 },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                if (item.value === 1 || validateStepOne()) {
                  setStep(item.value as 1 | 2);
                }
              }}
              className={[
                "rounded-2xl border px-4 py-3 text-sm font-black transition",
                step === item.value
                  ? "border-[var(--color-orange)] bg-[var(--color-orange)] text-white shadow-lg shadow-orange-200/70"
                  : "border-orange-100 bg-orange-50/60 text-stone-700 hover:bg-orange-100",
              ].join(" ")}
            >
              Step {item.value}: {item.label}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <FieldLabel label="Title">
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                required
              />
            </FieldLabel>

            <FieldLabel label="Description">
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={5}
                className="w-full resize-none rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                required
              />
            </FieldLabel>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Location">
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

              <FieldLabel label="Urgency">
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
              <FieldLabel label="Goal Amount">
                <input
                  value={form.goalAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      goalAmount: event.target.value,
                    }))
                  }
                  min={minimumGoalAmount}
                  step={goalAmountStep}
                  type="number"
                  className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </FieldLabel>

              <FieldLabel label="Duration">
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
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-stone-950">
                  Milestones
                </h2>
                <p className="text-sm font-bold text-stone-600">
                  Milestone 1 is a fixed 5% emergency release. Add up to four
                  later milestones; all percentages must total 100%.
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
                Total {totalPercentage}%
              </span>
            </div>

            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="rounded-2xl border border-orange-100 bg-orange-50/35 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-stone-950">
                    Milestone {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setMilestones((current) =>
                        current.filter((_, milestoneIndex) => milestoneIndex !== index),
                      )
                    }
                    disabled={index === 0 || milestones.length <= 2}
                    className="rounded-full border border-red-100 bg-white px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
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
                      readOnly={index === 0}
                      required
                    />
                  </FieldLabel>

                  <FieldLabel label="Percentage">
                    <input
                      value={milestone.percentage}
                      onChange={(event) =>
                        updateMilestone(index, "percentage", event.target.value)
                      }
                      min="5"
                      max="100"
                      step="5"
                      type="number"
                      onWheel={preventWheelNumberChange}
                      readOnly={index === 0}
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
                        updateMilestone(index, "description", event.target.value)
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
                        updateMilestone(index, "requirement", event.target.value)
                      }
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </FieldLabel>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setMilestones((current) => [
                  ...current,
                  { title: "", description: "", requirement: "", percentage: "" },
                ])
              }
              disabled={milestones.length >= 5}
              className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-black text-[var(--color-orange)] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon />
              Add Milestone
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-orange-100 bg-white px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-orange-50"
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
              className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)]"
            >
              Next Step
              <ArrowIcon />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || Boolean(deactivationReason)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Campaign for Approval"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
