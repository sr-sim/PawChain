import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PawChainModule = buildModule("PawChainModule", (m) => {
  const initialOwner = m.getAccount(0);
  const roleNFT = m.contract("RoleNFT", [initialOwner]);
  const campaignFactory = m.contract("CampaignFactory", [roleNFT]);
  m.call(roleNFT, "authorizeRecorderManager", [campaignFactory, true]);

  return { roleNFT, campaignFactory };
});

export default PawChainModule;
