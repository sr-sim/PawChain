export type DonorPreferenceKey =
  | "milestoneUpdates"
  | "refundUpdates"
  | "supportReplies"
  | "shortWallet"
  | "privateReports";

export type DonorPreferenceState = Record<DonorPreferenceKey, boolean>;

export const defaultDonorPreferences: DonorPreferenceState = {
  milestoneUpdates: true,
  refundUpdates: true,
  supportReplies: true,
  shortWallet: true,
  privateReports: true,
};

export function getDonorPreferenceStoreKey(walletAddress?: string | null) {
  return walletAddress
    ? `pawchain:donor-settings:${walletAddress.toLowerCase()}`
    : "pawchain:donor-settings";
}

export function loadDonorPreferences(walletAddress?: string | null) {
  if (typeof window === "undefined") {
    return defaultDonorPreferences;
  }

  try {
    const saved = window.localStorage.getItem(
      getDonorPreferenceStoreKey(walletAddress),
    );

    if (!saved) {
      return defaultDonorPreferences;
    }

    return {
      ...defaultDonorPreferences,
      ...(JSON.parse(saved) as Partial<DonorPreferenceState>),
    };
  } catch {
    return defaultDonorPreferences;
  }
}

export function saveDonorPreferences(
  walletAddress: string | null | undefined,
  preferences: DonorPreferenceState,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getDonorPreferenceStoreKey(walletAddress),
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event("pawchain:donor-settings-changed"));
}

type NotificationLike = {
  title: string;
  message: string;
  status?: string;
};

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function isNotificationAllowedByPreferences(
  notification: NotificationLike,
  preferences: DonorPreferenceState,
) {
  const text = `${notification.title} ${notification.message} ${
    notification.status ?? ""
  }`.toLowerCase();

  if (
    !preferences.refundUpdates &&
    includesAny(text, ["refund", "refunded", "claimable", "claim refund"])
  ) {
    return false;
  }

  if (
    !preferences.supportReplies &&
    includesAny(text, ["support", "report", "reply", "admin response"])
  ) {
    return false;
  }

  if (
    !preferences.milestoneUpdates &&
    includesAny(text, [
      "milestone",
      "proof",
      "release",
      "released",
      "campaign completed",
      "completed",
    ])
  ) {
    return false;
  }

  return true;
}
