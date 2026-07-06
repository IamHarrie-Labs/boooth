import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";

const RPC_URL = "https://rpc.bohr.life";
const DEFAULT_PAYPERCALL = "0x1bD37B2316f51059096E91F26313cba9DB949f32";

const PAYPERCALL_ABI = [
  "event CallPaid(uint256 indexed providerId, address indexed payer, address indexed payoutAddress, uint256 amount, uint256 timestamp)",
  "event StepLogged(address indexed agent, uint256 indexed taskId, uint256 stepIndex, uint256 indexed providerId, string summary, bytes32 dataHash, uint256 timestamp)",
];

function short(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Dashboard() {
  const [address, setAddress] = useState(DEFAULT_PAYPERCALL);
  const [status, setStatus] = useState("idle");
  const [paymentCount, setPaymentCount] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0n);
  const [latestBlock, setLatestBlock] = useState(null);
  const [events, setEvents] = useState([]);
  const cleanupRef = useRef(null);

  async function connect(addr) {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setStatus("connecting");
    setPaymentCount(0);
    setTotalPaid(0n);
    setEvents([]);
    setLatestBlock(null);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(addr, PAYPERCALL_ABI, provider);

    // Confirm the RPC actually answers, and that the address holds contract
    // code, before claiming to be connected. Registering event listeners
    // never fails on its own, even if the endpoint is unreachable or the
    // address is wrong, so without this check the page can say "Listening"
    // while quietly showing nothing.
    let blockNumber;
    try {
      const [bn, code] = await Promise.all([provider.getBlockNumber(), provider.getCode(addr)]);
      if (code === "0x") {
        setStatus("error: no contract at that address");
        return;
      }
      blockNumber = bn;
    } catch (err) {
      setStatus(`error: could not reach the RPC (${err.shortMessage || err.message})`);
      return;
    }

    setLatestBlock(blockNumber);

    // Show proof of activity even if nobody's agent happens to be running
    // the instant this page loads. contract.on() only ever sees events from
    // this point forward, so without this, a quiet moment looks identical
    // to the whole thing being broken. Try a shrinking block range in case
    // the RPC caps how far back a single eth_getLogs call can look.
    for (const span of [20000, 5000, 1000]) {
      try {
        const fromBlock = Math.max(0, blockNumber - span);
        const [paidLogs, stepLogs] = await Promise.all([
          contract.queryFilter(contract.filters.CallPaid(), fromBlock, blockNumber),
          contract.queryFilter(contract.filters.StepLogged(), fromBlock, blockNumber),
        ]);

        let historyCount = 0;
        let historyTotal = 0n;
        const historyEvents = [];

        for (const log of paidLogs) {
          historyCount += 1;
          historyTotal += log.args.amount;
          historyEvents.push({
            key: `paid-hist-${log.transactionHash}-${log.index}`,
            tag: "PAID",
            text: `Provider #${log.args.providerId} received ${ethers.formatEther(log.args.amount)} BOT, sent to ${short(log.args.payoutAddress)}`,
            time: new Date(Number(log.args.timestamp) * 1000).toLocaleTimeString(),
            blockNumber: log.blockNumber,
          });
        }
        for (const log of stepLogs) {
          historyEvents.push({
            key: `step-hist-${log.transactionHash}-${log.index}`,
            tag: "STEP",
            text: `Task ${log.args.taskId}, step ${log.args.stepIndex} on provider #${log.args.providerId}: ${log.args.summary}`,
            time: "",
            blockNumber: log.blockNumber,
          });
        }

        historyEvents.sort((a, b) => b.blockNumber - a.blockNumber);
        setPaymentCount(historyCount);
        setTotalPaid(historyTotal);
        setEvents(historyEvents);
        break;
      } catch (err) {
        console.warn(`history lookup over last ${span} blocks failed:`, err.shortMessage || err.message);
      }
    }

    const onCallPaid = (providerId, payer, payoutAddress, amount, timestamp) => {
      setPaymentCount((n) => n + 1);
      setTotalPaid((t) => t + amount);
      setEvents((list) => [
        {
          key: `paid-${list.length}-${Date.now()}`,
          tag: "PAID",
          text: `Provider #${providerId} received ${ethers.formatEther(amount)} BOT, sent to ${short(payoutAddress)}`,
          time: new Date(Number(timestamp) * 1000).toLocaleTimeString(),
        },
        ...list,
      ]);
    };

    const onStepLogged = (agent, taskId, stepIndex, providerId, summary) => {
      setEvents((list) => [
        {
          key: `step-${list.length}-${Date.now()}`,
          tag: "STEP",
          text: `Task ${taskId}, step ${stepIndex} on provider #${providerId}: ${summary}`,
          time: "",
        },
        ...list,
      ]);
    };

    const onBlock = (bn) => setLatestBlock(bn);

    contract.on("CallPaid", onCallPaid);
    contract.on("StepLogged", onStepLogged);
    provider.on("block", onBlock);

    setStatus("connected");

    cleanupRef.current = () => {
      contract.removeAllListeners();
      provider.removeAllListeners();
      provider.destroy?.();
    };
  }

  useEffect(() => {
    connect(DEFAULT_PAYPERCALL);
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="docsPage">
      <nav className="docsNav">
        <a href="/" className="docsBackLink">
          ← Boooth
        </a>
        <a href="https://github.com/IamHarrie-Labs/boooth" target="_blank" rel="noopener noreferrer" className="docsBackLink">
          GitHub
        </a>
      </nav>

      <div className="docsShell">
        <h1 className="docsTitle">Live activity</h1>
        <p className="docsIntro">
          This page reads directly from the PayPerCall contract on the BOT Chain testnet. It loads recent history first, then keeps listening, so anything new the agent does shows up here live.
        </p>

        <div className="connectRow">
          <input
            className="connectInput"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="PayPerCall contract address"
          />
          <button className="btnPrimary" onClick={() => connect(address)}>
            Connect
          </button>
          <span className={`connectStatus ${status.startsWith("error") ? "connectStatusError" : ""}`}>
            {status === "connected" ? "Listening" : status}
          </span>
        </div>

        <div className="statRow">
          <div className="statCard">
            <div className="statLabel">Payments</div>
            <div className="statValue">{paymentCount}</div>
          </div>
          <div className="statCard">
            <div className="statLabel">Total paid</div>
            <div className="statValue">{ethers.formatEther(totalPaid)} BOT</div>
          </div>
          <div className="statCard">
            <div className="statLabel">Latest block</div>
            <div className="statValue">{latestBlock ?? "—"}</div>
          </div>
        </div>

        <div className="feed">
          {events.length === 0 && status === "connected" && (
            <p className="docsBody">No activity in recent history. Waiting for the agent's next tick, this stays live.</p>
          )}
          {events.map((e) => (
            <div className="feedRow" key={e.key}>
              <span className={`feedTag ${e.tag === "PAID" ? "feedTagPaid" : "feedTagStep"}`}>{e.tag}</span>
              <span className="feedText">{e.text}</span>
              {e.time && <span className="feedTime">{e.time}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
