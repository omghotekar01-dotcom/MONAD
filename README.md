# BEAT DROP

**Four strangers. One beat. Everyone credited.**

A four-seat collaborative browser music sequencer built for **Monad Testnet**.
Create a 90-second jam, play a shared 16-step loop, see which instrument seats
contributed, and replay the finished music card. Listeners may tip **testnet
MON** to eligible contributors through the contract.

## Current release

| Area | State |
| --- | --- |
| Local drums, bass, synth and pluck studio | Implemented; usable without a wallet |
| Local Beat Card preview, deterministic SVG, replay mute/solo, volume | Implemented |
| Solidity room, seat, attribution and MON distribution contract | Implemented; automated tests |
| Wallet connect, real room creation/joins, live edits, final cards | Frontend implemented; requires deployed contract address |
| Two independently verified public-wallet jam and claim demo | **Not yet validated** |
| Deployed testnet contract and public website | **Not yet deployed** |

**The UI intentionally disables Create Jam when no verified testnet contract
address is configured.** A local practice session is not a simulated on-chain
transaction. Do not interpret a passing browser test as proof of deployed
multiplayer.

## Start local studio (Windows / VS Code)

Requirements: Node.js 22, npm, a modern browser.

```powershell
git clone https://github.com/omghotekar01-dotcom/MONAD.git
cd MONAD
npm ci
npm run dev
```

Open the URL that Vite prints (typically http://localhost:5173).

Controls: `1/2/3/4` inspect Drums/Bass/Synth/Pluck;
`A S D F` are drum hits; melodic lower row `A S D F G H J K`,
upper row `Q W E R T Y U I`. `SPACE` arms/disarms recording;
`Z` undoes. Touch pads and an interactive one-bar 16-step grid are
also available. Playback and note entry start audio after a user action.

Make at least one note, then click **Preview Beat Card**:
play, solo/mute each stem, view pattern-derived art, download SVG,
and adjust master volume. This mode is explicitly **LOCAL** and free.

## Verified build and tests

```powershell
npm ci
npm test
npm run contracts:compile
npm run contracts:test
npx playwright install chromium
npm run test:e2e
npm run build
```

The browser tests cover two Chromium viewport types; MIDI/audio fidelity,
live-wallet authorizations and physical phones require separate manual checks.
The current verification status is maintained in [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Real Monad Testnet multiplayer

Network: **Monad Testnet**, chain ID **10143**; native currency testnet MON;
RPC `https://testnet-rpc.monad.xyz`, explorer
https://testnet.monadvision.com, faucet https://faucet.monad.xyz.

To activate live multiplayer:

1. Compile and deploy `contracts/BeatDrop.sol` **to testnet only** with
   a dedicated wallet (MetaMask + Remix is supported; no seed phrase in chat).
2. Add its exact public address to local `.env.local`:
   `VITE_BEATDROP_ADDRESS=0x...`
3. Restart Vite; verify Create Jam / Join Jam and actual confirmations.
4. To share rooms across devices, host the frontend on public HTTPS
   with the *same* public testnet contract address.

See [Multiplayer setup and demo acceptance](docs/MULTIPLAYER.md) and
[Smart contract protocol](docs/CONTRACTS.md).

Accepted notes, frozen instrument owners, eligibility and tip balances are
read from the contract. Live audio and optimistic user inputs are browser-local
until confirmed. The app makes no sample-accurate cross-device synchronization
claim.

## Beat Cards and payment policy

[Beat Card guide](docs/BEAT_CARD.md): local preview, deterministic artwork,
stem isolation, credits, replay, no hidden backing notes.

Each instrument seat retaining >=1 accepted note in the finalized pattern
gets one equal entitlement to native testnet MON tips. Multiple seats owned
by one wallet aggregate their entitlement. Empty seats earn nothing.
The contract rounds tips deterministically and supports pull-based claims.
No platform fee is charged in this prototype.

**Important:** Attribution is account activity, **not** legal proof of
copyright, commercial song royalty collection, or verified human identity.
Beat Cards are not automatically NFTs; no external streaming royalties are
collected.

## Security and privacy

- No mainnet deployment or production-funds readiness is claimed.
- Do **not** paste seed phrases, deployer keys, or session keys into
  GitHub, chat, screenshots or browser-exposed `VITE_*` variables.
- Browser editing session keys are scoped, short-lived, and memory-only;
  they must be separately funded with small amounts of testnet MON and
  leftover funds could be stranded on reload.
- Session keys cannot reassign instruments or withdraw a contributor's tips.
- The Solidity contract is a hackathon prototype, **not security audited**.
- Work proceeds in verified Git milestones; unrun checks are never marked passed.

## Repo guide

- `src/main.js` — Tone.js studio and input controls
- `src/room-controller.js`, `src/chain.js` — room UI and testnet integration
- `src/beat-card.js`, `src/beat-card-view.js` — portable pattern art / credits
- `contracts/BeatDrop.sol` — 90-second room contract and native MON payouts
- `tests/`, `test/`, `e2e/` — domain, Hardhat and browser checks
- `docs/` — deployment, demo and design specifications
- `PROJECT_STATUS.md` — verified progress, blockers and next actions

All development commits should use **Om Ghotekar
<omghotekar01@gmail.com>** as local Git author, attributed to account
`omghotekar01-dotcom`. The GitHub connector may use the profile's own
display name; this is documented in the status file.
