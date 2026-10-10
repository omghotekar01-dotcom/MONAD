// Checks a locally created deployer's test MON balance before gas-paid deployment.
const fs=require('node:fs');
const path=require('node:path');
const {deployerEnvPath}=require('./deployer-path.cjs');
const dotenv=require('dotenv');
const {Wallet,JsonRpcProvider,formatEther}=require('ethers');
const network=require('../network/monad.testnet.json');

async function main(){
 const envFile=deployerEnvPath();
 if(!fs.existsSync(envFile))throw new Error('First run: npm run deployer:prepare');
 const vars=dotenv.parse(fs.readFileSync(envFile));
 const key=vars.DEPLOYER_PRIVATE_KEY;
 if(!/^0x[a-fA-F0-9]{64}$/.test(key||''))throw new Error('Deployment key is missing or invalid in your LOCAL .env.deploy.local.');
 const wallet=new Wallet(key);
 // Fixed testnet RPC from the checked-in network manifest; avoids wrong-chain accidents.
 const provider=new JsonRpcProvider(network.rpcUrl,network.chainId,{staticNetwork:false});
 const chain=await provider.getNetwork();
 if(chain.chainId!==BigInt(network.chainId))throw new Error('Wrong network. Expected Monad Testnet 10143.');
 const balance=await provider.getBalance(wallet.address);
 console.log('Network: '+network.name+' (chain '+chain.chainId+')');
 console.log('PUBLIC DEPLOYER ADDRESS: '+wallet.address);
 console.log('TESTNET MON BALANCE: '+formatEther(balance)+' MON');
 if(balance===0n) {
   console.log('No test MON yet. Send a small amount of testnet MON to the PUBLIC address from MetaMask on Monad Testnet.');
   console.log('Wait for confirmation, then rerun: npm run deployer:status');
   process.exitCode=2;return;
 }
 console.log('Balance is nonzero. To compile: npm run contracts:compile');
 console.log('Then to deploy with this disposable account: npm run contracts:deploy:testnet');
 console.log('Gas costs vary. A nonzero balance may still be insufficient for deployment.');
}
main().catch(e=>{console.error('Deployment wallet check failed:',e.shortMessage||e.message);process.exitCode=1;});
