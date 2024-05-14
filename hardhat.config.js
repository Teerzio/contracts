require("@nomicfoundation/hardhat-toolbox")
require("hardhat-gas-reporter")
require("solidity-coverage")
require('hardhat-storage-layout')
require('dotenv').config()

module.exports = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris" // paris for arbitrum because no PUSH0 support, shanghai for ethereum
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber: 19087444
      },
      accounts: {
        count: 30
      }
    },
  },
  gasReporter: {
    enabled: false
  }
}