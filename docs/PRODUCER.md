# Beat Drop Upgrade 5 — Smart Producer & Remix Studio

## What shipped

The Smart Producer is an **offline, deterministic music arrangement engine**, not
an externally hosted LLM and not a trained machine-learning model. It uses the
current 16-step bar and musical pattern rules to generate playable proposals.

It does **not** call OpenAI, Gemini, Anthropic, Ollama, a server, a database,
or an external music AI service. It has no API quota or key requirements.

### Working mode 1 — instrument-scoped suggestions

1. Pick one of **Drums, Bass, Synth, Pluck** with the existing seat buttons.
2. Open **Smart Producer**, select style: House / Lo-fi / Trap / Ambient.
3. Choose energy: Sparse / Balanced / Energetic.
4. Click **Generate 3 ideas**.
5. Review each proposal's description, 16-step diff, changed step count,
   original vs. suggested hit count.
6. Click **Audition** to listen without saving or sending transactions.
   The studio's grid highlights changed steps for the audition.
7. Click **Apply idea** to approve those exact note edits, or stop the audition.
8. Undo returns local edits to their previous state. In a shared jam, the
   accepted edits are queued as explicit on-chain cell updates, not credited
   until the contract has accepted them.

Styles are provided as drum-grid/beat profiles, pitch-scale choices and
rhythmic placement conventions. They are not claims of human-composed or
copyright-licensed training material.

### Working mode 2 — complete four-track draft (local only)

1. Open the Producer in **local practice**, not in a shared on-chain room.
2. Select a style and energy.
3. Click **Draft 4-track loop**.
4. Audition all 4 instruments together.
5. **Apply full beat** only if you want to replace the local draft with the
   approved arrangement. Use one Undo to restore the complete previous loop.

This action is intentionally **disabled in shared rooms**, because
a single player cannot rewrite another participant's instrument seat.
There is no silent "AI owns the beat" or "AI edits without consent" feature.

## Music and attribution safety

- The underlying original pattern is not mutated while proposals are auditioned.
- All melodic cells remain monophonic and have only one of the 16 app pitches.
- Drum cells use the same 4 voices and on-chain 4-bit mask as before.
- Only validated steps 0–15 are used.
- Proposals are invalidated when their source lane changes.
- Full four-track drafts are invalidated when **any** source pattern changes.
- A connected shared room only allows approved edits on instruments assigned
  to the connected wallet while the round's editing window is open.
- The smart contract, not the preview, determines eligibility and payment.
- No draft changes the royalty share calculation. An accepted note simply
  becomes an ordinary note by its **main-wallet instrument seat owner**.
- Main-wallet/session-key gas and cutoff risks from the multiplayer protocol
  still apply; failed/pending transactions do not count.
- No AI suggestions are written on-chain automatically. Every accepted patch
  comes from the player's explicit approval.

## Internals

- `src/producer.js`: pure, deterministic generator, note validation,
  original-lane signature, exact change sets, bounded style options and
  full four-lane local draft composition.
- `src/producer-panel.js`: UI controls, proposal explanations, audition
  toggling, validation and guarded acceptance.
- `src/producer.css`: responsive visual treatment.
- `src/main.js`: Tone.js audio playback chooses the auditioned pattern only
  while a draft is active; underlying storage and credits stay untouched.
- On live rooms: accepted edits enter the preexisting `room-controller.js`
  queued transaction path, which still validates seat authorization.
- Local notes can be imported/exported in the app's existing JSON format.

For a consistent demo, style + energy + initial pattern produce repeatable
recommendations. The algorithm favors reliability and explainability over
unverifiable marketing claims. It does **not** claim to understand natural
language or to have learned from external professional producers.

## Suggested demo

- Start with an empty local studio.
- Open Producer → House → Balanced → Draft 4-track loop → Audition.
- Show all four colored instrument stems and the 16-step live visual grid.
- Apply the full beat and open **Preview Beat Card**.
- Mute/solo bass or synth; show deterministic cover artwork and note counts.
- Undo the complete draft.
- Generate **3 ideas** for drums and preview an idea without applying it.
- Explain the real on-chain handoff: individual seat owners must approve each
  patch; contributors are paid only for accepted final notes.

## Automated checks

```powershell
npm ci
npm test
npm run contracts:test
npx playwright install chromium
npm run test:e2e
npm run build
```

Node tests exercise all 4 instruments × 4 styles × 3 energy levels,
full occupied grids, malformed inputs, pure deterministic output, and stale
proposals. Desktop/mobile Playwright tests exercise real audition → approve →
undo flows and four-track local proposals.

Tests do NOT certify music quality, sample-accurate remote synchronization,
or actual testnet transactions. Those require listening/device verification
and a deployment.

## Future optional work

A true hosted or local trained AI model could use the same explicit proposal
format and the same approval/permission gates. Do not replace the deterministic
engine with a fragile unaudited service during a short hackathon demo.
