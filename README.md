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
