const os=require('node:os');
const path=require('node:path');
// Never store testnet signer secrets in OneDrive/Desktop/repo directories.
// Windows: %LOCALAPPDATA%\BeatDrop\testnet-deployer.env
// Other OS: ~/.beat-drop/testnet-deployer.env
function deployerEnvPath(){
 const base=process.env.LOCALAPPDATA
   ?path.join(process.env.LOCALAPPDATA,'BeatDrop')
   :path.join(os.homedir(),'.beat-drop');
 return path.join(base,'testnet-deployer.env');
}
module.exports={deployerEnvPath};
