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

Next integration: MetaMask / wallet connection, live room links, explicit
user-approved authorization of short-lived editing keys, transaction status,
confirmed shared pattern sync, and final Beat Card replay/tipping.

**Do not deploy to Monad mainnet. Do not share any wallet seed phrase,
private key, or session key in chat.** For real testnet deployment, use a
separate test-only wallet; verify the RPC chain ID is 10143. 

Status, including what was actually tested: [PROJECT_STATUS.md](PROJECT_STATUS.md).
