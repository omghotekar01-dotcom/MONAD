# Upgrade 4 — Beat Cards and listening experience

## What you can see without deploying anything

The local studio now supports a **real local Beat Card preview**:

1. Open the app without connecting any wallet.
2. Select Drums, Bass, Synth or Pluck and click any step in the one-bar grid.
3. Click **◈ Preview Beat Card** in the studio transport.
4. The app generates visual artwork directly from the local 4 × 16 note pattern.
5. **Play replay** starts the existing Tone.js audio transport after your click.
6. Use **MUTE** or **SOLO** on any stem to hear its contribution. Solo takes priority if the same instrument is also muted.
7. **Save artwork** downloads an editable SVG built entirely from numeric music data.
8. Adjust **MASTER** volume in the studio. Close the preview and continue editing.

This path does **not** use a wallet or the blockchain. Its UI explicitly says
**LOCAL STUDIO / PREVIEW** and does not offer on-chain attribution or tips.

## Finalized on-chain Beat Cards

After the user completes the separately documented Monad Testnet deployment
and creates a real shared jam:

- The `?beat=ROOM_ID` query link fetches the contract's **final pattern**.
- Card replay uses exactly the confirmed on-chain grid, not the local pending queue.
- Each of the 4 instruments has its own MUTE/SOLO controls.
- The art and fingerprint derive deterministically from final notes.
- All eligible instrument seats are listed and aggregated by main wallet.
- Every eligible seat receives one equal contractual weight. The UI displays
  approximate percentages (one seat of three = 33.33%), not misleading
  decimals implying exact wei division.
- Every new testnet MON tip is split by the Solidity contract; any indivisible
  remainder is allocated to its **lowest-numbered active seat**.
- A wallet holding multiple eligible instruments aggregates those seats.
- The existing contract tip and claim controls remain visible separately from
  the artwork and credits.

**The card is not an NFT**, copyrighted-music certificate, creator identity
verification, or proof of commercial licensing.

## Deterministic visual construction

`src/beat-card.js` produces a four-ring SVG with 16 step positions per ring:

- Drums = coral; Bass = lavender; Synth = cyan; Pluck = amber.
- A rest leaves a faint tick; accepted notes illuminate their positions.
- Drum hits at the same step can change arc thickness.
- Notes affect the central visual signature.
- An **8-character FNV-1a fingerprint** provides a compact visual identifier.
  It is a convenience label and **not** a cryptographic proof or collision-resistant content hash.
- No external image hosting, proprietary audio sample URLs, AI artwork APIs,
  wallets, or backend are necessary to render these illustrations.
- Only validated numeric data is used to construct SVG elements. Untrusted
  room titles are HTML-escaped before insertion.

## Tests

```powershell
npm ci
npm test
npm run contracts:test
npx playwright install chromium
npm run test:e2e
npm run build
```

The `tests/beat-card.test.js` suite covers deterministic rendering, distinctive
drum masks, accurate share aggregation, local-only labels and HTML safety.
Browser smoke tests open a local Beat Card on Chromium desktop/mobile and
exercise mute/solo buttons.

These automated tests **do not replace** manual audio fidelity, wallet
transaction, or independent-device validation.

## Project safety rules

- Local practice file import is unavailable while a shared room is open.
- Wallet/account changes clear stale optimistic music edits.
- Session keys are stored only in memory and have separate gas costs.
- Remote confirmed updates enter the audio loop at local musical boundaries.
- MUTE and SOLO control *listening*, never recorded attribution or payments.
- Final Beat Cards are only genuinely shareable with remote guests after the
  website has a publicly accessible HTTPS URL.
