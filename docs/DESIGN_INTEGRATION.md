# BEAT DROP · Original Lovable UI / Monad integration

## Design provenance (not a redraw)

The production site uses the actual React/TanStack UI components, routes,
styles and bundled visual assets from the user's **craft-ui-essentials**
Lovable repository. Source: https://github.com/omghotekar01-dotcom/craft-ui-essentials
Lovable project: https://lovable.dev/preview/zrBbhTr7DrhAdKEGjnZia8l5UUlzIgh2

The imported artwork is the precise shipped source:
- `src/assets/mint-cover.jpg` — transparent mint glass sphere
- `src/assets/blue-cover.jpg` — folded cobalt sculptural ribbon
- `src/assets/coral-cover.jpg` — coral pink folded glass sculpture

The Lovable app's shell, typography, colors, component slots and file-based
routes were copied rather than approximated. Its Apple-esque light UI retains
restrained neutrals, mint accents, carefully separated instrument colors,
quiet backgrounds, compact sidebar and continuous bottom player.

The supplied open-source Apple HIG reference,
https://github.com/dickwu/apple-design-skill, informed *platform-safe*
improvements: visible focus, touch affordances, reduced motion, contrast and
iOS safe-area padding. It was not cloned wholesale or misrepresented as
Apple-endorsed styling. No stock photos or third-party design components were
injected instead of the user's supplied Lovable assets.

## Technology after migration

**Frontend:** original Lovable TanStack Start / TanStack Router file-based
routes, React 19, Tailwind CSS 4, Vite 8, Radix primitives, Tone.js.

**Smart contract:** preserves original MONAD `contracts/BeatDrop.sol`,
Hardhat tests, deployment tooling, chain ID **10143**.

**Wallet and contract:** `src/chain.js` and `src/room-utils.js` retain the
existing battle-tested viem/MON RPC flow.
`src/services/monad-bridge.ts` adapts it to typed React components and
translates 4 × 16 numeric contract values to/from legacy music cell arrays.

**Local practice:** the Lovable `MusicProvider` and Tone.js audio engine power
keyboard, sequencer, transport, master/channel volumes, JSON import/export,
and all the tutorial/sample routes. Local practice explicitly does not claim
real blockchain participation.

**On-chain screens:** `src/components/chain-pages.tsx` implements the
original design language with **real calls**, covering:
- `/create` — on-chain Create Jam after configuration, wallet approval
- `/join` — valid numeric room ID or invitation URL
- `/explore` — recent contract rooms; no fabricated online occupancy
- `/room/:id` — authoritative room phase, roster, shareable link
- `/room/:id/lobby` — host-approved wallet seat assignment, start round,
  optional short-lived session-key authorization and gas funding
- `/room/:id/studio` — live 90-second timer, owner-restricted keyboard/grid
  edits, batched transaction status and deterministic Producer suggestions
- `/beat/:id` — FINAL accepted notes, each instrument's credit eligibility,
  actual native testnet MON tips and main-wallet claims

All numeric room IDs are read from the Monad contract. Sample room IDs such as
`BD-CHILL` stay clearly **local** and can never be passed off as a confirmed
on-chain session. When the contract address is absent, create/join remain
honest local preview paths, not an impossible wallet call.

## Music semantics and signed changes

The existing contract requires four instruments in this order:
`drums`, `bass`, `synth`, `pluck`. Each has exactly 16 cells.
- Drums: 0–15 bitmask for kick/snare/hat/clap.
- Melody: 0 is rest, 1–16 is one melodic pitch.
- The React presentation owns numeric arrays and translates via
  `patternToChain`/`patternFromChain` when reusing the legacy JS Producer.
- Only the connected wallet's current seat can submit edits before
  the deadline buffer. Other lanes are read-only.
- The **Producer** is a local, transparent rules-based 4-genre engine,
  **not a trained model**; it only queues an authorized instrument's notes
  after an explicit Apply click. Full four-track drafts remain local-only.
- Pending transactions are labelled pending, not credited. Failed edits
  roll back to the contract's state.
- Final Beat Cards do **not** claim minting an NFT or streaming royalties.
  Equal payout is per eligible FINAL instrument seat, never per note count.

## Build and local run

This is now a **TanStack Start app with a server runtime**, *not* the old
static vanilla Vite application. Node.js 22 LTS or later is recommended.

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\MONAD\MONAD"
git pull --ff-only origin main
npm ci --legacy-peer-deps
npm run dev
```

After starting Vite, use its printed localhost URL. Local solo studio is
available without a wallet or RPC connection.

Verification:

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

The project uses a committed npm lockfile; `--legacy-peer-deps` is necessary
for this exact tested combination of React/TanStack and Hardhat plugins.

## Deployment differences and external validation

1. Compile/deploy `contracts/BeatDrop.sol` only to **Monad Testnet 10143**.
   Do not share seed/private keys or deploy to mainnet.
2. Set public `VITE_BEATDROP_ADDRESS=0x...` in `.env.local` for development,
   or in hosting provider build environment.
3. Host the **TanStack Start/Nitro application** on a runtime supporting its
   server output (`.output`). Do **not** treat it as a plain Vite `dist`
   static-site deployment. Configure the chosen hosting adapter/server.
4. Verify HTTPS `/room/:id`, `/beat/:id` and direct-refresh deep links.
5. Use two distinct wallets/devices to validate seat restrictions, confirmed
   live synchronization, finalization, test MON tip and pull claim. Only then
   mark real on-chain multiplayer as end-to-end verified.
6. Keep a record of deployment hash, address, block, source and public URL.

**Current validation scope:** automated unit, Hardhat, React route and browser
tests on CI. Actual Monad Testnet deployment and a hosted independent-device
demo have **not** yet been performed. Do not claim production funds/security
auditing, Spotify royalties, legal copyright proof or zero latency.

The former plain Vite instructions for publishing `dist` no longer apply.
The old `src/main.js`, `src/room-controller.js` and tests are kept for
reference and backward validation, but TanStack Start React routes now own
the user-facing website.
