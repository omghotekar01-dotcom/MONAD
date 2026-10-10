> **Recommended shortcut:** You can deploy entirely from VS Code
> using Hardhat, with **no Remix and no MetaMask private-key export**.
> Follow [VS_CODE_DEPLOY.md](VS_CODE_DEPLOY.md).
> The Remix route below is an optional alternative.

# Activate BEAT DROP on Monad Testnet — one-person end-to-end rehearsal

**Security boundary:** The code is ready for a real contract. This repository
does **not** contain any deployed BEAT DROP contract address, wallet private key,
confirmed room ID, transaction hash or publicly hosted website yet. Never claim
live blockchain success until you see confirmed testnet transactions.

## A. Audio / demo (no wallet)

1. Update `main` and run `npm ci --legacy-peer-deps && npm run dev`.
2. Visit **Solo Studio**. Tap **Load “Midnight on Monad”**, then **Play loop**.
3. The original demo is one 16-step bar with four instruments. At 120 BPM,
   one bar takes **2 seconds**; repeating it for a 90-second jam makes
   **45 loops**. It is *not* a pre-recorded commercial song.
4. The new Tone.js master path uses higher voice gain, dynamic compression
   and a -1 dB peak limiter. It is designed to sound materially louder
   without hard digital clipping. Begin with lower computer/headphone volume,
   then adjust. Audio loudness cannot be guaranteed on your specific speakers.
5. Click **Rehearse 4 players alone**. A local room is created with your own
   browser as all four seats, and the demo song already prepared. Start the
   round, Play, finish it, then replay its **LOCAL** Beat Card.

The local rehearsal sends **no** on-chain transactions and does **not** prove
cross-device collaboration.

## B. Network prerequisites

- Monad Testnet chain ID: **10143** (never Mainnet)
- Public RPC: `https://testnet-rpc.monad.xyz`
- Native gas currency: **testnet MON**
- Testnet faucet: https://faucet.monad.xyz
- Explorer: https://testnet.monadvision.com

Use a **dedicated test-only MetaMask account**, not one containing real assets.
Switch MetaMask to Monad Testnet and request testnet MON using the faucet.
Only use testnet tokens. The faucet may require account verification.

## C. Deploy once with Remix + MetaMask (no secret keys shared)

1. Open https://remix.ethereum.org in a browser with MetaMask installed.
2. In Remix, create `BeatDrop.sol`, and paste the **complete exact contents**
   of this repository's
   https://github.com/omghotekar01-dotcom/MONAD/blob/main/contracts/BeatDrop.sol
   (do not invent a shorter or different contract).
3. Open **Solidity Compiler**. Select Solidity **0.8.24**, enable optimizer
   with **200 runs**, compile the file. Confirm no compiler error.
4. Open **Deploy & Run Transactions**. Environment:
   **Injected Provider - MetaMask**; confirm MetaMask is on Monad Testnet
   **10143**, not Ethereum Mainnet or Monad Mainnet.
5. Choose `BeatDrop` (no constructor arguments), click **Deploy**, and
   approve the testnet-gas transaction in MetaMask.
6. When it confirms, copy the **contract address** (`0x...`) and the
   deployment transaction hash (`0x...`); check it on MonadVision.
   Both are *public* and safe to share. Do not share private keys.
7. In VS Code create or edit `.env.local` in your MONAD project root:

   ```dotenv
   VITE_BEATDROP_ADDRESS=0xYOUR_REAL_DEPLOYED_TESTNET_CONTRACT
   VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   ```

   Do **not** put private keys or seed phrases into `VITE_*` variables.
8. Stop Vite (`Ctrl+C`) and run:

   ```powershell
   npm run chain:check
   npm run dev
   ```

`chain:check` must print **PASS** with chain ID 10143, nonempty contract
bytecode, `ROUND_DURATION=90` and `MAX_BATCH=16`. If it fails, stop
and fix the environment/address instead of asserting deployment succeeded.

## D. Test REAL on-chain music with only ONE wallet

Your BEAT DROP contract explicitly allows the same wallet to own multiple
instrument seats. You don't need to create fake users or pretend that a
single browser represents four independent signers.

1. Connect MetaMask to Monad Testnet in the app.
2. Click **Create jam**. Name the room **Midnight on Monad**. Approve the
   testnet create-room transaction.
3. In the Lobby click **Assign my wallet to all 4 seats**. Approve four
   `assignSeat` transactions (or fewer if seats are already assigned).
   Do not overwrite any seats belonging to another wallet.
4. Click **Start 90-second jam**, approve the start transaction.
5. In the live Studio, click **Publish 4-track demo to Monad**.
   This sends up to **four separately signed batch transactions**, one
   per instrument lane, containing *changed steps only* (max 16 per batch).
   Start immediately after the round begins. You must approve each wallet
   transaction quickly enough to finish within the 90-second contract
   deadline; failed/expired steps do not count.
6. Click **Load transactions** in the new activity panel. You should see
   RoomCreated, SeatAssigned, RoomStarted and grouped NoteSet events with
   the real signer wallet, step numbers, block numbers and links to
   **View TX** in the external explorer. The panel scans only recent blocks;
   older history may require the explorer.
7. After the on-chain 90 seconds have elapsed, finalize the round.
   Confirm the real **RoomFinalized** transaction.
8. Open the **on-chain Beat Card**. Replay the accepted 4×16 pattern;
   confirm your wallet appears on each eligible instrument.
9. Optional: submit a small *testnet MON* tip and claim it with the
   **same main wallet**. Confirm TipReceived, TipAllocated and Claimed
   events via **View TX** or the external explorer. No real money.
10. Share the public room ID/address/tx hashes for review; **never**
    share your seed phrase/private key.

**Every audible hit is NOT a transaction.** At 120 BPM, audio playback is
scheduled in-browser using Web Audio. A `setNotes` transaction may include
up to 16 cell edits in one instrument. Every accepted edit emits a NoteSet
event; confirmed ledger records survive playback/reload.

**Attribution nuance:** Since one wallet owns all four seats in this rehearsal,
that wallet earns 100% of any tip allocated to the four eligible seats. This
is an authentic one-wallet on-chain rehearsal, not evidence of multi-user
collaboration or automatic commercial royalties.

## E. Independent user validation (after solo rehearsal)

For real multiplayer, deploy the TanStack Start/Nitro app to a compatible
HTTPS server and send `/room/ID` invites to players with distinct wallets.
The host assigns their addresses, and each player can edit only their lane.
Test with at least **two independent wallets** and ideally independent devices.
Native Tip/Claim, wallet rejections, delegated gas-key expiration and network
latency require this manual external validation. Avoid claims of zero latency
or independently audited financial security.

## When something fails

- `chain:check` says no address: `.env.local` is absent or malformed.
- Wrong chain: MetaMask or `VITE_MONAD_RPC_URL` is on another network.
- No bytecode: address was pasted incorrectly or deployment reverted.
- Host-only error: use the wallet that created the room.
- Read-only lane: host has not assigned the connected wallet to that lane.
- Session gas error: use main-wallet signing first; session keys are optional.
- Round expired: create a **new** room; the contract will not accept late edits.
- No activity: refresh the panel; the RPC view scans only a recent block
  window. Open the MonadVision contract address for older transactions.
- No sound: test Solo Studio pads first, check Windows and browser volume,
  then confirm notes were accepted into the pattern on-chain.

Read `docs/MULTIPLAYER.md` and `docs/DESIGN_INTEGRATION.md` for the detailed
contract data model and public hosting requirements.
