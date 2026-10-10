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
