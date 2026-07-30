export const campaigns = [
  {
    id: "food-support",
    title: "Emergency Food Support",
    shelterId: "happy-paws",
    shelter: "Happy Paws Shelter",
    location: "Kuala Lumpur",
    urgency: "High",
    status: "Active",
    duration: "60 days",
    raised: 68,
    goal: "RM 8,000",
    donors: 42,
    daysLeft: 12,
    verifiedSince: "2025",
    animalsHelped: "180+",
    imageClass: "from-orange-200 via-amber-100 to-white",
    story:
      "Happy Paws Shelter cares for rescued cats and dogs while they wait for adoption. This campaign keeps daily meals stable for the next month.",
    campaignDetails:
      "Funds will be used for dry food, wet food, milk replacement, and nutrition supplements. Proof of purchase will be uploaded before the next milestone release.",
    milestones: [
      { title: "Food supplier invoice", percentage: 30 },
      { title: "First delivery proof", percentage: 30 },
      { title: "Monthly feeding report", percentage: 40 },
    ],
  },
  {
    id: "medical-recovery",
    title: "Medical Recovery Fund",
    shelterId: "safe-tails",
    shelter: "Safe Tails Rescue",
    location: "Selangor",
    urgency: "Critical",
    status: "Active",
    duration: "90 days",
    raised: 42,
    goal: "RM 12,500",
    donors: 27,
    daysLeft: 19,
    verifiedSince: "2024",
    animalsHelped: "95+",
    imageClass: "from-red-100 via-orange-100 to-white",
    story:
      "Safe Tails Rescue takes in animals with urgent medical needs. This campaign supports treatment, medication, wound care, and recovery.",
    campaignDetails:
      "Donations are planned across vet consultation, treatment payment, and recovery supplies. Milestone proof includes clinic invoices and recovery updates.",
    milestones: [
      { title: "Vet quotation uploaded", percentage: 25 },
      { title: "Treatment payment proof", percentage: 45 },
      { title: "Recovery progress update", percentage: 30 },
    ],
  },
  {
    id: "kennel-upgrade",
    title: "Warm Kennel Upgrade",
    shelterId: "second-chance",
    shelter: "Second Chance Home",
    location: "Penang",
    urgency: "Medium",
    status: "Active",
    duration: "30 days",
    raised: 81,
    goal: "RM 6,500",
    donors: 58,
    daysLeft: 7,
    verifiedSince: "2023",
    animalsHelped: "240+",
    imageClass: "from-yellow-100 via-orange-100 to-white",
    story:
      "Second Chance Home provides temporary shelter for abandoned animals. This campaign improves sleeping areas and kennel equipment.",
    campaignDetails:
      "Funds will support raised beds, washable mats, sanitation supplies, and basic kennel repairs. Photos and purchase receipts will be submitted as milestone proof.",
    milestones: [
      { title: "Equipment purchase", percentage: 40 },
      { title: "Kennel setup photos", percentage: 35 },
      { title: "Final safety check", percentage: 25 },
    ],
  },
  {
    id: "vaccination-drive",
    title: "Vaccination Drive",
    shelterId: "furry-friends",
    shelter: "Furry Friends Network",
    location: "Johor",
    urgency: "Medium",
    status: "Active",
    duration: "60 days",
    raised: 35,
    goal: "RM 9,000",
    donors: 21,
    daysLeft: 24,
    verifiedSince: "2025",
    animalsHelped: "70+",
    imageClass: "from-emerald-100 via-orange-50 to-white",
    story:
      "Furry Friends Network works with foster homes and small rescue teams. This campaign helps vaccinate rescued animals before adoption.",
    campaignDetails:
      "The campaign covers vaccination appointments, transport to clinics, and digital health record preparation for future adopters.",
    milestones: [
      { title: "Clinic appointment list", percentage: 30 },
      { title: "Vaccination receipts", percentage: 50 },
      { title: "Health record summary", percentage: 20 },
    ],
  },
  {
    id: "adoption-care-kits",
    title: "Adoption Care Kits",
    shelterId: "happy-paws",
    shelter: "Happy Paws Shelter",
    location: "Kuala Lumpur",
    urgency: "Medium",
    status: "Active",
    duration: "30 days",
    raised: 54,
    goal: "RM 5,500",
    donors: 31,
    daysLeft: 16,
    verifiedSince: "2025",
    animalsHelped: "180+",
    imageClass: "from-orange-100 via-yellow-50 to-white",
    story:
      "Happy Paws Shelter prepares rescued animals for adoption with starter care kits, basic grooming, and adopter handover supplies.",
    campaignDetails:
      "Funds will be used for leashes, carriers, grooming supplies, and starter food packs for animals moving into new homes.",
    milestones: [
      { title: "Kit supplier receipt", percentage: 35 },
      { title: "Prepared adoption kits", percentage: 35 },
      { title: "Adopter handover report", percentage: 30 },
    ],
  },
];

export type Campaign = (typeof campaigns)[number] & {
  imageUrl?: string | null;
  shelterImageUrl?: string | null;
};

type CampaignWithoutRequiredLocation = Omit<Campaign, "location"> & {
  location?: string;
};

export function getShelters(
  sourceCampaigns: CampaignWithoutRequiredLocation[] = campaigns,
) {
  const shelterMap = new Map<string, {
    id: string;
    name: string;
    location: string;
    verifiedSince: string;
    animalsHelped: string;
    imageClass: string;
    imageUrl?: string | null;
    story: string;
    campaigns: CampaignWithoutRequiredLocation[];
  }>();

  sourceCampaigns.forEach((campaign) => {
    const existing = shelterMap.get(campaign.shelterId);

    if (existing) {
      existing.campaigns.push(campaign);
      return;
    }

    shelterMap.set(campaign.shelterId, {
      id: campaign.shelterId,
      name: campaign.shelter,
      location: campaign.location ?? "Malaysia",
      verifiedSince: campaign.verifiedSince,
      animalsHelped: campaign.animalsHelped,
      imageClass: campaign.imageClass,
      imageUrl: campaign.shelterImageUrl ?? null,
      story: campaign.story,
      campaigns: [campaign],
    });
  });

  return Array.from(shelterMap.values());
}
