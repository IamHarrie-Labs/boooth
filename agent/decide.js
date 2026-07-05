// Real reasoning step: asks Claude whether a given reading is worth paying
// for, given its price and kind. Falls back to a simple threshold rule if no
// ANTHROPIC_API_KEY is set, so the demo still runs without one.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

function fallbackDecide(reading, kind) {
  const interesting =
    (reading.loadavg_1m !== undefined && reading.loadavg_1m > 0.05) ||
    (reading.memUsedPct !== undefined && reading.memUsedPct > 40) ||
    (reading.rpcLatencyMs !== undefined && reading.rpcLatencyMs > 150) ||
    (reading.blockAgeMs !== undefined && reading.blockAgeMs > 2000);
  return {
    buy: interesting,
    reason: interesting
      ? `[fallback rule] ${kind} reading crossed threshold`
      : `[fallback rule] ${kind} reading below threshold, skipping`,
  };
}

async function decideWithLLM(reading, kind, priceEth) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackDecide(reading, kind);
  }

  const prompt = `You are an autonomous purchasing agent for an AI system. You are offered one data reading and must decide whether it is worth paying for.

Provider kind: ${kind}
Price: ${priceEth} BOT
Reading (JSON): ${JSON.stringify(reading)}

Buying rule: only buy readings that show something notable -- e.g. elevated system load/memory pressure for "telemetry" readings, or degraded latency/stale blocks for "network-health" readings. Skip routine, unremarkable readings to avoid wasting money.

Respond with ONLY a JSON object, no other text: {"buy": true|false, "reason": "one short sentence explaining the decision using the actual numbers"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse LLM response: ${text}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return { buy: Boolean(parsed.buy), reason: String(parsed.reason).slice(0, 200) };
}

module.exports = { decideWithLLM, fallbackDecide };
