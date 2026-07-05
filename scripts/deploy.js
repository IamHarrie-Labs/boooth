const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BOT");

  const Registry = await hre.ethers.getContractFactory("ToolRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ToolRegistry deployed:", registryAddress);

  const PayPerCall = await hre.ethers.getContractFactory("PayPerCall");
  const payPerCall = await PayPerCall.deploy(registryAddress);
  await payPerCall.waitForDeployment();
  const payPerCallAddress = await payPerCall.getAddress();
  console.log("PayPerCall deployed:", payPerCallAddress);

  // Persist addresses so agent/device/dashboard scripts can pick them up.
  const deployment = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    registry: registryAddress,
    payPerCall: payPerCallAddress,
    deployedAt: new Date().toISOString(),
  };
  const outPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("Wrote", outPath);

  // Also patch .env so scripts that read process.env work immediately.
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    env = env.replace(/^REGISTRY_ADDRESS=.*$/m, `REGISTRY_ADDRESS=${registryAddress}`);
    env = env.replace(/^PAYPERCALL_ADDRESS=.*$/m, `PAYPERCALL_ADDRESS=${payPerCallAddress}`);
    fs.writeFileSync(envPath, env);
    console.log("Updated .env with deployed addresses");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
