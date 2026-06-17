"use client";

import { useEffect, useState } from "react";
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
  {
    role: "Admin",
    title: "Review platform activity",
    description:
      "Verify shelters, approve campaigns, and review milestone fund releases.",
    points: ["Verify shelters", "Review campaigns", "Approve milestones"],
  },
];

type TextFieldProps = {
  label: string;
  type?: string;
  placeholder: string;
  readOnly?: boolean;
  value?: string;
};

function TextField({
  label,
  type = "text",
  placeholder,
  readOnly = false,
  value,
}: TextFieldProps) {
  return (
    <label className="block text-left">
      <span className="text-sm font-black text-stone-700">{label}</span>
      <input
        type={type}
        required={!readOnly}
        readOnly={readOnly}
        value={value}
        placeholder={placeholder}
        className={`mt-1.5 w-full rounded-xl border border-orange-100 px-3 py-2 text-sm font-bold outline-none transition focus:border-[var(--color-orange)] focus:ring-4 focus:ring-orange-100 ${
          readOnly
            ? "bg-white/60 text-stone-500"
            : "bg-white/80 text-stone-900"
        }`}
      />
    </label>
  );
}

export function RoleChooser() {
  const { address, isConnected } = useAppKitAccount();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isComplete, setIsComplete] = useState(false);
  const [isShelterPending, setIsShelterPending] = useState(false);
  const [lastAddress, setLastAddress] = useState<string | undefined>();

  useEffect(() => {
    if (!isConnected) {
      setSelectedRole(null);
      setIsAuthOpen(false);
      setAuthMode("login");
      setIsComplete(false);
      setIsShelterPending(false);
      setLastAddress(undefined);
      return;
    }

    if (address && address !== lastAddress) {
      setSelectedRole(null);
      setIsAuthOpen(false);
      setAuthMode("login");
      setIsComplete(false);
      setIsShelterPending(false);
      setLastAddress(address);
    }
  }, [address, isConnected, lastAddress]);

  const openAuthForm = (role: string) => {
    setSelectedRole(role);
    setAuthMode("login");
    setIsShelterPending(false);
    setIsAuthOpen(true);
  };

  const isRegister = authMode === "register";
  const isShelterRegister = selectedRole === "Shelter" && isRegister;
  const isDonorRegister = selectedRole === "Donor" && isRegister;

  if (!isConnected || isComplete) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-[var(--color-cream)] text-stone-950">
      <div className="animate-grid-drift pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,138,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,138,0,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--color-gold)]/30 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-20 border-b border-orange-200/70 bg-[linear-gradient(90deg,rgba(255,250,241,0.97),rgba(255,255,255,0.92)_46%,rgba(255,239,199,0.95))] shadow-[0_14px_42px_rgba(155,86,20,0.1)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 rounded-full px-1.5 py-1 sm:gap-3 sm:px-2">
            <span className="animate-shimmer grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 via-[var(--color-gold)] to-amber-300 text-sm font-black text-white shadow-lg shadow-orange-300/45 ring-1 ring-white/80 sm:h-10 sm:w-10">
              PC
            </span>
            <span className="block truncate text-base font-black leading-5 tracking-tight text-stone-950 sm:text-lg">
              PawChain
            </span>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 pb-6 pt-24 sm:px-6 lg:px-8">
        <section className="w-full max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Wallet connected
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Select your role
            </h1>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {roleOptions.map((option) => (
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
                <span className="mt-auto pt-4 text-sm font-black text-[var(--color-orange)]">
                  Continue as {option.role}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {selectedRole && isAuthOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-stone-950/35 px-4 py-5 backdrop-blur-sm">
          <section
            className={`max-h-[calc(100dvh-2.5rem)] w-full overflow-y-auto rounded-[2rem] border border-orange-100 bg-white/94 p-5 shadow-[0_24px_80px_rgba(120,72,16,0.24)] backdrop-blur-xl sm:p-6 ${
              isShelterRegister
                ? "max-w-5xl"
                : isDonorRegister
                  ? "max-w-2xl"
                  : "max-w-md"
            }`}
          >
            {isShelterPending ? (
              <div className="text-center">
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
                  Your shelter account has been sent to the admin review queue.
                  Shelter features stay locked until an admin confirms the
                  organization is real and approves the request.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(false)}
                  className="mt-7 rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70"
                >
                  Back to roles
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                      {selectedRole}
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
                      {authMode === "login" ? "Login" : "Create account"}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(false)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-orange-100 bg-white text-lg font-black text-stone-500 shadow-sm transition hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]"
                    aria-label="Close form"
                  >
                    x
                  </button>
                </div>

                  <p className="mt-1 text-sm leading-6 text-stone-600">
                  {authMode === "login"
                    ? "Enter your account details to continue with your selected role."
                    : "Register a new PawChain account for this connected wallet."}
                </p>

                <form
                  className={`mt-4 ${isShelterRegister ? "space-y-4" : "space-y-3"}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (isShelterRegister) {
                      setIsShelterPending(true);
                      return;
                    }
                    setIsComplete(true);
                  }}
                >
                  {isShelterRegister ? (
                    <>
                      <div>
                        <TextField
                          label="Connected wallet"
                          placeholder="Connected wallet"
                          readOnly
                          value={address ?? ""}
                        />
                      </div>

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
                            placeholder="Enter your name"
                          />
                          <TextField
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                          />
                          <TextField
                            label="Password"
                            type="password"
                            placeholder="Enter password"
                          />
                          <TextField
                            label="Confirm password"
                            type="password"
                            placeholder="Confirm password"
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
                              placeholder="Happy Paws Shelter"
                            />
                            <TextField
                              label="Registration / NGO ID"
                              placeholder="Organization ID"
                            />
                            <TextField
                              label="Contact phone"
                              type="tel"
                              placeholder="+60..."
                            />
                            <TextField
                              label="Website or social page"
                              type="url"
                              placeholder="https://..."
                            />
                          </div>
                          <TextField
                            label="Shelter address"
                            placeholder="Street, city, state, country"
                          />
                          <label className="block text-left">
                            <span className="text-sm font-black text-stone-700">
                              Description
                            </span>
                            <textarea
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
                          <span className="text-sm font-black text-stone-700">Document</span>
                          <input
                            type="file"
                            required
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="mt-1.5 w-full rounded-xl border border-dashed border-orange-200 bg-white/80 px-3 py-2 text-sm font-bold text-stone-700 file:mr-3 file:rounded-full file:border-0 file:bg-orange-100 file:px-3 file:py-1 file:text-sm file:font-black file:text-[var(--color-orange)]"
                          />
                        </label>
                      </div>

                      <div className="text-center">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)]">
                            Submit for admin review
                          </p>
                          <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-stone-600">
                            Shelter account needs to be reviewed and approved by admin before you can proceed with creating campaigns and managing donations.
                          </p>
                        </div>
                        <button
                          type="submit"
                          className="mx-auto mt-3 flex rounded-full bg-stone-950 px-5 py-2 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70"
                        >
                          Submit for admin review
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {isDonorRegister && (
                        <div>
                          <TextField
                            label="Connected wallet"
                            placeholder="Connected wallet"
                            readOnly
                            value={address ?? ""}
                          />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl border border-orange-100 bg-white/60 p-3.5 ${
                          isDonorRegister
                            ? "grid gap-3 bg-amber-50/35 sm:grid-cols-2"
                            : "space-y-2.5"
                        }`}
                      >
                      {isDonorRegister && (
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--color-orange)] sm:col-span-2">
                          Account details
                        </p>
                      )}

                      {authMode === "register" && (
                        <TextField
                          label="Full name"
                          placeholder="Enter your name"
                        />
                      )}
                      <TextField
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                      />
                      <TextField
                        label="Password"
                        type="password"
                        placeholder="Enter password"
                      />
                      {authMode === "register" && (
                        <TextField
                          label="Confirm password"
                          type="password"
                          placeholder="Confirm password"
                        />
                      )}

                      <button
                        type="submit"
                        className="w-full rounded-full bg-stone-950 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-orange)] hover:shadow-xl hover:shadow-orange-300/70 sm:col-span-2"
                      >
                        {isDonorRegister ? "Create account" : "Login"}
                      </button>
                      </div>
                    </>
                  )}
                </form>

                {authMode === "login" && selectedRole !== "Admin" ? (
                  <p className="mt-4 text-center text-sm font-bold text-stone-600">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className="font-black text-[var(--color-orange)] transition hover:text-stone-950"
                    >
                      Create one
                    </button>
                  </p>
                ) : authMode === "register" ? (
                  <p className="mt-4 text-center text-sm font-bold text-stone-600">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className="font-black text-[var(--color-orange)] transition hover:text-stone-950"
                    >
                      Login
                    </button>
                  </p>
                ) : null}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
