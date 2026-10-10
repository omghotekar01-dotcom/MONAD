# Deploy BEAT DROP from VS Code — no Remix or MetaMask key export

The website and Solidity project can be deployed from a normal VS Code
PowerShell terminal on Windows. No Docker or Remix needed.

**Important:** ChatGPT can push and verify deployment code in GitHub, but it
cannot execute commands inside your private VS Code window or authorize
wallet transactions. Your own computer must submit the deployment. Only
Monad **TESTNET 10143** is permitted; no real MON or ETH is needed.

## Why two different wallets?

Your existing **MetaMask Account 1** already received testnet MON. It will
continue to sign normal Beat Drop room, note, tip, and claim transactions
when you play music.

For the contract's ONE-TIME deployment, the scripts create a separate tiny
**throwaway testnet deployment account** locally. This avoids:
- Remix entirely.
- Exporting or pasting MetaMask Account 1's private key.
- Publishing any private key in GitHub or this chat.
- Storing keys in your OneDrive project directory.

The throwaway key is saved only to:
`%LOCALAPPDATA%\BeatDrop\testnet-deployer.env`
(on other OS: `~/.beat-drop/testnet-deployer.env`).
It is an **unencrypted local file**, so protect your computer; use it
exclusively for testnet and never fund it with real assets.

## 1 — Open correct project directory

In VS Code → Terminal → New Terminal (PowerShell):

```powershell
cd "C:\Users\ASUS\OneDrive\Desktop\MONAD\MONAD"
Test-Path .\package.json
git pull --ff-only origin main
node -v
npm ci --legacy-peer-deps
```

`Test-Path` must display `True`. If not, find the actual clone folder.
Node.js >= 22.16 is required.

## 2 — Generate a testnet-only deployment account

```powershell
npm run deployer:prepare
```

The output prints a **PUBLIC DEPLOYER ADDRESS** such as `0x...`.
No private key will be shown. Re-running this command reuses the same
account instead of creating a new one.

**IMPORTANT:** This address will be DIFFERENT from your MetaMask Account 1
address. That is intentional.

## 3 — Send it a little testnet MON

In MetaMask:

1. Ensure network says **Monad Testnet (10143)**.
2. Click **Send** and paste the **PUBLIC DEPLOYER ADDRESS** from VS Code.
3. Send a modest amount of **TESTNET MON** (not real MON or Ethereum ETH).
   Leave some testnet MON in MetaMask for creating rooms and playing notes.
4. Confirm the transaction and wait for testnet confirmation.
   Alternatively, request faucet test MON directly for the public deployer
   address if the faucet allows it.
5. Check the received balance:

```powershell
npm run deployer:status
```

The command prints network, deployer address and actual testnet MON balance.
If it says balance zero, wait and recheck the account/network.
Required gas changes; no fixed testnet MON balance is guaranteed to suffice.

## 4 — Compile and deploy DIRECTLY from VS Code

```powershell
npm run contracts:compile
npm run contracts:test
npm run contracts:deploy:testnet
```

The last command:
- Checks chain ID **10143**, then verifies a funded deployer.
- Uses compiled exact repository `contracts/BeatDrop.sol` (optimizer 200).
- Sends the one-time gas-paid deployment transaction.
- Waits for an actual successful on-chain receipt and bytecode.
- Prints public `contract`, `transaction`, `block`, and explorer URL.
- Writes a machine-local, PUBLIC deployment receipt into `.deployments/`.
- **Automatically configures** the project's `.env.local` with
  `VITE_BEATDROP_ADDRESS` and `VITE_MONAD_RPC_URL`.
- Refuses to redeploy if a valid contract address is already configured.
- Does NOT publish or display its private key.

This contract is a hackathon/testnet prototype, not independently audited.

## 5 — Verify that it REALLY deployed

```powershell
npm run chain:check
```

Look for:
- `RPC chain ID: 10143`
- `Contract bytecode length: ... bytes`
- `Round duration: 90 seconds`
- `Batch limit: 16`
- `PASS: Live Beat Drop RPC/contract preflight confirmed`

If this check fails, **do not** claim the deployment is complete.
Use the confirmed transaction hash to inspect the contract in
https://testnet.monadvision.com.

## 6 — Run the live website

```powershell
npm run dev
```

Open the local URL shown by the terminal (often http://localhost:5173/).
Refresh the page. The old **Local demo · deployment pending** status should
now be replaced with a Monad Testnet status.

Click **Connect wallet** with the ORIGINAL MetaMask Account 1 (NOT the new
one-time deployment account), confirm Monad Testnet.

Then:
1. Click Create jam → set name `Midnight on Monad` → submit.
2. Approve room creation using MetaMask Account 1.
3. In real Lobby click **Assign my wallet to all 4 seats**;
   sign seat assignment transactions using MetaMask.
4. Start 90-second jam. Immediately submit the four-instrument signature
   through **Publish 4-track demo to Monad**.
5. Load transactions: accepted `NoteSet` events should appear with real
   hashes linking to MonadVision. ONE batch can contain multiple notes.
6. After the contract's deadline, finalize; replay the real Beat Card.
7. Optionally send and claim tiny testnet MON tips.

The throwaway deployer wallet is only for contract creation. It is not
automatically enrolled as a contributor.

## What to send ChatGPT to verify

After running `npm run contracts:deploy:testnet` and
`npm run chain:check`, copy ONLY:
- Public contract address `0x...`
- Public deployment transaction hash `0x...`
- The terminal output **excluding any secrets**

Do NOT paste `%LOCALAPPDATA%\BeatDrop\testnet-deployer.env`,
private keys, seed phrases or wallet recovery phrases.

If you want a different deployment wallet later, back up/securely remove
the testnet-only local signer file first; generation deliberately refuses
to overwrite existing keys.
