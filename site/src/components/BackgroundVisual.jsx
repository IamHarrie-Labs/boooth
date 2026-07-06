import { useEffect, useRef } from "react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4";

export default function BackgroundVisual() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Setting `muted` as a JSX prop doesn't reliably set the underlying
    // media element property before the browser's autoplay policy check
    // runs, so autoplay can silently fail. Set it imperatively and retry
    // play() explicitly instead of trusting the autoPlay attribute alone.
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  return (
    <div className="bgWrapper">
      <div className="bgInner bgFadeIn">
        <video
          ref={videoRef}
          className="bgVideo"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    </div>
  );
}
