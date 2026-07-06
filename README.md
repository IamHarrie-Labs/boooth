# Boooth

An autonomous AI agent that pays real providers for real data, per call, on
[BOT Chain](https://www.botchain.ai/) — and logs the reasoning behind every
purchase on-chain, in the same transaction as the payment.

Every few seconds the agent:
1. Fetches a live reading from one or more registered providers
2. Asks Claude whether that specific reading is worth paying for (or falls back to a threshold rule if no API key is set)
3. If yes: pays the provider **and** writes its one-sentence reasoning to the blockchain, in a single transaction

This only makes economic sense on a chain with sub-second blocks and
near-zero fees — on a normal L1, paying gas for a purchase this small, this
often, would cost more than the data itself.

## Why this needs BOT Chain specifically

- **~0.75s blocks** — the agent can transact multiple times per provider per minute and see confirmation almost immediately, which is what lets it behave like a live, responsive buyer instead of a batch job.
- **Near-zero fees** — hundreds of sub-cent payments (0.0001–0.00015 BOT each) are only viable because the fee doesn't dwarf the payment.
- **Real transactions, not simulated ones** — every payment and every reasoning string in this repo came from an actual deploy + run against the BOT Chain testnet (chain ID 968). Transaction hashes below are independently verifiable on the explorer.

## Architecture

```
┌─────────────────────┐        HTTP /reading        ┌──────────────────────┐
│ device/telemetry.js  │ ◄─────────────────────────► │                      │
│ (real CPU/mem/uptime)│                              │   agent/agent.js     │
└─────────────────────┘                              │  - fetch reading     │
                                                       │  - ask Claude:      │
┌───────────────────────┐      HTTP /reading          │    buy or skip?     │
│ device/network-health  │ ◄─────────────────────────► │  - pay + log if buy │
│ (real RPC latency /    │                              └─────────┬────────┘
│  block staleness)      │                                        │
└───────────────────────┘                                         │ payAndLog()
                                                                    ▼
                                          ┌───────────────────────────────────┐
                                          │   PayPerCall.sol (on-chain)       │
                                          │   - forwards payment to provider  │
                                          │   - emits CallPaid + StepLogged   │
                                          └────────────────┬──────────────────┘
                                                            │ reads price/owner
                                                            ▼
                                          ┌───────────────────────────────────┐
                                          │   ToolRegistry.sol (on-chain)     │
                                          │   - providers register name,      │
                                          │     kind, price per call          │
                                          └───────────────────────────────────┘

dashboard/index.html  ── listens for CallPaid / StepLogged events, ticks live in browser
```

### Contracts

- **`contracts/ToolRegistry.sol`** — a sign-up list for providers. Anyone selling data registers a `name`, `kind` (e.g. `telemetry`, `network-health`), and `pricePerCall`, and can update price or deactivate later.
- **`contracts/PayPerCall.sol`** — the payment + audit-log contract. `payAndLog(providerId, taskId, stepIndex, summary, dataHash)` forwards the payment to the provider's registered payout address and emits both `CallPaid` (the money movement) and `StepLogged` (the agent's reasoning) in one atomic transaction.

### Providers (sellers)

- **`device/telemetry.js`** — reads this machine's actual CPU load average, free/total memory, and uptime via Node's `os` module. Registers itself as a `telemetry` provider and serves the live reading over a tiny HTTP server.
- **`device/network-health.js`** — measures real RPC latency (timed `eth_getBlock` call) and block staleness (`now - block.timestamp`) against BOT Chain's own testnet RPC. Registers as a `network-health` provider. A genuinely different data source from telemetry, not a duplicate — the registry ends up modeling a small real marketplace instead of one script running twice.

### Agent (buyer)

- **`agent/decide.js`** — sends the reading, price, and provider kind to Claude (`claude-haiku-4-5` by default) and asks for a `{buy, reason}` JSON decision. If `ANTHROPIC_API_KEY` isn't set, falls back to a simple threshold rule (high load/memory, high latency/stale blocks) so the demo still runs without an API key.
- **`agent/agent.js`** — the main loop. For each provider URL in `DEVICE_URLS`, fetches a reading, gets a decision, and if `buy`, calls `payAndLog` and waits for confirmation before moving to the next tick. Ticks are fully sequential (not fire-and-forget) specifically so nonces never race.

### Dashboard (viewer)

- **`dashboard/index.html`** — a single static HTML file (ethers.js via CDN, no build step). Open it in any browser, paste in the deployed `PayPerCall` address, and it live-subscribes to `CallPaid`/`StepLogged` events plus new block numbers, so a demo recording shows real-time activity instead of a wall of terminal text.

## Network

| | Testnet (used for this build) | Mainnet |
|---|---|---|
| Chain ID | 968 | 677 |
| RPC | https://rpc.bohr.life | https://rpc.botchain.ai |
| Explorer | https://scan.bohr.life/ | https://scan.botchain.ai |
| Native token | tBOT (via [faucet](https://faucet.botchain.ai/basic)) | BOT |

## Deployed contracts (BOT Chain testnet)

| Contract | Address |
|---|---|
| `ToolRegistry` | `0xA4f3540Af7d5f16AdF5518765C37d1766Aef5b12` |
| `PayPerCall` | `0x1bD37B2316f51059096E91F26313cba9DB949f32` |

Sample verified transaction (payment + step log in one tx):
`0x15510b9e79464634bc6bcd33a3f692497f4c2a4fe8aab9928a9c88f420ac3288`

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `PRIVATE_KEY` — the deployer/agent wallet (needs tBOT)
   - `DEVICE_PRIVATE_KEY` — wallet the providers get paid to (can be the same key for a demo)
3. Fund that wallet with tBOT: https://faucet.botchain.ai/basic
4. Optional but recommended: set `ANTHROPIC_API_KEY` so the agent reasons with Claude instead of the fallback rule.
5. Deploy the contracts:
   ```
   npx hardhat run scripts/deploy.js --network botTestnet
   ```
   This writes `deployment.json` and patches `REGISTRY_ADDRESS` / `PAYPERCALL_ADDRESS` into `.env` automatically.
6. Start both providers, each in its own terminal:
   ```
   node device/telemetry.js
   node device/network-health.js
   ```
7. Start the agent in a third terminal:
   ```
   node agent/agent.js
   ```
8. Open `dashboard/index.html` directly in a browser, paste in the `PayPerCall` address, click Connect.

### Environment variables

| Variable | Purpose |
|---|---|
| `PRIVATE_KEY` | Deployer + agent wallet, needs tBOT |
| `DEVICE_PRIVATE_KEY` | Wallet providers receive payments to |
| `REGISTRY_ADDRESS` / `PAYPERCALL_ADDRESS` | Auto-filled by `scripts/deploy.js` |
| `ANTHROPIC_API_KEY` | Optional — enables real Claude reasoning instead of the fallback rule |
| `ANTHROPIC_MODEL` | Defaults to `claude-haiku-4-5-20251001` |
| `DEVICE_URLS` | Comma-separated provider endpoints the agent polls each tick |
| `AGENT_TICK_MS` | Tick interval (default 5000ms) — raise this to slow down Claude API usage during longer demos |

## What to show in the demo video

- The two device terminals registering on-chain and serving real readings
- The agent terminal reasoning about (or applying the fallback rule to) each reading, then paying when it decides to
- The dashboard ticking live with `CallPaid` / `StepLogged` events and the block number climbing roughly every 0.75s
- The explorer (scan.bohr.life) showing the same transactions confirmed, independently of anything this repo controls

## Findings worth flagging to the BOT Chain team

Submitted separately via the PR / Bug / Optimization Bounty form:

1. **`dev-docs.botchain.ai` returns HTTP 403 to non-browser clients** (curl, AI coding agents) — only works with a full browser user-agent. Notable specifically because the event's own materials tell participants to paste the docs straight into Claude Code / Codex / Cursor, which can't fetch a 403'd page.
2. **`rpc.bohr.life` shows intermittent DNS/timeout failures** (`ENOTFOUND`, `ECONNRESET`, request timeouts) under light, sustained request load (~1 request/3-5s) — self-recovering, but reproducible across multiple test runs. Worth investigating for single-node vs. load-balanced setup.
3. The testnet lives on a separate domain (`bohr.life`) rather than `botchain.ai`, which is easy to miss when following the docs.

## License

MIT
