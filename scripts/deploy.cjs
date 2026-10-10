// Deploy only with an isolated, locally stored TESTNET deployer key.
// Never paste any private key into a chat, GitHub issue or frontend variable.
const { ethers } = require("hardhat");
const monad = require("../network/monad.testnet.json");

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== BigInt(monad.chainId)) {
    throw new Error("Wrong network: expected Monad TESTNET chain ID " + monad.chainId +
      ", received " + network.chainId + ". Refusing deployment.");
  }
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured. Set DEPLOYER_PRIVATE_KEY in local .env.");
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) throw new Error("Deployer has no TESTNET MON for gas. Visit " + monad.faucetUrl);

  const factory = await ethers.getContractFactory("BeatDrop", deployer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const receipt = await contract.deploymentTransaction().wait(1);

  console.log(JSON.stringify({
    network: monad.name,
    chainId: Number(network.chainId),
    contract: await contract.getAddress(),
    transaction: receipt.hash,
    block: receipt.blockNumber,
    explorer: monad.explorerUrl + "/tx/" + receipt.hash,
    sourceRevision: process.env.SOURCE_REVISION || "record-your-current-git-sha",
  }, null, 2));
  console.log("Record this manifest in docs/deployments/ after verifying the explorer transaction.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
