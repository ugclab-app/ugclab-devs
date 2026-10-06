import { useEffect } from "react";
import TescommercePitchDeck from "../../../../docs/TescommercePitchDeck";

/** Deck viewer — drops Tailwind body styles so html2canvas avoids oklch parse errors. */
export default function PitchDeckPage() {
  useEffect(() => {
    const prev = document.body.style.cssText;
    document.body.style.cssText =
      "margin:0;padding:0;background:#0a0f1e;color:#e2e8f0;font-family:system-ui,sans-serif;";
    return () => {
      document.body.style.cssText = prev;
    };
  }, []);

  return <TescommercePitchDeck />;
}
