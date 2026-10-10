# BEAT DROP — Project status

Updated: 2026-10-10

## Milestone 1 — Local music studio: DONE (local user test + CI)
- Four playable Tone.js instruments, 16-step one-bar sequencing at 120 BPM.
- Keyboard/touch/grid playback, local record, undo, JSON save/open, responsive layout.
- User reported the project opens and works locally.
- Browser audio fidelity and multi-device latency remain subjective manual tests.

## Milestone 2 — Solidity contract: DONE (automated tests)
- `BeatDrop.sol` Lobby → Live → Finalized, host-approved seats, 90s deadline.
- Room-specific restricted session-key authorization/revocation, final pattern,
  eligible-seat snapshot, exact native MON tip allocation and pull claims.
- Testnet-only deployment script, config and protocol documentation.

## Milestone 3 — Browser multiplayer frontend: IMPLEMENTED, activation pending
- Monad Testnet wallet connect and network switching via injected EVM wallet.
- Read-only room viewing, Create/Join Jam, `?room=ID` deep links and QR invites.
- Host instrument assignment, participant-wallet copy and frozen roster.
- Browser instrument edits checked against current on-chain seat ownership.
- Coalescing single-lane sorted batches (~one per bar) with transaction statuses.
- Optional temporary browser-memory session key (expires/revocable), explicit
  session gas funding; can set up in Lobby before round begins.
- Direct main-wallet signing fallback.
- Authoritative contract-state refresh (polling) and optimistic rollback on failures;
  updates applied at local musical boundaries.
- Post-deadline finalization, `?beat=ID` permanent Beat Card route, replay using
  confirmed contract pattern, native MON tip and main-wallet claim UI.
- Explicit config guard refuses fake room transactions without contract deployment.
- Root `package-lock.json` committed and CI installs with `npm ci`.
- Responsive room and transactional UI.

### Automated verification

Confirmed GitHub Actions run:
https://github.com/omghotekar01-dotcom/MONAD/actions/runs/38036590121
- 14 Node domain tests passed.
- 13 Solidity contract tests passed (on ephemeral Hardhat chain).
- 8 Playwright browser smoke tests passed (desktop and mobile Chromium configurations).
- Solidity compile and Vite production bundle succeeded.

Later pipeline runs must be checked individually; this report does not claim
every future head revision has passed.

### External activation still required (NOT complete)

- The user must deploy `BeatDrop.sol` to **Monad Testnet, chain ID 10143**,
  using MetaMask/Remix or a safe test-only local deployment signer.
- The public contract address must be inserted into **`.env.local`** as
  `VITE_BEATDROP_ADDRESS=0x...`; without it Create Jam is intentionally disabled.
- Hosted HTTPS frontend URL for invitations to work across separate devices;
  local `localhost` links are not shareable with remote friends.
- **Two real wallets editing the same Monad Testnet room and actual tip/claim
  transactions remain UNVERIFIED.** Do not claim live end-to-end success yet.
- Explorer verification, deployment tx, block, source revision and hosted URL
  cannot be recorded before real deployment.
- No external security audit, and no proof of legal music copyright.

### Known technical limitations

- Public read-only state polls every 2.5 seconds; devices are not sample-accurate.
- Browser-memory session keys are forgotten on reload; leftover funded session
  test MON can become unrecoverable. Use small TESTNET-only amounts or sign
  directly with main wallet.
- A transaction mined after the cutoff may fail even if submitted before it;
  UI shows pending/failed rather than claiming phantom notes.
- External wallet/RPC availability and faucet quotas are dependencies.
- Final Beat Card is replayable contract data, **not yet an NFT mint**.
- No AI Producer yet. No external streaming royalties.
- Monad Foundation Notion resources page could not be fully fetched; verify its
  complete latest submission requirements manually.
- Connector-created GitHub commits are attributed to `omghotekar01-dotcom`
  and `omghotekar01@gmail.com`, but GitHub's profile display name is
  `Omiiii` instead of requested local Git author label `Om Ghotekar`.

## Exact local commands (VS Code / PowerShell)

```powershell
git pull
npm ci
npm test
npm run contracts:compile
npm run contracts:test
npm run build
npm run dev
```

Optional browser test (install Chromium once if needed):
```powershell
npx playwright install chromium
npm run test:e2e
```

To enable rooms and public invitations, follow **[docs/MULTIPLAYER.md](docs/MULTIPLAYER.md)**.
Do not put a seed phrase or private key in ChatGPT, GitHub or browser-visible Vite variables.

## Next external acceptance and release tasks

1. Confirm deployed testnet address and chain ID 10143 (never mainnet).
2. Set public address in `.env.local`, restart frontend and create test room.
3. Complete a real two-wallet edit and independent-browser convergence test.
4. Verify a finalized Beat Card, real testnet MON tip/claim and explorer receipts.
5. Host frontend on HTTPS and verify deep-link invite and mobile layout.
6. Record deployment manifest, demo run results and conference/hackathon resources
   before marking the project as externally delivered.
