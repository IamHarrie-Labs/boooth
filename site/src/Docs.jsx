const REGISTRY_ADDRESS = "0xA4f3540Af7d5f16AdF5518765C37d1766Aef5b12";
const PAYPERCALL_ADDRESS = "0x1bD37B2316f51059096E91F26313cba9DB949f32";

export default function Docs() {
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
        <h1 className="docsTitle">How Boooth works</h1>
        <p className="docsIntro">
          Boooth connects real machines to an autonomous agent. Devices sell their live data, an agent decides what is worth buying, and every payment, along with the reasoning behind it, lands onchain on BOT Chain. There is nothing to sign up for. It is all open contracts you can read, run, or plug into yourself.
        </p>

        <section className="docsSection">
          <div className="docsSectionLabel">Overview</div>
          <h2 className="docsSectionTitle">Real machines, sold as data</h2>
          <p className="docsBody">
            This is a small DePIN loop. A device, right now a laptop, registers itself as a data provider and starts selling readings of things that are actually true about it, like how loaded its memory is, or how healthy the chain's own network looks from where it sits. Every few seconds, an agent checks in on one or more of these providers, looks at the reading, and decides whether it is worth the asking price. If it is, the agent pays for it and writes down why, both in the same transaction.
          </p>
          <p className="docsBody">
            The deciding part can be a real call to Claude, reasoning over the actual numbers in the reading, or a simple threshold rule if you would rather not wire up an API key. Either way, the outcome, and the reasoning behind it, ends up permanently on the chain, tied to real hardware, not a simulation.
          </p>
        </section>

        <section className="docsSection">
          <div className="docsSectionLabel">Why this needs BOT Chain</div>
          <h2 className="docsSectionTitle">Speed and cost, not just a slogan</h2>
          <p className="docsBody">
            BOT Chain confirms blocks in around three quarters of a second, and fees are close to nothing. That is not a nice to have here, it is the entire premise. Paying for a tiny reading, over and over, every few seconds, only makes sense when the fee does not swallow the payment and the confirmation does not make you wait. Try running this pattern on a slower, pricier chain and the fees alone would cost more than the data itself.
          </p>
        </section>

        <section className="docsSection">
          <div className="docsSectionLabel">Contracts</div>
          <h2 className="docsSectionTitle">Deployed on the BOT Chain testnet</h2>
          <table className="addressTable">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ToolRegistry</td>
                <td>{REGISTRY_ADDRESS}</td>
              </tr>
              <tr>
                <td>PayPerCall</td>
                <td>{PAYPERCALL_ADDRESS}</td>
              </tr>
            </tbody>
          </table>
          <p className="docsBody">
            Chain ID 968, RPC at <span className="inlineCode">rpc.bohr.life</span>, explorer at{" "}
            <a href="https://scan.bohr.life/" target="_blank" rel="noopener noreferrer" className="inlineCode">
              scan.bohr.life
            </a>
            .
          </p>
        </section>

        <section className="docsSection">
          <div className="docsSectionLabel">Integrate</div>
          <h2 className="docsSectionTitle">There is no account to make</h2>
          <p className="docsBody">
            Both contracts are open and permissionless. Anyone with a wallet can plug in, either as a seller or as a buyer. Here is what each side looks like.
          </p>

          <div className="docsCards">
            <div className="docsCard">
              <div className="docsCardTitle">Sell your own data</div>
              <div className="docsCardBody">
                Call <span className="inlineCode">registerProvider</span> on ToolRegistry with a name, a kind, and a price per call. From that moment on, any agent, ours or someone else's, can find you and pay you.
              </div>
            </div>
            <div className="docsCard">
              <div className="docsCardTitle">Run your own agent</div>
              <div className="docsCardBody">
                Clone the repo, point it at any registered provider, and let it decide for itself what is worth paying for. It can use ours, or one you registered yourself.
              </div>
            </div>
          </div>

          <p className="docsBody">Registering a provider looks roughly like this.</p>
          <div className="codeBlock">
{`const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);
await registry.registerProvider(
  "my-data-feed",   // name
  "telemetry",      // kind
  ethers.parseEther("0.0001") // price per call, in BOT
);`}
          </div>

          <p className="docsBody">Paying a provider and logging why looks like this.</p>
          <div className="codeBlock">
{`await payPerCall.payAndLog(
  providerId,
  taskId,
  stepIndex,
  "load and memory both crossed the threshold",
  dataHash,
  { value: pricePerCall }
);`}
          </div>
        </section>

        <section className="docsSection">
          <div className="docsSectionLabel">Run it yourself</div>
          <h2 className="docsSectionTitle">Local setup</h2>
          <ul className="docsList">
            <li>Clone the repo and run <span className="inlineCode">npm install</span></li>
            <li>Copy <span className="inlineCode">.env.example</span> to <span className="inlineCode">.env</span> and fill in a wallet that holds tBOT from the testnet faucet</li>
            <li>Deploy the contracts with <span className="inlineCode">npx hardhat run scripts/deploy.js --network botTestnet</span></li>
            <li>Start the providers with <span className="inlineCode">node device/telemetry.js</span> and <span className="inlineCode">node device/network-health.js</span></li>
            <li>Start the agent with <span className="inlineCode">node agent/agent.js</span></li>
            <li>Open the dashboard, paste in the PayPerCall address, and watch it go</li>
          </ul>
          <p className="docsBody">
            Full setup notes, environment variables, and the reasoning behind each piece live in the{" "}
            <a href="https://github.com/IamHarrie-Labs/boooth" target="_blank" rel="noopener noreferrer" className="inlineCode">
              README
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
