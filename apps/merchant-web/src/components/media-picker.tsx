import { useState } from "react";
import { api } from "@/api/client";

export function MediaPicker({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [pending, setPending] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <label className="ugclab-btn border border-zinc-200 bg-white text-sm cursor-pointer inline-block">
        {pending ? "Uploading…" : "Choose image"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={pending}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setPending(true);
            try {
              const r = await api.uploadMedia(f);
              const url = (r.media as { url: string }).url;
              setLastUrl(url);
              onUploaded(url);
            } finally {
              setPending(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {lastUrl ? (
        <p className="break-all text-xs font-mono text-violet-700">{lastUrl}</p>
      ) : null}
    </div>
  );
}
