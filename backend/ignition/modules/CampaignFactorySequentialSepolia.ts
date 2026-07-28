import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CampaignFactorySequentialSepoliaModule", (module) => {
  const roleNFTAddress = module.getParameter("roleNFTAddress");
  const campaignFactory = module.contract("CampaignFactory", [roleNFTAddress]);

  return { campaignFactory };
});
