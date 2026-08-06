# 🐾 PawChain

PawChain is a decentralized pet-shelter donation platform focused on transparent fundraising, verified shelters, milestone-based fund releases, and traceable refunds.

## ⚠️ Problem

Traditional animal-welfare fundraising can suffer from:

- Fake shelters, campaigns, QR codes, and payment links.
- Limited visibility into how donations are used.
- Full fund releases without evidence or progress checks.
- Weak donation, withdrawal, and refund audit trails.
- Reduced donor confidence in genuine shelters.

## ✅ PawChain's solution

PawChain combines:

- **Blockchain records** for donations, withdrawals, milestone decisions, cancellations, and refunds.
- **RoleNFTs** to identify registered donors, verified shelters, and authorized administrators.
- **Campaign smart contracts** that hold ETH and enforce milestone rules.
- **Evidence review** before a shelter can proceed to the next milestone.
- **Role-based dashboards** for donors, shelters, and administrators.
- **Supabase** for profiles, campaign information, documents, notifications, and reports.

## ✨ Main features

### 🧡 Donor

- Register and authenticate with a wallet.
- Receive and view a Donor RoleNFT.
- Browse, search, filter, and save approved campaigns.
- Donate ETH to the active campaign milestone.
- Track confirmed donations, withdrawals, refunds, and explorer links.
- Print donation receipts and claim eligible refunds.
- Progress through Normal, Bronze, Silver, Gold, and Hero badges.
- Receive a Hero Donor certificate when eligible.
- Manage profile, notifications, preferences, and wallet appearance.
- Submit support requests or report a campaign, shelter, milestone, or transaction concern.

### 🏥 Shelter

- Register an organization and upload verification documents.
- Track approval, rejection, and resubmission status.
- Receive a Shelter RoleNFT after administrator approval.
- Create campaign proposals with a goal, deadline, image, and two to five milestones.
- Monitor donations, campaign balances, and milestone progress.
- Withdraw a funded milestone using the registered shelter wallet.
- Upload evidence showing how released funds were used.
- Correct and resubmit rejected milestone evidence.
- Manage campaigns, refunds, notifications, and shelter profile information.

### 🛠️ Administrator

- Sign in with an approved internal administrator wallet.
- Review shelter applications and supporting documents.
- Approve shelters and mint or revoke Shelter RoleNFTs.
- Review campaign proposals and deploy approved Campaign contracts.
- Approve or reject milestone evidence.
- Cancel campaigns and initiate the eligible refund flow.
- Monitor users, shelters, campaigns, transactions, analytics, and notifications.
- Review donor reports with donor, campaign, shelter, and transaction references.
- Open reported campaigns in campaign management for investigation.

The current report page is read-only. Dismissing a report hides it only for that administrator wallet in the current browser; it does not delete or resolve the Supabase record.

## 🔄 Campaign flow

```text
Shelter submits proposal
        ↓
Admin reviews and deploys a Campaign contract
        ↓
Donors fund the active milestone
        ↓
Shelter withdraws the funded milestone
        ↓
Shelter submits usage evidence
        ↓
Admin approves or rejects the evidence
        ↓
Approval opens the next milestone
        ↓
Final approval completes the campaign
```

The first emergency milestone must be 5%. All milestone percentages must total 100%. A donation that exceeds the active milestone's remaining capacity is rejected.

If an active campaign is cancelled, or expires before reaching its goal, donors can claim contributions assigned to milestones whose funds were not released. Released milestone contributions are not refundable.

## 🔗 Smart contracts

### `RoleNFT.sol`

- Issues one Donor or Shelter role badge per wallet.
- Recognizes the owner and configured internal administrator wallets.
- Allows administrators to mint and revoke roles.
- Records cumulative donor contributions through authorized Campaign contracts.
- Upgrades donor badge metadata when contribution thresholds are reached.

### `CampaignFactory.sol`

- Allows only an administrator to deploy an approved campaign.
- Requires the campaign owner to hold an active Shelter RoleNFT.
- Prevents duplicate deployment for the same Supabase campaign key.
- Indexes campaigns globally and by shelter.

### `Campaign.sol`

- Holds and records ETH donations.
- Enforces sequential milestone funding and withdrawal.
- Restricts withdrawals and proof submission to the verified shelter.
- Restricts proof decisions and cancellation to administrators.
- Supports underfunded expiry, cancellation, and donor refund claims.
- Uses state changes and reentrancy protection to prevent repeated withdrawals or claims.

## 💡 Core assumptions

### Internal administrators

- Administrators are trusted PawChain staff and cannot register publicly for the role.
- Administrator wallets are approved in advance by the RoleNFT contract.
- Internal procedures are responsible for protecting and replacing administrator wallets.
- Shelter verification, campaign approval, evidence review, and donor-report investigation require human judgment.

### Donor RoleNFT badges

Donor badges are achievement credentials, not a live net-balance score. Progress is based on cumulative ETH from successfully confirmed on-chain donations recorded when each donation is made.

If a campaign later closes and a refund is issued, the refund is recorded separately in the donation ledger. It does not reduce `donorTotalContributed`, remove earned progress, or downgrade the badge. The badge represents verified participation history; the refund represents a separate financial recovery event.

| Badge | Cumulative recorded donations |
| --- | ---: |
| Normal | Below 0.05 ETH |
| Bronze | 0.05 ETH |
| Silver | 0.20 ETH |
| Gold | 0.50 ETH |
| Hero | 1.00 ETH |

Badge recording assumes the Campaign contract is an authorized donation recorder. A donation can still succeed if badge recording fails, so donation confirmation and badge progression are separate outcomes.

### Roles and wallets

- One wallet represents one PawChain user and can hold only one RoleNFT.
- RoleNFTs are non-transferable platform credentials, not tradable NFTs.
- Users control their own wallets; PawChain never stores private keys or reverses confirmed transactions.
- The application requires donor registration, although `Campaign.donate()` can be called directly by any wallet that satisfies its campaign rules.
- A Shelter RoleNFT represents PawChain approval, not a government guarantee of every campaign claim.

### Data and infrastructure

- Blockchain state is the source of truth for financial transactions and milestone state.
- Supabase stores supporting application data such as profiles, documents, reports, notifications, and campaign presentation content.
- ETH-to-MYR values are display estimates; contracts account only in ETH.
- RPC providers, IPFS gateways, Supabase, Reown, and email delivery are external dependencies.
- Uploaded documents and evidence still require human verification.

## 🛠️ Technology stack

- **Frontend/API:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Wallet/Web3:** Reown AppKit, Wagmi, Viem
- **Blockchain:** Solidity 0.8.28, Hardhat, Hardhat Ignition
- **Database/storage:** Supabase and IPFS-compatible storage
- **Documents/email:** PDF-Lib and Nodemailer

## 🗂️ Project structure

```text
PawChain/
├── backend/
│   ├── contracts/       # RoleNFT, CampaignFactory, and Campaign
│   ├── ignition/        # Deployment modules and records
│   ├── metadata/        # RoleNFT metadata
│   └── test/            # Hardhat tests
├── frontend/
│   ├── src/app/         # Pages and API routes
│   ├── src/lib/         # Blockchain, database, and domain logic
│   ├── src/context/     # Wallet context
│   └── public/          # Static assets
└── package.json         # Root commands
```

## 🚀 Run locally

### Prerequisites

- Node.js and npm
- MetaMask or another compatible wallet
- A configured Supabase project

### Install

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_BLOCK_EXPLORER_URL=
NEXT_PUBLIC_ROLE_NFT_ADDRESS=
NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=
NEXT_PUBLIC_ETH_MYR_RATE=7043.58

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

WALLET_SESSION_SECRET=
SHELTER_METADATA_CID=

CERTIFICATE_FROM_NAME=PawChain Certificates
GMAIL_SMTP_USER=
GMAIL_APP_PASSWORD=
```

Optional `backend/.env` values for Sepolia deployment and metadata upload:

```env
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
PINATA_JWT=
```

Never commit private keys, service-role keys, email passwords, or wallet-session secrets.

### Start

On Windows, start the local chain, deploy contracts, seed RoleNFT data, and run the frontend:

```powershell
npm.cmd run dev:all
```

Or run each stage separately:

```powershell
npm.cmd run backend
npm.cmd run deploy
npm.cmd run seed:role-nfts
npm.cmd run frontend
```

Copy the deployed RoleNFT and CampaignFactory addresses into `frontend/.env.local`, restart the frontend, and open [http://localhost:3000](http://localhost:3000).

## 🧪 Verify

```powershell
npm.cmd --prefix backend run compile
npm.cmd run test:backend
npm.cmd run build:frontend
```

The frontend production build downloads Geist fonts through `next/font`, so the first build requires access to Google Fonts unless the fonts are bundled locally.
