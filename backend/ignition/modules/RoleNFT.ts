import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RoleNFTModule = buildModule("RoleNFTModule", (m) => {
  const initialOwner = m.getAccount(0);
  const roleNFT = m.contract("RoleNFT", [initialOwner]);

  return { roleNFT };
});

export default RoleNFTModule;
