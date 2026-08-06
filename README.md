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

## 🔄 Platform flow

### 1. Shelter verification

1. A shelter connects its wallet, registers, and uploads supporting documents.
2. An internal administrator reviews the application.
3. When approved, the shelter receives a Shelter RoleNFT and access to shelter functions.

### 2. Campaign approval

1. The verified shelter creates a campaign proposal with its goal, deadline, and milestones.
2. The campaign must contain two to five milestones, the first milestone must be 5%, and all percentages must total 100%.
3. An administrator reviews the proposal and either rejects it with a reason or approves it.
4. Approval deploys a dedicated Campaign smart contract and makes the campaign available to donors.

### 3. Donation and milestone funding

1. A donor selects an approved campaign and contributes ETH using their wallet.
2. The smart contract records the donation and holds the funds.
3. Donations fund only the currently active milestone. An amount that exceeds its remaining capacity is rejected.
4. When the milestone reaches its funding threshold, it becomes available for shelter withdrawal.

### 4. Withdrawal and evidence review

1. The shelter withdraws the funded milestone allocation using its registered wallet.
2. The shelter submits evidence showing how the released funds were used.
3. An administrator reviews the evidence.
4. Approval completes the milestone and opens the next one. Rejection keeps the next milestone locked while the shelter corrects and resubmits its evidence.
5. Approval of the final milestone completes the campaign.

### 5. Cancellation and refunds

1. An administrator may cancel an active campaign, or an expired underfunded campaign may be finalized for refunds.
2. New donations and normal withdrawals stop when refunds are enabled.
3. Each donor claims with the same wallet used to donate.
4. The donor receives contributions assigned to milestones whose funds were not released. Contributions from released milestones are not refundable.

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

## 📜 Contracts deployed

The current PawChain contracts are deployed on Ethereum Sepolia:

- **RoleNFT:** [`0x2F2bFC356D87a901CDe862B5D0DFc20017838C43`](https://sepolia.etherscan.io/address/0x2F2bFC356D87a901CDe862B5D0DFc20017838C43#code)
- **CampaignFactory:** [`0x6ec3Cbadcbe84357228DeFd9Bc42666Ec815D1fa`](https://sepolia.etherscan.io/address/0x6ec3Cbadcbe84357228DeFd9Bc42666Ec815D1fa#code)

Use these addresses in `frontend/.env.local`:

```env
NEXT_PUBLIC_ROLE_NFT_ADDRESS=0x2F2bFC356D87a901CDe862B5D0DFc20017838C43
NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=0x6ec3Cbadcbe84357228DeFd9Bc42666Ec815D1fa
```

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

### First milestone allocation

- Every campaign must use exactly 5% of its total funding goal for the first milestone.
- This first milestone is treated as an emergency allocation that gives the shelter limited initial funding instead of releasing the full campaign amount at once.
- The shelter must withdraw the 5% allocation, use it for the stated campaign purpose, and submit evidence before the administrator can open the next milestone.
- The remaining 95% is divided among one to four later milestones. Altogether, a campaign must contain two to five milestones whose allocations total 100%.
- This design assumes that 5% is sufficient for an initial urgent action while keeping most donated funds locked until the shelter demonstrates accountable use.

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

## 🚀 Detailed setup

### 1. Prerequisites

Install or prepare:

- Node.js 20 or later and npm.
- MetaMask or another compatible browser wallet.
- A Supabase project containing the PawChain database tables and storage buckets.
- A Reown Cloud project for wallet connection.
- A Sepolia RPC endpoint and Sepolia ETH for deployment and transaction gas.
- IPFS metadata CIDs for the donor badge levels and shelter badge.
- A Gmail account with an App Password if Hero certificate email is required.

Check the local tools:

```powershell
node --version
npm --version
```

### 2. Install dependencies

From the repository root:

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Configure the backend

Create `backend/.env`:

```env
DEPLOYER_PRIVATE_KEY=
SEPOLIA_RPC_URL=
```

| Variable | Purpose |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | Private key of the wallet that deploys the contracts. This wallet becomes the owner when deploying `RoleNFT`. Include the `0x` prefix if available; the Hardhat configuration also accepts the key without it. |
| `SEPOLIA_RPC_URL` | HTTPS RPC endpoint for Ethereum Sepolia, obtained from a provider such as Alchemy, Infura, or another Ethereum RPC service. |

The deployer must have enough Sepolia ETH to pay deployment gas. Never use a wallet that holds real mainnet funds and never commit this file.

Compile and test the contracts before deployment:

```powershell
npm.cmd --prefix backend run compile
npm.cmd run test:backend
```

### 4. Deploy the contracts

For a new Sepolia deployment, deploy `RoleNFT` first:

```powershell
cd backend
npx hardhat ignition deploy ignition/modules/RoleNFT.ts --network sepolia --deployment-id pawchain-role-nft-sepolia
```

Copy the deployed `RoleNFT` address from the command output. Then place it in `backend/ignition/parameters/sepolia-campaign-factory-v3.json`:

```json
{
  "CampaignFactoryRefundV3SepoliaModule": {
    "roleNFTAddress": "0xYOUR_ROLE_NFT_ADDRESS"
  }
}
```

Deploy the V3 CampaignFactory:

```powershell
npm.cmd run deploy:factory:v3:sepolia
cd ..
```

Copy the deployed `CampaignFactory` address. The deployment module also authorizes the factory as a RoleNFT recorder manager, allowing newly created Campaign contracts to record donor badge progress.

If the contracts are already deployed, skip this step and use the existing RoleNFT and CampaignFactory addresses. Both addresses must belong to Sepolia and to the same PawChain deployment.

### 5. Configure the frontend

Create `frontend/.env.local` with the following values. Next.js also reads `frontend/.env`, but the included `seed-role-nfts.mjs` script specifically reads `.env.local`, so `.env.local` is recommended.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_ROLE_NFT_ADDRESS=
NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=
ROLE_NFT_MINTER_PRIVATE_KEY=

DONOR_METADATA_CID=
SHELTER_METADATA_CID=
BRONZE_DONOR_METADATA_CID=
SILVER_DONOR_METADATA_CID=
GOLD_DONOR_METADATA_CID=
HERO_DONOR_METADATA_CID=

CERTIFICATE_FROM_NAME=
GMAIL_SMTP_USER=
GMAIL_APP_PASSWORD=
WALLET_SESSION_SECRET=
```

#### Supabase

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from **Supabase Dashboard → Project Settings → API**. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key from the same Supabase API settings page. Do not use the service-role key here. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key used by protected API routes. Obtain it from the Supabase API settings and never expose it with a `NEXT_PUBLIC_` prefix. |

The configured Supabase project must contain the tables and storage expected by PawChain. The URL and anonymous key are exposed to the browser, so database access must be protected by appropriate Supabase policies and server-side API checks. The service-role key bypasses normal Row Level Security and must remain secret.

#### Wallet and Sepolia network

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_PROJECT_ID` | Project ID from the Reown Cloud dashboard. |
| `NEXT_PUBLIC_ROLE_NFT_ADDRESS` | Sepolia address produced by the RoleNFT deployment. |
| `NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS` | Sepolia address produced by the V3 CampaignFactory deployment. |
| `NEXT_PUBLIC_CHAIN_ID` | Use `11155111` for Ethereum Sepolia. |
| `NEXT_PUBLIC_RPC_URL` | The Sepolia RPC URL used by the application to read blockchain state. |
| `ROLE_NFT_MINTER_PRIVATE_KEY` | Server-only private key for a RoleNFT administrator authorized to mint and revoke role badges. It must start with `0x`. |

`ROLE_NFT_MINTER_PRIVATE_KEY` must belong to the RoleNFT owner or one of the administrator addresses recognized by the contract. Despite being stored under the frontend directory, it is used only by server-side code and must never use the `NEXT_PUBLIC_` prefix.

#### RoleNFT metadata

| Variable | Metadata represented |
| --- | --- |
| `DONOR_METADATA_CID` | Normal donor badge metadata. |
| `SHELTER_METADATA_CID` | Verified shelter badge metadata. |
| `BRONZE_DONOR_METADATA_CID` | Bronze donor badge metadata. |
| `SILVER_DONOR_METADATA_CID` | Silver donor badge metadata. |
| `GOLD_DONOR_METADATA_CID` | Gold donor badge metadata. |
| `HERO_DONOR_METADATA_CID` | Hero donor badge metadata. |

Use the IPFS metadata CID only, for example `Qm...` or `bafy...`, rather than a local filename. Each metadata JSON file should contain the badge name, description, image URI, and any desired attributes. The referenced image must already be accessible through IPFS.

#### Certificate email and wallet sessions

| Variable | Value |
| --- | --- |
| `CERTIFICATE_FROM_NAME` | Sender name shown on Hero certificate emails, such as `PawChain Certificates`. |
| `GMAIL_SMTP_USER` | Gmail address used to send certificates. |
| `GMAIL_APP_PASSWORD` | Google App Password for that Gmail account, not the normal account password. |
| `WALLET_SESSION_SECRET` | Random server secret used to protect signed wallet sessions; use at least 32 characters. |

Generate a wallet-session secret with a password manager or another cryptographically secure secret generator. Restart the frontend whenever environment values change.

### 6. Add Sepolia to the wallet

Configure the user's wallet with:

| Setting | Value |
| --- | --- |
| Network name | Ethereum Sepolia |
| Chain ID | `11155111` |
| Currency symbol | `ETH` |
| RPC URL | The same Sepolia endpoint configured above |
| Block explorer | `https://sepolia.etherscan.io` |

Fund administrator, shelter, and donor test wallets with Sepolia ETH before testing blockchain actions.

### 7. Start the application

From the repository root:

```powershell
npm.cmd run frontend
```

Open [http://localhost:3000](http://localhost:3000), connect a wallet on Sepolia, and complete the wallet-signature authentication flow.

For local Hardhat development instead of Sepolia, use `npm.cmd run dev:all`. That workflow deploys fresh local contracts, so use chain ID `31337`, the local RPC URL `http://127.0.0.1:8545`, and the newly emitted local contract addresses.

### Setup checklist

- [ ] Backend dependencies installed and contracts compiled.
- [ ] Deployer wallet funded with Sepolia ETH.
- [ ] RoleNFT deployed and its address recorded.
- [ ] CampaignFactory deployed using the same RoleNFT address.
- [ ] Reown, Supabase, network, contract, metadata, email, and session variables configured.
- [ ] RoleNFT minter key belongs to an authorized administrator.
- [ ] Frontend restarted after environment changes.
- [ ] Wallet connected to chain ID `11155111`.
- [ ] Shelter registration, admin approval, campaign deployment, donation, and milestone flow tested with separate wallets.
