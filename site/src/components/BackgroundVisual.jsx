import { motion } from "motion/react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4";

export default function BackgroundVisual() {
  return (
    <div className="bgWrapper">
      <motion.div
        className="bgInner"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <video
          className="bgVideo"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
        />
      </motion.div>
    </div>
  );
}
