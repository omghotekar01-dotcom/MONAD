import {
  createPublicClient, createWalletClient, custom, http,
  parseAbi, parseEventLogs, decodeEventLog, encodePacked,
  stringToHex, hexToString, parseEther, formatEther, isAddress
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { roomHref, decodePattern, ZERO_ADDRESS } from "./room-utils.js";

export const TESTNET = Object.freeze({
  id:10143,
  name:"Monad Testnet",
  nativeCurrency:{name:"MON",symbol:"MON",decimals:18},
  rpcUrls:{default:{http:["https://testnet-rpc.monad.xyz"]}},
  blockExplorers:{default:{name:"MonadVision",url:"https://testnet.monadvision.com"}},
  testnet:true
});
const RPC = import.meta.env.VITE_MONAD_RPC_URL || TESTNET.rpcUrls.default.http[0];
const configured = import.meta.env.VITE_BEATDROP_ADDRESS?.trim() || "";
export const CONTRACT_ADDRESS = isAddress(configured) && configured.toLowerCase() !== ZERO_ADDRESS
  ? configured : null;
export const CONTRACT_READY = Boolean(CONTRACT_ADDRESS);
export const EXPLORER = TESTNET.blockExplorers.default.url;
export const FAUCET = "https://faucet.monad.xyz";

export const BEATDROP_ABI = parseAbi([
  "event RoomCreated(uint256 indexed roomId,address indexed host,bytes32 name)",
  "event RoomStarted(uint256 indexed roomId,uint64 startedAt,uint64 endsAt)",
  "event SeatAssigned(uint256 indexed roomId,uint8 indexed instrument,address indexed owner)",
  "event NoteSet(uint256 indexed roomId,uint8 indexed instrument,uint8 step,uint8 value,address indexed owner,address operator)",
  "event RoomFinalized(uint256 indexed roomId,uint8 eligibleMask)",
  "event TipReceived(uint256 indexed roomId,address indexed from,uint256 amount)",
  "function createRoom(bytes32 name) returns (uint256 roomId)",
  "function assignSeat(uint256 roomId,uint8 seat,address owner)",
  "function startRoom(uint256 roomId)",
  "function authorizeSession(uint256 roomId,address key,uint64 expiresAt)",
  "function revokeSession(uint256 roomId,address key)",
  "function setNotes(uint256 roomId,uint8 instrument,uint8[] steps,uint8[] values,address owner)",
  "function finalizeRoom(uint256 roomId)",
  "function tip(uint256 roomId) payable",
  "function claim(uint256 roomId)",
  "function getRoom(uint256 roomId) view returns (address host,bytes32 name,uint8 phase,address[4] seats,uint64 startedAt,uint64 endsAt,uint64 finalizedAt,uint8 eligibleMask,uint256 totalTipped,uint256 totalClaimed)",
  "function getPattern(uint256 roomId) view returns (uint8[16][4] pattern)",
  "function claimable(uint256 roomId,address account) view returns (uint256)",
  "function sessionExpiry(uint256 roomId,address owner,address key) view returns (uint64)",
  "function nextRoomId() view returns (uint256)"
]);

const publicClient = createPublicClient({chain:TESTNET,transport:http(RPC,{timeout:12000,retryCount:2})});
let account=null, activeWallet=null, session=null;
let validatedRpc=false;
const eip1193 = () => globalThis.window?.ethereum;

function readableError(error) {
  const value=error?.shortMessage || error?.details || error?.message || "Transaction failed";
  return String(value).replace(/\s+/g," ").slice(0,240);
}
export function getErrorMessage(error){return readableError(error);}
export function walletAddress(){return account;}
export function sessionAddress(){return session?.account.address || null;}
export function sessionActive(roomId) {
  return Boolean(session && session.roomId===String(roomId) && session.expiresAt > Math.floor(Date.now()/1000));
}
export function explorerTx(hash){return EXPLORER+"/tx/"+hash;}
export function explorerAddress(addr){return EXPLORER+"/address/"+addr;}
export async function verifyRpc() {
  if (!CONTRACT_READY) throw new Error("No contract configured. Deploy to Monad Testnet and set VITE_BEATDROP_ADDRESS in .env.local.");
  const actual=await publicClient.getChainId();
  if (actual!==TESTNET.id) throw new Error("Configured RPC is not Monad Testnet (expected chain ID 10143).");
  if (!validatedRpc) {
    const code=await publicClient.getBytecode({address:CONTRACT_ADDRESS});
    if (!code || code==="0x") throw new Error("No contract exists at the configured address on Monad Testnet.");
    validatedRpc=true;
  }
}
export async function connectWallet() {
  if(!eip1193())throw new Error("An EVM wallet (for example MetaMask) is required to create or edit a jam.");
  const accounts=await eip1193().request({method:"eth_requestAccounts"});
  if (!accounts?.length)throw new Error("No wallet account selected.");
  await ensureWalletNetwork();
  account=accounts[0];
  activeWallet=createWalletClient({chain:TESTNET,account,transport:custom(eip1193())});
  return account;
}
export async function refreshWallet() {
  if(!eip1193()) {account=null;activeWallet=null;return null;}
  const [accounts,chainId]=await Promise.all([
    eip1193().request({method:"eth_accounts"}),
    eip1193().request({method:"eth_chainId"})
  ]);
  if(Number(BigInt(chainId))!==TESTNET.id){account=null;activeWallet=null;return null;}
  account=accounts?.[0] || null;
  activeWallet=account?createWalletClient({chain:TESTNET,account,transport:custom(eip1193())}):null;
  return account;
}
export function walletEvents(listener) {
  if(!eip1193()?.on)return ()=>{};
  const changed=()=>{clearSession();void refreshWallet().then(listener).catch(()=>listener(null));};
  eip1193().on("accountsChanged",changed);
  eip1193().on("chainChanged",changed);
  eip1193().on("disconnect",changed);
  return ()=>{eip1193()?.removeListener?.("accountsChanged",changed);eip1193()?.removeListener?.("chainChanged",changed);eip1193()?.removeListener?.("disconnect",changed);};
}
export async function ensureWalletNetwork(){
  if (!eip1193())throw new Error("No injected EVM wallet detected.");
  const actual=await eip1193().request({method:"eth_chainId"});
  if(Number(BigInt(actual))===TESTNET.id)return;
  try {
    await eip1193().request({method:"wallet_switchEthereumChain",params:[{chainId:"0x279f"}]});
  } catch(e){
    if(e.code!==4902)throw e;
    await eip1193().request({method:"wallet_addEthereumChain",params:[{
      chainId:"0x279f",chainName:TESTNET.name,rpcUrls:[RPC],
      nativeCurrency:TESTNET.nativeCurrency,blockExplorerUrls:[EXPLORER]
    }]});
    await eip1193().request({method:"wallet_switchEthereumChain",params:[{chainId:"0x279f"}]});
  }
}
async function checkedWriter() {
  if(!activeWallet || !account)throw new Error("Connect your wallet before making changes.");
  await ensureWalletNetwork();
  await verifyRpc();
  return activeWallet;
}
async function send(functionName,args=[],options={}) {
  const client=await checkedWriter();
  const {request}=await publicClient.simulateContract({
    address:CONTRACT_ADDRESS,abi:BEATDROP_ABI,functionName,args,account,
    ...(options.value!==undefined?{value:options.value}:{})
  });
  const hash=await client.writeContract(request);
  options.onHash?.(hash);
  const receipt=await publicClient.waitForTransactionReceipt({hash,confirmations:1,timeout:60000});
  if(receipt.status!=="success")throw new Error("Transaction reverted. "+explorerTx(hash));
  return {hash,receipt};
}
export async function readRoom(roomId) {
  await verifyRpc();
  const id=BigInt(roomId);
  const [meta,rawPattern,block]=await Promise.all([
    publicClient.readContract({address:CONTRACT_ADDRESS,abi:BEATDROP_ABI,functionName:"getRoom",args:[id]}),
    publicClient.readContract({address:CONTRACT_ADDRESS,abi:BEATDROP_ABI,functionName:"getPattern",args:[id]}),
    publicClient.getBlock({blockTag:"latest"})
  ]);
  const [host,name,phase,seats,startedAt,endsAt,finalizedAt,eligibleMask,totalTipped,totalClaimed]=meta;
  return {
    id,host,name:hexToString(name,{size:32}).replace(/\0/g,""),
    phase:["Lobby","Live","Finalized"][Number(phase)] || "Unknown",
    seats,startedAt:Number(startedAt),endsAt:Number(endsAt),finalizedAt:Number(finalizedAt),
    eligibleMask:Number(eligibleMask),totalTipped,totalClaimed,pattern:decodePattern(rawPattern),
    chainTime:Number(block.timestamp),chainObservedAt:Date.now()
  };
}
export async function readClaim(roomId,owner){
  if(!owner || !CONTRACT_READY)return 0n;
  return publicClient.readContract({address:CONTRACT_ADDRESS,abi:BEATDROP_ABI,functionName:"claimable",args:[BigInt(roomId),owner]});
}
export async function createRoom(name,onHash){
  const trimmed=name.trim();
  if(!trimmed || new TextEncoder().encode(trimmed).length>31)throw new Error("Room title must be between 1 and 31 UTF-8 bytes.");
  const {hash,receipt}=await send("createRoom",[stringToHex(trimmed,{size:32})],{onHash});
  const logs=parseEventLogs({abi:BEATDROP_ABI,eventName:"RoomCreated",logs:receipt.logs});
  const mine=logs.find(l=>l.address.toLowerCase()===CONTRACT_ADDRESS.toLowerCase());
  if(!mine)throw new Error("Room transaction confirmed but room ID was not present in its receipt.");
  return {roomId:mine.args.roomId,hash};
}
export async function assignSeat(roomId,index,owner,onHash){
  if(!isAddress(owner))throw new Error("Enter a valid 0x wallet address.");
  return send("assignSeat",[BigInt(roomId),index,owner],{onHash});
}
export async function startRoom(roomId,onHash){return send("startRoom",[BigInt(roomId)],{onHash});}
export async function finalizeRoom(roomId,onHash){return send("finalizeRoom",[BigInt(roomId)],{onHash});}
export async function tipRoom(roomId,amount,onHash) {
  const value=parseEther(amount.trim());
  if(value<=0n)throw new Error("Tip must be greater than zero.");
  return send("tip",[BigInt(roomId)],{value,onHash});
}
export async function claimRoom(roomId,onHash){return send("claim",[BigInt(roomId)],{onHash});}

export function clearSession(){session=null;}
export async function authorizeSession(roomId,onHash){
  if(!account)throw new Error("Connect your main wallet first.");
  const key=privateKeyToAccount(generatePrivateKey());
  const expiresAt=Math.floor(Date.now()/1000)+300;
  const {hash}=await send("authorizeSession",[BigInt(roomId),key.address,BigInt(expiresAt)],{onHash});
  session={roomId:String(roomId),account:key,expiresAt};
  return {address:key.address,expiresAt,hash};
}
export async function revokeSession(roomId,onHash){
  if(!session || session.roomId!==String(roomId))return;
  const address=session.account.address;
  const result=await send("revokeSession",[BigInt(roomId),address],{onHash});
  clearSession();
  return result;
}
export async function readSessionGas(){
  return session ? publicClient.getBalance({address:session.account.address}):0n;
}
export async function fundSession(amount,onHash) {
  if(!session)throw new Error("Authorize a browser session first.");
  const wallet=await checkedWriter();
  const value=parseEther(amount.trim());
  if(value<=0n)throw new Error("Top-up must be greater than zero.");
  const hash=await wallet.sendTransaction({to:session.account.address,value,account,chain:TESTNET});
  onHash?.(hash);
  const receipt=await publicClient.waitForTransactionReceipt({hash,timeout:60000});
  if(receipt.status!=="success")throw new Error("Session top-up failed.");
  return {hash,receipt};
}
export async function submitBatch(roomId,instrument,steps,values,owner,onHash,preferSession=false){
  await verifyRpc();
  const args=[BigInt(roomId),instrument,steps,values,owner];
  if(preferSession){
    if(!sessionActive(roomId))throw new Error("Session expired or not authorized; reconnect a new session.");
    const sessionAccount=session.account;
    const gasBalance=await publicClient.getBalance({address:sessionAccount.address});
    if(gasBalance===0n)throw new Error("Your browser session has no testnet MON gas. Fund it or switch to main-wallet signing.");
    const {request}=await publicClient.simulateContract({
      address:CONTRACT_ADDRESS,abi:BEATDROP_ABI,functionName:"setNotes",args,account:sessionAccount.address
    });
    const client=createWalletClient({account:sessionAccount,chain:TESTNET,transport:http(RPC,{timeout:12000})});
    const hash=await client.writeContract(request);
    onHash?.(hash);
    const receipt=await publicClient.waitForTransactionReceipt({hash,confirmations:1,timeout:60000});
    if(receipt.status!=="success")throw new Error("Session transaction reverted.");
    return {hash,receipt};
  }
  return send("setNotes",args,{onHash});
}
export function formatMon(amount){return Number(formatEther(amount)).toLocaleString(undefined,{maximumFractionDigits:5});}
