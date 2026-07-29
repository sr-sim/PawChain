"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { ConnectWallet } from "./ConnectWallet";

type RegisterRole = "donor" | "shelter";
type ShelterApplicationStatus = {
  status: "pending" | "rejected";
  shelterName?: string;
  registrationId?: string;
  contactPhone?: string;
  websiteUrl?: string;
  shelterAddress?: string;
  organizationDescription?: string;
  proofDocumentPath?: string;
  proofDocumentUrl?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

type TextFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  readOnly?: boolean;
  value?: string;
};

function TextField({
  label,
  name,
  type = "text",
  placeholder,
  readOnly = false,
  value,
}: TextFieldProps) {
  return (
    <label className="block text-left">
      <span className="text-sm font-black text-stone-700">{label}</span>
      <span className="relative mt-1.5 block">
        <input
          name={name}
          type={type}
          required={!readOnly}
          readOnly={readOnly}
          value={value}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-orange-100 px-3 py-2 text-sm font-bold outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100 ${
            readOnly
              ? "bg-white/60 text-stone-500"
              : "bg-white/80 text-stone-900"
          }`}
        />
      </span>
    </label>
  );
}

function ShelterStatusPanel({
  application,
  onCheckLater,
}: {
  application: ShelterApplicationStatus;
  onCheckLater: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-orange-100 bg-white/85 p-6 text-center shadow-[0_24px_80px_rgba(244,183,56,0.18)] backdrop-blur-xl">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-xl font-black text-[var(--color-orange)]">
        !
      </div>
      <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
        Shelter application submitted
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950">
        Pending admin verification
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-stone-600">
        Your shelter application was saved. Next time you connect this wallet,
        PawChain will detect the shelter account and ask you to login before
        showing the latest application status.
      </p>
      <div className="mx-auto mt-5 max-w-xl space-y-2 rounded-2xl border border-orange-100 bg-amber-50/60 p-4 text-left text-sm font-bold text-stone-700">
        <p>
          Shelter:{" "}
          <span className="text-stone-950">
            {application.shelterName ?? "-"}
          </span>
        </p>
        <p>
          Status:{" "}
          <span className="text-[var(--color-orange)]">
            {application.status}
          </span>
        </p>
        <p>
          Submitted:{" "}
          <span className="text-stone-950">
            {application.submittedAt
              ? new Date(application.submittedAt).toLocaleString()
              : "-"}
          </span>
        </p>
        {application.registrationId && (
          <p>
            Registration / NGO ID:{" "}
            <span className="text-stone-950">
              {application.registrationId}
            </span>
          </p>
        )}
        {application.contactPhone && (
          <p>
            Contact phone:{" "}
            <span className="text-stone-950">{application.contactPhone}</span>
          </p>
        )}
        {application.websiteUrl && (
          <p>
            Website / social:{" "}
            <a
              href={application.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[var(--color-orange)] underline decoration-orange-200 underline-offset-2 transition hover:text-stone-950"
            >
              {application.websiteUrl} ↗
            </a>
          </p>
        )}
        {application.shelterAddress && (
          <p>
            Address:{" "}
            <span className="text-stone-950">
              {application.shelterAddress}
            </span>
          </p>
        )}
        {application.organizationDescription && (
          <p>
            Description:{" "}
            <span className="text-stone-950">
              {application.organizationDescription}
            </span>
          </p>
        )}
        {application.proofDocumentUrl && (
          <a
            href={application.proofDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-stone-700"
          >
            View registration document
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={onCheckLater}
        className="mx-auto mt-6 flex rounded-full bg-gradient-to-r from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-orange)] px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-300/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-orange-300/80"
      >
        Check status later
      </button>
    </div>
  );
}

export function RegisterPage({ role }: { role: RegisterRole }) {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{
    name: string;
    type: string;
    url: string;
  } | null>(null);
  const [shelterApplication, setShelterApplication] =
    useState<ShelterApplicationStatus | null>(null);

  useEffect(() => {
    return () => {
      if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url);
    };
  }, [documentPreview]);

  const roleLabel = role === "donor" ? "Donor" : "Shelter";
  const isShelter = role === "shelter";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!address) {
      setFormError("Wallet is not connected.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      formData.set("role", role);
      formData.set("walletAddress", address);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create account.");
      }

      if (result.status === "pending") {
        setShelterApplication(result.application ?? { status: "pending" });
        return;
      }

      router.push(
        `/${roleLabel}/dashboard?walletAddress=${encodeURIComponent(address)}`,
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-cream)] text-stone-950">
      <div className="animate-grid-drift pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,138,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,138,0,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none fixed left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--color-gold)]/30 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-20 border-b border-orange-200/70 bg-[linear-gradient(90deg,rgba(255,250,241,0.97),rgba(255,255,255,0.92)_46%,rgba(255,239,199,0.95))] shadow-[0_14px_42px_rgba(155,86,20,0.1)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex min-w-0 items-center gap-2.5 rounded-full px-1.5 py-1 text-left transition hover:opacity-80 sm:gap-3 sm:px-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-orange-300/45 ring-1 ring-white/80 sm:h-10 sm:w-10">
              <img
                src="/images/logo.png"
                alt="PawChain logo"
                className="h-full w-full object-contain"
              />
            </span>
            <span className="block truncate text-base font-black leading-5 tracking-tight text-stone-950 sm:text-lg">
              PawChain
            </span>
          </button>
          <ConnectWallet />
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 py-28 sm:px-6 lg:px-8">
        {shelterApplication ? (
          <ShelterStatusPanel
            application={shelterApplication}
            onCheckLater={() => {
              window.sessionStorage.setItem("skipIntroOnce", "true");
              router.push("/");
            }}
          />
        ) : (
          <div className="w-full rounded-[2rem] border border-orange-100 bg-white/88 p-5 shadow-[0_24px_80px_rgba(120,72,16,0.18)] backdrop-blur-xl sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                {roleLabel}
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
                    Create account
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    Register a new PawChain account for this connected wallet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.sessionStorage.setItem("skipIntroOnce", "true");
                    router.push("/");
                  }}
                  className="shrink-0 rounded-full bg-gradient-to-r from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-orange)] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-300/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-orange-300/80"
                >
                  Change role
                </button>
              </div>
            </div>

            {!isConnected ? (
              <div className="rounded-2xl border border-orange-100 bg-amber-50/70 p-5 text-center">
                <p className="text-sm font-bold text-stone-700">
                  Connect your wallet before creating an account.
                </p>
              </div>
            ) : (
              <form
                className={isShelter ? "space-y-4" : "space-y-3"}
                onSubmit={(event) => {
                  void handleSubmit(event);
                }}
              >
                <TextField
                  label="Connected wallet"
                  name="walletAddress"
                  placeholder="Connected wallet"
                  readOnly
                  value={address ?? ""}
                />

                {isShelter ? (
                  <>
                    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                      <div className="space-y-2.5 rounded-2xl border border-orange-100 bg-white/75 p-4">
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                          1. Account owner
                        </p>
                        <p className="text-sm leading-6 text-stone-600">
                          This person manages the shelter profile after admin
                          approval.
                        </p>
                        <TextField
                          label="Full name"
                          name="fullName"
                          placeholder="Enter your name"
                        />
                        <TextField
                          label="Email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                        />
                      </div>

                      <div className="space-y-2.5 rounded-2xl border border-orange-100 bg-white/75 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                              2. Shelter details
                            </p>
                            <p className="text-sm leading-6 text-stone-600">
                              Admin uses this information to verify the
                              organization.
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                            Pending review
                          </span>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <TextField
                            label="Shelter name"
                            name="shelterName"
                            placeholder="Happy Paws Shelter"
                          />
                          <TextField
                            label="Registration / NGO ID"
                            name="registrationId"
                            placeholder="Organization ID"
                          />
                          <label className="block text-left">
                            <span className="text-sm font-black text-stone-700">
                              Contact phone
                            </span>
                            <span className="mt-1.5 flex overflow-hidden rounded-xl border border-orange-100 bg-white/80 transition focus-within:border-[var(--color-orange)] focus-within:ring-4 focus-within:ring-orange-100">
                              <span className="flex items-center border-r border-orange-100 bg-stone-50 px-3 text-sm font-black text-stone-600">
                                +60
                              </span>
                              <input
                                name="contactPhone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                required
                                pattern="[0-9]{8,10}"
                                placeholder="123456789"
                                aria-label="Malaysian contact phone number"
                                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-bold text-stone-900 outline-none"
                              />
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-stone-500">
                              Enter the number without the leading 0.
                            </span>
                          </label>
                          <TextField
                            label="Website or social page"
                            name="websiteUrl"
                            type="url"
                            placeholder="https://..."
                          />
                        </div>
                        <TextField
                          label="Shelter address"
                          name="shelterAddress"
                          placeholder="Street, city, state, country"
                        />
                        <label className="block text-left">
                          <span className="text-sm font-black text-stone-700">
                            Description
                          </span>
                          <textarea
                            name="organizationDescription"
                            required
                            placeholder="Tell admins what your shelter does."
                            rows={2}
                            className="mt-1.5 w-full resize-none rounded-xl border border-orange-100 bg-white/80 px-3 py-2 text-sm font-bold text-stone-900 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-orange-100 bg-amber-50/70 p-3.5">
                      <label className="block text-left">
                        <span className="text-sm font-black text-stone-700">
                          Shelter registration certificate / licence
                        </span>
                        <p className="mt-1 text-xs font-semibold leading-5 text-stone-500">
                          Upload an official document proving that the shelter is
                          legally registered or authorized to operate.
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          Accepted formats: PDF, JPG, PNG.
                        </p>
                        <input
                          name="proofDocument"
                          type="file"
                          required
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            setDocumentPreview(
                              file
                                ? {
                                    name: file.name,
                                    type: file.type,
                                    url: URL.createObjectURL(file),
                                  }
                                : null,
                            );
                          }}
                          className="mt-1.5 w-full rounded-xl border border-dashed border-orange-200 bg-white/80 px-3 py-2 text-sm font-bold text-stone-700 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-3 file:py-1 file:text-sm file:font-black file:text-[var(--color-orange)]"
                        />
                        {documentPreview ? (
                          <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
                            <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wide text-stone-400">
                                  Document preview
                                </p>
                                <p className="mt-0.5 truncate text-xs font-bold text-stone-700">
                                  {documentPreview.name}
                                </p>
                              </div>
                              <a
                                href={documentPreview.url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                              >
                                Open full view ↗
                              </a>
                            </div>
                            {documentPreview.type === "application/pdf" ? (
                              <iframe
                                src={documentPreview.url}
                                title={`Preview of ${documentPreview.name}`}
                                className="h-80 w-full bg-stone-100"
                              />
                            ) : (
                              <div className="grid min-h-52 place-items-center bg-stone-100 p-3">
                                <img
                                  src={documentPreview.url}
                                  alt={`Preview of ${documentPreview.name}`}
                                  className="max-h-80 max-w-full rounded object-contain shadow-sm"
                                />
                              </div>
                            )}
                          </div>
                        ) : null}
                      </label>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-3 rounded-2xl border border-orange-100 bg-amber-50/35 p-3.5 sm:grid-cols-2">
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)] sm:col-span-2">
                      Account details
                    </p>
                    <TextField
                      label="Full name"
                      name="fullName"
                      placeholder="Enter your name"
                    />
                    <TextField
                      label="Email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                    />
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mx-auto mt-2 flex rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? isShelter
                        ? "Submitting..."
                        : "Creating..."
                      : isShelter
                        ? "Submit for admin review"
                        : "Create account"}
                  </button>
                </div>
              </form>
            )}

            {formError && (
              <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
                {formError}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
