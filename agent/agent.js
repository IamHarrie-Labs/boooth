// Autonomous agent: every tick, it fetches a real reading from each
// registered device endpoint, asks Claude whether that specific reading is
// worth paying for, then pays the provider and logs both the payment and
// the model's reasoning on-chain in a single transaction.
require("dotenv").config();
const { ethers } = require("ethers");
const { decideWithLLM } = require("./decide");

const RPC_URL = process.env.RPC_URL || "https://rpc.bohr.life";
const DEVICE_URLS = (process.env.DEVICE_URLS || "http://localhost:4000/reading,http://localhost:4001/reading")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TICK_MS = Number(process.env.AGENT_TICK_MS || 5000);

const PAYPERCALL_ABI = [
  "function payAndLog(uint256 providerId, uint256 taskId, uint256 stepIndex, string summary, bytes32 dataHash) external payable",
  "event CallPaid(uint256 indexed providerId, address indexed payer, address indexed payoutAddress, uint256 amount, uint256 timestamp)",
  "event StepLogged(address indexed agent, uint256 indexed taskId, uint256 stepIndex, uint256 indexed providerId, string summary, bytes32 dataHash, uint256 timestamp)",
];

const REGISTRY_ABI = [
  "function getProvider(uint256 id) view returns (tuple(address payoutAddress, string name, string kind, uint256 pricePerCall, bool active))",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const payPerCall = new ethers.Contract(process.env.PAYPERCALL_ADDRESS, PAYPERCALL_ABI, wallet);
  const registry = new ethers.Contract(process.env.REGISTRY_ADDRESS, REGISTRY_ABI, provider);

  const taskId = Date.now();
  let stepIndex = 0;

  const usingLLM = Boolean(process.env.ANTHROPIC_API_KEY);
  console.log(`Agent ${wallet.address} starting task #${taskId}, ticking every ${TICK_MS}ms`);
  console.log(`Decision engine: ${usingLLM ? "Claude (ANTHROPIC_API_KEY set)" : "fallback threshold rule (no ANTHROPIC_API_KEY)"}`);
  console.log(`Watching ${DEVICE_URLS.length} provider(s): ${DEVICE_URLS.join(", ")}`);

  async function processProvider(deviceUrl) {
    const res = await fetch(deviceUrl);
    const { providerId, reading } = await res.json();
    const providerInfo = await registry.getProvider(providerId);
    const priceEth = ethers.formatEther(providerInfo.pricePerCall);

    const { buy, reason } = await decideWithLLM(reading, providerInfo.kind, priceEth);
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(reading)));
    stepIndex += 1;

    if (!buy) {
      console.log(`[step ${stepIndex}] skip (${providerInfo.kind} #${providerId}): ${reason}`);
      return;
    }

    const tx = await payPerCall.payAndLog(providerId, taskId, stepIndex, reason, dataHash, {
      value: providerInfo.pricePerCall,
    });
    const receipt = await tx.wait();
    console.log(`[step ${stepIndex}] paid ${providerInfo.kind} #${providerId} ${priceEth} BOT — ${reason} — tx ${receipt.hash}`);
  }

  // Recursive setTimeout, not setInterval: each tick fully resolves (including
  // every provider's transaction confirming) before the next one is scheduled,
  // so nonces never race.
  async function tick() {
    for (const deviceUrl of DEVICE_URLS) {
      try {
        await processProvider(deviceUrl);
      } catch (err) {
        console.error(`tick failed for ${deviceUrl}:`, err.message);
      }
    }
    setTimeout(tick, TICK_MS);
  }

  tick();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
