import type { DonorBadgeLevel } from "@/lib/role-nft";

export type DonorBadgeTier = {
  level: DonorBadgeLevel;
  name: string;
  requiredEth: number;
  imageUrl: string;
  description: string;
};

export const donorBadgeTiers: DonorBadgeTier[] = [
  {
    level: "normal",
    name: "Normal Donor",
    requiredEth: 0,
    imageUrl:
      "https://ipfs.io/ipfs/bafybeibu3k4astxm44cssvk6vzxgeijyz2ne2r3fosceuwlxf3q4ulwc24",
    description: "Default donor RoleNFT after registration.",
  },
  {
    level: "bronze",
    name: "Bronze Donor",
    requiredEth: 0.05,
    imageUrl:
      "https://ipfs.io/ipfs/bafybeiheq47evqyr3465xgz7mp532tyu3o4ptb3ep226nzqhrthx65lbti",
    description: "First milestone for confirmed donations.",
  },
  {
    level: "silver",
    name: "Silver Donor",
    requiredEth: 0.2,
    imageUrl:
      "https://ipfs.io/ipfs/bafybeig24h6rxs6ctidsfhckk2rxkzmkp3mkdsleqwcw3rbmopwjysb3mu",
    description: "Recognizes repeated support across campaigns.",
  },
  {
    level: "gold",
    name: "Gold Donor",
    requiredEth: 0.5,
    imageUrl:
      "https://ipfs.io/ipfs/bafybeifrxdhhcukz3uowivczom2cgqvhdpu6o4clwkxqnj2dpbb4eixjqm",
    description: "High-impact donor support for verified shelters.",
  },
  {
    level: "hero",
    name: "Hero Donor",
    requiredEth: 1,
    imageUrl:
      "https://ipfs.io/ipfs/bafybeif3rlh6hyli7o4dktyyva5q4uvftzyxzpwqa6nagxzi3cnfsirbwe",
    description: "Top donor badge for major campaign contributions.",
  },
];

export function formatBadgeEth(value: number) {
  return `${value.toLocaleString("en-MY", {
    maximumFractionDigits: 6,
  })} ETH`;
}

export function getBadgeTier(level?: DonorBadgeLevel | null) {
  return (
    donorBadgeTiers.find((tier) => tier.level === level) ?? donorBadgeTiers[0]
  );
}

export function getEarnedBadgeTier(totalEth: number) {
  return donorBadgeTiers.reduce((earned, tier) => {
    return totalEth >= tier.requiredEth ? tier : earned;
  }, donorBadgeTiers[0]);
}

export function getNextBadgeTier(level?: DonorBadgeLevel | null) {
  const currentIndex = donorBadgeTiers.findIndex((tier) => tier.level === level);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  return donorBadgeTiers[safeIndex + 1] ?? null;
}

export function getBadgeProgress(
  totalEth: number,
  currentLevel?: DonorBadgeLevel | null,
) {
  const currentTier = getBadgeTier(currentLevel);
  const nextTier = getNextBadgeTier(currentTier.level);

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      remainingEth: 0,
      progress: 100,
    };
  }

  const range = nextTier.requiredEth - currentTier.requiredEth;
  const progress =
    range > 0 ? ((totalEth - currentTier.requiredEth) / range) * 100 : 100;

  return {
    currentTier,
    nextTier,
    remainingEth: Math.max(0, nextTier.requiredEth - totalEth),
    progress: Math.max(0, Math.min(100, progress)),
  };
}
