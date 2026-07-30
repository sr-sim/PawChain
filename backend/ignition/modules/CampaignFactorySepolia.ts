import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CampaignFactorySepoliaModule = buildModule(
  "CampaignFactorySepoliaModule",
  (m) => {
    const roleNFTAddress = m.getParameter("roleNFTAddress");
    const roleNFT = m.contractAt("RoleNFT", roleNFTAddress);
    const campaignFactory = m.contract("CampaignFactory", [roleNFTAddress]);
    m.call(roleNFT, "authorizeRecorderManager", [campaignFactory, true]);

    return { campaignFactory };
  },
);

export default CampaignFactorySepoliaModule;
