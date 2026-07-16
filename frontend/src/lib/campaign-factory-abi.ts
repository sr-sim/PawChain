export const campaignFactoryAbi = [
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { indexed: true, name: "campaignKey", type: "bytes32" },
      { indexed: true, name: "shelter", type: "address" },
      { indexed: true, name: "campaign", type: "address" },
      { indexed: false, name: "admin", type: "address" },
      { indexed: false, name: "goal", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "createApprovedCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignKey", type: "bytes32" },
      { name: "shelter", type: "address" },
      { name: "goalWei", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "milestonePercentages", type: "uint16[]" },
    ],
    outputs: [{ name: "campaignAddress", type: "address" }],
  },
  {
    type: "function",
    name: "campaignByKey",
    stateMutability: "view",
    inputs: [{ name: "campaignKey", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
