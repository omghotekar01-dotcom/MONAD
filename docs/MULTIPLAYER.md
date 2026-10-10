> **Important UI migration update (October 2026):** The user-facing website
> now runs the original Lovable light-theme **React + TanStack Start/Nitro**
> interface. This guide originally described the former vanilla Vite version.
> The smart-contract deployment, chain ID, testnet wallet and payout principles
> below remain relevant; **UI button placements and the static `dist`
> hosting instructions have changed**. Follow
> [DESIGN_INTEGRATION.md](DESIGN_INTEGRATION.md) for current build and hosting.
> Use `npm ci --legacy-peer-deps` and visit `/create`, `/join`, `/explore`,
> `/room/:id/lobby`, `/room/:id/studio`, `/beat/:id`.
> Contract-free local practice remains on `/studio`.

# BEAT DROP — Multiplayer and Monad Testnet launch

This guide covers **the real on-chain path**, not a fake local multiplayer demo.

The browser app now implements:

- Create and join rooms by `?room=ID` link, optionally QR code.
- Read-only listening without a wallet.
- Host-controlled seat approval, 90-second on-chain jam.
- The existing Tone.js instruments for local playback.
- Owner-gated edits, queued batches, wallet transaction status, periodic contract refresh.
- Optional short-lived browser-memory session key, separate gas funding, revoke.
- Finalization after the deadline, immutable accepted grid replay, native testnet MON tips and claims.

**Important: this site needs a deployed contract first.** It intentionally disables room creation and shows an activation warning if `VITE_BEATDROP_ADDRESS` is absent. A successful local `npm run dev` build is NOT a real room.

## 1. Update the app and verify

In your existing MONAD folder in VS Code PowerShell:

```powershell
git pull
npm ci --legacy-peer-deps
npm test
npm run contracts:compile
npm run contracts:test
npm run build
npm run dev
```

You need Node.js 22 (or compatible active LTS), a browser, and MetaMask or another injected EVM wallet.

## 2. Prepare a safe Monad Testnet wallet

- Make sure the wallet is on **Monad Testnet**, chain ID **10143**.
- RPC: `https://testnet-rpc.monad.xyz`.
- Currency: **testnet MON**. Testnet explorer: `https://testnet.monadvision.com`.
- Request test MON gas from `https://faucet.monad.xyz` if needed.
- Use a **separate test-only wallet/account**, not a mainnet treasury wallet.
- **Never paste a wallet private key or recovery phrase into ChatGPT or GitHub.**
- Do not send actual/mainnet MON. This prototype has not been audited.

## 3. Deploy the contract (choose ONE route)

### A. MetaMask graphical route — no private-key copy required

1. In Chrome with MetaMask installed, navigate to https://remix.ethereum.org.
2. In Remix, create `BeatDrop.sol` and paste the **entire content** of `contracts/BeatDrop.sol` from this repo.
3. In the Solidity Compiler tab, choose **0.8.24** with optimization enabled; compile `BeatDrop.sol`.
4. In Deploy & Run Transactions, select **Injected Provider — MetaMask** (the label may vary).
5. Check that Remix shows **Monad Testnet, chain ID 10143**, your test-only MetaMask address, and sufficient TESTNET MON for deployment gas.
6. Select the compiled **BeatDrop** contract, click **Deploy**, and approve the transaction in MetaMask.
7. After confirmation, copy the deployed `0x...` contract address from Remix, and check it exists on the testnet explorer.

Do **not** deploy on Ethereum Mainnet or Monad Mainnet. If Remix shows the wrong network, change MetaMask network first.

### B. Local Hardhat route — only if you control a disposable TESTNET deployer

1. Create a local `.env` file from `.env.example`.
2. Store `DEPLOYER_PRIVATE_KEY` **only on your own machine** for a dedicated throwaway testnet account. Never upload it.
3. Run `npm run contracts:deploy:testnet`.
4. The script validates RPC chain ID **10143** and nonzero balance, then prints the contract address, transaction hash, and block. Verify on the explorer.
5. It does NOT verify source automatically. Keep the deployment metadata in the project docs.

The Remix route is preferred if you don't want to handle a deployer private key locally.

## 4. Enable real rooms in the frontend

In VS Code project root, create **`.env.local`** (not `.env.example`) and add:

```dotenv
VITE_BEATDROP_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
# Optional browser-callable public testnet RPC (must be chain ID 10143)
# VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

Replace the address with your exact verified TESTNET deployment address. It is a PUBLIC address, not a secret. **Do not put wallet private keys in `VITE_*` variables.**

Restart Vite (Ctrl+C, then `npm run dev`). The app checks both RPC chain ID and whether bytecode exists at the configured address.

## 5. Create and join the first real room

1. Open `http://localhost:5173/`.
2. Choose **Connect MetaMask**, and switch to Monad Testnet when requested.
3. Enter a short name, click **Create Jam**, and confirm the wallet transaction. The resulting room ID comes from the confirmed `RoomCreated` event.
4. As host, click **Me** and **Assign** for your instrument; each assignment is a testnet transaction.
5. To join as a guest, open the shared `?room=NUMBER` URL. Read-only listening needs no wallet. For editing, connect your own MetaMask address, copy it, and send it to the host.
6. Host pastes each guest wallet address into one instrument seat, clicks **Assign**, and confirms. One owner per instrument, up to four instruments; a wallet may hold two seats.
7. Confirm the frozen payout rule with the players: only seats whose FINAL accepted grid contains notes get one equal share each.
8. Host clicks **Start 90-second jam**. The seats freeze. Play / edit only an owned lane.
9. Grid taps, keyboard notes while Record is armed, and Undo enter a coalescing edit queue. Batches target approximately every two seconds and require confirmation. A pending transaction is NOT a credited edit.
10. Stop editing at least four seconds before the deadline. The contract rejects late submissions; only accepted state is credited.
11. After the contract deadline, click **Finalize after deadline** (any connected wallet can call it) to create the finished chain snapshot.
12. Open the **Beat Card** link, play the confirmed pattern, tip testnet MON, and claim to a contributor's MAIN wallet.

The Beat Card is an on-chain pattern and attribution snapshot, not a minted NFT.

## Optional browser session key

Without it, each batch requires an approval from the main wallet. To reduce prompts:

1. In a live room and with an assigned seat, click **Authorize short session** and approve on the main wallet.
2. A brand-new temporary key is created in **browser memory only**, authorized for this ONE room for up to five minutes.
3. Click **Fund session gas** to send a small amount of TESTNET MON to the temporary address. This is a **separate** MetaMask transaction; authorization doesn't fund gas.
4. Select **Session signing**. Only `setNotes` uses that temporary key. Seat assignment, finalization, tips and claims remain main-wallet transactions.
5. Click **Revoke session** to remove edit authorization. The temporary key is forgotten on reload or account switch.

**Caution:** If you close/reload the tab while the temporary address has unused test MON, the browser-memory key is lost, so remaining test MON can become unrecoverable. Fund only a tiny amount; using main-wallet signing avoids this issue. Do not use real funds.

## 6. Invite friends from a different phone or computer

`localhost` links work on your own computer only. Deploy the new **TanStack
Start/Nitro server application** to an HTTPS hosting platform that supports its
server runtime and deep links. The build output is `.output`, **not**
the old `dist` static site. Set `VITE_BEATDROP_ADDRESS` at build time
to the verified deployed Monad Testnet address. Test an independent
browser opening `/room/:id` and `/beat/:id` directly before sending
invites. For the exact updated deployment requirements see
[DESIGN_INTEGRATION](DESIGN_INTEGRATION.md).

## 7. Verify before your hackathon demo

- Two independent browsers/devices open the **same hosted room ID**.
- The host assigns the correct guest address and starts the jam.
- Only seat owners can send successful edits; a listener cannot.
- Wait until transactions are marked **confirmed** and show up in the other browser.
- An authorized temporary key only edits its room/lane and needs testnet MON gas.
- After 90 seconds, finalize once and verify no late edits change the chain pattern.
- Beat Card replay matches confirmed notes; empty seats get no payout.
- Tip testnet MON and verify per-recipient claim balances, explorer link and successful claim.
- Check phone sizing, keyboard-input guard, wrong-network errors, rejected MetaMask prompts and reloading/reconnection.

Automated tests **cannot** confirm that a real wallet, external testnet transactions, mobile audio and two independent devices work. Mark those checks complete only when observed.

## Deployment record

After deployment, update `docs/deployments/` with chain ID, address, transaction, block, contract revision, and public site URL. Never invent these values.

## Notes

- This is a hackathon prototype, not audited financial software or a legal copyright proof.
- It does NOT gather Spotify/streaming royalties; it splits only native MON that actually reaches its contract.
- The current quick-sync mechanism polls authoritative contract state and applies changes at local loop boundaries. Remote devices won't be sample-accurately synchronized.
- The full Monad Foundation Notion hackathon resources page could not be fetched automatically; check its final required submission items manually.
