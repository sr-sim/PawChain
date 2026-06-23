import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

const DonorLevel = {
  None: 0,
  Normal: 1,
  Bronze: 2,
  Silver: 3,
  Gold: 4,
  Hero: 5,
} as const;
const adminOne = "0x6aFf4af1a3f45adBbEa5d64955387b2f809521A6";
const adminTwo = "0x0D900c6FeF62E96Aa8Cf5788170A516aC66f3776";

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

describe("RoleNFT", function () {
  async function deployRoleNFTFixture() {
    const [owner, donor, shelter, otherAccount] =
      await hre.viem.getWalletClients();
    const roleNFT = await hre.viem.deployContract("RoleNFT", [
      owner.account.address,
    ]);

    return {
      roleNFT,
      owner,
      donor,
      shelter,
      otherAccount,
    };
  }

  it("mints donor NFTs at the Normal donor level", async function () {
    const { roleNFT, donor } = await loadFixture(deployRoleNFTFixture);

    await roleNFT.write.safeMintDonor([donor.account.address, "donor-cid"]);

    const tokenId = await roleNFT.read.userTokenId([donor.account.address]);

    expect(await roleNFT.read.hasRoleNFT([donor.account.address])).to.equal(
      true,
    );
    expect(await roleNFT.read.getUserRole([donor.account.address])).to.equal(
      "Donor",
    );
    expect(await roleNFT.read.donorLevelOf([tokenId])).to.equal(
      DonorLevel.Normal,
    );
    expect(await roleNFT.read.tokenURI([tokenId])).to.equal(
      "https://ipfs.io/ipfs/donor-cid",
    );
  });

  it("recognizes the fixed admin wallets", async function () {
    const { roleNFT, donor } = await loadFixture(deployRoleNFTFixture);

    expect(await roleNFT.read.isAdmin([adminOne])).to.equal(true);
    expect(await roleNFT.read.isAdmin([adminTwo])).to.equal(true);
    expect(await roleNFT.read.isAdmin([donor.account.address])).to.equal(false);
  });

  it("mints shelter NFTs with no donor level", async function () {
    const { roleNFT, shelter } = await loadFixture(deployRoleNFTFixture);

    await roleNFT.write.safeMintShelter([shelter.account.address, "shelter-cid"]);

    const tokenId = await roleNFT.read.userTokenId([shelter.account.address]);

    expect(await roleNFT.read.getUserRole([shelter.account.address])).to.equal(
      "Shelter",
    );
    expect(await roleNFT.read.donorLevelOf([tokenId])).to.equal(
      DonorLevel.None,
    );
  });

  it("only owner can update token metadata", async function () {
    const { roleNFT, donor, otherAccount } =
      await loadFixture(deployRoleNFTFixture);

    await roleNFT.write.safeMintDonor([donor.account.address, "donor-cid"]);

    const tokenId = await roleNFT.read.userTokenId([donor.account.address]);
    const roleNFTAsOtherAccount = await hre.viem.getContractAt(
      "RoleNFT",
      roleNFT.address,
      { client: { wallet: otherAccount } },
    );

    await expectRevert(
      roleNFTAsOtherAccount.write.updateTokenURI([tokenId, "other-cid"]),
      "Only owner",
    );

    await roleNFT.write.updateTokenURI([tokenId, "new-cid"]);

    expect(await roleNFT.read.tokenURI([tokenId])).to.equal(
      "https://ipfs.io/ipfs/new-cid",
    );
  });

  it("upgrades donor levels and metadata", async function () {
    const { roleNFT, donor } = await loadFixture(deployRoleNFTFixture);

    await roleNFT.write.safeMintDonor([donor.account.address, "donor-cid"]);

    const tokenId = await roleNFT.read.userTokenId([donor.account.address]);

    await roleNFT.write.upgradeDonorLevel([
      donor.account.address,
      DonorLevel.Bronze,
      "bronze-cid",
    ]);
    expect(await roleNFT.read.donorLevelOf([tokenId])).to.equal(
      DonorLevel.Bronze,
    );
    expect(await roleNFT.read.tokenURI([tokenId])).to.equal(
      "https://ipfs.io/ipfs/bronze-cid",
    );

    await roleNFT.write.upgradeDonorLevel([
      donor.account.address,
      DonorLevel.Silver,
      "silver-cid",
    ]);
    await roleNFT.write.upgradeDonorLevel([
      donor.account.address,
      DonorLevel.Gold,
      "gold-cid",
    ]);
    await roleNFT.write.upgradeDonorLevel([
      donor.account.address,
      DonorLevel.Hero,
      "hero-cid",
    ]);

    expect(await roleNFT.read.donorLevelOf([tokenId])).to.equal(
      DonorLevel.Hero,
    );
    expect(await roleNFT.read.tokenURI([tokenId])).to.equal(
      "https://ipfs.io/ipfs/hero-cid",
    );
  });

  it("rejects donor upgrades for shelter NFTs", async function () {
    const { roleNFT, shelter } = await loadFixture(deployRoleNFTFixture);

    await roleNFT.write.safeMintShelter([shelter.account.address, "shelter-cid"]);

    await expectRevert(
      roleNFT.write.upgradeDonorLevel([
        shelter.account.address,
        DonorLevel.Bronze,
        "bronze-cid",
      ]),
      "Shelter cannot have donor level",
    );
  });

  it("keeps one RoleNFT per wallet", async function () {
    const { roleNFT, donor } = await loadFixture(deployRoleNFTFixture);

    await roleNFT.write.safeMintDonor([donor.account.address, "donor-cid"]);

    await expectRevert(
      roleNFT.write.safeMintDonor([donor.account.address, "second-cid"]),
      "User already owns a RoleNFT",
    );
  });

  it("revoke clears role, owner, token URI, and donor level", async function () {
    const { roleNFT, donor } = await loadFixture(deployRoleNFTFixture);

    await roleNFT.write.safeMintDonor([donor.account.address, "donor-cid"]);

    const tokenId = await roleNFT.read.userTokenId([donor.account.address]);

    await roleNFT.write.revokeRoleNFT([donor.account.address]);

    expect(await roleNFT.read.hasRoleNFT([donor.account.address])).to.equal(
      false,
    );
    expect(await roleNFT.read.donorLevelOf([tokenId])).to.equal(
      DonorLevel.None,
    );
    await expectRevert(
      roleNFT.read.ownerOf([tokenId]),
      "Token does not exist",
    );
    await expectRevert(
      roleNFT.read.tokenURI([tokenId]),
      "Token does not exist",
    );
  });
});
