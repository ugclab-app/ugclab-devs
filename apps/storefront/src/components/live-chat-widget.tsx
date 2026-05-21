import { useEffect } from "react";
import type { StoreTheme } from "@ugclab/tenant/store-theme";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
    intercomSettings?: { app_id: string };
    Intercom?: (cmd: string, ...args: unknown[]) => void;
  }
}

export function LiveChatWidget({ theme }: { theme: StoreTheme }) {
  const provider = theme.liveChatProvider;
  const id = theme.liveChatId?.trim();

  useEffect(() => {
    if (!provider || provider === "none") return;

    if (provider === "crisp" && id) {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = id;
      const s = document.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = true;
      document.head.appendChild(s);
      return () => {
        s.remove();
      };
    }

    if (provider === "intercom" && id) {
      window.intercomSettings = { app_id: id };
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://widget.intercom.io/widget/${id}`;
      document.head.appendChild(s);
      return () => {
        s.remove();
      };
    }

    if (provider === "custom" && theme.liveChatSnippet) {
      const wrap = document.createElement("div");
      wrap.id = "ugclab-live-chat-custom";
      wrap.innerHTML = theme.liveChatSnippet;
      document.body.appendChild(wrap);
      wrap.querySelectorAll("script").forEach((old) => {
        const script = document.createElement("script");
        if (old.src) script.src = old.src;
        else script.textContent = old.textContent;
        script.async = true;
        document.body.appendChild(script);
        old.remove();
      });
      return () => {
        wrap.remove();
      };
    }
  }, [provider, id, theme.liveChatSnippet]);

  return null;
}
