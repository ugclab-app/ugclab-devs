"use client";

import { useEffect, useState } from "react";

const KEY = "ugclab_wishlist";

export function WishlistButton({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(list.includes(productId));
    } catch {
      setSaved(false);
    }
  }, [productId]);

  function toggle() {
    try {
      const raw = localStorage.getItem(KEY);
      let list = raw ? (JSON.parse(raw) as string[]) : [];
      if (list.includes(productId)) {
        list = list.filter((id) => id !== productId);
        setSaved(false);
      } else {
        list.push(productId);
        setSaved(true);
      }
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
      title={title}
    >
      {saved ? "♥ Saved" : "♡ Wishlist"}
    </button>
  );
}
