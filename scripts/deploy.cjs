// BEAT DROP one-command Solidity deployment for Monad TESTNET, no Remix.
// A disposable test MON-only account is created by 'npm run deployer:prepare'.
// The private key stays in local AppData. Never disclose or commit it.
const fs=require('node:fs');
const path=require('node:path');
const { ethers }=require('hardhat');
const { isAddress }=require('ethers');
const dotenv=require('dotenv');
const monad=require('../network/monad.testnet.json');

function configureLocalFrontend(address){
  const filename=path.resolve(process.cwd(),'.env.local');
  const current=fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):'';
  const updates={
    VITE_BEATDROP_ADDRESS:address,
    VITE_MONAD_RPC_URL:monad.rpcUrl,
  };
  let next=current;
  for(const [key,value]of Object.entries(updates)){
    const matcher=new RegExp('^'+key+'\\s*=.*$','m');
    next=matcher.test(next)?next.replace(matcher,key+'='+value):
      next+(next.endsWith('\n')||next.length===0?'':'\n')+key+'='+value+'\n';
  }
  fs.writeFileSync(filename,next,'utf8');
  console.log('Updated .env.local with PUBLIC contract address and Monad Testnet RPC.');
}

async function main(){
  const network=await ethers.provider.getNetwork();
  if(network.chainId!==BigInt(monad.chainId))throw new Error(
    'Wrong chain! Refusing deployment: expected Monad TESTNET '+monad.chainId+
    ', got '+network.chainId);
  const existingLocalEnv=path.resolve(process.cwd(),'.env.local');
  if(fs.existsSync(existingLocalEnv)){
    const existing=dotenv.parse(fs.readFileSync(existingLocalEnv))
      .VITE_BEATDROP_ADDRESS?.trim();
    if(existing&&isAddress(existing)){
      throw new Error('A valid contract address is already configured in .env.local: '+
        existing+'. Run npm run chain:check. Remove that value locally ONLY if you deliberately want another deployment.');
    }
  }

  const [deployer]=await ethers.getSigners();
  if(!deployer)throw new Error('No local testnet deployment account. Run npm run deployer:prepare.');
  const balance=await ethers.provider.getBalance(deployer.address);
  if(balance===0n)throw new Error('No TESTNET MON at '+deployer.address+
    '. Fund this public address on Monad Testnet, then run npm run deployer:status.');
  console.log('BEAT DROP · DEPLOYING ON '+monad.name+' (chain '+network.chainId+')');
  console.log('Deployer public address: '+deployer.address);
  console.log('Deployer TESTNET balance: '+ethers.formatEther(balance)+' MON');
  console.log('Deploying full BeatDrop.sol (Solidity 0.8.24). This spends testnet gas.');
  const factory=await ethers.getContractFactory('BeatDrop',deployer);
  const contract=await factory.deploy();
  await contract.waitForDeployment();
  const transaction=contract.deploymentTransaction();
  if(!transaction)throw new Error('Deployment transaction not available.');
  const receipt=await transaction.wait(1);
  if(!receipt||receipt.status!==1)throw new Error('Deployment did not succeed; inspect the transaction in the explorer.');
  const address=await contract.getAddress();
  const code=await ethers.provider.getCode(address);
  if(code==='0x')throw new Error('No contract bytecode found after deployment.');
  const result={
    network:monad.name,chainId:Number(network.chainId),
    contract:address,transaction:receipt.hash,block:receipt.blockNumber,
    explorer:monad.explorerUrl+'/tx/'+receipt.hash,
    deployer:deployer.address,
    sourceRevision:process.env.SOURCE_REVISION||'record-current-git-commit',
  };
  const dir=path.resolve(process.cwd(),'.deployments');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'monad-testnet.json'),JSON.stringify(result,null,2)+'\n','utf8');
  configureLocalFrontend(address);
  console.log('\nDEPLOYMENT SUCCESS (real confirmed testnet transaction):');
  console.log(JSON.stringify(result,null,2));
  console.log('\nNEXT COMMANDS:');
  console.log('npm run chain:check');
  console.log('npm run dev');
  console.log('In the website, connect your original MetaMask wallet and create a real jam room.');
  console.log('Your one-time local deployment key is NOT your MetaMask key. Never paste it into the frontend.');
}

main().catch(error=>{console.error('DEPLOYMENT FAILED:',error.shortMessage||error.message);process.exitCode=1;});
