# BEAT DROP

**Four strangers. One beat. Everyone credited.**

A guided, four-seat collaborative browser sequencer for Monad. The initial development sequence is: **local music practice → contract-based rooms and payments → multiplayer integration → replayable Beat Cards**.

## Current state

This repository is being built incrementally. **Do not interpret the initial repository setup as a deployed or complete dApp.** See [PROJECT_STATUS.md](PROJECT_STATUS.md) for verified features and blockers.

## Network

Development targets **Monad Testnet only**, chain ID **10143**, currency **testnet MON**, RPC `https://testnet-rpc.monad.xyz`, and [testnet explorer](https://testnet.monadvision.com). Never use mainnet funds for demo tasks.

## Why use a chain?

The contract will store room lifecycle, instrument ownership, accepted edits, final pattern, and transparent tip-claim accounting. Low-latency practice audio and UI remain local; no raw audio is stored on-chain.

## Scope

Core: four distinct playable instruments; 16-step, one-bar pattern; 90-second rounds; role-restricted edits; wallet-scoped session keys; seat-based equal payouts; final Beat Cards; native testnet MON tips and claims.

This is not copyright registration or automatic external music royalty distribution. Only tips sent to the Beat Drop contract can be allocated by it.

## Author

Project commit identity: **Om Ghotekar <omghotekar01@gmail.com>** (`omghotekar01-dotcom`).

## Milestone 2 — smart-contract foundation

A Solidity contract and Hardhat security tests have been added, **but they
are not deployed or wired into the studio yet**. Read the
[protocol and testnet deployment guide](docs/CONTRACTS.md).

```powershell
git pull
npm install
npm test
npm run contracts:compile
npm run contracts:test
npm run build
npm run dev
```

The existing local music controls remain usable without a wallet. Hardhat
tests operate on an in-memory development blockchain and use **no testnet funds**.

## Upgrade 3 — multiplayer frontend

**Implemented in the web app (requires a deployed Monad TESTNET contract address):**

- MetaMask/injected-wallet connect and switch to chain ID 10143.
- Create / Join Jam, read-only listeners, QR invitations, host-approved seats.
- Shared pattern retrieval, edit permission checks, batching and tx progress.
- Optional scoped session key and gas funding in Lobby or Live.
- 90-second live rounds, final Beat Card replay, testnet MON tips and claims.
- Poll + reconcile authoritative on-chain state, apply remote changes at audio loop boundaries.

**Activation:** The contract has not been deployed and the public site has not
been hosted. Without `VITE_BEATDROP_ADDRESS`, the app intentionally disables real
room creation rather than imitating a blockchain connection.

Read **[MULTIPLAYER SETUP](docs/MULTIPLAYER.md)** for MetaMask-only contract deployment
through Remix, environment setup, creating an actual room, and sending
public HTTPS invitations to different devices.

```powershell
git pull
npm install
npm test
npm run contracts:test
npm run test:e2e
npm run build
npm run dev
```

Run `npx playwright install chromium` once if the browser-test runner requests it.
Browser tests cover offline mode and responsive grid behaviours but do **not**
replace live two-wallet/real testnet acceptance.

Status, including what was actually tested: [PROJECT_STATUS.md](PROJECT_STATUS.md).
