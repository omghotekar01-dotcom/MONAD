# BEAT DROP — Web3 hardening review (Monad Testnet)

**Scope:** Deployed immutable `BeatDrop.sol` at
`0x9568d1f7871f46E75F555D66f68fF248de6d37fD` on Monad Testnet
(chain ID 10143). Public deployment evidence:
https://testnet.monadvision.com/tx/0xd07eb66bad8b2b95fc3c52d8e36a99047d0af8bb9b5d21d477bc40cf3a53021e

**Status:** Prototype with automated tests, **NOT audited**. A passing local
test suite or GitHub CI build is not a verified public-network wallet demo,
a professional security audit, or a guarantee of no vulnerabilities.

## What is really stored by Monad

- `createRoom`: immutable host, 31-byte room name, room ID.
- `assignSeat`: four instrument-owner wallet addresses while in Lobby.
- `setNotes`: the current 4 instruments × 16 steps pattern. One
  transaction can contain up to 16 **changed cells on one instrument**.
  Each changed cell emits a `NoteSet` event with owner AND operator.
- `finalizeRoom`: freezes the current pattern and eligible nonempty
  instrument seats after the chain-enforced 90-second editing deadline.
- `tip`: stores an exact native TESTNET MON contribution and creates
  claimable balances equal per final eligible **SEAT**, not note, click, or
  number of historical edits. Rounding dust goes to first eligible seat.
- `claim`: a pull payment to the original MAIN wallet; delegated
  browser-session keys cannot withdraw a seat owner's tips.

The *audio*, cover art, adjustable solo BPM, local drafts, browser-only
notes and player chat are **not uploaded** into the contract. An old Solo
Studio Beat Card does not become on-chain when MetaMask connects.
Nothing here mints an NFT or registers copyright or legally binding royalties.

## Security controls implemented and checked in code

| Threat / error | Current protection |
|---|---|
| Editing another wallet's instrument | On-chain `owner == seats[lane]` and signer/session authorization checks; host cannot forge edits by assigning a third party |
| Host steals another room's seats | On-chain `msg.sender == host`, Lobby-only assignments |
| Duplicate / malformed batch | Client rejects duplicates, out-of-range pitch, steps, >16 changes; contract independently checks ascending unique 0..15 cells |
| Notes after the 90-second deadline | On-chain timestamp/phase check; UI prevents new edits with a safety margin |
| Old signer after switching MetaMask accounts | Immediate `eth_accounts` equality check before main-wallet or delegated writes, not just an asynchronous event |
| Browser session being used by a different owner | Session bound in-browser to original main wallet and room; contract validates the owner's lane for every submitted note |
| Test-MON inadvertently held in a browser session | Main-wallet signing default; explicit dangerous-key warnings, confirmation, small top-up cap and **Reclaim unused gas** action |
| Accidental scientific notation / unsafe tip amount | Exact 18-decimal **BigInt** input validation, positive amount and ≤10 test MON per website tip. The Solidity contract itself does not cap tips |
| False transaction success | Await the actual chain transaction receipt; mark success only on receipt with `status = success`; expose the real TX hash in tip/claim UI |
| Stealing payout via session keys | On-chain `claim` pays `msg.sender`'s own claimable balance only; tests prove delegated key cannot claim |
| Reentrant withdrawal or direct MON transfer | Solidity reentrancy lock and reverting `receive`/`fallback`; tested in Hardhat |
| Missing contributions | No tips when no final eligible nonempty instrument; eligibility calculated on the FINAL, not historical, pattern |
| Broken on-chain activity/claims | Recent public RPC log indexes and MonadVision transaction links; failure states are explicit, no simulated hashes |

## Important limitations and remaining validation

1. **Not audited** — independent Solidity security review is still required
   before real-value deployment. Testnet MON has no real value.
2. **Existing contract is NOT upgradable in place.** Changing payout fairness,
   BPM, asset metadata, royalties, NFT behavior or extended session policy
   requires a separately deployed V2 contract, front-end address migration
   and new tests. Do NOT replace the proven deployed address silently.
3. **Session keys are volatile.** They only exist in browser memory. If the tab
   closes or crashes before a reclaim, unused session-gas funds may remain
   inaccessible. Changing wallet now disables delegated editing but retains
   the temporary signing key in the same tab, so the original owner can switch
   back and reclaim gas. Gas used, base-fee fluctuations and small residual
   dust cannot be recovered. Prefer the main wallet for demos.
4. **Last editor in an owned lane controls that lane's final values**.
   A `NoteSet` event is evidence of a confirmed write, not necessarily
   final credit. Only nonzero final notes determine tip eligibility.
5. **One wallet owning four seats receives all four tip allocations**.
   That's an authentic single-wallet on-chain rehearsal, but it is NOT a
   test of four independent identities or a sybil-resistant reputation scheme.
6. **Public explorer is a recent-block index**, not a full-history
   marketplace or immutable audio archive. Older events require MonadVision
   or an independently indexed query service.
7. **Hosted SSR + browser wallet still require real device testing**:
   a white Vercel page, incorrect build env or blocked wallet extension
   would prevent normal users from completing the flow. GitHub CI is NOT
   substitute evidence for a working live URL.
8. **Latency**: Monad makes block-based write confirmations suitable for
   short collaborative rounds, but interactive audio playback is always
   scheduled locally. Do NOT claim every sound is a separate tx or that
   signing has sub-audio latency.
9. **No fair-use or legal ownership decision** from a wallet signature.
   Attribution is account-based and under the control of the room's host.

## Web3 judge demo proof sequence

1. Verify `chain:check`: chain 10143, correct 7163-byte contract bytecode,
   correct 90-second round and max 16-cell edit limit.
2. On a public HTTPS URL with MetaMask, connect testnet wallet.
3. Create a room and copy the real transaction hash and room ID.
4. Assign instruments to real signer wallets (single-wallet demo is allowed,
   but disclose one wallet owns all four seats).
5. Start the timer with a confirmed `RoomStarted` transaction.
6. Submit batches of note edits, see `NoteSet` logs and actual wallet owners.
7. Finalize after the chain deadline and replay the frozen on-chain pattern.
8. Have a distinct testnet wallet TIP the finalized Beat Card; show
   `TipReceived` and `TipAllocated` in explorer.
9. Claim tips with an eligible main wallet; verify `Claimed` and the changed
   `claimable` balance.
10. Show the `/chain` dashboard. Explain its recent-window limit and the
    distinction between on-chain notes and off-chain audio.
11. Record public transaction hash links and actual confirmation status.
    Never disclose seed phrases, private keys or any session signing key.

## Focus of automated verification

- `npm run contracts:test`: Solidity room/seat/phase, bad-note validation,
  delegated session expiry and revocation, final-pattern tip eligibility,
  equal per-seat allocation, claims and reentrancy protection. Additional
  end-to-end local Hardhat test covers **all four lanes, finalize, tip, claim**.
- `npm run test:design`: precise BigInt tip validation, overflow/unsafe format,
  invalid and duplicate note batches, existing React and song tests.
- `npx tsc --noEmit`, `npm run test:e2e`, `npm run build:vercel`:
  compile, browser layout routes and server deployment artifact checks.
- **Still missing**: independent live Monad testnet wallet-confirmation
  transcript, real multi-device timing measurements, hosted production error
  and CORS validation, audited source-to-deployed bytecode comparison.

No real funds or mainnet deployment recommended.
