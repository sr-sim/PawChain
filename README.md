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

- Register an organization and upload supporting documents for verification. 
- Track the application's approval, rejection, and resubmission status.
- Receive a non-transferable Shelter RoleNFT after administrator approval.
- Create campaign proposals with a funding goal, 30-, 60-, or 90-day duration, optional image, and two to five milestones.
- Track campaign approval status, donations, balances, and milestone progress.
- Withdraw a funded milestone using the registered shelter wallet.
- Upload evidence showing how released funds were used.
- Correct and resubmit rejected milestone evidence.
- Manage campaigns, notifications, shelter profile information and monitor refunds.

### 🛠️ Administrator

- Sign in with an approved internal administrator wallet.
- Review shelter applications and supporting documents.
- Approve shelters and mint Shelter RoleNFTs.
- Deactivate shelters and revoke their Shelter RoleNFTs.
- Generate and email certificates to eligible Hero Donors.
- Review campaign proposals and deploy approved Campaign contracts.
- Approve or reject milestone evidence.
- Cancel campaigns and initiate the eligible refund flow.
- Monitor users, shelters, campaigns, transactions, analytics, and notifications.
- Review submitted reports and investigate campaign concerns.

## 🔄 Platform flow

### 1. Shelter verification

1. A shelter connects its wallet, registers, and uploads supporting documents.
2. An internal administrator reviews the application.
3. When approved, the shelter receives a Shelter RoleNFT and access to shelter functions.

### 2. Campaign approval

1. The verified shelter creates a campaign proposal with its funding goal, deadline, and milestones.
2. The campaign must contain at least two milestones, the first milestone must be 5%, and all percentages must total 100%.
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

1. An administrator may cancel an active campaign.
2. An administrator finalizes an expired campaign that has not reached its goal.
3. New donations and normal withdrawals stop when refunds are enabled.
4. Each donor claims with the same wallet used to donate.
5. The donor receives contributions assigned to milestones whose funds were not released. Contributions from released milestones are not refundable.

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

Individual Campaign contracts are created automatically by the CampaignFactory whenever an administrator approves a campaign. They are not listed here because every approved campaign has a different contract address; each address is available from its campaign page and deployment transaction.

Use these addresses in `frontend/.env.local`:

```env
NEXT_PUBLIC_ROLE_NFT_ADDRESS=0x2F2bFC356D87a901CDe862B5D0DFc20017838C43
NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=0x6ec3Cbadcbe84357228DeFd9Bc42666Ec815D1fa
```

## 💡 Core assumptions

### Internal administrators

- Administrators are trusted PawChain staff and cannot register publicly.
- Authorized administrator addresses are configured before RoleNFT deployment.
- Administrators do not require a Supabase profile or RoleNFT.
- When a shelter is deactivated, its pending campaigns are rejected and its active campaigns are cancelled. Donors can then claim any eligible refunds.
- Shelter verification, campaign approval, evidence review, and report investigation require human judgment.

### Shelters

- A shelter represents an animal-welfare organization rather than an individual fundraiser.
- Each shelter account is linked to one wallet address, and that wallet acts as the organization's authorized blockchain identity.
- The person registering the shelter is assumed to have authority to act on behalf of the organization.
- Each campaign belongs to one shelter wallet and cannot be reassigned to another shelter after contract deployment.
- Only the registered shelter wallet can withdraw milestone funds and submit milestone evidence.
- The shelter is responsible for maintaining access to its wallet. PawChain cannot recover lost private keys or reverse completed transactions.
- The shelter must ensure its connected wallet uses the supported blockchain network before performing transactions.
- When create campaign, the shelter must set the funding goal at least MYR 1000 or above.
- Campaign information, milestones, funding goals, deadlines, and evidence requirements are expected to be accurate and achievable.
- Evidence submission does not automatically approve a milestone; administrator review is required.
- Rejected evidence may be corrected and resubmitted, but the following milestone remains locked until approval.
- When refunds are enabled, normal donations and withdrawals stop.
- Shelters can monitor refunds but cannot claim refunds on behalf of donors.

### Donors

- Donors make voluntary donation decisions and are responsible for reviewing the campaign and milestone information. PawChain's approval process does not guarantee a campaign's success or the accuracy of every shelter claim.
- A donation is recorded only after its blockchain transaction is confirmed. Pending, rejected, or reverted transactions are not successful donations.
- Confirmed donations cannot be manually cancelled or reversed. Refunds are available only when enabled by the campaign contract, must be claimed with the wallet that donated, and exclude funds already released to the shelter.
- Donors are responsible for blockchain gas fees and ETH price fluctuations. Gas fees are not counted as donations and are not refundable.

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
- The contract limits active Donor and Shelter RoleNFT supplies to 50 each as a prototype constraint for controlled testing and demonstration. The number 50 is not a permanent business requirement; a production deployment should increase, configure, or remove the limit based on scalability and governance needs. Revoking a RoleNFT decreases the corresponding active supply count, allowing another RoleNFT of that role to be minted.
- `ROLE_NFT_MINTER_PRIVATE_KEY` belongs to an authorized administrator wallet and is used by the server to mint a Donor RoleNFT automatically after successful donor registration. A Shelter RoleNFT is minted separately using the connected administrator wallet during shelter approval.
- Donor badge levels upgrade automatically when confirmed cumulative on-chain donations reach the configured thresholds. Shelter RoleNFTs do not have badge levels.
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
- ETH-to-MYR values are estimates. Historical MYR values use the rate saved when the donation or refund was recorded.

## 🛠️ Technology stack

- **Frontend/API:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Wallet/Web3:** Reown AppKit, Wagmi, Viem
- **Blockchain:** Solidity 0.8.28, Hardhat, Hardhat Ignition
- **Database/storage:** Supabase Database and Storage; IPFS for RoleNFT metadata
- **Documents/email:** PDF-Lib and Nodemailer

## System architecture

<img width="5376" height="3264" alt="image" src="https://github.com/user-attachments/assets/5927387a-726c-44b0-bc78-3e577197d641" />

## 🚀 Run the application locally

### Prerequisites

#### Node.js and npm

Install Node.js 20 or later from [nodejs.org](https://nodejs.org/), then verify:

```powershell
node --version
npm --version
```

#### MetaMask

Install MetaMask, create or import a test wallet, and select **Ethereum Sepolia**:

```text
Network: Ethereum Sepolia
Chain ID: 11155111
Currency: ETH
Explorer: https://sepolia.etherscan.io
```

The wallets used for deployment and testing need Sepolia ETH for gas.

#### Required services

- A fresh Supabase project. The PawChain tables can be created from the included migration. The application creates the private Storage bucket `shelter-verification-documents` automatically when the first shelter document is uploaded.
- A Reown Cloud project for wallet connection.
- A Sepolia RPC URL.
- IPFS metadata CIDs for RoleNFT badges.
- Gmail with an App Password for Hero certificate emails.

#### ETH-to-MYR currency API

PawChain uses the public [CoinGecko API](https://www.coingecko.com/en/api) to retrieve the current Ethereum price in MYR. It uses `/api/v3/simple/price` for the latest rate and `/api/v3/coins/ethereum/market_chart` for 24-hour price history. Results are cached briefly, and no CoinGecko API key is currently required. If a request fails, the application uses its predefined demonstration rate, so displayed MYR amounts remain estimates; smart contracts and financial records use ETH.

### Setup steps

#### 1. Clone the repository

```powershell
git clone https://github.com/sr-sim/PawChain.git
cd PawChain
```

#### 2. Install dependencies

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

#### 3. Create the Supabase database

Create a new project in the [Supabase Dashboard](https://supabase.com/dashboard), then copy its **Session pooler** connection URI from **Connect**. Replace the password placeholder in the URI with the database password chosen when the project was created.

Apply the included baseline migration to the new project:

```powershell
npx --yes supabase@latest db push --db-url "YOUR_DATABASE_CONNECTION_URI"
```

This command applies [`supabase/migrations/202608070001_initial_schema.sql`](supabase/migrations/202608070001_initial_schema.sql), which creates the PawChain tables, enums, constraints, indexes, functions, triggers, and row-level security policies. Docker is not required for this command.

Use a fresh Supabase project. Do not apply the baseline to a database that already contains the PawChain tables. The migration creates the schema only; it does not copy users, authentication accounts, uploaded files, or application records.

The connection URI contains the database password. Do not commit it, place it in the README, or share it. If the password contains reserved URL characters, use a percent-encoded connection URI.

After the command succeeds, confirm in **Supabase Dashboard -> Table Editor** that tables such as `profiles`, `campaigns`, `campaign_milestones`, `donations`, and `donor_support_requests` are present.

#### 4. Configure the frontend

Create `frontend/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Reown and Sepolia
NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_ROLE_NFT_ADDRESS=0x2F2bFC356D87a901CDe862B5D0DFc20017838C43
NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=0x6ec3Cbadcbe84357228DeFd9Bc42666Ec815D1fa
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=
ROLE_NFT_MINTER_PRIVATE_KEY=

# RoleNFT metadata
DONOR_METADATA_CID=
SHELTER_METADATA_CID=
BRONZE_DONOR_METADATA_CID=
SILVER_DONOR_METADATA_CID=
GOLD_DONOR_METADATA_CID=
HERO_DONOR_METADATA_CID=

# Certificate email and wallet session
CERTIFICATE_FROM_NAME=PawChain Certificates
GMAIL_SMTP_USER=
GMAIL_APP_PASSWORD=
WALLET_SESSION_SECRET=
```

Get the Supabase URL and API keys from **Supabase Dashboard -> Project Settings -> API**, the project ID from Reown Cloud, and the RPC URL from a Sepolia RPC provider. Use the public anonymous key for `NEXT_PUBLIC_SUPABASE_ANON_KEY` and keep the service-role key server-only. Use IPFS metadata CIDs for the badge variables.

`ROLE_NFT_MINTER_PRIVATE_KEY` must contain the administrator wallet's private key, not its public wallet address, and must start with `0x`. The corresponding wallet must be recognized by `RoleNFT.isAdmin()` as the RoleNFT contract owner, `ADMIN_ONE`, or `ADMIN_TWO`. Using any other wallet causes RoleNFT minting to fail with an `Only admin` contract error. `WALLET_SESSION_SECRET` is a server-only random value used to secure wallet login sessions. It should contain at least 32 random characters and must be configured in `frontend/.env.local`.

RoleNFT metadata files are available in `backend/metadata/role-nfts`. To upload them, set `PINATA_JWT` in your terminal, run `npm --prefix backend run upload:role-metadata`, and add the printed CIDs to `frontend/.env.local`.

Never commit private keys, the Supabase service-role key, Gmail App Password, or wallet-session secret.

#### 5. Configure the backend

The contracts are already deployed. Create `backend/.env` only if you want to deploy them to Sepolia:

```env
DEPLOYER_PRIVATE_KEY=
SEPOLIA_RPC_URL=
```

The deployer wallet must have Sepolia ETH. To redeploy both RoleNFT and CampaignFactory to Sepolia:

```powershell
cd backend
npm.cmd run compile
npx.cmd hardhat ignition deploy ignition/modules/PawChain.ts --network sepolia --deployment-id pawchain-sepolia-new
cd ..
```

After deployment, copy the new RoleNFT and CampaignFactory addresses from `backend/ignition/deployments/pawchain-sepolia-new/deployed_addresses.json` into `frontend/.env.local`, then restart the frontend. Use a new deployment ID if `pawchain-sepolia-new` has already been used.

#### 6. Start the development server

```powershell
npm.cmd run frontend
```

Open [http://localhost:3000](http://localhost:3000), connect MetaMask to Sepolia, select a role, and start using PawChain.

### Administrator account setup

Administrators are internal users and cannot register through the public form. PawChain grants access only when `RoleNFT.isAdmin(walletAddress)` recognizes the connected wallet.

#### Authorize an administrator

1. Create a dedicated MetaMask test account for the administrator.
2. Use only the account's **public wallet address**. Never share its private key or recovery phrase.
3. Before deployment, replace either `ADMIN_ONE` or `ADMIN_TWO` in `backend/contracts/RoleNFT.sol` with the administrator's public address:

```solidity
address public constant ADMIN_ONE = 0x...; // Administrator wallet
```

4. Deploy the new RoleNFT and CampaignFactory contracts.
5. Update `NEXT_PUBLIC_ROLE_NFT_ADDRESS` and `NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS` in `frontend/.env.local`.

Administrator constants cannot be changed after RoleNFT is deployed. A new deployment is required when replacing one of these predefined administrator addresses.

#### Configure an additional administrator

1. Copy the public address of the MetaMask account that will be used for administrator access.
2. Replace either `ADMIN_ONE` or `ADMIN_TWO` in `backend/contracts/RoleNFT.sol` with the additional administrator address. Both constants can be updated if both administrator wallets need to change.
3. Compile and redeploy the RoleNFT and CampaignFactory contracts to Ethereum Sepolia.
4. Update the new contract addresses in `frontend/.env.local`, then restart the application.
5. Call `isAdmin(additionalAdminAddress)` and confirm that it returns `true`.
6. Connect the same MetaMask account to Sepolia and sign in.

Only a public wallet address is required; never share a private key, password, or recovery phrase. The wallet requires Sepolia ETH for gas. Redeployment creates fresh contract state, so records and NFTs from the previous deployment are not transferred.

#### Administrator sign-in

1. Open MetaMask using the authorized account.
2. Switch to Ethereum Sepolia (`11155111`).
3. Open PawChain and connect the wallet.
4. Sign the authentication message.
5. PawChain verifies the public address on-chain and redirects the administrator to `/Admin/dashboard`.

The administrator does not need to register, create a Supabase profile, or receive a RoleNFT.

## 🔧 Troubleshooting

### Wallet connection issues

- Confirm MetaMask is connected to Ethereum Sepolia with chain ID `11155111`.
- Confirm `NEXT_PUBLIC_PROJECT_ID` and `NEXT_PUBLIC_RPC_URL` are correct.
- Check that the wallet has enough Sepolia ETH for gas.
- Disconnect and reconnect the wallet after changing networks.

### Contract errors

- Confirm the RoleNFT and CampaignFactory addresses match the deployed Sepolia contracts listed above.
- Confirm the administrator or minter wallet is authorized by the RoleNFT contract.
- Restart the frontend after changing environment variables.

### Administrator access denied

- Confirm MetaMask is using an authorized wallet on Sepolia.
- Confirm `NEXT_PUBLIC_ROLE_NFT_ADDRESS` matches the deployed contract.
- Check the wallet using the contract's `isAdmin(address)` function on Etherscan.

### Frontend or database errors

- Confirm all required variables exist in `frontend/.env.local`.
- Confirm the Supabase URL and keys belong to the same project.
- Check that the required Supabase tables, storage buckets, and access policies exist.
- Check the terminal and browser console for the specific error message.
