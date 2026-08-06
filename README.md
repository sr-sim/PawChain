
# 🐾 PawChain

**PawChain** is a blockchain-based pet shelter donation platform that improves transparency, traceability, and accountability in animal-welfare fundraising. It connects verified shelters with donors and uses smart contracts to record donations, hold funds, distribute campaign funding by milestones, and return remaining eligible funds when a campaign is cancelled or expires underfunded.

## ⚠️ Problem

Traditional animal-shelter donation systems face several critical challenges that reduce donor confidence and make responsible fund management difficult.

### 🎭 Fake and misleading campaigns

Scammers can create fake animal-rescue campaigns using stolen names, photographs, and emotional stories. Donors may send money without knowing whether the campaign or shelter is genuine, while legitimate shelters lose public support because of increasing suspicion.

### 🎣 Fraudulent payment channels

Fake QR codes, payment links, and social-media accounts can redirect donations to fraudulent recipients. Conventional payment processes give donors limited ways to independently confirm that their money reached the intended shelter campaign.

### 💸 Misuse of donation funds

Even when donations reach a real organization, donors cannot always verify that the money was used for the stated purpose, such as veterinary treatment, food, rescue operations, or shelter maintenance. Giving an organization the full amount upfront without ongoing oversight creates opportunities for misuse.

### 🚫 Lack of transparency and post-donation visibility

Centralized platforms normally store donation records in private databases controlled by the platform or recipient. After donating, supporters may receive only a manual receipt or occasional update, with no independent audit trail showing how funds were collected, held, and released.

### 🏠 Unverified shelters and weak accountability

Unregistered or misleading organizations may collect public donations without sufficient identity checks. Manual reporting alone does not provide continuous, verifiable evidence of campaign progress or fund usage.

### 🔒 Declining donor trust

Fraud, emotional manipulation, and poor visibility make the public more hesitant to donate. This harms both donors and genuine shelters that depend on public contributions to care for rescued animals.

## ✅ PawChain's solution

PawChain addresses these problems by integrating:

- 🧾 **Blockchain records** for transparent and independently traceable donations, releases, and refunds.
- 🛡️ **On-chain role verification** using RoleNFTs for donors and shelters, together with contract-based wallet authorization for platform administrators.
- ⚙️ **Smart contracts** to hold campaign funds and enforce campaign, milestone, withdrawal, and refund rules.
- 🎯 **Milestone-based distribution** so shelters receive funding incrementally instead of receiving the entire campaign amount at once.
- 📄 **Evidence and administrator review** so a shelter must account for a released milestone before the next milestone is activated.
- ↩️ **Proportional refunds** that let donors claim their share of the remaining contract balance when refunds are enabled.
- 📊 **Role-based dashboards** for campaign discovery, donation tracking, shelter management, verification, and platform analytics.

> **Current milestone logic:** after an active milestone reaches its funding threshold, the shelter withdraws that milestone's allocation and submits evidence of its use. An administrator must approve the evidence before the next milestone opens. This provides sequential accountability, although evidence approval occurs after the corresponding milestone release.

## ✨ Main Features

PawChain provides dedicated functions for three primary roles: **Donor**, **Shelter**, and **Administrator**. Wallet authentication and role checks ensure that each user can access only the actions assigned to their role.

### 🧡 Donor features

#### Wallet registration and access

- Register a donor account with a cryptocurrency wallet.
- Connect and authenticate using the registered wallet.
- Receive a donor RoleNFT and access protected donor pages.
- End the authenticated session by disconnecting the wallet.

#### Dashboard and campaign discovery

- View total donations, supported campaigns, recent activity, donation trends, and refund status.
- Browse campaigns that have been reviewed and approved by an administrator.
- Search, filter, and sort campaigns by information, urgency, or status.
- Save campaigns for later or remove them from the saved list.
- View campaign descriptions, images, goals, deadlines, funding progress, milestone allocations, and smart-contract information.
- Inspect the profile and available background information of the verified shelter operating a campaign.

#### Blockchain donations

- Select an active campaign and enter a donation amount in ETH.
- View an estimated MYR value using the platform's ETH-to-MYR rate.
- Review the current milestone and its remaining funding capacity.
- Confirm the transaction through MetaMask or another compatible wallet.
- Transfer ETH directly to the selected campaign smart contract.
- Receive confirmation only after the blockchain transaction succeeds and is verified by the platform.

The campaign contract rejects zero-value donations, expired campaigns, inactive campaigns, and amounts that exceed the current milestone threshold. Donations remain inside the campaign contract until the active milestone becomes withdrawable.

> The application provides donor-only access, but the current `donate()` contract function does not require the caller to own a donor RoleNFT. A wallet can therefore call the contract directly while the campaign is accepting donations.

#### Donation tracking and receipts

- Track pending, confirmed, and refunded donations.
- View the donation date, campaign, shelter, ETH amount, estimated MYR value, and campaign status.
- Inspect the transaction hash and campaign contract on the configured blockchain explorer.
- Open and print a receipt for every verified donation.
- View refund amounts and refund transaction evidence on the original receipt.

#### Refund claims

- Detect when a cancelled or expired campaign has made a refund available.
- Read the wallet's refundable amount directly from the campaign contract.
- Submit `claimRefund()` using the contributing wallet.
- Receive a proportional share of the contract's remaining refund pool.
- Track the successful refund and view its internal transfer evidence on the blockchain explorer.

A wallet cannot claim twice, claim without a contribution, or claim before refunds are enabled. Funds already released to the shelter are excluded from the refund pool.

#### RoleNFT badges and Hero certificate

- View the donor RoleNFT and total recorded blockchain contributions.
- Progress through Normal, Bronze, Silver, Gold, and Hero donor levels.
- Receive automatic badge-level updates when configured donation thresholds are reached.
- Receive a generated Hero Donor certificate by email when eligible.
- Contact support if certificate delivery is unsuccessful.

#### Notifications, profile, and support

- Receive campaign, donation, milestone, refund, and support updates.
- Mark notifications as read, mark all as read, delete one, or clear all.
- Control which notification categories are visible through donor preferences.
- Update supported profile fields, wallet appearance, privacy options, and wallet-address display.
- Read help information, submit support requests, and report campaign or shelter concerns.
- Include campaign, shelter, or transaction references and track the administrator's response.

### 🏥 Shelter features

#### Registration and verification

- Register using the organization's wallet.
- Provide the shelter name, registration identifier, telephone number, address, website, and description.
- Upload registration or supporting documents for administrator review.
- Monitor application status and view the reason for a rejection.
- Correct and resubmit a rejected application.
- Receive a Shelter RoleNFT after approval as on-chain proof of the verified role.

Full shelter access requires an approved platform account and an active Shelter RoleNFT. Revoking this NFT prevents protected withdrawals and evidence submissions, and the contract also stops accepting donations for that shelter's campaigns.

#### Shelter dashboard

- View total, active, pending, completed, and closed campaigns.
- Monitor total funds raised and their estimated MYR value.
- View recent campaigns, funding progress, status summaries, and live contract states.
- Access shortcuts for creating campaigns, managing campaigns, viewing donations, and withdrawing funds.
- View ETH-to-MYR market information used by the platform.

#### Campaign creation and management

- Create a proposal with a title, description, image, urgency, duration, and funding goal.
- Use a duration of 30, 60, or 90 days.
- Define between two and five milestones whose percentages total 100%.
- Configure the required first emergency milestone at 5%.
- Describe each milestone's purpose, allocation, and required evidence.
- Request invoices, receipts, treatment reports, supply receipts, photographs, or videos as evidence.
- Submit the completed campaign for administrator approval.
- Filter and view active, pending, completed, closed, and rejected campaigns.
- Edit, delete, or resubmit eligible campaigns before blockchain deployment.
- View administrator rejection reasons and correct the campaign information.

An approved campaign receives a dedicated smart contract. Its on-chain goal, deadline, shelter wallet, and milestone percentages cannot be changed through a normal database edit after deployment.

#### Donation and campaign monitoring

- View confirmed donations received across the shelter's campaigns.
- Inspect donor wallets, ETH and MYR values, dates, transaction hashes, and confirmation status.
- Verify donation transactions using the blockchain explorer.
- Monitor the campaign goal, amount raised, current milestone, allocation thresholds, contract balance, and refund pool.
- Inspect proof, review, withdrawal, and release transactions.

Blockchain donation records are read-only to the shelter and cannot be manually rewritten.

#### Milestone withdrawals

- View whether a milestone is Locked, Active, Withdrawable, Released, Pending Review, Rejected, or Completed.
- Withdraw the active milestone after its cumulative funding threshold has been reached.
- Confirm `withdrawMilestone()` using the campaign's registered shelter wallet.
- Receive only the allocation assigned to that milestone.
- View and verify the resulting fund-release transaction.

The contract validates the shelter wallet, active Shelter RoleNFT, campaign state, current milestone, available balance, and withdrawal status. Reentrancy protection and milestone-state changes prevent repeated withdrawal.

#### Evidence submission

- Upload proof explaining how the released milestone allocation was used.
- Store the proof reference and submit it through `submitMilestoneProof()`.
- Send the milestone to an administrator for review.
- View the approval or rejection result and its transaction hash.
- Correct and resubmit rejected evidence.

In the current implementation, evidence is submitted **after the milestone withdrawal**. Approval completes that milestone and opens the next one; rejection keeps the next milestone locked.

#### Refund, notification, and profile management

- Monitor campaigns in cancelled or refunding states.
- View the refund pool, refundable donations, claimed refunds, and remaining balance.
- Receive campaign, milestone, donation, withdrawal, and verification notifications.
- Manage read state and delete notifications.
- Update supported organization, contact, website, address, and profile information.

Shelters can monitor refunds but cannot claim on behalf of donors. Every donor must claim using the wallet that made the contribution.

### 🛠️ Administrator features

#### Secure administrator access

- Authenticate with a wallet recognized as an administrator by the RoleNFT contract.
- Access protected administrative pages and API operations.
- Confirm sensitive blockchain actions using the administrator wallet.

#### Platform dashboard

- View total donors, shelters, campaigns, and donations.
- Monitor pending shelter applications and campaign proposals.
- View total funds raised, released, and available for refunds in ETH and estimated MYR.
- Inspect recent campaigns, platform activity, campaign states, and blockchain summaries.

#### Shelter application and RoleNFT management

- Review organization details and uploaded registration documents.
- Approve a pending shelter application and mint its Shelter RoleNFT.
- Verify that the mint transaction matches the approved shelter wallet.
- Reject an application with a required explanation.
- View and manage verified shelters and their campaigns.
- Deactivate or reactivate eligible shelter accounts.
- Mint or revoke Shelter RoleNFTs and record the related transaction.
- Cancel active campaigns when shelter access is revoked, allowing remaining balances to become refundable.

#### Donor management

- View registered donors, wallets, profile information, and account status.
- Inspect donor RoleNFT and badge information.
- Monitor Hero Donor eligibility and certificate-delivery status.
- Retry eligible certificate emails and inspect delivery failures.

#### Campaign review and blockchain deployment

- View campaign proposals from all shelters and filter them by status.
- Inspect campaign goals, deadlines, urgency, milestones, percentage allocations, and evidence requirements.
- Reject a proposal with a reason or approve it for deployment.
- Confirm that the shelter is still verified before approval.
- Call `createApprovedCampaign()` through `CampaignFactory`.
- Store the deployed campaign address, campaign key, network, and deployment transaction.
- Activate the approved campaign so it can receive donations.

The factory contract blocks non-administrators, duplicate campaign keys, unverified shelters, invalid deadlines, zero goals, and invalid milestone configurations.

#### Milestone evidence review

- View milestones with evidence awaiting review.
- Inspect the submitted proof and related campaign information.
- Approve valid evidence using `approveMilestone()`.
- Reject invalid evidence using `rejectMilestone()` and provide a reason.
- Verify and store the on-chain review transaction.
- Notify the shelter of the result.

Approval completes the reviewed milestone and activates the next one. Approval of the final milestone marks the campaign as completed. Rejection leaves the next milestone locked and allows the shelter to resubmit its proof.

#### Campaign cancellation and expiry

- Cancel an active campaign using `cancelCampaign()`.
- Stop new donations and normal milestone withdrawals.
- Convert the remaining campaign-contract balance into a refund pool.
- Store the cancellation transaction, administrator, reason, and timestamp.
- Initiate `finalizeExpired()` for an eligible expired and underfunded campaign.
- Allow contributors to claim their refunds individually.

The contract's `finalizeExpired()` function is publicly callable after the deadline when its conditions are met, although PawChain exposes this operation through the administrator interface.

#### Transactions, analytics, and oversight

- Monitor verified campaign deployments, donations, evidence submissions, reviews, releases, cancellations, and refunds.
- View transaction type, wallet, campaign, amount, status, date, hash, and explorer link.
- Analyze donation trends, campaign performance, fund distribution, and campaign-status distribution.
- Compare raised, released, and refundable balances.
- Monitor confirmed, pending, and invalid blockchain transactions.
- Receive notifications for new shelter applications, campaign proposals, evidence, and donor concerns.
- Investigate donor reports and related campaign, shelter, or transaction references.

## 🔄 Campaign lifecycle

```text
Shelter submits a campaign proposal
                ↓
Administrator reviews the proposal
                ↓
Administrator approves and deploys its smart contract
                ↓
Donors fund the currently active milestone
                ↓
The milestone reaches its funding threshold
                ↓
Shelter withdraws that milestone's allocation
                ↓
Shelter submits evidence of fund usage
                ↓
Administrator approves or rejects the evidence
                ↓
Approval opens the next milestone; final approval completes the campaign
```

If an active campaign is cancelled, or expires while underfunded, its remaining smart-contract balance becomes a refund pool. Each donor claims a proportional refund using their own wallet. Amounts already released to the shelter are not part of the refund pool.

## 🔗 Smart contracts

### `RoleNFT.sol`

- Represents donor and shelter roles on-chain.
- Recognizes platform administrator wallets.
- Supports shelter-role revocation.
- Records donor contribution totals and badge-level progression.

### `CampaignFactory.sol`

- Allows only an administrator to deploy approved campaigns.
- Requires the recipient to hold an active Shelter RoleNFT.
- Prevents duplicate deployment for the same platform campaign key.
- Indexes deployed campaigns by shelter and campaign key.

### `Campaign.sol`

- Accepts and records ETH donations.
- Holds donations within the campaign contract.
- Enforces sequential milestone funding thresholds.
- Restricts withdrawals and proof submission to the verified shelter.
- Restricts evidence approval and rejection to administrators.
- Emits auditable donation, proof, release, completion, and refund events.
- Protects withdrawals and refund claims against reentrancy.
- Supports campaign cancellation, underfunded expiry, and proportional donor refunds.

## 🛠️ Technology stack

- **Frontend and API:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Wallet integration:** Reown AppKit, Wagmi, Viem, MetaMask-compatible wallets
- **Blockchain:** Ethereum-compatible network, Solidity 0.8.28
- **Contract development:** Hardhat and Hardhat Ignition
- **Database and storage:** Supabase
- **Email and documents:** Nodemailer and PDF-Lib
- **External storage:** Pinata/IPFS-compatible metadata and proof references


