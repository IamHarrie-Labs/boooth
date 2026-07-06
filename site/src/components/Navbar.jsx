import { motion } from "motion/react";
import { Plus } from "lucide-react";

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="brandMark">
      <rect x="4" y="9" width="14" height="8" rx="3" fill="#000" transform="rotate(-35 11 13)" />
      <rect x="8" y="9" width="14" height="8" rx="3" fill="#000" opacity="0.55" transform="rotate(-35 15 13)" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="0" y="0" width="5" height="5" rx="1" fill="#fff" />
      <rect x="7" y="0" width="5" height="5" rx="1" fill="#fff" />
      <rect x="0" y="7" width="5" height="5" rx="1" fill="#fff" />
      <rect x="7" y="7" width="5" height="5" rx="1" fill="#fff" />
    </svg>
  );
}

export default function Navbar() {
  return (
    <motion.nav
      className="navbar"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="navLeft">
        <a href="/" className="brand">
          <BrandMark />
          <span className="brandText">Boooth</span>
        </a>

        <button className="menuButton" type="button">
          <span className="menuButtonCircle">
            <Plus size={12} strokeWidth={3} color="#000" />
          </span>
          <span className="menuButtonText">Menu</span>
        </button>

        <div className="tagsPill">
          <span>Autonomous agents</span>
          <span>Onchain payments</span>
        </div>
      </div>

      <a href="https://scan.bohr.life/" target="_blank" rel="noopener noreferrer" className="navRight">
        <span className="navRightCircle">
          <GridIcon />
        </span>
        <span className="navRightLabel">BOT Chain</span>
      </a>
    </motion.nav>
  );
}
