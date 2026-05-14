const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy BallotAuditRegistry
  const BallotAuditRegistry = await ethers.getContractFactory("BallotAuditRegistry");
  const ballotAuditRegistry = await BallotAuditRegistry.deploy();
  await ballotAuditRegistry.waitForDeployment();
  const contractAddr = await ballotAuditRegistry.getAddress();
  console.log("BallotAuditRegistry deployed to:", contractAddr);

  // Write address to backend/.env
  const backendEnvPath = path.resolve(__dirname, "../../backend/.env");

  let envContent = "";
  if (fs.existsSync(backendEnvPath)) {
    envContent = fs.readFileSync(backendEnvPath, "utf8");
  } else {
    // Copy from .env.example if .env doesn't exist
    const examplePath = path.resolve(__dirname, "../../backend/.env.example");
    if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, "utf8");
    }
  }

  function setEnvVar(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  }

  envContent = setEnvVar(envContent, "BALLOT_AUDIT_REGISTRY_ADDRESS", contractAddr);

  fs.writeFileSync(backendEnvPath, envContent);
  console.log("Contract address written to backend/.env");

  // Export ABI for frontend explorer
  const abiDir = path.resolve(__dirname, "../../frontend/src/abis");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const contracts = [
    { name: "BallotAuditRegistry", address: contractAddr },
  ];

  const deployInfo = {};

  for (const c of contracts) {
    const artifactPath = path.resolve(
      __dirname,
      `../artifacts/contracts/${c.name}.sol/${c.name}.json`
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      fs.writeFileSync(
        path.join(abiDir, `${c.name}.json`),
        JSON.stringify({ abi: artifact.abi, address: c.address }, null, 2)
      );
      deployInfo[c.name] = c.address;
    }
  }

  // Write a combined deploy-info file
  fs.writeFileSync(
    path.join(abiDir, "deploy-info.json"),
    JSON.stringify({
      network: "localhost",
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
      deployer: deployer.address,
      contracts: deployInfo,
      deployedAt: new Date().toISOString(),
    }, null, 2)
  );
  console.log("ABIs and deploy info exported to frontend/src/abis/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
