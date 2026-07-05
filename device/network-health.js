// Second, distinct provider: sells live health readings about BOT Chain
// itself -- RPC latency and how stale the latest block is. Real measurements
// taken every call, not simulated. Thematically it's an agent paying to
// monitor the health of the chain it runs on.
require("dotenv").config();
const http = require("http");
const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL || "https://rpc.bohr.life";
const PRICE_PER_CALL = ethers.parseEther("0.00015"); // tBOT per reading
const PORT = process.env.NETHEALTH_PORT || 4001;

const REGISTRY_ABI = [
  "function registerProvider(string name, string kind, uint256 pricePerCall) external returns (uint256)",
  "event ProviderRegistered(uint256 indexed id, address indexed payoutAddress, string name, string kind, uint256 pricePerCall)",
];

async function readNetworkHealth(provider) {
  const start = Date.now();
  const block = await provider.getBlock("latest");
  const rpcLatencyMs = Date.now() - start;
  const blockAgeMs = Date.now() - Number(block.timestamp) * 1000;

  return {
    rpcUrl: RPC_URL,
    blockNumber: block.number,
    rpcLatencyMs,
    blockAgeMs,
    timestamp: Date.now(),
  };
}

async function registerAsProvider(provider) {
  const wallet = new ethers.Wallet(process.env.DEVICE_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);
  const registry = new ethers.Contract(process.env.REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  console.log(`Registering network-health provider from ${wallet.address} ...`);
  const tx = await registry.registerProvider("botchain-network-health", "network-health", PRICE_PER_CALL);
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((l) => {
      try {
        return registry.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "ProviderRegistered");

  const providerId = event.args.id.toString();
  console.log(`Registered as provider #${providerId} (tx ${receipt.hash})`);
  return providerId;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const providerId = await registerAsProvider(provider);

  const server = http.createServer(async (req, res) => {
    if (req.url === "/reading") {
      try {
        const reading = await readNetworkHealth(provider);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ providerId, reading }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`Network-health provider #${providerId} serving readings on http://localhost:${PORT}/reading`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
