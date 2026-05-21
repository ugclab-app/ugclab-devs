import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

export function CartEmailCapture() {
  const { tenant } = useStoreParams();
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (value: string) => storeApi.cartEmail(tenant, value),
    onSuccess: () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
      <p className="text-sm font-medium text-zinc-800">Get a reminder if you leave</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        We&apos;ll email you a link to your cart (1h and 24h reminders).
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          className="ugclab-input flex-1 text-sm"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => {
            if (email.includes("@")) save.mutate(email);
          }}
        />
        <button
          type="button"
          className="store-btn-primary shrink-0 px-4 text-sm"
          disabled={!email.includes("@") || save.isPending}
          onClick={() => save.mutate(email)}
        >
          {save.isPending ? "…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
