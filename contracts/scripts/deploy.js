import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy the Agent Registry
  const MockAgentRegistry = await hre.ethers.getContractFactory("MockAgentRegistry");
  const agentRegistry = await MockAgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const registryAddress = await agentRegistry.getAddress();
  console.log("MockAgentRegistry deployed to:", registryAddress);

  // 2. Deploy ArcVault
  const ArcVault = await hre.ethers.getContractFactory("ArcVault");
  const arcVault = await ArcVault.deploy(registryAddress);
  await arcVault.waitForDeployment();
  const vaultAddress = await arcVault.getAddress();
  console.log("ArcVault deployed to:", vaultAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
