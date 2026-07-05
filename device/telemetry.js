// Real device telemetry provider: reads this machine's actual CPU load, free
// memory and uptime, registers itself in ToolRegistry, and serves readings
// over HTTP so the agent can "buy" a fresh one every call.
require("dotenv").config();
const os = require("os");
const http = require("http");
const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL || "https://rpc.bohr.life";
const PRICE_PER_CALL = ethers.parseEther("0.0001"); // tBOT per reading
const PORT = process.env.DEVICE_PORT || 4000;

const REGISTRY_ABI = [
  "function registerProvider(string name, string kind, uint256 pricePerCall) external returns (uint256)",
  "event ProviderRegistered(uint256 indexed id, address indexed payoutAddress, string name, string kind, uint256 pricePerCall)",
];

function readTelemetry() {
  const load = os.loadavg()[0]; // 1-minute load average, real value
  const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
  const totalMemMB = Math.round(os.totalmem() / 1024 / 1024);
  const uptimeSec = Math.round(os.uptime());
  return {
    hostname: os.hostname(),
    loadavg_1m: load,
    freeMemMB,
    totalMemMB,
    memUsedPct: Number((((totalMemMB - freeMemMB) / totalMemMB) * 100).toFixed(2)),
    uptimeSec,
    timestamp: Date.now(),
  };
}

async function registerAsProvider() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEVICE_PRIVATE_KEY || process.env.PRIVATE_KEY, provider);
  const registry = new ethers.Contract(process.env.REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  console.log(`Registering device provider from ${wallet.address} ...`);
  const tx = await registry.registerProvider(`telemetry-${os.hostname()}`, "telemetry", PRICE_PER_CALL);
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
  const providerId = await registerAsProvider();

  const server = http.createServer((req, res) => {
    if (req.url === "/reading") {
      const reading = readTelemetry();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ providerId, reading }));
    } else if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ providerId, pricePerCall: PRICE_PER_CALL.toString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`Device telemetry provider #${providerId} serving readings on http://localhost:${PORT}/reading`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
