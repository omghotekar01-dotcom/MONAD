// Read-only proof that the local UI is pointing to a real Monad TESTNET
// deployment. Never reads a private key or changes blockchain state.
require('dotenv').config({path:'.env.local'});
const { JsonRpcProvider, Contract, isAddress, getAddress }=require('ethers');
const rpc=process.env.VITE_MONAD_RPC_URL||process.env.MONAD_TESTNET_RPC_URL||'https://testnet-rpc.monad.xyz';
const address=process.env.VITE_BEATDROP_ADDRESS?.trim();
async function main(){
 console.log('BEAT DROP · Monad connection preflight');
 const provider=new JsonRpcProvider(rpc);
 const network=await provider.getNetwork();
 console.log('RPC chain ID:',String(network.chainId));
 if(network.chainId!==10143n)throw Error('Wrong network! Expected Monad Testnet 10143, refusing to continue.');
 if(!address||!isAddress(address))throw Error('No valid VITE_BEATDROP_ADDRESS found in .env.local. Deploy BeatDrop.sol with Remix/MetaMask and copy its PUBLIC address.');
 const code=await provider.getCode(address);
 if(code==='0x')throw Error('No bytecode found at '+address+' on Monad Testnet. Check deployed address.');
 const contract=new Contract(getAddress(address),['function nextRoomId() view returns(uint256)','function ROUND_DURATION() view returns(uint64)','function MAX_BATCH() view returns(uint8)'],provider);
 const [next,duration,batch]=await Promise.all([contract.nextRoomId(),contract.ROUND_DURATION(),contract.MAX_BATCH()]);
 if(duration!==90n||batch!==16n)throw Error('Deployed contract is not the expected BeatDrop version (90s / max 16).');
 console.log('Contract address:',getAddress(address));
 console.log('Room count:',String(next-1n));
 console.log('Contract bytecode length:',(code.length-2)/2,'bytes');
 console.log('Round duration:',String(duration),'seconds · batch limit:',String(batch));
 console.log('Explorer: https://testnet.monadvision.com/address/'+getAddress(address));
 console.log('PASS: Live Beat Drop RPC/contract preflight confirmed. Wallet and real multi-user interactions still need testing.');
}
main().catch(e=>{console.error('FAIL:',e.shortMessage||e.message);process.exitCode=1;});
