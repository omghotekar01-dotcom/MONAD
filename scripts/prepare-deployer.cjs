// Generates an isolated local-only account for deploying a TESTNET contract.
// The secret is NEVER printed, uploaded, or embedded in VITE_* frontend vars.
const fs = require('node:fs');
const path = require('node:path');
const {deployerEnvPath}=require('./deployer-path.cjs');
const { Wallet } = require('ethers');
const dotenv = require('dotenv');

const filename=deployerEnvPath();
if(fs.existsSync(filename)){
  const vars=dotenv.parse(fs.readFileSync(filename));
  const key=vars.DEPLOYER_PRIVATE_KEY;
  if(!/^0x[a-fA-F0-9]{64}$/.test(key||'')) {
    console.error('Existing local deployment wallet file has no valid key. Do not share it or overwrite it with this script.');
    process.exitCode=1;
  }else{
    console.log('An isolated deployment wallet already exists. No new key was generated.');
    console.log('PUBLIC DEPLOYER ADDRESS: '+new Wallet(key).address);
    console.log('Check its testnet MON balance with: npm run deployer:status');
  }
}else{
  const wallet=Wallet.createRandom();
  const env='# Locally generated, TESTNET-ONLY deployment signer. NEVER commit or share.\n'
   +'# This key is for a temporary deployment account, NOT your MetaMask account.\n'
   +'DEPLOYER_PRIVATE_KEY='+wallet.privateKey+'\n';
  fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  fs.writeFileSync(filename,env,{encoding:'utf8',flag:'wx',mode:0o600});
  try{fs.chmodSync(filename,0o600);}catch{/* Windows file ACL controls apply */}
  console.log('Created a disposable TESTNET-only deployment wallet under your local user app-data directory (outside OneDrive and Git).');
  console.log('PUBLIC DEPLOYER ADDRESS: '+wallet.address);
  console.log('Send a small amount of MONAD TESTNET MON to this address from your funded MetaMask wallet.');
  console.log('Do NOT send Ethereum ETH or real tokens. Do NOT publish this file.');
  console.log('Then run: npm run deployer:status');
}
