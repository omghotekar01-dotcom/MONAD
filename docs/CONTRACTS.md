# Beat Drop contract protocol (Milestone 2)

Development target: **Monad TESTNET** (chain ID 10143, testnet MON).
Contract: `contracts/BeatDrop.sol`.

## Why it is on-chain

Rooms, the four frozen seat owners, accepted grid edits, final notes, eligibility snapshot,
and tip/claim balances are contract state. Low-latency music preview, local practice,
metronome, and audio rendering stay entirely in the browser.

## Life cycle

1. The host calls `createRoom(bytes32 name)` (up to 31 UTF-8 bytes for this MVP).
2. The host calls `assignSeat(roomId, instrument, owner)` while in Lobby.
   Instrument 0=drums, 1=bass, 2=synth, 3=pluck; zero address clears an unstarted seat.
3. Host calls `startRoom(roomId)`. At least one seat must be occupied.
   **Seat assignment freezes**; the recorded end time is exactly 90 seconds later.
4. During `Live`, each owner or their room-authorized temporary session key calls
   `setNotes(roomId, instrument, ascendingUniqueSteps, values, mainWallet)`.
   Batches contain 1–16 cell sets. The chain rejects writes at/after `endsAt`.
   Confirmed cells are authoritative; the frontend must reconcile failed/pending
   transactions and allow time to flush before the deadline.
5. After the deadline **any wallet** calls `finalizeRoom(roomId)`. It freezes the
   final pattern and a four-bit eligibility mask. No offline host is required.
6. `tip(roomId)` transfers native testnet MON only after finalization if a
   nonempty eligible seat exists. The contract allocates each tip by final
   active **instrument seats**, not keypresses.
7. Contributor main wallets independently call `claim(roomId)` for their balances.

## Audio encoding and accessibility

Each room uses the single fixed preset: **120 BPM, 4/4, 16 sixteenth-note steps**.
Drum cell values use bitmask bits 0=kick, 1=snare, 2=hat, 3=clap, valid 0..15.
Melodic cells use **0 for rest** and **1..16 for the 16 playable pitches**
in the lower and upper keyboard rows. All invalid steps, values or sorted-order
violations revert; repeated explicit SETs are idempotent. Every instrument lane
is owned by one wallet, and one wallet may occupy multiple lanes.

## Session security

The seat owner calls `authorizeSession(roomId, key, expiry)`. Authorizations
are scoped by room, **main-wallet owner**, and temporary-key address, with a
maximum declared lifetime of 24 hours; live editing is additionally restricted
by the room end time. `revokeSession(roomId,key)` ends access.

Only `setNotes` recognizes session-key delegation. `assignSeat`, `startRoom`,
`authorizeSession`, `claim` and other calls use normal `msg.sender` authority.
Session keys cannot claim main-wallet funds. **Authorization does not fund the
temporary wallet's transaction gas.** Never log, export or commit its private key.

## Split arithmetic

A seat is eligible iff its final grid contains at least one non-rest note/hit.
Every eligible seat receives `floor(msg.value / activeSeats)` units, and the
remainder goes to the lowest-index eligible seat. Multiple seats held by one
wallet aggregate balances. No host payout override and no fee.

For each finalized room: `totalTipped = totalClaimed + sum(claimable[room][mainWallet])`.
Only `claim()` performs an external MON transfer, following checks-effects-interactions
with a reentrancy guard. No copyright, streaming-platform royalties, audio files,
or collectible rights are inferred from chain attribution.

## Development commands (Windows PowerShell, project root)

```powershell
npm install
npm run contracts:compile
npm run contracts:test
npm test
npm run build
```

Contract tests run against Hardhat's in-memory network and **do not** spend MON.

## Optional real TESTNET deployment

1. Confirm tests and compilation pass. Obtain separate testnet MON from
   https://faucet.monad.xyz into a dedicated test-only wallet.
2. Store its deployment private key in **local** `.env`, never in chat or git.
   `DEPLOYER_PRIVATE_KEY=0x...` is supported; use a disposable burner wallet.
3. Run `npm run contracts:deploy:testnet`. The script checks RPC chain ID
   against **10143** before signing and refuses a zero-balance deployer.
4. Verify the resulting transaction and address on https://testnet.monadvision.com.
   Add a non-secret deployment record including contract address, chain ID, tx,
   block number, and source revision. Explorer source verification is a
   separate task, not guaranteed merely by deployment.

**This contract is a hackathon prototype, not a security-audited payment product.**
The browser does not yet use this contract: wallet session onboarding, batching
and explorer-linked Beat Cards are future integration milestones.
