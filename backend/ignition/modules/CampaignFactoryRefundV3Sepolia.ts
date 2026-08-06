import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CampaignFactoryRefundV3SepoliaModule = buildModule(
  "CampaignFactoryRefundV3SepoliaModule",
  (m) => {
    const roleNFTAddress = m.getParameter("roleNFTAddress");
    const roleNFT = m.contractAt("RoleNFT", roleNFTAddress);
    const campaignFactory = m.contract("CampaignFactory", [roleNFTAddress]);

    // A factory must be an authorized manager before campaigns created by it
    // can register themselves as RoleNFT donation recorders.
    m.call(roleNFT, "authorizeRecorderManager", [campaignFactory, true]);

    return { campaignFactory };
  },
);

export default CampaignFactoryRefundV3SepoliaModule;
