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
