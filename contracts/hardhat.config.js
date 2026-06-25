import '@nomicfoundation/hardhat-toolbox';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000001';

export default {
  paths: { sources: './src_contracts' },
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true }
  },
  networks: {
    arcTestnet: {
      url: 'https://rpc.testnet.arc.network',
      chainId: 5042002,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    }
  }
};
