import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function OrderNotes({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="admin-card space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setPending(true);
        try {
          await api.addOrderNote(orderId, text.trim());
          setText("");
          await qc.invalidateQueries({ queryKey: ["order", orderId] });
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-sm font-semibold">Internal note</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="ugclab-input text-sm"
        placeholder="Visible to staff only…"
      />
      <button type="submit" disabled={pending} className="ugclab-btn ugclab-btn-primary text-sm">
        {pending ? "Adding…" : "Add note"}
      </button>
    </form>
  );
}
