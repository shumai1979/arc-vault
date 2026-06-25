import hre from "hardhat";

async function main() {
  const ArcVault = await hre.ethers.getContractFactory("ArcVault");
  const arcVault = await ArcVault.deploy();
  await arcVault.waitForDeployment();
  const vaultAddress = await arcVault.getAddress();
  console.log(`ArcVault (native USDC) deployed to: ${vaultAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
