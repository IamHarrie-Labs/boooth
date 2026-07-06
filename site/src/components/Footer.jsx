export default function Footer() {
  return (
    <div className="footerWrapper fadeUp" style={{ animationDelay: "0.5s" }}>
      <div className="footerLeft">
        <h1 className="heroHeading fadeUp" style={{ animationDelay: "0.6s" }}>
          An agent that
          <br />
          pays for itself.
        </h1>

        <p className="heroDescription fadeUp" style={{ animationDelay: "0.8s" }}>
          Boooth is an autonomous agent that pays real machines for real data, things like a device's live telemetry or a chain's own network health, and settles every payment onchain the moment it happens.
        </p>

        <div className="heroButtons fadeUp" style={{ animationDelay: "1s" }}>
          <a href="/dashboard.html" className="btnPrimary">
            Watch it run
          </a>
          <a href="/docs.html" className="btnSecondary">
            Read the docs
          </a>
        </div>
      </div>

      <div className="footerRight fadeUp" style={{ animationDelay: "1s" }}>
        <span className="tagPill">DePIN</span>
        <span className="tagPill">Autonomous</span>
        <span className="tagPill">Verifiable</span>
      </div>
    </div>
  );
}
