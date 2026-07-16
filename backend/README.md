# PawChain smart contracts

- `RoleNFT.sol` identifies PawChain admins, shelters, and donors.
- `CampaignFactory.sol` deploys one approved campaign per Supabase campaign key.
- `Campaign.sol` holds donations and controls milestone withdrawals and refunds.

Useful commands:

```powershell
npm.cmd run compile
npm.cmd test
npm.cmd run node
npm.cmd run deploy:local
```

The deployment module is `ignition/modules/PawChain.ts`.
