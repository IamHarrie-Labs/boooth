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
        <motion.div
          className="subtitleLine"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
        >
          <span className="subtitleDot" />
          <span className="subtitleText">Built for the BOT Chain Builder Challenge</span>
        </motion.div>

        <motion.h1
          className="heroHeading"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8, ease: EASE }}
        >
          An agent that
          <br />
          pays for itself.
        </motion.h1>

        <motion.div
          className="heroButtons"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.8, ease: EASE }}
        >
          <a href="/dashboard/" className="btnPrimary">
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
        <span className="tagPill">Real time</span>
        <span className="tagPill">Autonomous</span>
        <span className="tagPill">Verifiable</span>
      </motion.div>
    </motion.div>
  );
}
