"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { RoleNFTBadge } from "@/app/components/RoleNFTBadge";
import type { ContractRole, RoleNFTDisplay } from "@/lib/role-nft";

type ShelterProfile = {
  id: string;
  role: string;
  fullName: string;
  email: string;
  walletAddress: string;
  shelterImageUrl: string | null;
};

type ShelterApplication = {
  status: string;
  shelterName: string;
  registrationId: string;
  contactPhone: string;
  websiteUrl: string | null;
  shelterAddress: string;
  organizationDescription: string;
  proofDocumentPath: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

type ProfileResponse = {
  profile: ShelterProfile;
  application: ShelterApplication | null;
  roleNFT: RoleNFTDisplay | null;
  contractRole: ContractRole | null;
  nftVerified: boolean;
  nftError: string | null;
};

type ProfileForm = {
  fullName: string;
  email: string;
  contactPhone: string;
  websiteUrl: string;
  shelterAddress: string;
  organizationDescription: string;
  shelterImageUrl: string;
};

const emptyForm: ProfileForm = {
  fullName: "",
  email: "",
  contactPhone: "",
  websiteUrl: "",
  shelterAddress: "",
  organizationDescription: "",
  shelterImageUrl: "",
};

function FieldCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <div className="mt-2 break-words text-sm font-black leading-6 text-stone-950">
        {value || "-"}
      </div>
    </div>
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
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-600">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getInitialForm(data: ProfileResponse): ProfileForm {
  return {
    fullName: data.profile.fullName ?? "",
    email: data.profile.email ?? "",
    contactPhone: data.application?.contactPhone ?? "",
    websiteUrl: data.application?.websiteUrl ?? "",
    shelterAddress: data.application?.shelterAddress ?? "",
    organizationDescription: data.application?.organizationDescription ?? "",
    shelterImageUrl: data.profile.shelterImageUrl ?? "",
  };
}

export default function ShelterProfilePage() {
  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [savedForm, setSavedForm] = useState<ProfileForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!address) {
        setProfileData(null);
        setForm(emptyForm);
        setSavedForm(emptyForm);
        return;
      }

      setIsLoading(true);
      setError("");
      setMessage("");

      try {
        const response = await fetch(
          `/api/shelter/profile?walletAddress=${encodeURIComponent(address)}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Unable to load shelter profile.");
        }

        const initialForm = getInitialForm(result);

        setProfileData(result);
        setForm(initialForm);
        setSavedForm(initialForm);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load shelter profile.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [address]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  const canSave = useMemo(() => {
    return (
      isDirty &&
      form.fullName.trim() &&
      isValidEmail(form.email.trim()) &&
      form.contactPhone.trim() &&
      form.shelterAddress.trim() &&
      form.organizationDescription.trim()
    );
  }, [form, isDirty]);

  function updateForm(key: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
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
      updateForm("shelterImageUrl", imageUrl);
      setError("");
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Unable to read image file.",
      );
    }
  }

  function validateForm() {
    if (!form.fullName.trim()) {
      setError("Name is required.");
      return false;
    }

    if (!isValidEmail(form.email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }

    if (
      !form.contactPhone.trim() ||
      !form.shelterAddress.trim() ||
      !form.organizationDescription.trim()
    ) {
      setError("Phone, address, and description are required.");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!address) {
      open();
      return;
    }

    if (!isDirty) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/shelter/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address,
          fullName: form.fullName,
          email: form.email,
          contactPhone: form.contactPhone,
          websiteUrl: form.websiteUrl,
          shelterAddress: form.shelterAddress,
          organizationDescription: form.organizationDescription,
          shelterImageUrl: form.shelterImageUrl,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Unable to save shelter profile.");
      }

      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                fullName: form.fullName,
                email: form.email,
                shelterImageUrl: form.shelterImageUrl || null,
              },
              application: current.application
                ? {
                    ...current.application,
                    contactPhone: form.contactPhone,
                    websiteUrl: form.websiteUrl || null,
                    shelterAddress: form.shelterAddress,
                    organizationDescription: form.organizationDescription,
                  }
                : current.application,
            }
          : current,
      );
      setSavedForm(form);
      setMessage("Shelter profile saved successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save shelter profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const application = profileData?.application;
  const profile = profileData?.profile;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(var(--color-white-rgb),0.98),rgba(var(--color-cream-rgb),0.9)_48%,rgba(var(--color-peach-rgb),0.5))] p-5 shadow-[0_22px_60px_rgba(155,86,20,0.12)] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
          Shelter Profile
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-950 sm:text-4xl">
          Manage shelter identity
        </h1>
        <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-stone-700">
          Edit shelter account details, contact information, and the image used
          on your dashboard.
        </p>
      </section>

      {!isConnected ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          <h2 className="text-xl font-black text-stone-950">
            Connect your shelter wallet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-stone-600">
            Your shelter profile is linked to your registered wallet.
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

      {isLoading ? (
        <section className="rounded-2xl border border-orange-100 bg-white p-6 text-center text-sm font-black text-stone-600 shadow-[0_18px_48px_rgba(155,86,20,0.08)]">
          Loading shelter profile...
        </section>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      ) : null}

      {profile ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
              <h2 className="text-xl font-black text-stone-950">
                Dashboard Image
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-stone-600">
                Uploading changes the preview only. Click Save Profile to
                commit it with the rest of your edits.
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,rgba(var(--color-cream-rgb),0.92),rgba(var(--color-peach-rgb),0.44))]">
                {form.shelterImageUrl ? (
                  <img
                    src={form.shelterImageUrl}
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-[16/10] place-items-center text-sm font-black text-[var(--color-orange)]">
                    Shelter Image
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-5 w-full rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
              />
            </section>

            <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
              <h2 className="text-xl font-black text-stone-950">
                Account Details
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FieldLabel label="Name">
                  <input
                    value={form.fullName}
                    onChange={(event) =>
                      updateForm("fullName", event.target.value)
                    }
                    className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </FieldLabel>

                <FieldLabel label="Email">
                  <input
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    type="email"
                    className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </FieldLabel>

                <FieldCard label="Role" value={profile.role} />
                <FieldCard label="Wallet" value={profile.walletAddress} />
              </div>

              <RoleNFTBadge
                role={profileData?.contractRole ?? "Shelter"}
                roleNFT={profileData?.roleNFT ?? null}
              />

              {profileData?.nftError ? (
                <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                  {profileData.nftError}
                </p>
              ) : null}
            </section>
          </div>

          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_18px_48px_rgba(155,86,20,0.08)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  Shelter Application
                </p>
                <h2 className="mt-1 text-2xl font-black text-stone-950">
                  {application?.shelterName ?? "Shelter details"}
                </h2>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-black capitalize text-[var(--color-orange)]">
                {application?.status ?? "-"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FieldLabel label="Contact Phone">
                <input
                  value={form.contactPhone}
                  onChange={(event) =>
                    updateForm("contactPhone", event.target.value)
                  }
                  className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </FieldLabel>

              <FieldLabel label="Website">
                <input
                  value={form.websiteUrl}
                  onChange={(event) =>
                    updateForm("websiteUrl", event.target.value)
                  }
                  className="w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  placeholder="https://..."
                />
              </FieldLabel>

              <FieldCard
                label="Registration ID"
                value={application?.registrationId}
              />
              <FieldCard
                label="Proof Document"
                value={application?.proofDocumentPath}
              />
              <FieldCard
                label="Submitted"
                value={formatDate(application?.submittedAt ?? null)}
              />
              <FieldCard
                label="Reviewed"
                value={formatDate(application?.reviewedAt ?? null)}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <FieldLabel label="Shelter Address">
                <textarea
                  value={form.shelterAddress}
                  onChange={(event) =>
                    updateForm("shelterAddress", event.target.value)
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </FieldLabel>

              <FieldLabel label="Organization Description">
                <textarea
                  value={form.organizationDescription}
                  onChange={(event) =>
                    updateForm("organizationDescription", event.target.value)
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-orange-100 bg-orange-50/40 px-4 py-3 text-sm font-bold leading-6 text-stone-950 outline-none transition focus:border-[var(--color-orange)] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </FieldLabel>
            </div>

            {application?.rejectionReason ? (
              <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {application.rejectionReason}
              </p>
            ) : null}
          </section>

          <div className="sticky bottom-4 z-10 flex justify-end">
            <button
              type="submit"
              disabled={!canSave || isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition hover:-translate-y-0.5 hover:bg-[var(--color-orange)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SaveIcon />
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

