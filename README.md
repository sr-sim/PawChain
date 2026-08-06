# PawChain

PawChain uses Supabase for application data and a local Hardhat blockchain for
donations, milestone releases, and refunds.

## Campaign blockchain setup

### 1. Start the local chain

```powershell
cd backend
npm.cmd run node
```

Keep this terminal open. Restarting the Hardhat node creates a fresh blockchain,
so previously deployed contract addresses and transactions no longer exist.

### 2. Deploy RoleNFT and CampaignFactory

In a second terminal:

```powershell
cd backend
npm.cmd run deploy:local
```

Copy the deployed `RoleNFT` and `CampaignFactory` addresses printed by Hardhat
Ignition.

### 3. Configure the frontend

Add or update these values in `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ROLE_NFT_ADDRESS=<deployed RoleNFT address>
NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=<deployed CampaignFactory address>
NEXT_PUBLIC_ETH_MYR_RATE=7043.58
```

Keep the existing Supabase, AppKit, and `ROLE_NFT_MINTER_PRIVATE_KEY` settings.
The ETH/MYR rate is a demo snapshot used to convert the approved MYR goal and
donation amount; it is not a live price oracle.

The wallet approving a campaign must be one of the admin addresses recognized
by `RoleNFT` and must have local test ETH for gas. Fund that wallet from one of
the accounts printed by `hardhat node`; never buy or send real ETH to the local
network.

### 4. Supabase database

This assignment prototype uses a preconfigured Supabase database. The complete
database provisioning schema is outside the scope of this repository, so use
the existing Supabase project and credentials configured in `frontend/.env.local`.

### 5. Seed local RoleNFTs if needed

```powershell
npm.cmd run seed:role-nfts
```

The shelter wallet used by a campaign must hold an active Shelter RoleNFT before
the admin can deploy its Campaign contract.

### 6. Start the frontend

```powershell
cd frontend
npm.cmd run dev
```

### Hero Donor certificate email

The admin certificate action generates a personalized PDF and sends it through
the dedicated PawChain Gmail account. Copy the variables from
`frontend/certificate-email.env.example` into `frontend/.env.local`, then use a
Google App Password generated for that account. Restart the frontend after
changing environment variables.

## Verification

```powershell
cd backend
npm.cmd test

cd ..\frontend
npm.cmd run build
```

## On-chain campaign flow

1. The shelter submits a campaign and 2–5 milestones to Supabase.
2. Milestone 1 is fixed at 5%; all percentages must total 100%.
3. The admin approves it by deploying one `Campaign` through
   `CampaignFactory`.
4. Donors donate ETH to that campaign contract.
5. The first 5% becomes withdrawable when donations reach 5% of the goal.
6. Later milestones require sequential proof approval and their cumulative
   funding threshold.
7. Cancellation or underfunded expiry enables donors to claim their share of
   the remaining locked ETH.
