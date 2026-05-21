import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("ugclab_pwa_dismissed") === "1") {
      setHidden(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-violet-200 bg-white p-4 shadow-lg sm:left-auto">
      <p className="text-sm text-zinc-700">Install this shop on your home screen</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          className="text-xs text-zinc-500"
          onClick={() => {
            localStorage.setItem("ugclab_pwa_dismissed", "1");
            setHidden(true);
          }}
        >
          Later
        </button>
        <button
          type="button"
          className="store-btn-primary px-3 py-1.5 text-xs"
          onClick={async () => {
            await deferred.prompt();
            setHidden(true);
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
