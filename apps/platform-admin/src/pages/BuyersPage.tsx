import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export default function BuyersPage() {
  const [email, setEmail] = useState("");
  const [term, setTerm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["buyers", term],
    queryFn: () => api.buyers(term),
    enabled: term.length >= 3,
  });
  const erase = useMutation({
    mutationFn: (value: string) => api.eraseBuyer(value),
    onSuccess: (result) => {
      setNotice(`Removed ${result.customers} buyer profiles and cleared ${result.orders} order emails.`);
      setTerm(email.trim());
    },
    onError: (err: Error) => setNotice(err.message),
  });

  async function download() {
    setNotice(null);
    try {
      const data = await api.exportBuyer(email.trim());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `buyer-${email.trim()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buyers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Find a shopper by email, download their orders, or erase the profile. Orders stay, with the email removed.
        </p>
      </div>
      <form
        className="platform-card flex flex-wrap items-center gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(null);
          setTerm(email.trim());
        }}
      >
        <input
          className="ugclab-input min-w-64 flex-1"
          type="email"
          placeholder="buyer@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="ugclab-btn ugclab-btn-primary">
          Search
        </button>
        <button type="button" className="ugclab-btn" onClick={() => void download()} disabled={!email.includes("@")}>
          Export
        </button>
        <button
          type="button"
          className="ugclab-btn"
          disabled={!email.includes("@") || erase.isPending}
          onClick={() => {
            if (window.confirm(`Erase ${email.trim()} from every store?`)) erase.mutate(email.trim());
          }}
        >
          Erase
        </button>
      </form>
      {notice ? <p className="text-sm text-slate-700">{notice}</p> : null}
      {query.isLoading ? <p className="text-sm text-slate-500">Searching…</p> : null}
      {query.data ? (
        <ul className="space-y-3">
          {query.data.buyers.map((row) => (
            <li key={row.id} className="platform-card flex items-center justify-between gap-4 p-4 text-sm">
              <div>
                <p className="font-medium">{row.email}</p>
                <p className="text-slate-500">
                  {row.name ?? "No name"} · {row.orders} orders · {row.country ?? "—"}
                </p>
              </div>
              <Link to={`/tenants/${row.tenantId}`} className="text-sky-700">
                {row.store}
              </Link>
            </li>
          ))}
          {query.data.buyers.length === 0 ? <li className="text-sm text-slate-500">No buyers with that email.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
