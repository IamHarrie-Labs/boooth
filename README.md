# Boooth

An autonomous AI agent that pays real machines for real data, per call, on
[BOT Chain](https://www.botchain.ai/). It logs the reasoning behind every
purchase onchain, in the same transaction as the payment.

Live site: [useboooth.vercel.app](https://useboooth.vercel.app) (landing page, docs, and a live activity dashboard)

Every few seconds the agent:
1. Fetches a live reading from one or more registered providers
2. Asks an LLM whether that specific reading is worth paying for (or falls back to a threshold rule if no API key is set)
3. If yes, pays the provider and writes its one sentence reasoning to the blockchain, in a single transaction

This only makes economic sense on a chain with sub second blocks and near
zero fees. On a normal chain, paying gas for a purchase this small, this
often, would cost more than the data itself.

## Why this needs BOT Chain specifically

- Blocks confirm in around three quarters of a second, so the agent can transact multiple times per provider per minute and see confirmation almost immediately. That is what lets it behave like a live, responsive buyer instead of a batch job.
- Fees are close to nothing, so hundreds of tiny payments (0.0001 to 0.00015 BOT each) are only viable because the fee does not dwarf the payment.
- Every transaction here is real, not simulated. Every payment and every reasoning string in this repo came from an actual deploy and run against the BOT Chain testnet (chain ID 968). The transaction hash below is independently verifiable on the explorer.

## Architecture

```
┌─────────────────────┐        HTTP /reading        ┌──────────────────────┐
│ device/telemetry.js  │ ◄─────────────────────────► │                      │
│ (real CPU/mem/uptime)│                              │   agent/agent.js     │
└─────────────────────┘                              │  fetch reading       │
                                                       │  ask the LLM:       │
┌───────────────────────┐      HTTP /reading          │    buy or skip?     │
│ device/network-health  │ ◄─────────────────────────► │  pay and log if buy │
│ (real RPC latency and  │                              └─────────┬────────┘
│  block staleness)      │                                        │
└───────────────────────┘                                         │ payAndLog()
                                                                    ▼
                                          ┌───────────────────────────────────┐
                                          │   PayPerCall.sol (onchain)        │
                                          │   forwards payment to provider    │
                                          │   emits CallPaid + StepLogged     │
                                          └────────────────┬──────────────────┘
                                                            │ reads price and owner
                                                            ▼
                                          ┌───────────────────────────────────┐
                                          │   ToolRegistry.sol (onchain)      │
                                          │   providers register a name,      │
                                          │   kind, and price per call        │
                                          └───────────────────────────────────┘

useboooth.vercel.app/dashboard.html   listens for CallPaid and StepLogged events, ticks live in the browser
```

### Contracts

- `contracts/ToolRegistry.sol`, a sign up list for providers. Anyone selling data registers a name, a kind (for example `telemetry` or `network-health`), and a price per call, and can update the price or deactivate later.
- `contracts/PayPerCall.sol`, the payment and audit log contract. `payAndLog(providerId, taskId, stepIndex, summary, dataHash)` forwards the payment to the provider's registered payout address and emits both `CallPaid` (the money movement) and `StepLogged` (the agent's reasoning) in one atomic transaction.

### Providers, the sellers

- `device/telemetry.js` reads this machine's actual CPU load average, free and total memory, and uptime through Node's `os` module. It registers itself as a `telemetry` provider and serves the live reading over a small HTTP server.
- `device/network-health.js` measures real RPC latency (a timed `eth_getBlock` call) and block staleness (now minus the block's timestamp) against BOT Chain's own testnet RPC. It registers as a `network-health` provider, a genuinely different data source from telemetry rather than the same script running twice, so the registry ends up modeling a small real marketplace instead of one script duplicated.

### Agent, the buyer

- `agent/decide.js` sends the reading, price, and provider kind to an LLM and asks for a buy or skip decision along with a one sentence reason. It supports Groq's fast inference API or Anthropic's Claude, picked by whichever API key is set, and falls back to a threshold rule built from the actual reading if neither key is set, so the demo still runs without one.
- `agent/agent.js` is the main loop. For each provider URL in `DEVICE_URLS`, it fetches a reading, gets a decision, and if the decision is to buy, calls `payAndLog` and waits for confirmation before moving to the next tick. Ticks run one at a time, in order, specifically so nonces never race against each other.

### Dashboard, the viewer

- `dashboard.html` (deployed at [useboooth.vercel.app/dashboard.html](https://useboooth.vercel.app/dashboard.html)) loads recent history from the chain first, then keeps listening live. Open it in any browser and watch `CallPaid` and `StepLogged` events, plus the block number, arrive in real time.

## Network

| | Testnet (used for this build) | Mainnet |
|---|---|---|
| Chain ID | 968 | 677 |
| RPC | https://rpc.bohr.life | https://rpc.botchain.ai |
| Explorer | https://scan.bohr.life/ | https://scan.botchain.ai |
| Native token | tBOT (via the [faucet](https://faucet.botchain.ai/basic)) | BOT |

## Deployed contracts (BOT Chain testnet)

| Contract | Address |
|---|---|
| `ToolRegistry` | `0xA4f3540Af7d5f16AdF5518765C37d1766Aef5b12` |
| `PayPerCall` | `0x1bD37B2316f51059096E91F26313cba9DB949f32` |

Sample verified transaction (payment and step log in one tx):
`0x15510b9e79464634bc6bcd33a3f692497f4c2a4fe8aab9928a9c88f420ac3288`

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `PRIVATE_KEY`, the deployer and agent wallet, needs tBOT
   - `DEVICE_PRIVATE_KEY`, the wallet the providers get paid to (can be the same key for a demo)
3. Fund that wallet with tBOT from the [faucet](https://faucet.botchain.ai/basic).
4. Optional but recommended, set `GROQ_API_KEY` (or `ANTHROPIC_API_KEY`) so the agent reasons with a real model instead of the fallback rule.
5. Deploy the contracts:
   ```
   npx hardhat run scripts/deploy.js --network botTestnet
   ```
   This writes `deployment.json` and fills in `REGISTRY_ADDRESS` and `PAYPERCALL_ADDRESS` in `.env` automatically.
6. Start both providers, each in its own terminal:
   ```
   node device/telemetry.js
   node device/network-health.js
   ```
7. Start the agent in a third terminal:
   ```
   node agent/agent.js
   ```
8. Open the [live dashboard](https://useboooth.vercel.app/dashboard.html), or `dashboard/index.html` locally, and watch the activity arrive.

### Environment variables

| Variable | Purpose |
|---|---|
| `PRIVATE_KEY` | Deployer and agent wallet, needs tBOT |
| `DEVICE_PRIVATE_KEY` | Wallet providers receive payments to |
| `REGISTRY_ADDRESS` / `PAYPERCALL_ADDRESS` | Filled in automatically by `scripts/deploy.js` |
| `GROQ_API_KEY` | Optional, enables real reasoning through Groq. Takes priority if both keys are set |
| `GROQ_MODEL` | Defaults to `llama-3.1-8b-instant` |
| `ANTHROPIC_API_KEY` | Optional, enables real reasoning through Claude |
| `ANTHROPIC_MODEL` | Defaults to `claude-haiku-4-5-20251001` |
| `DEVICE_URLS` | Comma separated provider endpoints the agent checks each tick |
| `AGENT_TICK_MS` | Tick interval in milliseconds, default 5000, raise it to slow down API usage during longer demos |

## What to show in a demo

- The two device terminals registering onchain and serving real readings
- The agent terminal reasoning about each reading, then paying when it decides to
- The dashboard ticking live with payments and reasoning arriving, plus the block number climbing roughly every three quarters of a second
- The explorer showing the same transactions confirmed, independently of anything this repo controls

## License

MIT
