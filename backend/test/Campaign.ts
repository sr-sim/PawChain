import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { keccak256, parseEther, toBytes, zeroAddress } from "viem";

const CampaignStatus = {
  Funding: 0,
  Completed: 1,
  Refunding: 2,
  Cancelled: 3,
} as const;

const MilestoneStatus = {
  Locked: 0,
  Active: 1,
  PendingReview: 2,
  Rejected: 3,
  Approved: 4,
  Withdrawable: 5,
  Released: 6,
  Completed: 7,
} as const;

const defaultPercentages = [500, 2500, 3000, 4000] as const;

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

describe("Campaign and CampaignFactory", function () {
  async function deployFixture() {
    const [admin, shelter, donorOne, donorTwo, outsider] =
      await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const roleNFT = await hre.viem.deployContract("MockRoleNFT");

    await roleNFT.write.setAdmin([admin.account.address, true]);
    await roleNFT.write.mintShelter([shelter.account.address]);

    const factory = await hre.viem.deployContract("CampaignFactory", [
      roleNFT.address,
    ]);
    const campaignKey = keccak256(toBytes("supabase-campaign-1"));
    const deadline = BigInt((await time.latest()) + 30 * 24 * 60 * 60);

    await factory.write.createApprovedCampaign([
      campaignKey,
      shelter.account.address,
      parseEther("10"),
      deadline,
      [...defaultPercentages],
    ]);

    const campaignAddress = await factory.read.campaignByKey([campaignKey]);
    const campaign = await hre.viem.getContractAt(
      "Campaign",
      campaignAddress,
    );
    const campaignAsShelter = await hre.viem.getContractAt(
      "Campaign",
      campaignAddress,
      { client: { wallet: shelter } },
    );
    const campaignAsDonorOne = await hre.viem.getContractAt(
      "Campaign",
      campaignAddress,
      { client: { wallet: donorOne } },
    );
    const campaignAsDonorTwo = await hre.viem.getContractAt(
      "Campaign",
      campaignAddress,
      { client: { wallet: donorTwo } },
    );
    const campaignAsOutsider = await hre.viem.getContractAt(
      "Campaign",
      campaignAddress,
      { client: { wallet: outsider } },
    );

    return {
      admin,
      shelter,
      donorOne,
      donorTwo,
      outsider,
      publicClient,
      roleNFT,
      factory,
      campaign,
      campaignAsShelter,
      campaignAsDonorOne,
      campaignAsDonorTwo,
      campaignAsOutsider,
      campaignKey,
      campaignAddress,
      deadline,
    };
  }

  it("deploys and indexes one campaign per approved Supabase key", async function () {
    const {
      factory,
      campaign,
      campaignKey,
      campaignAddress,
      shelter,
    } = await loadFixture(deployFixture);

    expect(await factory.read.campaignByKey([campaignKey])).to.equal(
      campaignAddress,
    );
    expect(await factory.read.getCampaignCount()).to.equal(1n);
    expect(await factory.read.FLOW_VERSION()).to.equal(2n);
    expect(await factory.read.getAllCampaigns()).to.deep.equal([
      campaignAddress,
    ]);
    expect(
      await factory.read.getCampaignsByShelter([shelter.account.address]),
    ).to.deep.equal([campaignAddress]);
    expect(await campaign.read.getMilestoneCount()).to.equal(4n);
    expect(await campaign.read.FLOW_VERSION()).to.equal(2n);
    expect(await campaign.read.campaignStatus()).to.equal(
      CampaignStatus.Funding,
    );
  });

  it("rejects non-admins, duplicate keys, and unverified shelters", async function () {
    const {
      factory,
      roleNFT,
      campaignKey,
      shelter,
      outsider,
      deadline,
    } = await loadFixture(deployFixture);
    const factoryAsOutsider = await hre.viem.getContractAt(
      "CampaignFactory",
      factory.address,
      { client: { wallet: outsider } },
    );

    await expectRevert(
      factoryAsOutsider.write.createApprovedCampaign([
        keccak256(toBytes("outsider-campaign")),
        shelter.account.address,
        parseEther("10"),
        deadline,
        [...defaultPercentages],
      ]),
      "Only admin",
    );

    await expectRevert(
      factory.write.createApprovedCampaign([
        campaignKey,
        shelter.account.address,
        parseEther("10"),
        deadline,
        [...defaultPercentages],
      ]),
      "Campaign exists",
    );

    await expectRevert(
      factory.write.createApprovedCampaign([
        keccak256(toBytes("unverified-shelter")),
        outsider.account.address,
        parseEther("10"),
        deadline,
        [...defaultPercentages],
      ]),
      "Verified shelter required",
    );

    await roleNFT.write.revoke([shelter.account.address]);
    await expectRevert(
      factory.write.createApprovedCampaign([
        keccak256(toBytes("revoked-shelter")),
        shelter.account.address,
        parseEther("10"),
        deadline,
        [...defaultPercentages],
      ]),
      "Verified shelter required",
    );
  });

  it("validates milestone count, emergency percentage, and total", async function () {
    const { factory, shelter, deadline } = await loadFixture(deployFixture);

    await expectRevert(
      factory.write.createApprovedCampaign([
        keccak256(toBytes("one-milestone")),
        shelter.account.address,
        parseEther("10"),
        deadline,
        [10_000],
      ]),
      "Use 2 to 5 milestones",
    );

    await expectRevert(
      factory.write.createApprovedCampaign([
        keccak256(toBytes("wrong-emergency")),
        shelter.account.address,
        parseEther("10"),
        deadline,
        [1000, 9000],
      ]),
      "First milestone must be 5%",
    );

    await expectRevert(
      factory.write.createApprovedCampaign([
        keccak256(toBytes("wrong-total")),
        shelter.account.address,
        parseEther("10"),
        deadline,
        [500, 4000, 5000],
      ]),
      "Milestones must total 100%",
    );
  });

  it("records donations, caps the current stage, and unlocks milestone one at 5%", async function () {
    const {
      campaign,
      campaignAsDonorOne,
      donorOne,
      publicClient,
      campaignAddress,
    } = await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], {
      value: parseEther("0.49"),
    });
    expect((await campaign.read.getMilestone([0n])).status).to.equal(
      MilestoneStatus.Active,
    );

    await campaignAsDonorOne.write.donate([], {
      value: parseEther("0.01"),
    });

    expect(await campaign.read.totalRaised()).to.equal(parseEther("0.5"));
    expect(
      await campaign.read.donorContributions([donorOne.account.address]),
    ).to.equal(parseEther("0.5"));
    expect(await publicClient.getBalance({ address: campaignAddress })).to.equal(
      parseEther("0.5"),
    );
    expect((await campaign.read.getMilestone([0n])).status).to.equal(
      MilestoneStatus.Withdrawable,
    );

    await expectRevert(
      campaignAsDonorOne.write.donate([], { value: parseEther("0.01") }),
      "Current milestone not accepting donations",
    );
    await expectRevert(
      campaignAsDonorOne.write.donate([], { value: 0n }),
      "Donation required",
    );
  });

  it("requires emergency withdrawal, proof, and approval before milestone two", async function () {
    const {
      campaign,
      campaignAsShelter,
      campaignAsDonorOne,
      campaignAsOutsider,
    } = await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.5") });

    await expectRevert(
      campaignAsShelter.write.submitMilestoneProof([0n, "too-early"]),
      "Milestone funds must be withdrawn first",
    );

    await expectRevert(
      campaignAsOutsider.write.withdrawMilestone([0n]),
      "Only shelter",
    );

    await campaignAsShelter.write.withdrawMilestone([0n]);
    expect(await campaign.read.totalReleased()).to.equal(parseEther("0.5"));
    expect((await campaign.read.getMilestone([0n])).status).to.equal(
      MilestoneStatus.Released,
    );
    expect(await campaign.read.currentMilestoneIndex()).to.equal(0n);

    await campaignAsShelter.write.submitMilestoneProof([
      0n,
      "emergency-proof-cid",
    ]);
    expect((await campaign.read.getMilestone([0n])).status).to.equal(
      MilestoneStatus.PendingReview,
    );

    await campaign.write.approveMilestone([0n]);
    expect((await campaign.read.getMilestone([0n])).status).to.equal(
      MilestoneStatus.Completed,
    );
    expect(await campaign.read.currentMilestoneIndex()).to.equal(1n);
    expect((await campaign.read.getMilestone([1n])).status).to.equal(
      MilestoneStatus.Active,
    );

    await expectRevert(
      campaignAsShelter.write.withdrawMilestone([0n]),
      "Not current milestone",
    );
  });

  it("requires stage funding and withdrawal before proof for later milestones", async function () {
    const { campaign, campaignAsShelter, campaignAsDonorOne } =
      await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.5") });
    await campaignAsShelter.write.withdrawMilestone([0n]);
    await campaignAsShelter.write.submitMilestoneProof([0n, "proof-0"]);
    await campaign.write.approveMilestone([0n]);

    await campaignAsDonorOne.write.donate([], { value: parseEther("2.4") });
    await expectRevert(
      campaignAsShelter.write.withdrawMilestone([1n]),
      "Funds not withdrawable",
    );
    await expectRevert(
      campaignAsShelter.write.submitMilestoneProof([1n, "proof-too-early"]),
      "Milestone funds must be withdrawn first",
    );
    await expectRevert(
      campaignAsDonorOne.write.donate([], { value: parseEther("0.11") }),
      "Donation exceeds current milestone target",
    );

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.1") });
    expect((await campaign.read.getMilestone([1n])).status).to.equal(
      MilestoneStatus.Withdrawable,
    );

    await campaignAsShelter.write.withdrawMilestone([1n]);
    expect(await campaign.read.totalReleased()).to.equal(parseEther("3"));
    expect((await campaign.read.getMilestone([1n])).status).to.equal(
      MilestoneStatus.Released,
    );
    expect(await campaign.read.currentMilestoneIndex()).to.equal(1n);

    await campaignAsShelter.write.submitMilestoneProof([1n, "proof-1"]);
    await campaign.write.approveMilestone([1n]);

    expect((await campaign.read.getMilestone([1n])).status).to.equal(
      MilestoneStatus.Completed,
    );
    expect(await campaign.read.currentMilestoneIndex()).to.equal(2n);
    expect((await campaign.read.getMilestone([2n])).status).to.equal(
      MilestoneStatus.Active,
    );
  });

  it("allows rejected proof to be resubmitted", async function () {
    const { campaign, campaignAsShelter, campaignAsDonorOne } =
      await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.5") });
    await campaignAsShelter.write.withdrawMilestone([0n]);
    await campaignAsShelter.write.submitMilestoneProof([0n, "bad-proof"]);
    await campaign.write.rejectMilestone([0n]);

    expect((await campaign.read.getMilestone([0n])).status).to.equal(
      MilestoneStatus.Rejected,
    );

    await campaignAsShelter.write.submitMilestoneProof([0n, "fixed-proof"]);
    expect((await campaign.read.getMilestone([0n])).proofCID).to.equal(
      "fixed-proof",
    );
  });

  it("allows only an admin to review proof", async function () {
    const {
      campaign,
      campaignAsShelter,
      campaignAsDonorOne,
      campaignAsOutsider,
    } = await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.5") });
    await campaignAsShelter.write.withdrawMilestone([0n]);
    await campaignAsShelter.write.submitMilestoneProof([0n, "proof-0"]);

    await expectRevert(
      campaignAsOutsider.write.approveMilestone([0n]),
      "Only admin",
    );
    await expectRevert(
      campaignAsOutsider.write.rejectMilestone([0n]),
      "Only admin",
    );
  });

  it("completes the campaign only after final withdrawal and proof approval", async function () {
    const { campaign, campaignAsShelter, campaignAsDonorOne } =
      await loadFixture(deployFixture);
    const allocations = ["0.5", "2.5", "3", "4"] as const;

    for (let index = 0; index < allocations.length; index++) {
      await campaignAsDonorOne.write.donate([], {
        value: parseEther(allocations[index]),
      });
      await campaignAsShelter.write.withdrawMilestone([BigInt(index)]);
      await campaignAsShelter.write.submitMilestoneProof([
        BigInt(index),
        `proof-${index}`,
      ]);
      await campaign.write.approveMilestone([BigInt(index)]);
    }

    expect(await campaign.read.totalRaised()).to.equal(parseEther("10"));
    expect(await campaign.read.totalReleased()).to.equal(parseEther("10"));
    expect(await campaign.read.campaignStatus()).to.equal(
      CampaignStatus.Completed,
    );
    expect((await campaign.read.getMilestone([3n])).status).to.equal(
      MilestoneStatus.Completed,
    );
  });

  it("blocks proof and withdrawals after the shelter RoleNFT is revoked", async function () {
    const { roleNFT, campaignAsShelter, campaignAsDonorOne, shelter } =
      await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.5") });
    await roleNFT.write.revoke([shelter.account.address]);

    await expectRevert(
      campaignAsShelter.write.withdrawMilestone([0n]),
      "Shelter role inactive",
    );
    await expectRevert(
      campaignAsDonorOne.write.donate([], { value: parseEther("0.1") }),
      "Shelter role inactive",
    );
  });

  it("refunds the remaining locked balance proportionally after cancellation", async function () {
    const {
      campaign,
      campaignAsShelter,
      campaignAsDonorOne,
      campaignAsDonorTwo,
      donorOne,
      donorTwo,
      publicClient,
      campaignAddress,
    } = await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.3") });
    await campaignAsDonorTwo.write.donate([], { value: parseEther("0.2") });
    await campaignAsShelter.write.withdrawMilestone([0n]);
    await campaignAsShelter.write.submitMilestoneProof([0n, "proof-0"]);
    await campaign.write.approveMilestone([0n]);
    await campaignAsDonorOne.write.donate([], { value: parseEther("1") });
    await campaignAsDonorTwo.write.donate([], { value: parseEther("1") });

    await campaign.write.cancelCampaign();

    expect(await campaign.read.campaignStatus()).to.equal(
      CampaignStatus.Cancelled,
    );
    expect(await campaign.read.refundPool()).to.equal(parseEther("2"));
    expect(
      await campaign.read.getRefundableAmount([donorOne.account.address]),
    ).to.equal(parseEther("1.04"));
    expect(
      await campaign.read.getRefundableAmount([donorTwo.account.address]),
    ).to.equal(parseEther("0.96"));

    await campaignAsDonorOne.write.claimRefund();
    await expectRevert(
      campaignAsDonorOne.write.claimRefund(),
      "Refund already claimed",
    );
    await campaignAsDonorTwo.write.claimRefund();

    expect(await publicClient.getBalance({ address: campaignAddress })).to.equal(
      0n,
    );
  });

  it("enables refunds when an underfunded campaign expires", async function () {
    const {
      campaign,
      campaignAsDonorOne,
      campaignAsDonorTwo,
      donorOne,
      donorTwo,
      deadline,
    } = await loadFixture(deployFixture);

    await campaignAsDonorOne.write.donate([], { value: parseEther("0.1") });
    await campaignAsDonorTwo.write.donate([], { value: parseEther("0.2") });
    await time.increaseTo(deadline);
    await campaign.write.finalizeExpired();

    expect(await campaign.read.campaignStatus()).to.equal(
      CampaignStatus.Refunding,
    );
    expect(
      await campaign.read.getRefundableAmount([donorOne.account.address]),
    ).to.equal(parseEther("0.1"));
    expect(
      await campaign.read.getRefundableAmount([donorTwo.account.address]),
    ).to.equal(parseEther("0.2"));
    await expectRevert(
      campaignAsDonorOne.write.donate([], { value: parseEther("0.1") }),
      "Not funding",
    );
  });

  it("rejects a zero RoleNFT factory deployment", async function () {
    await expectRevert(
      hre.viem.deployContract("CampaignFactory", [zeroAddress]),
      "RoleNFT required",
    );
  });
});
