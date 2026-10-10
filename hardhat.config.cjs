require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const monad = require("./network/monad.testnet.json");
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./.hardhat/cache",
    artifacts: "./.hardhat/artifacts",
  },
  networks: {
    hardhat: { chainId: 31337 },
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC_URL || monad.rpcUrl,
      chainId: monad.chainId,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
};
