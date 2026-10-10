# Test BEAT DROP now — Windows + VS Code (October 2026)

This runs the actual Lovable-derived **light React website** on your laptop
with real Tone.js audio. It does not require Docker or MetaMask for the
first test. It is not necessary to deploy the Solidity contract first.

## 1. Open the correct repository folder

Open VS Code **File → Open Folder** and select the folder containing both
`package.json` and `src`.

If you previously cloned *while inside* a Desktop folder named MONAD, this may
be `C:\Users\ASUS\OneDrive\Desktop\MONAD\MONAD`, or it may simply be
`C:\Users\ASUS\OneDrive\Desktop\MONAD`. **Check**, do not guess.

In VS Code choose **Terminal → New Terminal** (PowerShell). Run:

```powershell
Get-Location
Test-Path .\package.json
git remote -v
```

The second command **must** print `True`. The origin remote should point
to `https://github.com/omghotekar01-dotcom/MONAD`.
If `False`, open the right folder before doing anything else.

## 2. Update project and start the site

```powershell
git pull --ff-only origin main
node -v
npm ci --legacy-peer-deps
npm run dev
```

**Node.js 22 or newer** is required (this is a Vite 8/TanStack Start app).
If `npm ci` gives network errors, retry while connected to the mobile
hotspot you used for `git pull`. `npm ci` will replace the old vanilla
Vite dependencies with the new React dependencies.

Leave the terminal open. Open the **Local** URL displayed by Vite, normally
`http://localhost:5173/`. It should be the **light** BEAT DROP site
with the mint glass sphere. It should **not** resemble the former dark app.

## 3. Test real audio and controls (no wallet needed)

1. Discover: verify exact mint sphere, cobalt ribbon, coral glass images,
   sidebar, bottom player, navigation, light aesthetic and mobile layout.
2. Solo Studio: click **Go solo**, press **Play** (unlocks browser audio).
   Hear the loop. Try Drum/Bass/Synth/Pluck via instrument buttons or
   keys `1`, `2`, `3`, `4`.
3. Keyboard: drums use `A S D F`; melodic lanes use
   `A S D F G H J K` and `Q W E R T Y U I`.
4. Grid: toggle a step and confirm the beat changes; try
   Play/Stop, Arm recording, Undo, volume, the mixer.
5. Producer tab: change **style** and **energy**, Generate 3 ideas,
   Audition, Apply, and Undo; try a local four-track draft.
6. Export your loop as JSON; Import the same file.
7. Rooms: Create a local room, take a seat, start the short countdown,
   change at least one drum step, click Finish local round.
8. Beat Card: replay the arrangement, verify label
   **locally saved · not on-chain**, reload the card,
   visit Library, and return to the same saved beat.
9. Try a smaller window or your phone viewport: no browser-wide sideways
   scrolling; the sequencer's own lane can scroll horizontally if needed.

If the screen is blank, browser audio is silent, or a feature errors, send
the terminal output and a screenshot. **Do not share wallet seed phrases.**

## 4. Optional automated developer verification

Stop the dev server with `Ctrl+C` if needed:

```powershell
npm run test:design
npx tsc --noEmit
npm run test:legacy
npm run contracts:test
npx playwright install chromium
npm run test:e2e
npm run build
```

Playwright will run desktop and Pixel-sized browser tests using a temporary
local server. The full suite currently checks solo UX, keyboard,
import/export, create→lobby→jam→Beat Card persistence, responsive layout,
routing, legacy music algorithms and contract logic.

## 5. Real testnet multiplayer comes after deployment

Real cross-device rooms, attribution and native MON tip/claim depend on
a verified deployed `BeatDrop.sol` address. Without a public contract
address in `.env.local`, the website intentionally labels rooms **local
demo** and cannot promise blockchain transactions.

Never type a private key into chat or paste it into a frontend
`VITE_*` setting. For real testing:
- Deploy on **Monad Testnet chain 10143** using a dedicated wallet
  with faucet-provided test MON.
- Set `VITE_BEATDROP_ADDRESS=<YOUR_PUBLIC_CONTRACT_ADDRESS>` in `.env.local`.
- Restart `npm run dev`, connect your EVM wallet, create the chain room.
- Test with a second separate wallet; check live edits, finalization and
  optional tip/claim on the block explorer.

The current browser tests are **not** a substitute for observing actual
testnet transactions between independent users.

See `docs/DESIGN_INTEGRATION.md` and `docs/MULTIPLAYER.md` for details.
