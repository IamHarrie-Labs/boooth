import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1];

export default function Footer() {
  return (
    <motion.div
      className="footerWrapper"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 1, ease: EASE }}
    >
      <div className="footerLeft">
        <motion.h1
          className="heroHeading"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
        >
          An agent that
          <br />
          pays for itself.
        </motion.h1>

        <motion.p
          className="heroDescription"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8, ease: EASE }}
        >
          Boooth is an autonomous agent that pays real machines for real data, things like a device's live telemetry or a chain's own network health, and settles every payment onchain the moment it happens.
        </motion.p>

        <motion.div
          className="heroButtons"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.8, ease: EASE }}
        >
          <a href="/dashboard.html" className="btnPrimary">
            Watch it run
          </a>
          <a href="/docs.html" className="btnSecondary">
            Read the docs
          </a>
        </motion.div>
      </div>

      <motion.div
        className="footerRight"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.8, ease: EASE }}
      >
        <span className="tagPill">DePIN</span>
        <span className="tagPill">Autonomous</span>
        <span className="tagPill">Verifiable</span>
      </motion.div>
    </motion.div>
  );
}
