import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CampaignFactorySepoliaModule = buildModule(
  "CampaignFactorySepoliaModule",
  (m) => {
    const roleNFTAddress = m.getParameter("roleNFTAddress");
    const campaignFactory = m.contract("CampaignFactory", [roleNFTAddress]);

    return { campaignFactory };
  },
);

export default CampaignFactorySepoliaModule;
