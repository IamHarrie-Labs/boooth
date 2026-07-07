// Real reasoning step: asks an LLM whether a given reading is worth paying
// for, given its price and kind. Supports either Anthropic or Groq's fast
// inference API, picked by whichever API key is set. Falls back to a
// threshold rule with no API key at all, so the demo still runs without one.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

function fallbackDecide(reading, kind) {
  // Build the reason from the actual numbers in the reading, not a generic
  // template, so the onchain log reads like a real decision even without an
  // LLM call behind it.
  const facts = [];
  if (reading.loadavg_1m !== undefined) facts.push(`load average of ${reading.loadavg_1m.toFixed(2)}`);
  if (reading.memUsedPct !== undefined) facts.push(`memory at ${reading.memUsedPct}% used`);
  if (reading.rpcLatencyMs !== undefined) facts.push(`rpc latency of ${reading.rpcLatencyMs}ms`);
  if (reading.blockAgeMs !== undefined) facts.push(`a block that is ${reading.blockAgeMs}ms old`);
  const summary = facts.join(" and ");

  const interesting =
    (reading.loadavg_1m !== undefined && reading.loadavg_1m > 0.05) ||
    (reading.memUsedPct !== undefined && reading.memUsedPct > 40) ||
    (reading.rpcLatencyMs !== undefined && reading.rpcLatencyMs > 150) ||
    (reading.blockAgeMs !== undefined && reading.blockAgeMs > 2000);

  return {
    buy: interesting,
    reason: interesting
      ? `Worth buying, this ${kind} reading shows ${summary}, past the threshold.`
      : `Skipping, this ${kind} reading shows ${summary}, still within normal range.`,
  };
}

function buildPrompt(reading, kind, priceEth) {
  return `You are an autonomous purchasing agent for an AI system. You are offered one data reading and must decide whether it is worth paying for.

Provider kind: ${kind}
Price: ${priceEth} BOT
Reading (JSON): ${JSON.stringify(reading)}

Buying rule: only buy readings that show something notable, such as elevated system load or memory pressure for telemetry readings, or degraded latency or stale blocks for network health readings. Skip routine, unremarkable readings to avoid wasting money.

Respond with ONLY a JSON object, no other text: {"buy": true or false, "reason": "one short sentence explaining the decision using the actual numbers"}`;
}

function extractJson(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not parse LLM response: ${text}`);
  }
  const parsed = JSON.parse(jsonMatch[0]);
  return { buy: Boolean(parsed.buy), reason: String(parsed.reason).slice(0, 200) };
}

async function decideWithGroq(reading, kind, priceEth) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: buildPrompt(reading, kind, priceEth) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return extractJson(text);
}

async function decideWithAnthropic(reading, kind, priceEth) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: buildPrompt(reading, kind, priceEth) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  return extractJson(text);
}

async function decideWithLLM(reading, kind, priceEth) {
  try {
    if (process.env.GROQ_API_KEY) {
      return await decideWithGroq(reading, kind, priceEth);
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return await decideWithAnthropic(reading, kind, priceEth);
    }
  } catch (err) {
    // A rate limit or a network hiccup on the LLM call shouldn't stop the
    // agent from deciding at all, it should just decide with the threshold
    // rule for this one reading and keep ticking.
    console.error("LLM call failed, using fallback rule for this reading:", err.message);
  }
  return fallbackDecide(reading, kind);
}

module.exports = { decideWithLLM, fallbackDecide };
