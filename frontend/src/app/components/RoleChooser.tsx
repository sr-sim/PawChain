"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { ConnectWallet } from "./ConnectWallet";

const roleOptions = [
  {
    role: "Donor",
    title: "Support verified shelter campaigns",
    description:
      "Donate to animal shelters, follow campaign progress, and track milestone releases.",
    points: ["Browse campaigns", "Support shelters", "Track impact"],
  },
  {
    role: "Shelter",
    title: "Raise funds for animal care",
    description:
      "Create shelter campaigns, submit milestone proof, and receive approved funds.",
    points: ["Create campaigns", "Submit proof", "Manage releases"],
  },
];

type Role = "Donor" | "Shelter" | "Admin";
type DbRole = "donor" | "shelter" | "admin";
type ShelterApplicationStatus = {
  status: "pending" | "rejected";
  shelterName?: string;
  registrationId?: string;
  contactPhone?: string;
  websiteUrl?: string;
  shelterAddress?: string;
  organizationDescription?: string;
  proofDocumentPath?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
};
type WalletProfile = {
  role: DbRole;
  email: string;
  fullName?: string;
  application?: ShelterApplicationStatus | null;
};

type TextFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  readOnly?: boolean;
  value?: string;
  defaultValue?: string;
};

function TextField({
  label,
  name,
  type = "text",
  placeholder,
  readOnly = false,
  value,
  defaultValue,
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="block text-left">
      <span className="text-sm font-black text-stone-700">{label}</span>
      <span className="relative mt-1.5 block">
        <input
          name={name}
          type={inputType}
          required={!readOnly}
          readOnly={readOnly}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-orange-100 px-3 py-2 text-sm font-bold outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100 ${
            isPassword ? "pr-11" : ""
          } ${
            readOnly
              ? "bg-white/60 text-stone-500"
              : "bg-white/80 text-stone-900"
          }`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-orange-100 hover:text-[var(--color-orange)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.7 3.1 10 8a12.3 12.3 0 0 1-2.1 4.1" />
                <path d="M6.1 6.1A12 12 0 0 0 2 12c1.3 4.9 5 8 10 8a10.9 10.9 0 0 0 5.9-1.7" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function toDbRole(role: Role): DbRole {
  return role.toLowerCase() as DbRole;
}

function toUiRole(role: DbRole): Role {
  if (role === "donor") return "Donor";
  if (role === "shelter") return "Shelter";
  return "Admin";
}

export function RoleChooser() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isShelterPending, setIsShelterPending] = useState(false);
  const [shelterApplication, setShelterApplication] =
    useState<ShelterApplicationStatus | null>(null);
  const [walletProfile, setWalletProfile] = useState<WalletProfile | null>(
    null,
  );
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWalletLookupLoading, setIsWalletLookupLoading] = useState(false);
  const [canCheckShelterStatus, setCanCheckShelterStatus] = useState(false);
  const [isEditingApplication, setIsEditingApplication] = useState(false);
  const [lastAddress, setLastAddress] = useState<string | undefined>();

  useEffect(() => {
    if (!isConnected) {
      setSelectedRole(null);
      setIsAuthOpen(false);
      setIsComplete(false);
      setIsShelterPending(false);
      setShelterApplication(null);
      setWalletProfile(null);
      setFormError("");
      setStatusMessage("");
      setIsSubmitting(false);
      setIsWalletLookupLoading(false);
      setCanCheckShelterStatus(false);
      setIsEditingApplication(false);
      setLastAddress(undefined);
      return;
    }

    if (address && address !== lastAddress) {
      setSelectedRole(null);
      setIsAuthOpen(false);
      setIsComplete(false);
      setIsShelterPending(false);
      setShelterApplication(null);
      setWalletProfile(null);
      setFormError("");
      setStatusMessage("");
      setIsSubmitting(false);
      setIsWalletLookupLoading(true);
      setCanCheckShelterStatus(false);
      setIsEditingApplication(false);
      setLastAddress(address);

      const lookupWalletProfile = async () => {
        try {
          const [response] = await Promise.all([
            fetch(
              `/api/auth/wallet-profile?walletAddress=${encodeURIComponent(
                address,
              )}`,
            ),
            new Promise((resolve) => {
              window.setTimeout(resolve, 3000);
            }),
          ]);
          const result = await response.json();

          if (response.ok && result.profile) {
            const profile = result.profile as WalletProfile;

            setWalletProfile(profile);
            setSelectedRole(toUiRole(profile.role));
            if (
              profile.role === "shelter" &&
              (profile.application?.status === "pending" ||
              profile.application?.status === "rejected")
            ) {
              setShelterApplication(profile.application);
              setIsShelterPending(true);
              setCanCheckShelterStatus(false);
            }
            setIsAuthOpen(true);
          }
        } finally {
          setIsWalletLookupLoading(false);
        }
      };

      void lookupWalletProfile();
    }
  }, [address, isConnected, lastAddress]);

  const openAuthForm = (role: string) => {
    setSelectedRole(role as Role);
    router.push(`/register/${role.toLowerCase()}`);
  };

  const handleCheckShelterStatus = async () => {
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/shelter/application-status");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to check application status.");
      }

      if (result.status === "approved") {
        setIsComplete(true);
        router.push("/Shelter/dashboard");
        return;
      }

      setShelterApplication(result.application);
      setStatusMessage(
        result.status === "pending"
          ? "Your application is still pending admin review."
          : "Your application was reviewed by admin.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to check application status.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRole || !address) {
      setFormError("Wallet is not connected.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const role = toDbRole(selectedRole);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role,
          walletAddress: address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to sign in.");
      }

      if (result.status === "pending") {
        setShelterApplication(result.application ?? { status: "pending" });
        setIsShelterPending(true);
        setCanCheckShelterStatus(true);
        return;
      }

      if (result.status === "rejected") {
        setShelterApplication(result.application ?? { status: "rejected" });
        setIsShelterPending(true);
        setCanCheckShelterStatus(true);
        return;
      }

      setIsComplete(true);
      router.push(`/${selectedRole}/dashboard`);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmitApplication = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!address) {
      setFormError("Wallet is not connected.");
      return;
    }

    setFormError("");
    setStatusMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("walletAddress", address);

    try {
      const response = await fetch("/api/shelter/resubmit-application", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to resubmit application.");
      }

      setShelterApplication(result.application ?? { status: "pending" });
      setIsShelterPending(true);
      setIsEditingApplication(false);
      setCanCheckShelterStatus(false);
      setStatusMessage("Your application was resubmitted for admin review.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedRoleOptions = walletProfile
    ? roleOptions.filter((option) => option.role === toUiRole(walletProfile.role))
    : roleOptions;
  const isShelterStatusView =
    walletProfile?.role === "shelter" && isShelterPending;

  if (!isConnected || isComplete) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-y-auto overflow-x-hidden bg-[var(--color-cream)] text-stone-950">
      <div className="animate-grid-drift pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,138,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,138,0,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--color-gold)]/30 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-20 border-b border-orange-200/70 bg-[linear-gradient(90deg,rgba(255,250,241,0.97),rgba(255,255,255,0.92)_46%,rgba(255,239,199,0.95))] shadow-[0_14px_42px_rgba(155,86,20,0.1)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 rounded-full px-1.5 py-1 sm:gap-3 sm:px-2">
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
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="relative z-10 flex min-h-dvh flex-1 items-start justify-center px-4 pb-10 pt-28 sm:px-6 lg:px-8">
        <section className="w-full max-w-6xl">
          {isWalletLookupLoading ? (
            <CheckingWalletCard address={address} />
          ) : isShelterStatusView ? (
            <div
              className={`mx-auto w-full rounded-[2rem] border border-orange-100 bg-white/88 p-5 shadow-[0_24px_80px_rgba(120,72,16,0.18)] backdrop-blur-xl sm:p-6 ${
                isEditingApplication ? "max-w-5xl" : "max-w-3xl"
              }`}
            >
              {isEditingApplication && shelterApplication ? (
                <ShelterResubmitForm
                  application={shelterApplication}
                  formError={formError}
                  isSubmitting={isSubmitting}
                  profile={walletProfile}
                  walletAddress={address ?? ""}
                  onCancel={() => {
                    setFormError("");
                    setIsEditingApplication(false);
                  }}
                  onSubmit={handleResubmitApplication}
                />
              ) : (
                <ShelterStatusPanel
                  application={shelterApplication}
                  statusMessage={statusMessage}
                  isSubmitting={isSubmitting}
                  onCheckStatus={
                    canCheckShelterStatus ? handleCheckShelterStatus : undefined
                  }
                  onEdit={
                    shelterApplication?.status === "rejected"
                      ? () => {
                          setFormError("");
                          setIsEditingApplication(true);
                        }
                      : undefined
                  }
                />
              )}
            </div>
          ) : walletProfile ? (
            <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2rem] border border-orange-100 bg-white/72 p-6 text-left shadow-[0_22px_70px_rgba(244,183,56,0.14)] backdrop-blur-xl sm:p-7">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                  Wallet connected
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                  Welcome back
                </h1>
                <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-stone-600">
                  PawChain found an existing account linked to this wallet.
                  Login to continue or check your shelter application status.
                </p>

                <div className="mt-6 rounded-2xl border border-orange-100 bg-amber-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-stone-950">
                        Wallet found
                      </p>
                      <p className="mt-1 text-sm font-bold leading-5 text-stone-600">
                        Login as{" "}
                        <span className="text-[var(--color-orange)]">
                          {toUiRole(walletProfile.role)}
                        </span>{" "}
                        with the linked email.
                      </p>
                      <p className="mt-2 break-all text-xs font-bold text-stone-500">
                        {address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRole && isAuthOpen && (
                <div className="rounded-[2rem] border border-orange-100 bg-white/95 p-5 text-left shadow-[0_24px_80px_rgba(120,72,16,0.18)] backdrop-blur-xl sm:p-6">
                  {isShelterPending ? (
                    <ShelterStatusPanel
                      application={shelterApplication}
                      statusMessage={statusMessage}
                      isSubmitting={isSubmitting}
                      onCheckStatus={
                        canCheckShelterStatus
                          ? handleCheckShelterStatus
                          : undefined
                      }
                    />
                  ) : (
                    <>
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                        {selectedRole}
                      </p>
                      <h2 className="mt-2 text-3xl font-black tracking-tight text-stone-950">
                        Login
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        Enter the account password for the linked email. Pending
                        shelters will see their application status before
                        dashboard access is unlocked.
                      </p>

                      <form
                        className="mt-5 space-y-3"
                        onSubmit={(event) => {
                          void handleAuthSubmit(event);
                        }}
                      >
                        <TextField
                          label="Email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          readOnly
                          value={walletProfile.email}
                        />
                        <TextField
                          label="Password"
                          name="password"
                          type="password"
                          placeholder="Enter password"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full rounded-full bg-stone-950 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmitting ? "Please wait..." : "Login"}
                        </button>
                      </form>

                      {formError && (
                        <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
                          {formError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                Wallet connected
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                Select your role
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-6 text-stone-600">
                Welcome to PawChain registration
              </p>
              {address ? (
                <p className="mx-auto mt-4 max-w-xl break-all rounded-2xl border border-orange-100 bg-white/60 px-4 py-3 text-xs font-bold text-stone-500">
                  {address}
                </p>
              ) : null}
            </div>
          )}

          {!walletProfile && !isWalletLookupLoading && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {displayedRoleOptions.map((option) => (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => openAuthForm(option.role)}
                  className={`group flex min-h-[16rem] flex-col rounded-[1.75rem] border p-5 text-left shadow-[0_20px_70px_rgba(244,183,56,0.16)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-orange)] hover:bg-white hover:shadow-[0_28px_90px_rgba(255,138,0,0.22)] ${
                    selectedRole === option.role
                      ? "border-[var(--color-orange)] bg-white"
                      : "border-orange-100 bg-white/80"
                  }`}
                >
                  <span className="text-4xl font-black text-[var(--color-orange)] transition duration-300 group-hover:text-stone-950">
                    {option.role}
                  </span>
                  <h2 className="mt-4 text-xl font-black leading-tight">
                    {option.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    {option.description}
                  </p>
                  <div className="mt-4 space-y-2">
                    {option.points.map((point) => (
                      <div
                        key={point}
                        className="flex items-center gap-3 text-sm font-bold text-stone-700"
                      >
                        <span className="h-2 w-2 rounded-full bg-[var(--color-orange)] shadow-[0_0_12px_var(--color-orange)]" />
                        {point}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

    </div>
  );
}

function CheckingWalletCard({ address }: { address?: string }) {
  return (
    <div className="animate-fade-up mx-auto max-w-2xl rounded-[2rem] border border-orange-100 bg-white/86 p-7 text-center shadow-[0_24px_80px_rgba(244,183,56,0.18)] backdrop-blur-xl">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange-100 shadow-[0_0_34px_rgba(255,138,0,0.22)]">
        <span className="h-5 w-5 animate-pulse rounded-full bg-[var(--color-orange)] shadow-[0_0_18px_var(--color-orange)]" />
      </div>
      <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
        Checking role
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-stone-950">
        Finding your PawChain account
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-stone-600">
        We are checking whether this wallet already has a donor or shelter
        profile, including any shelter application under review.
      </p>
      {address ? (
        <p className="mx-auto mt-5 max-w-xl break-all rounded-2xl border border-orange-100 bg-amber-50/70 px-4 py-3 text-xs font-bold text-stone-500">
          {address}
        </p>
      ) : null}
      <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-orange-100">
        <div className="animate-shimmer h-full w-2/3 rounded-full bg-gradient-to-r from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-orange)]" />
      </div>
    </div>
  );
}

function ShelterStatusPanel({
  application,
  statusMessage,
  isSubmitting,
  onCheckStatus,
  onBack,
  onEdit,
}: {
  application: ShelterApplicationStatus | null;
  statusMessage: string;
  isSubmitting: boolean;
  onCheckStatus?: () => Promise<void>;
  onBack?: () => void;
  onEdit?: () => void;
}) {
  const isRejected = application?.status === "rejected";

  return (
    <div className="grid gap-6 text-left lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-xl font-black text-[var(--color-orange)]">
          !
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
          Shelter application status
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950">
          {isRejected ? (
            <>
              Application{" "}
              <span className="text-red-600 drop-shadow-sm">rejected</span>
            </>
          ) : (
            <>
              Your application is still{" "}
              <span className="text-[var(--color-orange)] drop-shadow-sm">
                pending
              </span>
            </>
          )}
        </h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          {isRejected
            ? "Admin reviewed your shelter application and did not approve it. Check the reason below before contacting admin or submitting again later."
            : "Your shelter account has been sent to the admin review queue. Shelter features stay locked until an admin confirms the organization is real and approves the request."}
        </p>
        {statusMessage && (
          <p className="mt-4 rounded-2xl border border-orange-100 bg-amber-50/70 px-4 py-3 text-sm font-bold text-stone-600">
            {statusMessage}
          </p>
        )}
      </div>

      <div>
        <div className="space-y-2 rounded-2xl border border-orange-100 bg-amber-50/60 p-4 text-sm font-bold text-stone-700">
          <p>
            Shelter:{" "}
            <span className="text-stone-950">
              {application?.shelterName ?? "-"}
            </span>
          </p>
          <p>
            Status:{" "}
            <span className="text-[var(--color-orange)]">
              {application?.status ?? "pending"}
            </span>
          </p>
          <p>
            Submitted:{" "}
            <span className="text-stone-950">
              {application?.submittedAt
                ? new Date(application.submittedAt).toLocaleString()
                : "-"}
            </span>
          </p>
          {application?.registrationId && (
            <p>
              Registration / NGO ID:{" "}
              <span className="text-stone-950">
                {application.registrationId}
              </span>
            </p>
          )}
          {application?.contactPhone && (
            <p>
              Contact phone:{" "}
              <span className="text-stone-950">
                {application.contactPhone}
              </span>
            </p>
          )}
          {application?.websiteUrl && (
            <p>
              Website / social:{" "}
              <span className="break-all text-stone-950">
                {application.websiteUrl}
              </span>
            </p>
          )}
          {application?.shelterAddress && (
            <p>
              Address:{" "}
              <span className="text-stone-950">
                {application.shelterAddress}
              </span>
            </p>
          )}
          {application?.organizationDescription && (
            <p>
              Description:{" "}
              <span className="text-stone-950">
                {application.organizationDescription}
              </span>
            </p>
          )}
          {application?.proofDocumentPath && (
            <p>
              Document:{" "}
              <span className="break-all text-stone-950">
                {application.proofDocumentPath}
              </span>
            </p>
          )}
          {application?.reviewedAt && (
            <p>
              Reviewed:{" "}
              <span className="text-stone-950">
                {new Date(application.reviewedAt).toLocaleString()}
              </span>
            </p>
          )}
          {application?.rejectionReason && (
            <p>
              Reason:{" "}
              <span className="text-stone-950">
                {application.rejectionReason}
              </span>
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {onCheckStatus ? (
            <button
              type="button"
              onClick={() => {
                void onCheckStatus();
              }}
              disabled={isSubmitting}
              className="rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Checking..." : "Check again"}
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full bg-gradient-to-r from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-orange)] px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-300/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-orange-300/80"
            >
              Edit and resubmit application
            </button>
          ) : null}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-orange-100 bg-white px-6 py-3 text-sm font-black text-stone-700 transition hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]"
            >
              Back to roles
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ShelterResubmitForm({
  application,
  formError,
  isSubmitting,
  profile,
  walletAddress,
  onCancel,
  onSubmit,
}: {
  application: ShelterApplicationStatus;
  formError: string;
  isSubmitting: boolean;
  profile: WalletProfile | null;
  walletAddress: string;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
            Shelter application
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-stone-950">
            Edit and resubmit
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Update the rejected application details below. Resubmitting will
            send it back to admin review.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-full border-2 border-[var(--color-orange)] bg-orange-100 px-5 py-2.5 text-sm font-black text-[var(--color-orange)] shadow-lg shadow-orange-200/60 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:text-white hover:shadow-orange-300/70"
        >
          Back to status
        </button>
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <TextField
          label="Connected wallet"
          name="walletAddress"
          placeholder="Connected wallet"
          readOnly
          value={walletAddress}
        />

        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-2.5 rounded-2xl border border-orange-100 bg-white/75 p-4">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
              1. Account owner
            </p>
            <p className="text-sm leading-6 text-stone-600">
              This account stays linked to the connected wallet while admin
              reviews the updated shelter details.
            </p>
            <TextField
              label="Full name"
              name="fullName"
              placeholder="Account owner"
              readOnly
              value={profile?.fullName ?? ""}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              readOnly
              value={profile?.email ?? ""}
            />
            <div className="rounded-2xl border border-red-100 bg-red-50/80 p-3 text-sm font-bold leading-6 text-red-700">
              Previous application was rejected. Update the shelter details and
              submit again for admin review.
            </div>
          </div>

          <div className="space-y-2.5 rounded-2xl border border-orange-100 bg-white/75 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                  2. Shelter details
                </p>
                <p className="text-sm leading-6 text-stone-600">
                  Admin uses this information to verify the organization.
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <TextField
                label="Shelter name"
                name="shelterName"
                placeholder="Happy Paws Shelter"
                defaultValue={application.shelterName}
              />
              <TextField
                label="Registration / NGO ID"
                name="registrationId"
                placeholder="Organization ID"
                defaultValue={application.registrationId}
              />
              <TextField
                label="Contact phone"
                name="contactPhone"
                type="tel"
                placeholder="+60..."
                defaultValue={application.contactPhone}
              />
              <TextField
                label="Website or social page"
                name="websiteUrl"
                type="url"
                placeholder="https://..."
                defaultValue={application.websiteUrl}
              />
            </div>
            <TextField
              label="Shelter address"
              name="shelterAddress"
              placeholder="Street, city, state, country"
              defaultValue={application.shelterAddress}
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
                defaultValue={application.organizationDescription}
                className="mt-1.5 w-full resize-none rounded-xl border border-orange-100 bg-white/80 px-3 py-2 text-sm font-bold text-stone-900 outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-orange-100 bg-amber-50/70 p-3.5">
          <label className="block text-left">
            <span className="text-sm font-black text-stone-700">Document</span>
            <input
              name="proofDocument"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="mt-1.5 w-full rounded-xl border border-dashed border-orange-200 bg-white/80 px-3 py-2 text-sm font-bold text-stone-700 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-3 file:py-1 file:text-sm file:font-black file:text-[var(--color-orange)]"
            />
          </label>
          <input
            type="hidden"
            name="existingProofDocumentPath"
            value={application.proofDocumentPath ?? ""}
          />
          {application.proofDocumentPath ? (
            <p className="text-xs font-bold text-stone-500">
              Current document: {application.proofDocumentPath}
            </p>
          ) : null}
        </div>

        {formError && (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
            {formError}
          </p>
        )}

        <div className="text-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
              Submit for admin review
            </p>
            <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-stone-600">
              Your updated shelter application will return to pending review.
              Shelter dashboard access stays locked until admin approves it.
            </p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mx-auto mt-3 flex rounded-full bg-stone-950 px-5 py-2 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Resubmitting..." : "Submit for admin review"}
          </button>
        </div>
      </form>
    </div>
  );
}
