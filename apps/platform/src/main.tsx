import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { loadAnalytics } from "@/lib/analytics";
import "@/globals.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Landing pages are prerendered at build time (scripts/prerender.mjs); the rest is a plain SPA.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);

loadAnalytics();
