# BEAT DROP agent instructions

- Product: multiplayer four-seat music sequencer for Monad **testnet**. No generic crypto dashboard and no change of product scope.
- Core data: one 16-step bar at 120 BPM; drums polyphonic, melodic lanes monophonic; contribution credit from accepted final notes, never raw note counts.
- Working Git commit identity **must be** `Om Ghotekar <omghotekar01@gmail.com>`. Account: `omghotekar01-dotcom`. For local Git commits set repository-local user.name/email. API-based commits must verify actual author and disclose any mismatch.
- Commands: `npm install`, `npm run dev`, `npm test`, `npm run build`.
- Never commit passwords, private keys, seed phrases, session keys, user wallets, or production secrets.
- Monad testnet only until explicitly authorized otherwise. Verify RPC chain ID before contract deployment.
- UI audio is low-latency local; authoritative multiplayer state and contributor payouts must come from contract.
- Distinguish local practice from on-chain rooms. Do not claim blockchain transactions, contract security, validation, or deployment that has not occurred.
- Keep `PROJECT_STATUS.md` honest after each milestone, including tests actually executed and blockers.

- Contract protocol: `docs/CONTRACTS.md`. Use `npm run contracts:compile` and `npm run contracts:test`; deploy ONLY to Monad Testnet with a separate local test-wallet signer.
- Root `type=module` requires explicit `--config hardhat.config.cjs` in npm contract scripts; do not rename config to `.js` without adapting to ESM.

- Frontend multiplayer code: `src/room-controller.js`, `src/chain.js`, `src/room-utils.js`; no faux room state when the contract address is unconfigured.
- Browser-only `VITE_BEATDROP_ADDRESS` is public and must point to a verified TESTNET contract; never embed a private key in Vite `VITE_*` env.
- Session keys are held only in memory, scoped to one room, need separately funded TESTNET gas; warn that unused gas can be stranded on reload.
- `npm ci` installs committed lockfile, `npm run test:e2e` runs browser smoke tests. Keep desktop/mobile layout and original studio working.
- Live web + multiwallet behavior is NOT verified until actual testnet deployment and real transactions are witnessed.
- Guide: `docs/MULTIPLAYER.md`.
