import { useEffect } from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { SignupPage } from "@/pages/SignupPage";
import { PartnersPage } from "@/pages/PartnersPage";
import PitchDeckPage from "@/pages/PitchDeckPage";
import { PrivacyPage, TermsPage } from "@/pages/LegalPages";
import { publicPartnerUrl } from "@/lib/api-public";

function CapturePartnerRef() {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  useEffect(() => {
    if (!ref) return;
    void fetch(publicPartnerUrl("/partners/click"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref, source: document.referrer || "direct" }),
    });
  }, [ref]);
  return null;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<><CapturePartnerRef /><HomePage /></>} />
      <Route path="/signup" element={<><CapturePartnerRef /><SignupPage /></>} />
      <Route path="/partners" element={<PartnersPage />} />
      <Route path="/deck" element={<PitchDeckPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
    </Routes>
  );
}
