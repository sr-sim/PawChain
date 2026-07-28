import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { keccak256, parseEther, toBytes } from "viem";

const adminOne = "0x6aFf4af1a3f45adBbEa5d64955387b2f809521A6";

async function expectRevert(action: Promise<unknown>, message: string) {
  try {
    await action;
  } catch (error) {
    expect(error).to.be.instanceOf(Error);
    expect((error as Error).message).to.include(message);
    return;
  }

  throw new Error(`Expected transaction to revert with "${message}".`);
}

describe("CampaignFactory with the real RoleNFT", function () {
  async function deployFixture() {
    const [owner, shelter] = await hre.viem.getWalletClients();
    const testClient = await hre.viem.getTestClient();

    const roleNFT = await hre.viem.deployContract("RoleNFT", [
      owner.account.address,
    ]);
    await roleNFT.write.safeMintShelter([
      shelter.account.address,
      "verified-shelter-cid",
    ]);

    const factory = await hre.viem.deployContract("CampaignFactory", [
      roleNFT.address,
    ]);

    await testClient.impersonateAccount({ address: adminOne });
    await testClient.setBalance({
      address: adminOne,
      value: parseEther("10"),
    });
    const adminWallet = await hre.viem.getWalletClient(adminOne);
    const factoryAsAdmin = await hre.viem.getContractAt(
      "CampaignFactory",
      factory.address,
      { client: { wallet: adminWallet } },
    );

    return {
      owner,
      shelter,
      roleNFT,
      factory,
      factoryAsAdmin,
      testClient,
    };
  }

  it("combines RoleNFT verification with the sequential campaign flow", async function () {
    const {
      shelter,
      roleNFT,
      factory,
      factoryAsAdmin,
      testClient,
    } = await loadFixture(deployFixture);
    const campaignKey = keccak256(toBytes("real-role-nft-campaign"));
    const deadline = BigInt((await time.latest()) + 30 * 24 * 60 * 60);

    expect(await roleNFT.read.isAdmin([adminOne])).to.equal(true);
    expect(await factory.read.isPlatformAdmin([adminOne])).to.equal(true);

    await factoryAsAdmin.write.createApprovedCampaign([
      campaignKey,
      shelter.account.address,
      parseEther("1"),
      deadline,
      [500, 9500],
    ]);

    const campaignAddress = await factory.read.campaignByKey([campaignKey]);
    const campaign = await hre.viem.getContractAt(
      "Campaign",
      campaignAddress,
    );

    expect(await factory.read.FLOW_VERSION()).to.equal(2n);
    expect(await campaign.read.FLOW_VERSION()).to.equal(2n);
    expect((await campaign.read.getMilestone([0n])).status).to.equal(1);
    expect((await campaign.read.getMilestone([1n])).status).to.equal(0);

    await roleNFT.write.revokeRoleNFT([shelter.account.address]);
    await expectRevert(
      factoryAsAdmin.write.createApprovedCampaign([
        keccak256(toBytes("revoked-real-role-nft-campaign")),
        shelter.account.address,
        parseEther("1"),
        deadline,
        [500, 9500],
      ]),
      "Verified shelter required",
    );

    await testClient.stopImpersonatingAccount({ address: adminOne });
  });
});
