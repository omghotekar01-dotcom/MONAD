# Deploy BEAT DROP to Vercel (TanStack Start + Nitro)

**Status:** Code and GitHub CI can be verified without a Vercel account;
a PUBLIC Vercel URL requires an authorized Vercel integration or a user-driven
deployment. Do not claim a hosted URL until Vercel reports a successful
deployment and the live pages have been tested.

## 1. Existing checked-in smart contract

- Monad Testnet: `10143`
- PUBLIC contract address: `0x9568d1f7871f46E75F555D66f68fF248de6d37fD`
- Public RPC: `https://testnet-rpc.monad.xyz`
- Explorer: https://testnet.monadvision.com/address/0x9568d1f7871f46E75F555D66f68fF248de6d37fD
- DO NOT deploy the contract again just to host the website.
- **No** wallet recovery phrases, private keys, `DEPLOYER_PRIVATE_KEY`,
  MetaMask connection keys or `testnet-deployer.env` in Vercel settings.

## 2. Deploy exact existing GitHub code

1. Sign in to https://vercel.com/new.
2. Select **Import Git Repository**.
3. Authorize GitHub to view `omghotekar01-dotcom/MONAD` as needed.
4. Import **omghotekar01-dotcom/MONAD**, root directory `./`.
5. The included `vercel.json` selects **TanStack Start**.
   This app uses server-side routes; **do not configure it as a static Vite SPA**.
6. Set Node.js version to **22.x** if Vercel asks.
7. Set the following environment variables for **Production and Preview**
   before clicking Deploy:

   ```dotenv
   VITE_BEATDROP_ADDRESS=0x9568d1f7871f46E75F555D66f68fF248de6d37fD
   VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   NITRO_PRESET=vercel
   ```

   `VITE_*` variables are intentionally PUBLIC: a browser wallet must know
   the contract and RPC. Do **not** prefix confidential values with `VITE_`.
   `NITRO_PRESET=vercel` ensures the Nitro server targets Vercel instead of
   the development template's Cloudflare default.

8. Dependency installation uses `npm ci --legacy-peer-deps` (the project
   lockfile needs `--legacy-peer-deps`). If Vercel errors on dependencies,
   set the **Install Command** to `npm ci --legacy-peer-deps` in Vercel
   Project Settings, then redeploy.
9. Vercel should detect the `TanStack Start` framework and run `npm run build`
   (build output is a Nitro server, **not** a generic `dist` directory).
10. Wait for deployment success; record the **actual** assigned HTTPS URL.

## 3. Verify the real hosted app

Visit all the following on the deployed hostname, in separate fresh tabs:

- `/` — homepage loads without SSR errors.
- `/studio` — click **New blank Lo-fi · 84 BPM**, add four-beat drum
  and bass notes, Play and save local Beat Card.
- `/chain` — contract address and chain ID shown; live blocks/room count
  load from RPC. No sample or local Beat Cards should be shown as TXs.
- `/create` — create a **real** Monad room; MetaMask prompts the testnet.
- `/room/1` — replace `1` with a REAL confirmed room ID. Route must load
  directly from HTTPS and show its public on-chain owner and pattern.
- `/room/1/lobby` and `/room/1/studio` — direct link and refresh work.
- `/beat/1` — only finalized chain rooms open a real Beat Card.

Verify the wallet is on Monad Testnet chain `10143`; run a small
test transaction, wait for confirmation, and confirm a real TX hash in
https://testnet.monadvision.com. **Do not assume an SSR build passing means
wallet interactions or on-chain read/write have been validated.**

## 4. Deploy using CLI instead (if desired)

In an ordinary VS Code terminal inside your project:

```powershell
npm ci --legacy-peer-deps
npm run build
npx vercel
```

Sign in to Vercel through the browser when prompted. Configure your PUBLIC
environment variables in the Vercel project dashboard, then:

```powershell
npx vercel --prod
```

The CLI command runs on **your computer**, not inside ChatGPT.
The public URL is printed by Vercel only after it actually deploys.

## 5. Troubleshooting

- **Local-only banner:** public `VITE_BEATDROP_ADDRESS` was not set
  before build; set it in Vercel and REDEPLOY.
- **404 on deep links:** wrong framework preset or Nitro build target.
  Confirm `vercel.json`, `NITRO_PRESET=vercel`, SSR build logs.
- **Build fails during install:** set Install Command to
  `npm ci --legacy-peer-deps`.
- **RPC read error:** check public RPC availability/CORS, exact contract address,
  and a browser console network error. Large event scans may be RPC-limited.
- **Wallet works but local saved Beat Card cannot tip:** expected. Local cards
  never pay testnet MON. Create a new on-chain jam.
- **No TXs yet:** contract registry might have 0 rooms and no edits;
  use `/create` to create a real on-chain room first.
- **Runtime 500 error:** use Vercel Functions logs; never expose secrets.

Reference: https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel
