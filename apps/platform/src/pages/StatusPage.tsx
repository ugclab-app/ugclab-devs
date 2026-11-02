import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicPartnerUrl } from "@/lib/api-public";

type Status = {
  ok: boolean;
  services: { api: string; database: string; email: string; stripe: string };
  updatedAt: string;
};

export function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(publicPartnerUrl("/status"))
      .then(async (res) => {
        if (!res.ok) throw new Error("Status unavailable");
        setStatus((await res.json()) as Status);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const rows = status
    ? [
        ["API", status.services.api],
        ["Database", status.services.database],
        ["Email", status.services.email],
        ["Stripe", status.services.stripe],
      ]
    : [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="mx-auto flex max-w-xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-semibold">
          Tescommerce
        </Link>
        <Link to="/" className="text-sm text-zinc-500">
          Home
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-6 pb-16">
        <h1 className="text-3xl font-bold">Status</h1>
        <p className="mt-2 text-zinc-600">
          {status ? (status.ok ? "Checkout and the dashboard are up." : "Something is down.") : "Checking…"}
        </p>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <ul className="mt-8 divide-y rounded-2xl border border-zinc-200 bg-white">
          {rows.map(([name, value]) => (
            <li key={name} className="flex items-center justify-between px-5 py-4">
              <span>{name}</span>
              <span className="text-sm font-medium capitalize">{(value ?? "").replaceAll("_", " ")}</span>
            </li>
          ))}
        </ul>
        {status ? (
          <p className="mt-4 text-xs text-zinc-500">Updated {new Date(status.updatedAt).toLocaleString()}</p>
        ) : null}
      </main>
    </div>
  );
}
