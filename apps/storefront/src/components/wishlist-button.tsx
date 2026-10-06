import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storeApi } from "@/api/client";
import { useStoreParams } from "@/hooks/use-store-params";

export const WISHLIST_KEY = "ugclab_wishlist";

export function readLocalWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeLocalWishlist(ids: string[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

export function WishlistButton({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  const { tenant } = useStoreParams();
  const qc = useQueryClient();
  const { data: session } = useQuery({
    queryKey: ["account-session", tenant],
    queryFn: () => storeApi.accountSession(tenant),
  });
  const signedIn = !!session?.customer;
  const { data: remote } = useQuery({
    queryKey: ["account-wishlist", tenant],
    queryFn: () => storeApi.accountWishlist(tenant),
    enabled: signedIn,
  });
  const [localSaved, setLocalSaved] = useState(false);

  useEffect(() => {
    setLocalSaved(readLocalWishlist().includes(productId));
  }, [productId]);

  const saved = signedIn
    ? (remote?.productIds ?? []).includes(productId)
    : localSaved;

  const toggle = useMutation({
    mutationFn: async () => {
      if (signedIn) {
        if (saved) await storeApi.wishlistRemove(tenant, productId);
        else await storeApi.wishlistAdd(tenant, [productId]);
        return;
      }
      const list = readLocalWishlist();
      const next = list.includes(productId)
        ? list.filter((id) => id !== productId)
        : [...list, productId];
      writeLocalWishlist(next);
      setLocalSaved(next.includes(productId));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account-wishlist", tenant] });
    },
  });

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title}`}
      onClick={() => toggle.mutate()}
      className={`rounded-full border px-3 py-1 text-sm ${
        saved
          ? "border-[var(--store-primary)] bg-violet-50 text-[var(--store-primary)]"
          : "border-zinc-200 text-zinc-600"
      }`}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
