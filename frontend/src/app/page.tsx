"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { ConnectWallet } from "./components/ConnectWallet";
import IntroAnimation from "./components/IntroAnimation";
import { RoleChooser } from "./components/RoleChooser";

const features = [
  {
    title: "Verified Shelters",
    text: "Shelter profiles and campaigns are reviewed before donations can begin.",
  },
  {
    title: "On-chain Donation Tracking",
    text: "Every donation links to a blockchain transaction hash for public traceability.",
  },
  {
    title: "Milestone-based Fund Release",
    text: "Funds stay protected until approved milestones unlock the next release.",
  },
  {
    title: "Transparent Fund Usage",
    text: "Donors can follow proof submissions, approvals, and campaign progress.",
  },
];

const steps = [
  "Connect Wallet",
  "Choose Verified Campaign",
  "Donate Securely",
  "Track Milestones and Fund Release",
];

const roles = [
  {
    role: "Donor",
    description: "Donate to campaigns, view transaction hashes, and track milestones.",
  },
  {
    role: "Shelter",
    description: "Create verified campaigns and submit milestone proof for review.",
  },
  {
    role: "Admin",
    description: "Verify shelters, approve campaigns, and review milestone releases.",
  },
];

const teamMembers = [
  {
    id: 1,
    name: "Gan Anwen",
    role: "Fullstack Developer",
    image: "/images/anwen.png",
  },
  {
    id: 2,
    name: "Saw Khoo Mei Huey",
    role: "Fullstack Developer",
    image: "/images/macy.png",
  },
  {
    id: 3,
    name: "Sim Soo Ruan",
    role: "Fullstack Developer",
    image: "/images/sooruan.png",
  },
];

const flow = [
  "Donor",
  "Smart Contract",
  "Milestone Approval",
  "Shelter Fund Release",
];

const contractPoints = [
  "Donation received",
  "Funds locked",
  "Milestone approved",
  "Funds released",
];

const navItems = [
  { label: "Home", id: "home" },
  { label: "How It Works", id: "how-it-works" },
  { label: "About", id: "about" },
  { label: "Team", id: "team" },
];

function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="animate-fade-up mx-auto mb-12 max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-orange)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold text-stone-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-stone-600">{text}</p>
    </div>
  );
}

function GlowCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`group rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(244,183,56,0.18)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-2 hover:border-orange-200 hover:bg-white/85 hover:shadow-[0_34px_110px_rgba(255,138,0,0.24)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAppKitAccount();
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const shouldSkipIntro =
      window.sessionStorage.getItem("skipIntroOnce") === "true";

    if (shouldSkipIntro) {
      window.sessionStorage.removeItem("skipIntroOnce");
    }

    return !shouldSkipIntro;
  });
  const [activeSection, setActiveSection] = useState("home");
  const wasConnectedRef = useRef(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true;
      return;
    }

    if (wasConnectedRef.current) {
      wasConnectedRef.current = false;
      setShowIntro(true);
    }
  }, [isConnected]);

  useEffect(() => {
    if (showIntro || isConnected) {
      return;
    }

    const sectionElements = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        rootMargin: "-35% 0px -55% 0px",
        threshold: [0.08, 0.2, 0.4],
      },
    );

    sectionElements.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [isConnected, showIntro]);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    const headerOffset = (navRef.current?.getBoundingClientRect().height ?? 0) + 18;
    const sectionTop =
      section.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: Math.max(sectionTop, 0),
      behavior: "smooth",
    });

    window.history.replaceState(null, "", `#${sectionId}`);
    setActiveSection(sectionId);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-cream)] text-stone-950">
      {showIntro && (
        <IntroAnimation onComplete={() => setShowIntro(false)} />
      )}
      {!showIntro && isConnected && <RoleChooser />}
      {!showIntro && !isConnected && (
      <div>
        <div className="animate-grid-drift pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,138,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,138,0,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="animate-float-slow pointer-events-none fixed left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--color-gold)]/30 blur-3xl" />
        <div className="animate-pulse-soft pointer-events-none fixed right-10 top-32 hidden h-3 w-3 rounded-full bg-[var(--color-orange)] shadow-[0_0_32px_var(--color-orange)] lg:block" />
        <div className="animate-pulse-soft delay-300 pointer-events-none fixed bottom-24 left-12 hidden h-2.5 w-2.5 rounded-full bg-[var(--color-gold)] shadow-[0_0_28px_var(--color-gold)] lg:block" />
        <div className="relative">
        <nav ref={navRef} className="fixed inset-x-0 top-0 z-50 border-b border-orange-200/70 bg-[linear-gradient(90deg,rgba(255,250,241,0.97),rgba(255,255,255,0.92)_46%,rgba(255,239,199,0.95))] shadow-[0_14px_42px_rgba(155,86,20,0.1)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
            <a
              href="#home"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("home");
              }}
              className="flex min-w-0 items-center gap-2.5 rounded-full border border-transparent px-1.5 py-1 transition duration-300 hover:border-orange-100 hover:bg-white/70 hover:shadow-sm sm:gap-3 sm:px-2"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-orange-300/45 ring-1 ring-white/80 sm:h-10 sm:w-10">
                <img
                  src="/images/logo.png"
                  alt="PawChain logo"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-black leading-5 tracking-tight text-stone-950 sm:text-lg">
                  PawChain
                </span>
              </span>
            </a>
            <div className="hidden items-center gap-1 rounded-full border border-orange-100/90 bg-white/62 p-1 text-sm font-black text-stone-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_28px_rgba(244,183,56,0.11)] lg:flex">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(item.id);
                  }}
                  className={`relative rounded-full px-3.5 py-2 transition-all duration-300 ${
                    activeSection === item.id
                      ? "bg-amber-100 text-stone-950 shadow-sm ring-1 ring-orange-100"
                      : "hover:bg-amber-50 hover:text-[var(--color-orange)]"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ConnectWallet />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-orange-100/80 bg-amber-50/55 px-4 py-2 text-sm font-black text-stone-700 sm:px-6 lg:hidden">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection(item.id);
                }}
                className={`shrink-0 rounded-full px-3.5 py-2 transition-all duration-300 ${
                  activeSection === item.id
                    ? "bg-white text-[var(--color-orange)] shadow-sm ring-1 ring-orange-100"
                    : "bg-white/45 hover:bg-white hover:text-[var(--color-orange)]"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <section
          id="home"
          className="scroll-mt-36 mx-auto grid max-w-7xl items-center gap-8 px-6 pb-14 pt-36 md:scroll-mt-28 md:pt-28 lg:min-h-screen lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-16 lg:pt-28"
        >
          <div className="animate-fade-up">
            <h1 className="max-w-5xl text-4xl font-black leading-[1.04] tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              Transparent Donations for Animal Shelters Through Blockchain
            </h1>
            <p className="animate-fade-up delay-100 mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              Support verified shelters, track every donation on-chain, and
              monitor fund usage through milestone-based smart contracts that
              release support only after approved progress.
            </p>
            <div className="animate-fade-up delay-200 mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#how-it-works"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("how-it-works");
                }}
                className="animate-shimmer rounded-full bg-gradient-to-r from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-orange)] px-6 py-3 text-center text-sm font-black text-white shadow-2xl shadow-orange-300/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-orange-300/80"
              >
                See How It Works
              </a>
            </div>
          </div>

          <GlowCard className="animate-fade-float relative p-4 sm:p-6">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[var(--color-orange)]/20 blur-2xl transition duration-500 group-hover:bg-[var(--color-orange)]/30" />
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-orange)]">
                  Donation Flow
                </p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">
                  Smart Contract Route
                </h2>
              </div>
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                Verified
              </div>
            </div>
            <div className="space-y-3">
              {flow.map((item, index) => (
                <div
                  key={item}
                  className="relative flex items-center gap-4 transition duration-300 hover:translate-x-1"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-white to-orange-100 font-black text-[var(--color-orange)] shadow-inner transition duration-300 hover:scale-110">
                    {index + 1}
                  </div>
                  <div className="flex-1 rounded-2xl border border-orange-100 bg-white/75 p-3 shadow-sm transition duration-300 hover:border-orange-200 hover:bg-white">
                    <p className="font-bold text-stone-900">{item}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {index === 0 && "Wallet confirms the donation"}
                      {index === 1 && "Funds are locked with rules"}
                      {index === 2 && "Admin validates submitted proof"}
                      {index === 3 && "Approved funds reach the shelter"}
                    </p>
                  </div>
                  {index < flow.length - 1 && (
                    <span className="absolute left-5 top-12 h-5 w-px bg-gradient-to-b from-[var(--color-orange)] to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </GlowCard>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <GlowCard
                key={feature.title}
                className="animate-fade-up rounded-3xl"
                style={{ animationDelay: `${index * 90}ms` } as React.CSSProperties}
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 shadow-[0_0_30px_rgba(255,138,0,0.22)] transition duration-500 group-hover:rotate-3 group-hover:scale-110">
                  <span className="h-3 w-3 rounded-full bg-[var(--color-orange)] shadow-[0_0_16px_var(--color-orange)]" />
                </div>
                <h3 className="text-lg font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {feature.text}
                </p>
              </GlowCard>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-32 mx-auto max-w-7xl px-6 py-16 md:scroll-mt-24 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="How it works"
            title="A simple path from wallet to verified impact"
            text="PawChain turns each donation into a visible sequence of wallet confirmation, campaign progress, milestone proof, and smart contract release."
          />
          <div className="grid gap-5 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="animate-fade-up group rounded-3xl border border-orange-100 bg-white/65 p-6 shadow-lg shadow-orange-100/50 backdrop-blur transition-all duration-500 hover:-translate-y-2 hover:border-[var(--color-orange)] hover:bg-white/80 hover:shadow-2xl hover:shadow-orange-200/60"
                style={{ animationDelay: `${index * 110}ms` }}
              >
                <span className="text-sm font-black text-[var(--color-orange)]">
                  Step {index + 1}
                </span>
                <h3 className="mt-4 text-xl font-black">{step}</h3>
                <div className="mt-8 h-1 rounded-full bg-orange-100">
                  <div className="animate-shimmer h-full w-2/3 rounded-full bg-gradient-to-r from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-orange)] transition-all duration-700 group-hover:w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="scroll-mt-32 mx-auto max-w-7xl px-6 py-16 md:scroll-mt-24 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="Roles"
            title="Built for donors, shelters, and reviewers"
            text="Each role has a focused workflow so campaign creation, giving, proof review, and fund release stay easy to understand."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((role, index) => (
              <GlowCard
                key={role.role}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 120}ms` } as React.CSSProperties}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-orange)]">
                  {role.role}
                </p>
                <h3 className="mt-4 text-2xl font-black">{role.role} Portal</h3>
                <p className="mt-4 leading-7 text-stone-600">{role.description}</p>
              </GlowCard>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="animate-fade-up grid items-center gap-10 rounded-[2.5rem] border border-white/70 bg-white/65 p-6 shadow-[0_30px_100px_rgba(244,183,56,0.2)] backdrop-blur-xl transition-all duration-500 hover:border-orange-100 hover:bg-white/75 hover:shadow-[0_36px_120px_rgba(255,138,0,0.24)] md:grid-cols-[0.9fr_1.1fr] md:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-orange)]">
                Smart contract transparency
              </p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                Donations stay traceable from receipt to release
              </h2>
              <p className="mt-5 leading-8 text-stone-600">
                Funds are stored and released using smart contracts. Donors can
                see when funds arrive, when they are locked, when milestone proof
                is approved, and when approved funds are released to shelters.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {contractPoints.map((point, index) => (
                <div
                  key={point}
                  className="group rounded-3xl border border-orange-100 bg-[var(--color-cream)]/70 p-5 shadow-inner transition-all duration-500 hover:-translate-y-1 hover:bg-white/70 hover:shadow-lg hover:shadow-orange-100"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sm font-black text-[var(--color-orange)] shadow transition duration-500 group-hover:scale-110 group-hover:shadow-[0_0_24px_rgba(255,138,0,0.28)]">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-black">{point}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="team" className="scroll-mt-32 mx-auto max-w-7xl px-6 py-16 md:scroll-mt-24 lg:px-8 lg:py-20">
          <SectionHeader
            eyebrow="Our team"
            title="The builders behind PawChain"
            text="A focused fullstack team building transparent donation workflows for shelters, donors, and reviewers."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className="animate-fade-up group flex flex-col items-center rounded-[2rem] border border-white/70 bg-white/70 p-6 text-center shadow-[0_24px_80px_rgba(244,183,56,0.16)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-orange-200 hover:bg-white/85 hover:shadow-[0_34px_110px_rgba(255,138,0,0.22)]"
                style={{ animationDelay: `${index * 110}ms` } as React.CSSProperties}
              >
                <div className="relative mb-5 h-44 w-44 rounded-full">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[var(--color-orange)] via-[var(--color-gold)] to-[var(--color-peach)] opacity-70 blur transition duration-500 group-hover:opacity-100" />
                  <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white bg-amber-50 shadow-[0_18px_55px_rgba(255,138,0,0.22)]">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      sizes="176px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>
                <h3 className="text-xl font-black text-stone-950">
                  {member.name}
                </h3>
                <p className="mt-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-black text-[var(--color-orange)]">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-orange-200/80 bg-white/55 px-6 py-10 backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <a
                href="#home"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("home");
                }}
                className="inline-flex items-center gap-3 rounded-full transition duration-300 hover:opacity-80"
              >
                <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-orange-300/40 ring-1 ring-white/80">
                  <img
                    src="/images/logo.png"
                    alt="PawChain logo"
                    className="h-full w-full object-contain"
                  />
                </span>
                <span className="text-lg font-black tracking-tight text-stone-950">
                  PawChain
                </span>
              </a>
              <p className="mt-4 text-sm leading-6 text-stone-600">
                Transparent shelter donations powered by wallet confirmation,
                milestone proof, and smart contract fund release.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                  Explore
                </h3>
                <div className="mt-4 grid gap-3 text-sm font-bold text-stone-700">
                  {navItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToSection(item.id);
                      }}
                      className="transition duration-300 hover:text-[var(--color-orange)]"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
                  Platform
                </h3>
                <div className="mt-4 grid gap-3 text-sm font-bold text-stone-700">
                  <span>Verified campaigns</span>
                  <span>On-chain tracking</span>
                  <span>Milestone approvals</span>
                  <span>Secure fund release</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-orange-100 pt-6 text-sm font-semibold text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 PawChain. All rights reserved.</p>
            <p>Built for transparent animal shelter support.</p>
          </div>
        </footer>
        </div>
      </div>
      )}
    </main>
  );
}
