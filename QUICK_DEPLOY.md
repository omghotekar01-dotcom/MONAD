# BEAT DROP — quickest hackathon deployment

Repository: https://github.com/omghotekar01-dotcom/MONAD

## 1. Install and test (Node.js 22+)

```powershell
git clone https://github.com/omghotekar01-dotcom/MONAD.git
cd MONAD
npm ci --legacy-peer-deps
npm run test:design
npm run test:legacy
npm run contracts:test
npm run build
npm run dev
```

Local site is not a public hackathon URL. The Solo Studio works without deployment or a wallet.

## 2. Deploy BeatDrop.sol to Monad Testnet

Read `docs/VS_CODE_DEPLOY.md` for the full steps. Keep ALL private keys and seed phrases off GitHub and out of chat.

```powershell
npm run deployer:prepare
```

Send testnet MON (not mainnet funds) to the PUBLIC one-time deployer address printed.

```powershell
npm run deployer:status
npm run contracts:compile
npm run contracts:test
npm run contracts:deploy:testnet
npm run chain:check
```

The deploy command checks chain ID 10143, deploys with a dedicated local signer, waits for the receipt, and writes the PUBLIC contract address to a Git-ignored `.env.local`. Copy the real PUBLIC address and transaction hash. Verify the bytecode and transaction using https://testnet.monadvision.com. Explorer source-code verification is a separate step; publish the matching flattened/standard-json compiler inputs with Solidity 0.8.24 and optimizer 200 where supported. A transaction receipt does NOT automatically mean the source is verified.

## 3. Host the full website (Vercel)

1. Sign in at https://vercel.com/new with your GitHub-connected account.
2. Import **omghotekar01-dotcom/MONAD**.
3. Choose Node.js 22 or newer and the TanStack Start preset if available.
4. The repo already has `vercel.json`, `vite.config.ts`, and `npm run build:vercel`.
5. Installation command: `npm ci --legacy-peer-deps`. Build: `npm run build:vercel` if auto-detection fails.
6. Add these **public** production environment variables:
   - `VITE_BEATDROP_ADDRESS` = actual deployed Monad Testnet contract address.
   - `VITE_MONAD_RPC_URL` = `https://testnet-rpc.monad.xyz`.
7. Deploy and wait for READY; open the actual HTTPS site. Test refreshing `/studio` and opening a direct room link.
8. If build fails, inspect the Vercel build log; do not replace the server build with a static `dist` upload.

**Do not add `DEPLOYER_PRIVATE_KEY` or any wallet secret as a `VITE_` variable.** Smart-contract deployment is separate from hosting.

## 4. Update the README with verified public evidence

Replace the clearly marked **Public website** and **Public Monad Testnet contract** placeholders at the top of README only AFTER confirming they work. Add the actual explorer contract URL and verified source status. Make this change and push it **before the code-freeze deadline**; no code changes afterward.

## 5. Submission rubric checklist

- [ ] Public repo URL works without login.
- [ ] README contains working public HTTPS URL and actual testnet contract address.
- [ ] Contract deployed on Monad Testnet 10143; explorer receipt exists.
- [ ] Contract source verified on the explorer.
- [ ] Public app can connect wallet and produce a genuine transaction.
- [ ] Fresh-clone README commands work independently.
- [ ] Social X/LinkedIn post tags @monad, @monad_dev and @geeky_kartikey.
- [ ] Demo video 30 seconds or longer, showing actual product running.
- [ ] Creative advertisement video posted, with working evidence URL.
- [ ] View counts and all submission evidence captured by deadline.
- [ ] Pitch says repo, contract address, live URL, deployment out loud.

## 6. Three-minute demo order

1. (0:00–0:25) Pitch the real problem and name/link/network.
2. (0:25–1:05) Play drums, bass, synth, pluck and show the 16-step sequencer in Solo Studio.
3. (1:05–2:05) Run a real testnet wallet transaction; open its explorer hash and show successful confirmation.
4. (2:05–2:35) Show Beat Card and explain equal eligible seat-based tip distribution.
5. (2:35–3:00) Explain originality, creator use case, revenue opportunities, and how to independently run it.

Only claim operations that have actually been tested and confirmed.

**Scope:** Testnet prototype; not a security-audited financial service. Blockchain records seat contributions and tip accounting, not legal music rights or external streaming royalties.
