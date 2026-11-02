import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

const FILTERS = ["PENDING", "APPROVED", "REJECTED", ""] as const;

function foldName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function PhotoFrame({
  href,
  label,
  empty,
}: {
  href?: string;
  label: string;
  empty?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-zinc-100 bg-white">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="block">
          <img src={href} alt={label} className="max-h-64 w-full object-contain bg-zinc-50" />
        </a>
      ) : (
        <div className="flex h-40 items-center justify-center bg-zinc-50 text-sm text-zinc-400">
          {empty}
        </div>
      )}
      <figcaption className="border-t border-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700">
        {label}
      </figcaption>
    </figure>
  );
}

export default function KycPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("PENDING");
  const [search, setSearch] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["platform-kyc", status, search.trim()],
    queryFn: () => api.kycSubmissions(status || undefined, search.trim() || undefined),
  });

  async function review(id: string, next: "APPROVED" | "REJECTED" | "PENDING") {
    setBusyId(id);
    setError(null);
    try {
      await api.reviewKyc(id, next, reasons[id]);
      await qc.invalidateQueries({ queryKey: ["platform-kyc"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the review.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Passport KYC</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Tescommerce staff review these passport photos. Finik, Stripe, and Wise do not.
          Photos stay off the public file URL.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Name, passport number, or store slug"
        className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item || "all"}
            type="button"
            onClick={() => setStatus(item)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              status === item ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {item || "All"}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {q.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {q.isError ? (
        <p className="text-sm text-red-600">
          {q.error instanceof Error ? q.error.message : "Could not load submissions."}
        </p>
      ) : null}

      <div className="space-y-4">
        {(q.data?.submissions ?? []).map((row) => {
          const payoutName = row.payoutLegalName?.trim() ?? "";
          const namesDiffer =
            row.legalName.trim().length > 0 &&
            payoutName.length > 0 &&
            foldName(row.legalName) !== foldName(payoutName);
          return (
          <article key={row.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {row.legalName}{" "}
                  <span className="font-normal text-zinc-500">
                    {row.country} · {row.passportNumber}
                  </span>
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Payout profile name: {payoutName || "—"}
                </p>
                {namesDiffer ? (
                  <p className="mt-1 text-sm font-medium text-amber-800">Names do not match.</p>
                ) : null}
                <p className="mt-1 text-sm text-zinc-600">
                  <Link className="underline" to={`/tenants/${row.tenant.id}`}>
                    {row.tenant.name}
                  </Link>{" "}
                  · {row.tenant.slug} · {row.status}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Submitted {new Date(row.submittedAt).toLocaleString()}
                  {row.reviewedByEmail ? ` · ${row.reviewedByEmail}` : ""}
                </p>
                {row.rejectReason ? (
                  <p className="mt-2 text-sm text-red-700">{row.rejectReason}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {row.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PhotoFrame
                href={`/api/platform/kyc/${row.id}/file?side=passport`}
                label="Passport page"
              />
              <PhotoFrame
                href={row.hasSelfie ? `/api/platform/kyc/${row.id}/file?side=selfie` : undefined}
                label="Selfie"
                empty="No selfie"
              />
            </div>

            {row.status === "PENDING" ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  className="min-w-[16rem] flex-1 rounded-lg border px-3 py-2 text-sm"
                  placeholder="Reason if you reject"
                  value={reasons[row.id] ?? ""}
                  onChange={(e) => setReasons((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="ugclab-btn ugclab-btn-primary text-sm"
                  disabled={busyId === row.id}
                  onClick={() => review(row.id, "APPROVED")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                  disabled={busyId === row.id}
                  onClick={() => review(row.id, "REJECTED")}
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  className="ugclab-btn border border-zinc-200 bg-white text-sm"
                  disabled={busyId === row.id}
                  onClick={() => review(row.id, "PENDING")}
                >
                  Return to review
                </button>
              </div>
            )}
          </article>
          );
        })}
        {q.data && q.data.submissions.length === 0 ? (
          <p className="text-sm text-zinc-500">No passport submissions in this filter.</p>
        ) : null}
      </div>
    </div>
  );
}
