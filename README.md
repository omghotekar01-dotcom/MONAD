# BEAT DROP
### Four strangers. One beat. Everyone credited.

A playful four-instrument music room on **Monad Testnet**.

Built from the **exact original light-theme Lovable UI/UX** in the user's
[craft-ui-essentials](https://github.com/omghotekar01-dotcom/craft-ui-essentials)
repository, merged with the existing MONAD smart-contract and music project.

![BEAT DROP design is mint glass, cobalt ribbon and coral sculpture](src/assets/mint-cover.jpg)

## The experience

The website preserves the original Lovable React/TanStack design language:
minimal white canvas, mint accents, left navigation, sculptural album artwork,
audio player docked at the bottom, and mobile adaptations.

| Navigation | What works |
| --- | --- |
| Discover | Home, original artwork and featured sample loops |
| Solo studio | Real Tone.js audio, 4 instruments, 16 steps, keyboard/pads, transport, mixer, recording, undo, JSON import/export |
| Producer | Offline 4-style, 3-energy music suggestions, audition and human-approved edits, local four-track drafts |
| Jam rooms | Honest local previews until configured; actual on-chain room list after deployment |
| Create / Join | Real Monad testnet room transaction or numeric invite when deployed |
| Lobby | Host-approved wallet seats and optional scoped session key |
| Live studio | 90-second rounds, seat-authorized edits, transaction status and chain sync |
| Drops / Library | Original Lovable sample and local browser-save browsing |
| Beat Card | Sample/local replay, or final on-chain pattern, eligible seat attribution, test MON tip/claim |
| Profile / How it works | Original Lovable routes |

**Important:** The original Lovable source was a local-only frontend preview;
the deployed-room routes now connect to the retained `BeatDrop.sol` contract.
No testnet contract has yet been deployed in this project or independently
tested with two real wallets. Without `VITE_BEATDROP_ADDRESS`, website rooms
remain visibly local-only. Sample beats are never represented as real
user-minted on-chain assets.

## Run locally

Requirements: Node.js **22** and npm; no Docker.

```powershell
git clone https://github.com/omghotekar01-dotcom/MONAD.git
cd MONAD
npm ci --legacy-peer-deps
npm run dev
```

Open the local URL printed by Vite. You can immediately test Solo Studio
and samples without a wallet.

Quick controls: `1/2/3/4` instruments, drum `A/S/D/F`, melodic
`A S D F G H J K` and `Q W E R T Y U I`; `Space` arm recording,
`Z` undo. Audio activates only after the first user gesture.

## Validate

```powershell
npm run test:design
npx tsc --noEmit
npm run test:legacy
npm run contracts:compile
npm run contracts:test
npx playwright install chromium
npm run test:e2e
npm run build
```

GitHub Actions runs the same test/check/build sequence in a known environment.
Passing automated tests does not prove real cross-device timing, mobile wallet
transaction reliability, or on-chain tips.

## Upgrade 7 — louder signature song, real transaction explorer, solo chain rehearsal

- Original **Midnight on Monad** four-instrument signature composition
  (`src/lib/demo-song.ts`), 16 steps at 120 BPM; 45 repetitions fill a
  90-second round. Load it directly from the Solo Studio guide.
- Upgraded Tone.js output with approximately **2.5x pre-limiter slider gain**,
  boosted instrument voices, gentle synth/pluck echo, compression and
  a -1 dB peak limiter. Actual loudness depends on device/speakers;
  start with comfortable OS/headphone volume.
- One-click **Rehearse 4 players alone** creates a clearly local four-seat
  simulation with the original song. No wallet or chain transaction claimed.
- For **real testnet rehearsal**, a room host can assign all four seats
  to **one MetaMask wallet**, then publish the signed demo song as up to
  four on-chain instrument transactions during the 90-second active round.
- Rooms, live Studio and finalized Beat Cards have a **Load transactions**
  explorer panel. It reads **real `eth_getLogs` results**, groups
  accepted `NoteSet` events by transaction, and links each real hash to
  MonadVision. The recent-block window is limited, not a full history index.
- Read-only CLI `npm run chain:check` confirms the configured RPC is
  chain ID **10143** and the deployed contract has the expected interface.
- No contract address or testnet room hash has been deployed/proven in this
  repo yet. Contract creation still requires the user's testnet wallet
  confirmation; no wallet private keys belong in source or chat.

**Start the real blockchain activation:** [ACTIVATE_MONAD.md](docs/ACTIVATE_MONAD.md).

## Live Monad dashboard, custom Lo-fi creation, Vercel hosting

- **/chain** → independently verifiable read-only Monad Testnet status:
  contract `0x9568d1f7871f46E75F555D66f68fF248de6d37fD`,
  chain ID 10143, latest block, total on-chain rooms, newest room ownership,
  accepted note patterns and real `NoteSet` transaction hashes.
  The RPC activity feed polls every 15 seconds and is explicitly
  **recent-block only**; no fabricated sample activity.
- **/studio** → **New blank Lo-fi · 84 BPM**, all four musical lanes
  start empty. Place your own notes; freely adjust solo tempo 65–160 BPM,
  play, save a local Beat Card, or click **Publish my song on Monad**.
- Publishing a custom song first saves a local draft and opens the REAL
  room creator. One wallet can then own all four instrument seats,
  start the 90-second chain round, and click **Publish my draft to Monad**.
  This creates genuine signed transactions for changed notes only.
- **Contract limitation:** The currently deployed Solidity room uses
  **fixed 120 BPM**. An 84 BPM Lo-fi local draft's four musical patterns
  can be published, but the 84 BPM setting itself cannot be encoded in
  this contract without deploying an upgraded contract. The user is warned.
- Browser-saved Beat Cards are **not on-chain** and cannot receive real
  testnet tips. The old confusing local `Tip the crew` button now
  explicitly invites a real on-chain jam.
- Vercel: the code includes `vercel.json`, an explicit Nitro/Vercel
  output preset and `npm run build:vercel`, verified by CI.
  Connect/import the GitHub repo to Vercel with these **PUBLIC**
  build environment values: `VITE_BEATDROP_ADDRESS` set to the deployed
  address, `VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz`,
  and `NITRO_PRESET=vercel`.
  Never paste a wallet key or seed phrase in Vercel variables.

**Deployment walkthrough:** [VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md).

## One-time contract deployment directly from VS Code (no Remix)

A safe deployment workflow is built into this repository. A dedicated
throwaway testnet signer is generated locally under your user AppData
(outside any OneDrive-synced project directory). Your existing MetaMask
Account 1 key is **not** exported or accessed.

```powershell
npm ci --legacy-peer-deps
npm run deployer:prepare
# Send a little TESTNET MON to the printed PUBLIC deployer address.
npm run deployer:status
npm run contracts:compile
npm run contracts:deploy:testnet
npm run chain:check
npm run dev
```

Deployment automatically writes the PUBLIC contract address into Git-ignored
`.env.local`. A live wallet with some test MON is still needed to fund
the throwaway signer. Only Monad Testnet chain ID 10143 is allowed.
**Full setup:** [VS_CODE_DEPLOY.md](docs/VS_CODE_DEPLOY.md).

## Monad Testnet

- Chain ID **10143**.
- Public RPC: `https://testnet-rpc.monad.xyz`.
- Native currency: **testnet MON**.
- Faucet: https://faucet.monad.xyz.
- Never use a wallet holding mainnet funds to deploy the prototype.

Deploy the Solidity contract once through MetaMask + Remix (or a dedicated
local throwaway testnet signer); then add its **public address**:

```dotenv
VITE_BEATDROP_ADDRESS=0xYOUR_DEPLOYED_TESTNET_CONTRACT
```

Restart the app. Remember: the frontend is now **TanStack Start + Nitro SSR**,
not a static Vite `dist` site. Public hosting needs a compatible server
runtime/adapter with deep-link support.

For details read [DESIGN INTEGRATION](docs/DESIGN_INTEGRATION.md)
and [MONAD MULTIPLAYER](docs/MULTIPLAYER.md).

## How contributor credit works

The contract freezes four seat wallet addresses on Start. In a 90-second
round, each approved owner may change only their lane and needs a confirmed
testnet transaction. When the round closes, **only lanes retaining at least
one accepted note** count toward equal tip shares. A wallet holding two
eligible lanes gets two shares. No platform royalty fee, automatic NFT mint,
creator identity proof, or commercial streaming royalties are claimed.

The Producer remains a deterministic music-rule generator, not a trained LLM
or unrestricted blockchain bot. All edits require explicit player approval.

## Files

- `src/components/` — original light Lovable interface and new chain screens
- `src/routes/` — TanStack file-based navigation
- `src/styles.css` — exact source tokens, with accessibility refinements
- `src/assets/` — exact supplied mint, blue and coral cover art
- `src/services/monad-bridge.ts` — typed contract and music adapter
- `src/chain.js`, `src/producer.js`, `src/room-utils.js` — retained original logic
- `contracts/BeatDrop.sol` — retained Solidity room and distribution protocol
- `tests/`, `src/test/`, `test/`, `e2e/` — automated checks
- `docs/DESIGN_INTEGRATION.md` — route mapping, design provenance, deployment changes
- `PROJECT_STATUS.md` — completed and outstanding tests

**Prototype security disclaimer:** contracts have no independent audit; do
not use real money or treat an on-chain note record as legal proof of ownership.
